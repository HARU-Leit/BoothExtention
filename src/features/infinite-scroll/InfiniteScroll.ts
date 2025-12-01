import type { z } from "zod/mini";
import type { GridPipeline } from "@/app/grid-pipeline";
import {
	CLASS_NAMES,
	DEFAULTS,
	INLINE_STYLES,
	SELECTORS,
} from "@/config/constants";
import { logger, useObserver } from "@/shared/core";
import {
	gridItemsAppendedSchema,
	infiniteScrollConfigSchema,
} from "@/shared/schema";
import { isValidBoothUrl } from "@/shared/url";
import { waitForElement } from "@/utils/dom";
import { domBatcher } from "@/utils/domBatcher";
import { t } from "@/utils/i18n";
import { perfProfiler } from "@/utils/performance";

/**
 * 検索結果の無限スクロール制御
 *
 * IntersectionObserverを使用してページ下部に到達したら
 * 自動的に次のページを読み込み、既存のグリッドに追加する
 */
export class InfiniteScroll {
	private static readonly MAX_CONSECUTIVE_LOADS = 5;
	private static readonly DOM_WAIT_TIMEOUT = 5000;
	private static readonly NEXT_LINK_TIMEOUT = 2000;
	private static readonly VIEWPORT_BUFFER = 100;

	private isLoadingMore = false;
	private hasMorePages = true;
	private sentinelElement: HTMLElement | null = null;
	private observer: IntersectionObserver | null = null;
	private isActive = false;
	private consecutiveLoads = 0;
	private pendingFetchAbortController: AbortController | null = null;
	private itemGrid: HTMLElement | null = null;
	private readonly config: z.infer<typeof infiniteScrollConfigSchema>;

	/**
	 * @param gridPipeline - アイテムフィルタリング用パイプライン
	 * @param config - 無限スクロール設定
	 */
	public constructor(
		private readonly gridPipeline: GridPipeline,
		config?: Partial<z.infer<typeof infiniteScrollConfigSchema>>,
	) {
		this.config = infiniteScrollConfigSchema.parse({
			rootMargin: config?.rootMargin ?? DEFAULTS.INFINITE_SCROLL.ROOT_MARGIN,
			threshold: config?.threshold ?? DEFAULTS.INFINITE_SCROLL.THRESHOLD,
			enabled: config?.enabled ?? DEFAULTS.INFINITE_SCROLL.ENABLED,
		});
	}

	/**
	 * 無限スクロールを初期化
	 *
	 * DOMの準備完了を待ち、センチネル要素とObserverを設定する
	 *
	 * @param onLoadItems - アイテム読み込み時のコールバック
	 */
	public async init(onLoadItems?: (items: Element[]) => void): Promise<void> {
		if (this.isActive) {
			return;
		}

		// DOMの準備完了を待機
		const itemGrid = await waitForElement(
			SELECTORS.ITEM_GRID,
			InfiniteScroll.DOM_WAIT_TIMEOUT,
		);
		if (!itemGrid) {
			logger.warn("Item grid not found, infinite scroll not initialized");
			return;
		}

		this.itemGrid = itemGrid as HTMLElement;
		this.isActive = true;
		this.createSentinel();

		// 次ページリンクをチェック
		const nextLink = await waitForElement(
			SELECTORS.NEXT_LINK,
			InfiniteScroll.NEXT_LINK_TIMEOUT,
		);
		if (!nextLink) {
			logger.debug("No next page link found, single page or last page");
			this.hasMorePages = false;
			return;
		}

		this.observer = useObserver({
			setup: () =>
				new IntersectionObserver(
					(entries) => {
						for (const entry of entries) {
							if (
								entry.isIntersecting &&
								!this.isLoadingMore &&
								this.hasMorePages
							) {
								// ユーザースクロールでトリガーされたときに連続カウンターをリセット
								this.consecutiveLoads = 0;
								this.loadNextPage(onLoadItems);
							}
						}
					},
					{
						rootMargin: this.config.rootMargin,
						threshold: this.config.threshold,
					},
				),
		});

		if (this.sentinelElement) {
			this.observer.observe(this.sentinelElement);
		}

		logger.info("Infinite scroll initialized");
	}

	/** 無限スクロールを無効化しリソースを解放 */
	public disable(): void {
		this.abortOngoingFetch();
		this.observer?.disconnect();
		this.observer = null;

		this.sentinelElement?.remove();
		this.sentinelElement = null;
		this.itemGrid = null;

		this.isActive = false;
		this.showPagination();
		this.hideLoadingIndicator();
		logger.info("Infinite scroll disabled");
	}

	/** センチネル要素を作成してグリッドの後に挿入 */
	private createSentinel(): void {
		const itemsContainer = this.itemGrid;
		if (!itemsContainer?.parentElement) {
			return;
		}

		this.sentinelElement = document.createElement("div");
		this.sentinelElement.className = CLASS_NAMES.INFINITE_SCROLL_SENTINEL;
		this.sentinelElement.style.cssText = INLINE_STYLES.SENTINEL;

		itemsContainer.parentElement.appendChild(this.sentinelElement);
		this.hidePagination();
	}

	private hidePagination(): void {
		const pagers = document.querySelectorAll(SELECTORS.PAGER);
		for (const pager of pagers) {
			(pager as HTMLElement).style.display = "none";
		}
	}

	private showPagination(): void {
		const pagers = document.querySelectorAll(SELECTORS.PAGER);
		for (const pager of pagers) {
			(pager as HTMLElement).style.display = "";
		}
	}

	private async loadNextPage(
		onLoadItems?: (items: Element[]) => void,
	): Promise<void> {
		// ガード: 既に読み込み中またはページがない場合はスキップ
		if (this.isLoadingMore || !this.hasMorePages || !this.isActive) {
			return;
		}

		const nextUrl = this.getNextPageUrl();
		if (!nextUrl) {
			return;
		}

		this.isLoadingMore = true;
		this.showLoadingIndicator();
		this.pendingFetchAbortController?.abort();
		const abortController = new AbortController();
		this.pendingFetchAbortController = abortController;

		try {
			const newItems = await this.fetchAndParseNextPage(
				nextUrl,
				abortController.signal,
			);
			if (newItems && this.isActive) {
				const filteredItems = await this.gridPipeline.runBeforeAppend(
					newItems,
					"append",
				);
				if (filteredItems.length > 0) {
					this.appendItemsToPage(filteredItems);
					await this.gridPipeline.runAfterAppend(filteredItems, "append");
					onLoadItems?.(filteredItems);
				} else {
					logger.debug("Fetched page contained only filtered items");
				}
			}
		} catch (error) {
			if (this.isAbortError(error)) {
				logger.debug("Infinite scroll fetch aborted");
			} else {
				this.hasMorePages = false;
				logger.error("Failed to load next page", error);
			}
		} finally {
			if (this.pendingFetchAbortController === abortController) {
				this.pendingFetchAbortController = null;
			}
			this.isLoadingMore = false;
			this.hideLoadingIndicator();
		}

		if (!this.isActive) {
			return;
		}

		// ブロックにより表示アイテムが少ない場合は追加読み込み
		await this.checkAndLoadMore(onLoadItems);
	}

	private getNextPageUrl(): string | null {
		const nextLink = this.findNextPageLink();
		if (!nextLink) {
			this.hasMorePages = false;
			logger.debug("No more pages");
			return null;
		}

		const url = nextLink.getAttribute("href");
		if (!url || !isValidBoothUrl(url)) {
			this.hasMorePages = false;
			return null;
		}

		return url;
	}

	private async fetchAndParseNextPage(
		url: string,
		signal?: AbortSignal,
	): Promise<Element[] | null> {
		try {
			const response = await fetch(url, { signal });

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const html = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");

			const newItemsContainer = doc.querySelector(SELECTORS.ITEM_GRID);
			if (!newItemsContainer) {
				this.hasMorePages = false;
				return null;
			}

			const newItems = this.validateGridItems(
				Array.from(newItemsContainer.children),
			);
			if (newItems.length === 0) {
				this.hasMorePages = false;
				return null;
			}

			// 次ページリンクを更新
			this.updateNextLink(doc);
			return newItems;
		} catch (error) {
			logger.error("Failed to fetch next page", error, { url });
			this.hasMorePages = false;
			throw error;
		}
	}

	private appendItemsToPage(items: readonly Element[]): void {
		if (items.length === 0) {
			return;
		}
		perfProfiler.mark("infiniteScroll:append:start");

		const itemsContainer = this.itemGrid;
		if (!itemsContainer) {
			this.hasMorePages = false;
			return;
		}

		// バッチDOM挿入のためにDocumentFragmentを使用（単一リフロー）
		const fragment = document.createDocumentFragment();

		for (const item of items) {
			fragment.appendChild(item);
		}

		// 単一のDOM追加操作
		itemsContainer.appendChild(fragment);

		perfProfiler.measure(
			"infiniteScroll:append:total",
			"infiniteScroll:append:start",
		);
	}

	private async checkAndLoadMore(
		onLoadItems?: (items: Element[]) => void,
	): Promise<void> {
		if (!this.hasMorePages || !this.sentinelElement || !this.isActive) {
			return;
		}

		// 無限ループを防止: 連続読み込みを制限
		this.consecutiveLoads++;
		if (this.consecutiveLoads > InfiniteScroll.MAX_CONSECUTIVE_LOADS) {
			logger.warn("Max consecutive loads reached, stopping auto-load");
			return;
		}

		// ブロック処理の完了を待機
		await this.waitForBlockingComplete();

		// 条件1: ページの高さが不十分
		if (this.shouldLoadForScrollbar()) {
			logger.debug("Page too short, loading more to enable scrolling", {
				consecutiveLoads: this.consecutiveLoads,
			});
			await this.loadNextPage(onLoadItems);
			return;
		}

		// 条件2: センチネル要素がまだビューポート内
		if (this.isSentinelInViewport()) {
			const itemsContainer = this.itemGrid;
			const visibleItems = itemsContainer?.children.length ?? 0;

			logger.debug("Sentinel still visible after blocking, loading more", {
				visibleItems,
				consecutiveLoads: this.consecutiveLoads,
			});
			await this.loadNextPage(onLoadItems);
		}
	}

	private async waitForBlockingComplete(): Promise<void> {
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				domBatcher.flush();
				resolve();
			});
		});
	}

	private shouldLoadForScrollbar(): boolean {
		const hasVerticalScrollbar =
			document.documentElement.scrollHeight > window.innerHeight;
		return !hasVerticalScrollbar && this.hasMorePages;
	}

	private isSentinelInViewport(): boolean {
		if (!this.sentinelElement) {
			return false;
		}

		const sentinelRect = this.sentinelElement.getBoundingClientRect();
		return (
			sentinelRect.top < window.innerHeight + InfiniteScroll.VIEWPORT_BUFFER
		);
	}

	private updateNextLink(doc: Document): void {
		const currentNextLink = document.querySelector(SELECTORS.NEXT_LINK);
		currentNextLink?.remove();

		const nextLinkFromDoc = doc.querySelector(SELECTORS.NEXT_LINK);
		if (nextLinkFromDoc) {
			const newNextLink = nextLinkFromDoc.cloneNode(true) as HTMLElement;
			newNextLink.style.display = "none";
			document.body.appendChild(newNextLink);
			this.hasMorePages = true;
		} else {
			this.hasMorePages = false;
		}
	}

	private findNextPageLink(): HTMLAnchorElement | null {
		const nextLink = document.querySelector(
			SELECTORS.NEXT_LINK,
		) as HTMLAnchorElement;
		return nextLink?.href ? nextLink : null;
	}

	private showLoadingIndicator(): void {
		if (document.querySelector(`.${CLASS_NAMES.INFINITE_SCROLL_LOADER}`))
			return;

		const indicator = document.createElement("div");
		indicator.className = CLASS_NAMES.INFINITE_SCROLL_LOADER;
		indicator.style.cssText = INLINE_STYLES.LOADER;
		indicator.textContent = t("status.loading");

		this.itemGrid?.parentElement?.appendChild(indicator);
	}

	private hideLoadingIndicator(): void {
		document.querySelector(`.${CLASS_NAMES.INFINITE_SCROLL_LOADER}`)?.remove();
	}

	private abortOngoingFetch(): void {
		if (!this.pendingFetchAbortController) return;
		this.pendingFetchAbortController.abort();
		this.pendingFetchAbortController = null;
	}

	private isAbortError(error: unknown): boolean {
		if (
			typeof DOMException !== "undefined" &&
			error instanceof DOMException &&
			error.name === "AbortError"
		) {
			return true;
		}
		return (
			typeof error === "object" &&
			error !== null &&
			"name" in error &&
			(error as { name?: string }).name === "AbortError"
		);
	}

	/**
	 * グリッドアイテムを検証（開発環境のみ）
	 *
	 * 本番環境ではパフォーマンスのためスキップされる
	 */
	private validateGridItems(items: Element[]): Element[] {
		if (import.meta.env.DEV) {
			return gridItemsAppendedSchema.parse(items);
		}
		return items;
	}
}
