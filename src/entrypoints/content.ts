/**
 * コンテンツスクリプト
 *
 * Booth.pmページ上で動作し、以下の機能を提供:
 * - ショップブロック機能
 * - 無限スクロール
 * - 画像最適化
 * - スティッキーサイドバー
 * - セクション非表示
 * - 検索プロファイル適用
 */
import { BoothOptimizerApp } from "@/app/BoothOptimizerApp";
import { resolveFeatures } from "@/app/feature-registry";
import { storage } from "@/app/storage";
import darkModeStyles from "@/features/dark-mode/booth-dark-theme.scss?inline";
import { logger } from "@/shared/core";

/** ダークモードを即座に適用（ちらつき防止） */
async function applyEarlyDarkMode(): Promise<void> {
	try {
		const settings = await storage.boothDarkMode.getValue();
		if (!settings?.enabled) return;

		let shouldApply = false;
		if (settings.mode === "dark") {
			shouldApply = true;
		} else if (settings.mode === "system") {
			shouldApply = window.matchMedia("(prefers-color-scheme: dark)").matches;
		}

		if (shouldApply) {
			document.documentElement.setAttribute("data-booth-theme", "dark");
			const style = document.createElement("style");
			style.id = "booth-dark-early";
			style.textContent = darkModeStyles;
			(document.head || document.documentElement).appendChild(style);
		}
	} catch {}
}

export default defineContentScript({
	matches: ["*://*.booth.pm/*"],
	runAt: "document_start",

	/**
	 * コンテンツスクリプトのメインエントリーポイント
	 *
	 * @param ctx - WXTコンテキスト（スクリプト無効化時のコールバック登録用）
	 */
	async main(ctx): Promise<void> {
		// ダークモードを最速で適用
		void applyEarlyDarkMode();

		logger.info("Booth Optimizer Content Script started");

		// 有効な機能を解決してアプリケーションを初期化
		const features = await resolveFeatures(storage);
		const app = new BoothOptimizerApp({
			features,
			storage,
			logger,
		});

		await app.bootstrap();

		// 価格トラッカーの自動チェック（12時間以上経過していたら発火）
		void checkPriceTrackerIfNeeded();

		// 拡張機能の更新/無効化時にクリーンアップ
		ctx?.onInvalidated(() => {
			logger.info("Content script invalidated, destroying application");
			void app.destroy();
		});
	},
});

/** 価格トラッカーの自動チェック */
async function checkPriceTrackerIfNeeded(): Promise<void> {
	try {
		await browser.runtime.sendMessage({ type: "CHECK_PRICE_TRACKER_NEEDED" });
	} catch {}
}
