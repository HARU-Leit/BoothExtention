/**
 * Boothダークモード機能 (Filter Mode)
 *
 * CSSフィルターを使用したシンプルなアプローチ
 * - filter: invert() hue-rotate() で全体を反転
 * - 画像・動画は再反転して元に戻す
 */
import { BaseFeature, type FeatureContext } from "@/app/feature";
import type { BoothDarkModeSettings, ThemeMode } from "@/app/storage";
import styles from "./booth-dark-theme.scss?inline";

/** スタイル要素のID */
const STYLE_ID = "booth-dark-filter-style";
/** 早期適用スタイルのID (content scriptより先にbackgroundで注入される) */
const EARLY_STYLE_ID = "booth-dark-early";

export class DarkModeFeature extends BaseFeature {
	readonly id = "dark-mode";

	private mediaQuery: MediaQueryList | null = null;
	private isDarkModeActive = false;

	protected async onInit(context: FeatureContext): Promise<void> {
		const binder = this.getStorageBinder();

		await binder.bind(
			context.storage.boothDarkMode,
			(settings) => {
				this.applyTheme(settings);
				this.logger.info("Booth dark mode settings updated", settings);
			},
			{ logKey: "boothDarkMode" },
		);
	}

	/**
	 * テーマを適用
	 */
	private applyTheme(settings: BoothDarkModeSettings): void {
		this.removeSystemThemeListener();

		if (!settings.enabled) {
			this.removeDarkMode();
			return;
		}

		const shouldApplyDark = this.shouldApplyDarkMode(settings.mode);

		if (shouldApplyDark) {
			this.enableDarkMode();
		} else {
			this.removeDarkMode();
		}

		if (settings.mode === "system") {
			this.setupSystemThemeListener();
		}
	}

	/**
	 * ダークモードを適用すべきか判定
	 */
	private shouldApplyDarkMode(mode: ThemeMode): boolean {
		if (mode === "dark") return true;
		if (mode === "light") return false;
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	}

	/**
	 * ダークモードを有効化
	 */
	private enableDarkMode(): void {
		if (this.isDarkModeActive) return;
		this.isDarkModeActive = true;

		// data属性を追加
		document.documentElement.setAttribute("data-booth-theme", "dark");

		// 早期適用スタイルがあればそれを使用（IDを変更）
		const earlyStyle = document.getElementById(EARLY_STYLE_ID);
		if (earlyStyle) {
			earlyStyle.id = STYLE_ID;
		} else {
			// なければ新規注入
			this.injectStyles();
		}

		this.logger.debug("Filter dark mode enabled");
	}

	/**
	 * ダークモードを無効化
	 */
	private removeDarkMode(): void {
		if (!this.isDarkModeActive) return;
		this.isDarkModeActive = false;

		// スタイルを削除（両方のIDをチェック）
		for (const id of [STYLE_ID, EARLY_STYLE_ID]) {
			const style = document.getElementById(id);
			if (style) {
				style.remove();
			}
		}

		// data属性を削除
		document.documentElement.removeAttribute("data-booth-theme");

		this.logger.debug("Filter dark mode disabled");
	}

	/**
	 * スタイルを注入
	 */
	private injectStyles(): void {
		if (document.getElementById(STYLE_ID)) return;

		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = styles;
		(document.head || document.documentElement).appendChild(style);
	}

	/**
	 * システムテーマの変更を監視
	 */
	private setupSystemThemeListener(): void {
		this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		this.mediaQuery.addEventListener("change", this.handleSystemThemeChange);
	}

	/**
	 * システムテーマリスナーを解除
	 */
	private removeSystemThemeListener(): void {
		if (this.mediaQuery) {
			this.mediaQuery.removeEventListener(
				"change",
				this.handleSystemThemeChange,
			);
			this.mediaQuery = null;
		}
	}

	/**
	 * システムテーマ変更ハンドラ
	 */
	private handleSystemThemeChange = (event: MediaQueryListEvent): void => {
		if (event.matches) {
			this.enableDarkMode();
		} else {
			this.removeDarkMode();
		}
		this.logger.debug("System theme changed", { dark: event.matches });
	};
}
