import type { AppEvents, EventPublisher } from "@/app/events";
import type { GridPipeline } from "@/app/grid-pipeline";
import type { StorageNamespace } from "@/app/storage";
import { StorageBinder } from "@/app/storage";
import type { Cleanup, ILogger } from "@/types";

/**
 * Featureが外部依存を受け取るためのコンテキスト
 *
 * 各Featureはこのコンテキストを通じてロガー、イベント、
 * ストレージなどの共通機能にアクセスする
 */
export interface FeatureContext {
	readonly logger: ILogger;
	readonly events: EventPublisher<AppEvents>;
	readonly storage: StorageNamespace;
	readonly gridPipeline: GridPipeline;
	registerCleanup(cleanup: Cleanup): void;
}

/**
 * Feature初期化メソッドの戻り値型
 *
 * 同期/非同期どちらでも同じ破棄手続きを共有できる
 */
export type FeatureInitResult =
	| void
	| Cleanup
	| Promise<void>
	| Promise<Cleanup>;

/** 機能モジュールのインターフェース */
export interface Feature {
	readonly id: string;
	readonly description?: string;
	init(context: FeatureContext): FeatureInitResult;
}

/**
 * 共通依存へのアクセスを提供するFeature基底クラス
 *
 * @example
 * ```ts
 * class MyFeature extends BaseFeature {
 *   readonly id = 'my-feature';
 *
 *   protected onInit(): void {
 *     this.logger.info('Feature initialized');
 *   }
 * }
 * ```
 */
export abstract class BaseFeature implements Feature {
	abstract readonly id: string;
	readonly description?: string;

	private _logger!: ILogger;
	private _events!: EventPublisher<AppEvents>;
	private _storage!: StorageNamespace;
	private _gridPipeline!: GridPipeline;
	private _registerCleanup!: (cleanup: Cleanup) => void;
	private storageBinder: InstanceType<typeof StorageBinder> | null = null;

	init(context: FeatureContext): FeatureInitResult {
		this._logger = context.logger;
		this._events = context.events;
		this._storage = context.storage;
		this._gridPipeline = context.gridPipeline;
		this._registerCleanup = context.registerCleanup.bind(context);
		return this.onInit(context);
	}

	/** サブクラスで実装する初期化処理 */
	protected abstract onInit(context: FeatureContext): FeatureInitResult;

	protected get logger(): ILogger {
		return this._logger;
	}

	protected get events(): EventPublisher<AppEvents> {
		return this._events;
	}

	protected get storage(): StorageNamespace {
		return this._storage;
	}

	protected get gridPipeline(): GridPipeline {
		return this._gridPipeline;
	}

	/** 親アプリにクリーンアップ処理を登録 */
	protected registerCleanup(cleanup: Cleanup): void {
		this._registerCleanup(cleanup);
	}

	/** ストレージ購読を束ねるバインダーを取得 */
	protected getStorageBinder(): InstanceType<typeof StorageBinder> {
		if (!this.storageBinder) {
			this.storageBinder = new StorageBinder(
				(cleanup) => this.registerCleanup(cleanup),
				this._logger,
			);
		}
		return this.storageBinder;
	}
}
