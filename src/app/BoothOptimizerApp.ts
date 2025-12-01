import type { AppEvents } from "@/app/events";
import { appEventSchemas, LazyEventBus } from "@/app/events";
import type { Feature, FeatureContext } from "@/app/feature";
import { GridPipeline } from "@/app/grid-pipeline";
import { createScopedLogger } from "@/app/logger";
import type { StorageNamespace } from "@/app/storage";
import { SELECTORS } from "@/config/constants";
import { logger as baseLogger } from "@/shared/core";
import type { Cleanup, ILogger } from "@/types";
import { perfProfiler } from "@/utils/performance";

export interface BoothOptimizerOptions {
	readonly features: readonly Feature[];
	readonly storage: StorageNamespace;
	readonly logger?: ILogger;
}

export class BoothOptimizerApp {
	private readonly events = new LazyEventBus<AppEvents>(appEventSchemas);
	private readonly gridPipeline = new GridPipeline();
	private readonly featureCleanups = new Map<string, Cleanup[]>();
	private readonly logger: ILogger;
	private isBootstrapped = false;

	public constructor(private readonly options: BoothOptimizerOptions) {
		this.logger = options.logger ?? baseLogger;
	}

	public async bootstrap(): Promise<void> {
		if (this.isBootstrapped) {
			this.logger.warn("BoothOptimizerApp already bootstrapped");
			return;
		}

		perfProfiler.mark("app:bootstrap:start");
		await this.ensureDocumentReady();

		const initPromises: Promise<void>[] = [];
		for (const feature of this.options.features) {
			initPromises.push(this.initializeFeature(feature));
		}

		await Promise.all(initPromises);

		await this.hydrateInitialGrid();

		perfProfiler.measure("app:bootstrap:total", "app:bootstrap:start");
		this.isBootstrapped = true;
		this.logger.info("BoothOptimizerApp bootstrapped");
	}

	private async initializeFeature(feature: Feature): Promise<void> {
		const scopedLogger = createScopedLogger(this.logger, feature.id);
		const cleanupBag: Cleanup[] = [];

		const context: FeatureContext = {
			logger: scopedLogger,
			events: this.events,
			storage: this.options.storage,
			gridPipeline: this.gridPipeline,
			registerCleanup: (cleanup) => cleanupBag.push(cleanup),
		};

		try {
			const result = await feature.init(context);
			if (typeof result === "function") {
				cleanupBag.push(result);
			}

			this.featureCleanups.set(feature.id, cleanupBag);
			scopedLogger.info("Feature initialized");
		} catch (error) {
			scopedLogger.error("Feature failed to initialize", error);
			await this.runCleanupBag(cleanupBag, feature.id);
		}
	}

	private async ensureDocumentReady(): Promise<void> {
		if (document.readyState === "complete") return;
		if (document.readyState === "interactive") return;

		await new Promise<void>((resolve) => {
			document.addEventListener("DOMContentLoaded", () => resolve(), {
				once: true,
			});
		});
	}

	// クリーンアップは後入れ先出しで実行し、副作用を確実に巻き戻す
	private async runCleanupBag(
		cleanups: Cleanup[],
		featureId?: string,
	): Promise<void> {
		for (const cleanup of [...cleanups].reverse()) {
			try {
				await cleanup();
			} catch (error) {
				this.logger.error(
					`Cleanup failed${featureId ? ` for feature "${featureId}"` : ""}`,
					error,
				);
			}
		}
	}

	public async destroy(): Promise<void> {
		const allCleanups = [...this.featureCleanups.entries()];
		for (const [featureId, cleanups] of allCleanups) {
			await this.runCleanupBag(cleanups, featureId);
		}

		this.featureCleanups.clear();
		this.events.clear();
		this.isBootstrapped = false;
		this.logger.info("BoothOptimizerApp destroyed");
	}

	// 初期描画済みのカードをパイプラインへ流し、他機能と状態を揃える
	private async hydrateInitialGrid(): Promise<void> {
		const gridItems = document.querySelectorAll<Element>(SELECTORS.ITEM_CARD);
		if (gridItems.length === 0) {
			return;
		}

		const initialCards = Array.from(gridItems);
		const filtered = await this.gridPipeline.runBeforeAppend(
			initialCards,
			"bootstrap",
		);
		if (filtered.length === 0) {
			return;
		}

		await this.gridPipeline.runAfterAppend(filtered, "bootstrap");
		this.events.emit("grid:items-appended", filtered);
	}
}
