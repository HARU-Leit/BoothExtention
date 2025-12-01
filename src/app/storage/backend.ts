import { logger } from "@/shared/core";

/** ストレージ変更イベントのリスナー型 */
export type StorageChangeListener = (
	changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
	areaName: string,
) => void;

/**
 * ストレージバックエンドのインターフェース
 *
 * WebExtension API (browser.storage) と Chrome API (chrome.storage) の
 * 差異を吸収する統一的なインターフェース
 */
export interface StorageBackend {
	get: (
		keys?: string | string[] | Record<string, unknown>,
	) => Promise<Record<string, unknown>>;
	set: (items: Record<string, unknown>) => Promise<void>;
	addListener: (listener: StorageChangeListener) => void;
	removeListener: (listener: StorageChangeListener) => void;
	areaName: "sync" | "local";
}

interface ChromeStorageArea {
	get(
		keys: string | string[] | Record<string, unknown> | undefined,
		callback: (items: Record<string, unknown>) => void,
	): void;
	set(items: Record<string, unknown>, callback: () => void): void;
}

/** テスト用やAPIが無い環境向けのインメモリストレージ */
function createMemoryBackend(): StorageBackend {
	const store = new Map<string, unknown>();
	const listeners = new Set<StorageChangeListener>();

	const notifyListeners = (
		changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
	): void => {
		for (const listener of listeners) {
			listener(changes, "local");
		}
	};

	const snapshotAll = (): Record<string, unknown> => {
		const result: Record<string, unknown> = {};
		for (const [key, value] of store.entries()) {
			result[key] = value;
		}
		return result;
	};

	return {
		get: async (keys) => {
			if (typeof keys === "undefined") {
				return snapshotAll();
			}

			const result: Record<string, unknown> = {};

			if (typeof keys === "string") {
				result[keys] = store.get(keys);
				return result;
			}

			if (Array.isArray(keys)) {
				for (const key of keys) {
					result[key] = store.get(key);
				}
				return result;
			}

			for (const [key, defaultValue] of Object.entries(keys)) {
				result[key] = store.has(key) ? store.get(key) : defaultValue;
			}

			return result;
		},
		set: async (items) => {
			const changes: Record<
				string,
				{ oldValue?: unknown; newValue?: unknown }
			> = {};
			for (const [key, value] of Object.entries(items)) {
				const oldValue = store.get(key);
				if (Object.is(oldValue, value)) continue;
				store.set(key, value);
				changes[key] = { oldValue, newValue: value };
			}

			if (Object.keys(changes).length > 0) {
				notifyListeners(changes);
			}
		},
		addListener: (listener) => {
			listeners.add(listener);
		},
		removeListener: (listener) => {
			listeners.delete(listener);
		},
		areaName: "local",
	};
}

/** WebExtension browser API (Firefox/Edge) 向けバックエンド */
function createBrowserBackend(): StorageBackend {
	return {
		get: (keys) => browser.storage.sync.get(keys),
		set: (items) => browser.storage.sync.set(items),
		addListener: (listener) => browser.storage.onChanged.addListener(listener),
		removeListener: (listener) =>
			browser.storage.onChanged.removeListener(listener),
		areaName: "sync",
	};
}

/** Chrome拡張 API 向けバックエンド (コールバック→Promise変換) */
function createChromeBackend(): StorageBackend {
	const storageApi = chrome.storage;
	if (!storageApi) {
		throw new Error("chrome.storage is not available");
	}
	const storageArea = (storageApi.sync ??
		storageApi.local) as ChromeStorageArea;
	const areaName = storageApi.sync ? "sync" : "local";

	const promisify = <T>(
		action: (callback: (result: T) => void) => void,
	): Promise<T> =>
		new Promise<T>((resolve, reject) => {
			try {
				action((result) => {
					const lastError = chrome.runtime?.lastError;
					if (lastError) {
						reject(new Error(lastError.message));
						return;
					}
					resolve(result);
				});
			} catch (error) {
				reject(error);
			}
		});

	return {
		get: (keys) =>
			promisify<Record<string, unknown>>((callback) => {
				storageArea.get(
					keys as never,
					(result: Record<string, unknown> | undefined) =>
						callback(result ?? {}),
				);
			}),
		set: (items) =>
			promisify<void>((callback) => {
				storageArea.set(items, () => callback());
			}),
		addListener: (listener) => storageApi.onChanged.addListener(listener),
		removeListener: (listener) => storageApi.onChanged.removeListener(listener),
		areaName,
	};
}

/** 実行環境に応じた適切なストレージバックエンドを選択 */
export function resolveStorageBackend(): StorageBackend {
	// WebExtension browser API (Firefox, Edge, etc.)
	if (typeof browser !== "undefined" && browser.storage?.sync) {
		return createBrowserBackend();
	}

	// Chrome 拡張 API
	if (typeof chrome !== "undefined" && chrome.storage) {
		return createChromeBackend();
	}

	// フォールバック: メモリストレージ（テスト環境など）
	logger.warn(
		"Storage API is not available; falling back to in-memory storage backend",
	);
	return createMemoryBackend();
}

export const storageBackend = resolveStorageBackend();
