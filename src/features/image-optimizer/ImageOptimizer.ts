import { DEFAULTS, SELECTORS } from "@/config/constants";
import { imageOptimizerConfigSchema } from "@/shared/schema";
import { isBoothItemPath } from "@/shared/url";
import type { ImageOptimizerConfig } from "@/types";
import { ImageLazyLoader } from "./ImageLazyLoader";

/** 画像最適化対象のセレクター */
const IMAGE_TARGET_SELECTOR = `${SELECTORS.ITEM_THUMBNAIL}, img[data-original]`;

/**
 * 画像最適化機能
 *
 * 画像の遅延読み込みやネイティブlazy load属性の設定を行う
 */
export class ImageOptimizer {
	private lazyLoader: ImageLazyLoader | null = null;
	private readonly config: ImageOptimizerConfig;

	/**
	 * @param config - 画像最適化設定
	 */
	public constructor(config?: Partial<ImageOptimizerConfig>) {
		this.config = imageOptimizerConfigSchema.parse({
			rootMargin: config?.rootMargin ?? DEFAULTS.IMAGE_OPTIMIZER.ROOT_MARGIN,
			threshold: config?.threshold ?? DEFAULTS.IMAGE_OPTIMIZER.THRESHOLD,
			prefetchLimit:
				config?.prefetchLimit ?? DEFAULTS.IMAGE_OPTIMIZER.PREFETCH_LIMIT,
			enableLQIP: config?.enableLQIP ?? DEFAULTS.IMAGE_OPTIMIZER.ENABLE_LQIP,
		});
	}

	/**
	 * 現在のページが商品詳細ページかどうかを判定
	 * @returns 商品詳細ページの場合はtrue
	 */
	public isItemDetailPage(): boolean {
		return isBoothItemPath();
	}

	/** ページ内の全画像にネイティブlazy load属性を設定 */
	public enableNativeLazyLoad(): void {
		const images = document.querySelectorAll<HTMLImageElement>("img");
		for (const img of images) {
			if (!img.loading) {
				img.loading = "lazy";
			}
			img.decoding = "async";
		}
	}

	/** IntersectionObserverベースの遅延ローダーを有効化 */
	public enableLazyLoader(): void {
		if (this.lazyLoader) return;
		this.lazyLoader = new ImageLazyLoader({
			rootMargin: this.config.rootMargin,
			threshold: this.config.threshold,
		});
		this.lazyLoader.init();
	}

	/**
	 * 要素内の画像を最適化
	 *
	 * @param elements - 最適化対象の要素配列
	 */
	public optimizeElements(elements: readonly Element[]): void {
		if (elements.length === 0) return;
		for (const element of elements) {
			this.processElementTree(element);
		}
	}

	private processElementTree(root: Element): void {
		if (!(root instanceof HTMLElement)) {
			return;
		}

		if (root.matches(IMAGE_TARGET_SELECTOR)) {
			this.processImageElement(root);
		}

		const nestedTargets = root.querySelectorAll<HTMLElement>(
			IMAGE_TARGET_SELECTOR,
		);
		for (const target of nestedTargets) {
			this.processImageElement(target);
		}
	}

	private processImageElement(element: HTMLElement): void {
		const dataOriginal = element.dataset.original;
		if (dataOriginal) {
			this.lazyLoader?.observe(element);
		}

		if (element instanceof HTMLImageElement) {
			if (!element.loading) {
				element.loading = "lazy";
			}
			element.decoding = "async";
		}
	}

	/** リソースを解放 */
	public destroy(): void {
		this.lazyLoader?.cleanup();
		this.lazyLoader = null;
	}
}
