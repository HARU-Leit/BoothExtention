import { logger, useObserver } from "@/shared/core";
import type { ObserverConfig } from "@/types";

/**
 * 画像遅延ローダー
 *
 * IntersectionObserverを使用して、ビューポートに入った画像を
 * data-original属性から実際のsrcに読み込む
 */
export class ImageLazyLoader {
	private observer: IntersectionObserver | null = null;

	/**
	 * @param config - Observer設定（rootMargin, threshold）
	 */
	public constructor(private readonly config: ObserverConfig) {}

	/** IntersectionObserverを初期化 */
	public init(): void {
		if (this.observer) return;
		this.observer = useObserver({
			setup: () =>
				new IntersectionObserver(
					(entries) => {
						for (const entry of entries) {
							if (entry.isIntersecting) {
								this.loadImage(entry.target as HTMLElement);
							}
						}
					},
					{
						rootMargin: this.config.rootMargin,
						threshold: this.config.threshold as number | number[] | undefined,
					},
				),
		});

		logger.debug("ImageLazyLoader initialized");
	}

	/**
	 * 要素を監視対象に追加
	 * @param element - 監視する要素
	 */
	public observe(element: HTMLElement): void {
		this.observer?.observe(element);
	}

	/**
	 * 要素を監視対象から除外
	 * @param element - 除外する要素
	 */
	public unobserve(element: HTMLElement): void {
		this.observer?.unobserve(element);
	}

	/**
	 * 画像を読み込む
	 * @param element - data-original属性を持つ要素
	 */
	private loadImage(element: HTMLElement): void {
		const dataOriginal = element.dataset.original;
		if (!dataOriginal) return;

		try {
			if (element instanceof HTMLImageElement) {
				element.src = dataOriginal;
			} else {
				// CSS injection対策: URLをダブルクォートで囲み、内部の特殊文字をエスケープ
				const safeUrl = dataOriginal.replace(/["\\]/g, "\\$&");
				element.style.backgroundImage = `url("${safeUrl}")`;
			}

			this.observer?.unobserve(element);
		} catch (error) {
			logger.error("Failed to load image", error);
		}
	}

	/** Observerを破棄しリソースを解放 */
	public cleanup(): void {
		this.observer?.disconnect();
		this.observer = null;
	}
}
