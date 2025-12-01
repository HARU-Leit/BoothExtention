import { DEFAULTS, SELECTORS } from "@/config/constants";
import { logger } from "@/shared/core";

/** サイドバーの配置モード */
type StickyMode = "static" | "fixed" | "absolute";

/**
 * スティッキーサイドバー
 *
 * スクロール位置に応じてサイドバーの配置モードを切り替え、
 * コンテンツと共にスクロールしつつビューポート内に留まるようにする
 */
export class StickySidebar {
	private static readonly DEFAULT_WIDTH = 176;
	private static readonly DEFAULT_HEADER_HEIGHT = 52;
	private static readonly SCROLL_THROTTLE_MS = 16;
	private static readonly RESIZE_THROTTLE_MS = 150;
	private static readonly POSITION_EPSILON = 0.5;

	// --- サイズ・位置情報 ---
	private dimensions = {
		width: StickySidebar.DEFAULT_WIDTH,
		height: 0,
		top: 0,
	};

	// --- DOM要素参照 ---
	private sidebar: HTMLElement | null = null;
	private directParent: HTMLElement | null = null;
	private container: HTMLElement | null = null;
	private footer: HTMLElement | null = null;
	private header: HTMLElement | null = null;
	private cachedHeaderHeight = StickySidebar.DEFAULT_HEADER_HEIGHT;

	// --- イベントハンドラ・タイマー ---
	private scrollHandler: (() => void) | null = null;
	private resizeHandler: (() => void) | null = null;
	private rafId: number | null = null;
	private resizeTimeout: number | null = null;
	private isScrolling = false;
	private lastScrollTime = 0;

	// --- 配置モード状態 ---
	private mode: StickyMode = "static";
	private lastFixedTop = -1;
	private lastFixedLeft = -1;
	private lastAbsoluteTop = -1;
	private parentOriginalPosition: string | null = null;
	private parentOriginalMinHeight: string | null = null;

	/**
	 * スティッキーサイドバーを初期化
	 *
	 * サイドバー要素を検出し、スクロール/リサイズイベントを登録する
	 */
	public init(): void {
		if (this.scrollHandler) {
			logger.warn("StickySidebar already initialized");
			return;
		}

		const sidebar = document.querySelector<HTMLElement>(SELECTORS.SIDEBAR);
		if (!sidebar) {
			return;
		}

		const directParent = sidebar.parentElement;
		const container = directParent?.parentElement;
		if (!directParent || !container) {
			return;
		}

		this.sidebar = sidebar;
		this.directParent = directParent;
		this.container = container;
		this.footer = document.querySelector<HTMLElement>(SELECTORS.FOOTER);
		this.header = document.querySelector<HTMLElement>(SELECTORS.HEADER);
		this.cachedHeaderHeight =
			this.header?.clientHeight ?? StickySidebar.DEFAULT_HEADER_HEIGHT;
		this.parentOriginalPosition = directParent.style.position || null;
		this.parentOriginalMinHeight = directParent.style.minHeight || null;

		this.updateDimensions(sidebar);
		this.ensureParentConstraints();
		this.scheduleUpdate();

		this.scrollHandler = (): void => {
			const now = Date.now();
			const timeSinceLastScroll = now - this.lastScrollTime;

			if (!this.isScrolling) {
				this.isScrolling = true;
				this.lastScrollTime = now;
				this.scheduleUpdate();
			} else if (timeSinceLastScroll >= StickySidebar.SCROLL_THROTTLE_MS) {
				this.lastScrollTime = now;
				this.scheduleUpdate();
			}
		};

		window.addEventListener("scroll", this.scrollHandler, { passive: true });

		this.resizeHandler = (): void => {
			if (this.resizeTimeout !== null) {
				clearTimeout(this.resizeTimeout);
			}
			this.resizeTimeout = window.setTimeout(() => {
				if (this.sidebar) {
					this.updateDimensions(this.sidebar);
					this.ensureParentConstraints();
					// ヘッダー高もリサイズ時に更新
					this.cachedHeaderHeight =
						this.header?.clientHeight ?? StickySidebar.DEFAULT_HEADER_HEIGHT;
					this.scheduleUpdate();
				}
			}, StickySidebar.RESIZE_THROTTLE_MS);
		};

		window.addEventListener("resize", this.resizeHandler, { passive: true });

		logger.info("Sticky sidebar initialized");
	}

	private updateDimensions(sidebar: HTMLElement): void {
		if (sidebar.offsetWidth === 0) return;

		this.dimensions = {
			width: sidebar.offsetWidth,
			height: sidebar.offsetHeight,
			top: sidebar.offsetTop,
		};
	}

	private ensureParentConstraints(): void {
		if (!this.directParent) return;
		if (!this.directParent.style.position) {
			this.directParent.style.position = "relative";
		}
		this.directParent.style.minHeight = `${this.dimensions.height}px`;
	}

	private refreshMeasurements(): void {
		if (!this.sidebar || this.mode !== "static") {
			return;
		}
		const currentWidth = this.sidebar.offsetWidth;
		const currentHeight = this.sidebar.offsetHeight;
		const currentTop = this.sidebar.offsetTop;
		if (
			currentWidth !== this.dimensions.width ||
			currentHeight !== this.dimensions.height ||
			currentTop !== this.dimensions.top
		) {
			this.updateDimensions(this.sidebar);
			this.ensureParentConstraints();
		}
	}

	private scheduleUpdate(): void {
		if (this.rafId !== null) {
			return;
		}

		this.rafId = requestAnimationFrame(() => {
			this.rafId = null;
			this.isScrolling = false;
			this.handleScroll();
		});
	}

	/**
	 * スクロール位置に応じてサイドバーの配置モードを決定する
	 *
	 * 配置モードは以下の3種類:
	 * 1. static: 通常のフロー配置（スクロール位置がサイドバーより上）
	 * 2. fixed: ビューポートに固定（スクロール中、コンテナ内に収まる範囲）
	 * 3. absolute: 親要素に対して絶対配置（コンテナ下端またはフッターに到達）
	 *
	 * 位置計算の概要:
	 * - stickyTop: ヘッダー高 + オフセット（固定時のビューポート上端からの距離）
	 * - boundary: コンテナ下端とフッター上端の小さい方（サイドバーの停止位置）
	 * - overshoot: サイドバー下端が boundary を超える量（正なら超過）
	 */
	private handleScroll(): void {
		if (
			!this.sidebar ||
			!this.directParent ||
			!this.container ||
			this.sidebar.offsetWidth === 0
		) {
			return;
		}

		this.refreshMeasurements();

		// キャッシュ済みヘッダー高を使用
		const stickyTop =
			this.cachedHeaderHeight + DEFAULTS.STICKY_SIDEBAR.TOP_OFFSET;
		const scrollY = window.scrollY;

		// レイアウト読み取りを一括で行う（レイアウトスラッシング防止）
		const containerRect = this.container.getBoundingClientRect();
		const directParentRect = this.directParent.getBoundingClientRect();
		const footerTop = this.footer?.getBoundingClientRect().top;

		// コンテナの絶対位置を計算
		const containerTop = containerRect.top + scrollY;
		const containerBottom = containerRect.bottom + scrollY;

		// フッターがあればその上端で停止、無ければ無限大（制限なし）
		const footerStopLine =
			footerTop !== undefined ? footerTop + scrollY : Number.POSITIVE_INFINITY;

		// サイドバーの元の絶対位置
		const sidebarOriginalTop = containerTop + this.dimensions.top;

		// ケース1: まだサイドバーの位置までスクロールしていない → 通常配置
		if (scrollY + stickyTop <= sidebarOriginalTop) {
			this.applyStatic();
			return;
		}

		// サイドバーが停止すべき下限位置
		const boundary = Math.min(containerBottom, footerStopLine);

		// サイドバー下端が境界を超える量を計算
		const overshoot = scrollY + stickyTop + this.dimensions.height - boundary;

		// ケース2: 境界内に収まっている → ビューポートに固定
		if (overshoot <= 0) {
			this.applyFixed(stickyTop, directParentRect.left);
			return;
		}

		// ケース3: コンテナ下端に到達 → 親要素に対して絶対配置
		if (boundary === containerBottom) {
			const absoluteTop = Math.max(
				0,
				this.directParent.offsetHeight - this.dimensions.height,
			);
			this.applyAbsolute(absoluteTop);
			return;
		}

		// ケース4: フッターに到達 → 上にずらして固定
		const boundedTop = Math.max(-this.dimensions.height, stickyTop - overshoot);
		this.applyFixed(boundedTop, directParentRect.left);
	}

	private applyStatic(): void {
		if (!this.sidebar || this.mode === "static") {
			return;
		}

		this.mode = "static";
		this.lastFixedTop = -1;
		this.lastFixedLeft = -1;
		this.lastAbsoluteTop = -1;

		this.sidebar.style.position = "";
		this.sidebar.style.top = "";
		this.sidebar.style.left = "";
		this.sidebar.style.width = "";
		this.sidebar.style.bottom = "";
		this.sidebar.style.zIndex = "";
		this.sidebar.style.transform = "";
		this.sidebar.style.willChange = "";
	}

	private applyFixed(top: number, left: number): void {
		if (!this.sidebar) return;
		if (
			this.mode === "fixed" &&
			Math.abs(this.lastFixedTop - top) < StickySidebar.POSITION_EPSILON &&
			Math.abs(this.lastFixedLeft - left) < StickySidebar.POSITION_EPSILON
		) {
			return;
		}

		this.mode = "fixed";
		this.lastFixedTop = top;
		this.lastFixedLeft = left;
		this.lastAbsoluteTop = -1;

		this.sidebar.style.position = "fixed";
		this.sidebar.style.top = `${top}px`;
		this.sidebar.style.left = `${left}px`;
		this.sidebar.style.width = `${this.dimensions.width}px`;
		this.sidebar.style.bottom = "";
		this.sidebar.style.transform = "";
		this.sidebar.style.willChange = "";
	}

	private applyAbsolute(relativeTop: number): void {
		if (!this.sidebar || !this.directParent) return;
		if (
			this.mode === "absolute" &&
			Math.abs(this.lastAbsoluteTop - relativeTop) <
				StickySidebar.POSITION_EPSILON
		) {
			return;
		}

		this.mode = "absolute";
		this.lastAbsoluteTop = relativeTop;
		this.lastFixedTop = -1;
		this.lastFixedLeft = -1;

		if (!this.directParent.style.position) {
			this.directParent.style.position = "relative";
		}

		this.sidebar.style.position = "absolute";
		this.sidebar.style.top = `${relativeTop}px`;
		this.sidebar.style.left = "0";
		this.sidebar.style.width = `${this.dimensions.width}px`;
		this.sidebar.style.zIndex = "auto";
		this.sidebar.style.bottom = "";
		this.sidebar.style.transform = "";
		this.sidebar.style.willChange = "";
	}

	/** スティッキーサイドバーを破棄しリソースを解放 */
	public destroy(): void {
		if (this.scrollHandler) {
			window.removeEventListener("scroll", this.scrollHandler);
			this.scrollHandler = null;
		}

		if (this.resizeHandler) {
			window.removeEventListener("resize", this.resizeHandler);
			this.resizeHandler = null;
		}

		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		if (this.resizeTimeout !== null) {
			clearTimeout(this.resizeTimeout);
			this.resizeTimeout = null;
		}

		this.applyStatic();

		if (this.directParent) {
			this.directParent.style.position = this.parentOriginalPosition ?? "";
			this.directParent.style.minHeight = this.parentOriginalMinHeight ?? "";
		}

		this.sidebar = null;
		this.directParent = null;
		this.container = null;
		this.footer = null;
		this.header = null;
		this.mode = "static";

		logger.info("Sticky sidebar destroyed");
	}
}
