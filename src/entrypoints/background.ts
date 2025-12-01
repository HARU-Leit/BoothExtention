/**
 * バックグラウンドスクリプト
 *
 * 以下の機能を提供:
 * - ホームページから検索ページへの自動リダイレクト
 * - declarativeNetRequestによるトラッキングブロック
 * - ストレージ変更の監視とルール更新
 * - 価格トラッカーの定期チェック
 */
import {
	autoRedirectToSearch,
	multiSearchProfiles,
	priceTracker,
} from "@/app/storage";
import { RULE_ID_RANGES } from "@/config/constants";
import {
	detectPriceChanges,
	filterUnnotifiedChanges,
	markAsNotified,
	showPriceDropNotifications,
	updateBadge,
	updateTrackedItems,
} from "@/features/price-tracker";
import { TrackingBlocker } from "@/features/tracking-blocker/TrackingBlocker";
import {
	buildAbsoluteSearchUrl,
	createDefaultMultiProfileSettings,
	DEFAULT_SEARCH_PROFILE_LOCALE,
	getActiveProfile,
	type MultiSearchProfileSettings,
} from "@/shared/search";
import {
	BOOTH_PATH_LOCALES,
	type BoothPathLocale,
} from "@/shared/url/boothUrl";
import type { WishlistItem } from "@/shared/wishlist";

// ========================
// 定数定義
// ========================
const BOOTH_DOMAIN = "booth.pm";
const BOOTH_BASE_URL = `https://${BOOTH_DOMAIN}`;
const BASE_REDIRECT_RULE_ID = RULE_ID_RANGES.REDIRECT.START;

/** 自動価格チェックの閾値（ミリ秒） - 12時間 */
const PRICE_CHECK_THRESHOLD_MS = 12 * 60 * 60 * 1000;
const ROUTE_SOURCES = [
	{ kind: "root" } as const,
	...BOOTH_PATH_LOCALES.map(
		(locale): RedirectSource => ({ kind: "locale", locale }),
	),
] as const satisfies readonly RedirectSource[];
const REDIRECT_RULE_IDS = ROUTE_SOURCES.map(
	(_, index) => BASE_REDIRECT_RULE_ID + index,
);

// ========================
// 状態管理
// ========================
let cachedProfiles: MultiSearchProfileSettings =
	createDefaultMultiProfileSettings();
let redirectEnabled = false;

// ========================
// 型定義
// ========================

/** リダイレクト元の種類 */
type RedirectSource =
	| { kind: "root" }
	| { kind: "locale"; locale: BoothPathLocale };

/** リダイレクトルールの記述子 */
interface RedirectRuleDescriptor {
	readonly id: number;
	readonly pattern: string;
	readonly targetUrl: string;
}

// ========================
// メインエントリーポイント
// ========================
export default defineBackground({
	main(): void {
		console.log("Booth Optimizer Background: 準備完了");

		initRedirectRules();
		initTrackingBlocker();
		initPriceTracker();

		autoRedirectToSearch.watch((enabled) => {
			redirectEnabled = enabled;
			void updateRedirectRules(redirectEnabled, cachedProfiles);
		});

		multiSearchProfiles.watch((profiles) => {
			cachedProfiles = profiles;
			if (redirectEnabled) {
				void updateRedirectRules(true, cachedProfiles);
			}
		});

		// コンテンツスクリプト/ポップアップからのメッセージリスナー
		browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
			const msg = message as { type?: string; items?: WishlistItem[] };
			if (msg.type === "WISHLIST_ITEMS_EXTRACTED") {
				void handleWishlistItems(msg.items ?? []);
				// バックグラウンドで開いたタブなら閉じる
				if (sender.tab?.id && backgroundWishlistTabId === sender.tab.id) {
					void closeBackgroundTab(sender.tab.id);
				}
				sendResponse({ success: true });
			} else if (msg.type === "CHECK_PRICE_TRACKER_NEEDED") {
				// booth.pmを開いた時に12時間以上経過していたら自動チェック
				void checkAndTriggerPriceTracker().then((triggered) => {
					sendResponse({ triggered });
				});
				return true; // 非同期レスポンスのため
			} else if (msg.type === "TRIGGER_PRICE_CHECK") {
				// ポップアップの「今すぐ確認」ボタンから手動トリガー
				void triggerWishlistExtraction();
				sendResponse({ success: true });
			}
			return true;
		});
	},
});

// ========================
// リダイレクトルール管理
// ========================

/** 初期リダイレクトルールを設定 */
async function initRedirectRules(): Promise<void> {
	const [enabled, profiles] = await Promise.all([
		autoRedirectToSearch.getValue(),
		multiSearchProfiles.getValue(),
	]);
	redirectEnabled = enabled;
	cachedProfiles = profiles;
	await updateRedirectRules(redirectEnabled, cachedProfiles);
}

/**
 * リダイレクトルールを更新
 *
 * BOOTHホームを各ロケールの検索ページへリダイレクトする
 * 動的ルールを有効/無効にする
 */
async function updateRedirectRules(
	enabled: boolean,
	profiles: MultiSearchProfileSettings,
): Promise<void> {
	if (enabled) {
		const descriptors = buildRedirectRuleDescriptors(profiles);
		const rules = descriptors.map(({ id, pattern, targetUrl }) =>
			createRedirectRule(id, pattern, targetUrl),
		);
		await browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: REDIRECT_RULE_IDS,
			addRules: rules,
		});
		console.log("✅ Home redirect rules enabled for all languages");
	} else {
		await browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: REDIRECT_RULE_IDS,
		});
		console.log("❌ Home redirect rules disabled");
	}
}

/** declarativeNetRequest用のリダイレクトルールを生成 */
function createRedirectRule(
	id: number,
	regexFilter: string,
	targetUrl: string,
): browser.declarativeNetRequest.Rule {
	return {
		id,
		priority: 1,
		action: {
			type: "redirect",
			redirect: { url: targetUrl },
		},
		condition: {
			regexFilter,
			resourceTypes: ["main_frame"],
		},
	};
}

// ========================
// トラッキングブロッカー
// ========================

/** トラッキングブロッカーを初期化 */
async function initTrackingBlocker(): Promise<void> {
	const blocker = new TrackingBlocker({ enabled: true });
	await blocker.init();
}

// ========================
// ヘルパー関数
// ========================

/** 全ロケール用のリダイレクトルール記述子を構築 */
function buildRedirectRuleDescriptors(
	profiles: MultiSearchProfileSettings,
): RedirectRuleDescriptor[] {
	return ROUTE_SOURCES.map((source, index) => {
		const locale =
			source.kind === "root" ? resolveDefaultLocale() : source.locale;
		return {
			id: BASE_REDIRECT_RULE_ID + index,
			pattern: buildSourcePattern(source),
			targetUrl: getLocaleTargetUrl(locale, profiles),
		};
	});
}

/** ロケールに応じたリダイレクト先URLを取得 */
function getLocaleTargetUrl(
	locale: BoothPathLocale,
	settings: MultiSearchProfileSettings,
): string {
	if (!settings.enabled) {
		return `${BOOTH_BASE_URL}/${locale}/items`;
	}
	const profile = getActiveProfile(settings);
	if (!profile) {
		return `${BOOTH_BASE_URL}/${locale}/items`;
	}
	return buildAbsoluteSearchUrl(locale, profile, {
		origin: BOOTH_BASE_URL,
		page: 1,
	});
}

/** デフォルトロケールを解決 */
function resolveDefaultLocale(): BoothPathLocale {
	return DEFAULT_SEARCH_PROFILE_LOCALE;
}

/** リダイレクト元URLパターンを構築 */
function buildSourcePattern(source: RedirectSource): string {
	const domainRegex = escapeRegex(BOOTH_DOMAIN);
	switch (source.kind) {
		case "root":
			return `^https?://${domainRegex}/?$`;
		case "locale":
			return `^https?://${domainRegex}/${source.locale}/?$`;
	}
}

/** 正規表現の特殊文字をエスケープ */
function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ========================
// 価格トラッカー
// ========================

/** ウィッシュリストページのURL */
const WISHLIST_PAGE_URL = "https://accounts.booth.pm/wish_lists";

/** バックグラウンドで開いたウィッシュリストタブのID */
let backgroundWishlistTabId: number | null = null;

/** バックグラウンドタブを閉じる */
async function closeBackgroundTab(tabId: number): Promise<void> {
	try {
		await browser.tabs.remove(tabId);
		console.log("✅ Wishlist tab closed");
	} catch {
		// タブが既に閉じられている場合は無視
	} finally {
		if (backgroundWishlistTabId === tabId) {
			backgroundWishlistTabId = null;
		}
	}
}

/** 価格トラッカーを初期化 */
async function initPriceTracker(): Promise<void> {
	// 値下げ済みの商品数をバッジに反映
	await updatePriceDropBadge();
}

/** 12時間以上経過していたら価格チェックをトリガー */
async function checkAndTriggerPriceTracker(): Promise<boolean> {
	const settings = await priceTracker.getValue();

	if (!settings.enabled) {
		console.log("❌ Price tracker is disabled");
		return false;
	}

	const lastCheckedAt = settings.lastCheckedAt;
	if (!lastCheckedAt) {
		// 一度もチェックしていない場合はトリガー
		console.log("🔄 First price check triggered");
		void triggerWishlistExtraction();
		return true;
	}

	const elapsed = Date.now() - new Date(lastCheckedAt).getTime();
	if (elapsed > PRICE_CHECK_THRESHOLD_MS) {
		console.log(
			`🔄 Price check triggered (${Math.round(elapsed / 3600000)}h since last check)`,
		);
		void triggerWishlistExtraction();
		return true;
	}

	console.log(
		`⏭️ Price check skipped (${Math.round(elapsed / 3600000)}h since last check)`,
	);
	return false;
}

/** ウィッシュリストページを開いてデータ抽出をトリガー */
async function triggerWishlistExtraction(): Promise<void> {
	const settings = await priceTracker.getValue();

	if (!settings.enabled) {
		console.log("❌ Price tracker is disabled, skipping extraction");
		return;
	}

	// 既に実行中なら何もしない
	if (backgroundWishlistTabId !== null) {
		console.log("⏳ Wishlist extraction already in progress");
		return;
	}

	console.log("🔄 Triggering wishlist extraction...");

	// バックグラウンドでウィッシュリストページを開く
	const tab = await browser.tabs.create({
		url: WISHLIST_PAGE_URL,
		active: false,
	});

	if (tab.id) {
		backgroundWishlistTabId = tab.id;

		// タブの読み込み完了を待ってからトリガーを送信
		const tabId = tab.id;
		const onUpdated = (
			updatedTabId: number,
			changeInfo: { status?: string },
		) => {
			if (updatedTabId === tabId && changeInfo.status === "complete") {
				browser.tabs.onUpdated.removeListener(onUpdated);
				// コンテンツスクリプトに抽出を指示
				setTimeout(() => {
					void browser.tabs.sendMessage(tabId, {
						type: "TRIGGER_WISHLIST_EXTRACTION",
					});
				}, 1000);
			}
		};
		browser.tabs.onUpdated.addListener(onUpdated);

		// フォールバック: 3分後にタブを強制的に閉じる（ページネーションに時間がかかる場合）
		setTimeout(() => {
			if (tabId && backgroundWishlistTabId === tabId) {
				browser.tabs.onUpdated.removeListener(onUpdated);
				void closeBackgroundTab(tabId);
				console.log("⚠️ Wishlist tab closed by timeout");
			}
		}, 180000);
	}
}

/** ウィッシュリストアイテムを処理 */
async function handleWishlistItems(items: WishlistItem[]): Promise<void> {
	console.log(`📦 Received ${items.length} wishlist items`);

	const settings = await priceTracker.getValue();

	if (!settings.enabled) {
		console.log("❌ Price tracker is disabled");
		return;
	}

	// 価格変動を検出
	const priceChanges = detectPriceChanges(items, settings.items);

	// 追跡アイテムを更新
	const updatedItems = updateTrackedItems(items, settings.items);

	// 設定を更新
	const updatedSettings = {
		...settings,
		lastCheckedAt: new Date().toISOString(),
		items: updatedItems,
	};

	await priceTracker.setValue(updatedSettings);

	// 未通知の値下げをフィルタリング
	const unnotifiedChanges = filterUnnotifiedChanges(priceChanges);

	if (unnotifiedChanges.length > 0) {
		console.log(`✅ Found ${unnotifiedChanges.length} price drops`);

		// 通知を表示
		await showPriceDropNotifications(unnotifiedChanges);

		// 通知済みとしてマーク
		const notifiedMap = new Map(
			unnotifiedChanges.map((c) => [c.item.id, c.newPrice]),
		);
		const markedSettings = markAsNotified(updatedSettings, notifiedMap);
		await priceTracker.setValue(markedSettings);

		// バッジを更新
		await updateBadge(unnotifiedChanges.length);
	} else {
		console.log("✅ No price drops found");
	}
}

/** 値下げバッジを更新 */
async function updatePriceDropBadge(): Promise<void> {
	const settings = await priceTracker.getValue();

	// 未通知の値下げ数をカウント
	let priceDropCount = 0;

	for (const item of settings.items) {
		if (item.priceHistory.length < 2) continue;

		const latestPrice = item.priceHistory[item.priceHistory.length - 1].price;
		const previousPrice = item.priceHistory[item.priceHistory.length - 2].price;

		if (
			latestPrice < previousPrice &&
			(item.lastNotifiedPrice === null || item.lastNotifiedPrice > latestPrice)
		) {
			priceDropCount++;
		}
	}

	await updateBadge(priceDropCount);
}
