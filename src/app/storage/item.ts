import type { ZodMiniType } from "zod/mini";
import { logger } from "@/shared/core";
import type { Cleanup } from "@/types";
import type { StorageBackend, StorageChangeListener } from "./backend";
import { storageBackend } from "./backend";

/**
 * スキーマ検証と変更監視機能を持つストレージアクセスラッパー
 *
 * @typeParam T - 保存する値の型
 *
 * @example
 * ```ts
 * const enabled = new StorageItem('enabled', false, z.boolean());
 * await enabled.setValue(true);
 * const value = await enabled.getValue();
 * ```
 */
export class StorageItem<T> {
	constructor(
		private readonly key: string,
		private readonly defaultValue: T,
		private readonly schema?: ZodMiniType<T>,
		private readonly backend: StorageBackend = storageBackend,
	) {}

	protected parse(value: unknown): T {
		if (!this.schema) {
			return (value as T) ?? this.defaultValue;
		}

		try {
			return this.schema.parse(value);
		} catch (error) {
			logger.warn("Invalid storage value, falling back to default", {
				key: this.key,
				error,
			});
			return this.defaultValue;
		}
	}

	/** ストレージから値を取得 */
	async getValue(): Promise<T> {
		try {
			const result = await this.backend.get(this.key);
			const value = result[this.key];
			if (value === undefined) {
				return this.defaultValue;
			}
			return this.parse(value);
		} catch (error) {
			logger.error("Failed to get storage value", error, {
				key: this.key,
			});
			return this.defaultValue;
		}
	}

	/** ストレージに値を保存 */
	async setValue(value: T): Promise<void> {
		try {
			const sanitized = this.schema ? this.schema.parse(value) : value;
			await this.backend.set({ [this.key]: sanitized });
		} catch (error) {
			logger.error("Failed to set storage value", error, {
				key: this.key,
			});
			throw error;
		}
	}

	/** {@link getValue} のエイリアス */
	get(): Promise<T> {
		return this.getValue();
	}

	/** {@link setValue} のエイリアス */
	set(value: T): Promise<void> {
		return this.setValue(value);
	}

	/**
	 * 生の値をパースしてデフォルト値を適用（バッチ読み込み用）
	 * @internal
	 */
	fromRaw(value: unknown): T {
		if (typeof value === "undefined") {
			return this.defaultValue;
		}
		return this.parse(value);
	}

	/**
	 * 値の変更を監視
	 * @param callback - 値が変更されたときに呼び出されるコールバック
	 * @returns 監視を解除する関数
	 */
	watch(callback: (newValue: T) => void): Cleanup {
		const listener: StorageChangeListener = (changes, areaName) => {
			const change = changes[this.key];
			if (!change || areaName !== this.backend.areaName) {
				return;
			}

			const newValue = change.newValue ?? this.defaultValue;
			callback(this.parse(newValue));
		};

		this.backend.addListener(listener);

		return () => {
			this.backend.removeListener(listener);
		};
	}

	/** {@link watch} のエイリアス（Svelte store互換） */
	subscribe(callback: (newValue: T) => void): Cleanup {
		return this.watch(callback);
	}
}
