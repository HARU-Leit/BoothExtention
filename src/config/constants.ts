/** Booth.pm上の要素を特定するCSSセレクター */
export const SELECTORS = {
	ITEM_CARD: ".item-card",
	ITEM_CARD_SHOP_NAME: ".item-card__shop-name",
	ITEM_THUMBNAIL: ".js-thumbnail-image",
	ITEM_THUMBNAIL_CONTAINER: ".item-card__thumbnail.js-thumbnail",
	ITEM_GRID: ".l-cards-5cols",
	SHOP_FOLLOW_BUTTON: ".follow-action",
	SHOP_NAME: ".shop-name",
	CATEGORIES: ".container.categories",
	RECENT_VIEWED: ".recent_viewed_items_component",
	PAGER: ".pager",
	NEXT_LINK: 'a[rel="next"]',
	SIDEBAR: "#js-detail-search-sidebar",
	FOOTER: ".footer__menu",
	HEADER: "header",
	// ウィッシュリストページ用
	WISHLIST_ITEM: ".wish-item",
	WISHLIST_ITEM_LINK: ".wish-item a[href*='/items/']",
	WISHLIST_ITEM_NAME: ".wish-item__name",
	WISHLIST_ITEM_PRICE: ".wish-item__price",
	WISHLIST_ITEM_SHOP: ".wish-item__shop-name",
	WISHLIST_ITEM_THUMBNAIL: ".wish-item__thumbnail img",
} as const;

/** 拡張機能が生成する要素のクラス名 */
export const CLASS_NAMES = {
	BOOTH_OPTIMIZER_PREFIX: "booth-optimizer",
	BLOCK_BUTTON: "booth-optimizer-block-btn",
	INFINITE_SCROLL_SENTINEL: "infinite-scroll-sentinel",
	INFINITE_SCROLL_LOADER: "infinite-scroll-loader",
} as const;

/** chrome.storage / browser.storage で使用するキー */
export const STORAGE_KEYS = {
	BLOCKED_SHOPS: "blockedShops",
	AUTO_REDIRECT: "autoRedirect",
	HIDDEN_SECTIONS: "hiddenSections",
	INFINITE_SCROLL_ENABLED: "infiniteScrollEnabled",
	SEARCH_PROFILES: "searchProfiles",
	MULTI_SEARCH_PROFILES: "multiSearchProfiles",
	THEME_MODE: "themeMode",
	BOOTH_DARK_MODE: "boothDarkMode",
	PRICE_TRACKER: "priceTracker",
} as const;

/** テーマモードオプション */
export const THEME_MODES = ["light", "dark", "system"] as const;

/** declarativeNetRequestでブロックするトラッキングURL */
export const TRACKING_BLOCKLIST = [
	"*://www.google-analytics.com/*",
	"*://www.googletagmanager.com/*",
	"*://analytics.google.com/*",
	"*://stats.g.doubleclick.net/*",
	"*://*.doubleclick.net/*",
	"*://api.onesignal.com/*",
	"*://cdn.onesignal.com/*",
] as const;

/** declarativeNetRequestルールID範囲 */
export const RULE_ID_RANGES = {
	REDIRECT: { START: 1, END: 999 },
	TRACKING_BLOCKER: { START: 2000, END: 2999 },
	IMAGE_REFERER: { START: 3000, END: 3999 },
} as const;

/** 各機能のデフォルト設定 */
export const DEFAULTS = {
	IMAGE_OPTIMIZER: {
		ROOT_MARGIN: "200px",
		THRESHOLD: [0, 0.1, 0.5, 1.0],
		PREFETCH_LIMIT: 5,
		ENABLE_LQIP: true,
	},
	INFINITE_SCROLL: {
		ROOT_MARGIN: "600px",
		THRESHOLD: 0.1,
		ENABLED: false,
	},
	STICKY_SIDEBAR: {
		TOP_OFFSET: 18,
	},
} as const;

/** タイムアウト設定（ミリ秒） */
export const TIMEOUTS = {
	WAIT_FOR_ELEMENT_MS: 5000,
	RUN_WHEN_IDLE_FALLBACK_MS: 1,
	/** プロファイル保存のデバウンス時間 */
	PROFILE_SAVE_DEBOUNCE_MS: 600,
} as const;

/** パフォーマンス関連の定数 */
export const PERFORMANCE = {
	/** 60fpsのフレーム予算（ミリ秒） */
	FRAME_BUDGET_MS: 16.67,
} as const;

/** トラッキングブロッカー設定 */
export const TRACKING = {
	RULE_PRIORITY: 1,
} as const;

/** 動的生成要素のインラインスタイル */
export const INLINE_STYLES = {
	SENTINEL: "height: 1px; width: 100%;",
	LOADER: "text-align: center; padding: 20px; color: #999; font-size: 12px;",
} as const;
