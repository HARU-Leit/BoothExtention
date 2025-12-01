// アプリ全体で使用するストレージインスタンスの定義
import { STORAGE_KEYS } from "@/config/constants";
import {
	blockedShopListSchema,
	booleanFlagSchema,
	boothDarkModeSchema,
	hiddenSectionsSchema,
	multiSearchProfileSettingsSchema,
	priceTrackerSettingsSchema,
	searchProfileSettingsSchema,
	themeModeSchema,
} from "@/shared/schema";
import {
	createDefaultMultiProfileSettings,
	createDefaultSearchProfileSettings,
	type MultiSearchProfileSettings,
	type NamedSearchProfile,
	type SearchProfileSettings,
} from "@/shared/search";
import type {
	BlockedShop,
	HiddenSections,
	PriceTrackerSettings,
} from "@/types";
import { storageBackend } from "./backend";
import { StorageItem } from "./item";
import {
	MultiSearchProfileStorageItem,
	SearchProfileStorageItem,
} from "./searchProfileItem";

export type {
	BlockedShop,
	HiddenSections,
	MultiSearchProfileSettings,
	NamedSearchProfile,
	PriceTrackerSettings,
	SearchProfileSettings,
};

/** ユーザーがUI全体でブロックしたショップ一覧 */
export const blockedShops = new StorageItem<BlockedShop[]>(
	STORAGE_KEYS.BLOCKED_SHOPS,
	[],
	blockedShopListSchema,
);

/** Boothのホームを検索結果へ自動リダイレクトするフラグ */
export const autoRedirectToSearch = new StorageItem<boolean>(
	STORAGE_KEYS.AUTO_REDIRECT,
	false,
	booleanFlagSchema,
);

/** セクション非表示UIで隠したサイドバー/本文セクションの状態 */
export const hiddenSections = new StorageItem<HiddenSections>(
	STORAGE_KEYS.HIDDEN_SECTIONS,
	{
		categoryResults: false,
		recentlyViewed: false,
	},
	hiddenSectionsSchema,
);

/** 無限スクロール機能のON/OFFフラグ */
export const infiniteScrollEnabled = new StorageItem<boolean>(
	STORAGE_KEYS.INFINITE_SCROLL_ENABLED,
	false,
	booleanFlagSchema,
);

/** 検索プロファイル設定（マイグレーション対応・旧形式との互換性） */
export const searchProfiles = new SearchProfileStorageItem(
	STORAGE_KEYS.SEARCH_PROFILES,
	createDefaultSearchProfileSettings(),
	searchProfileSettingsSchema,
);

/** 複数検索プロファイル設定（新形式） */
export const multiSearchProfiles = new MultiSearchProfileStorageItem(
	STORAGE_KEYS.MULTI_SEARCH_PROFILES,
	createDefaultMultiProfileSettings(),
	multiSearchProfileSettingsSchema,
);

/** テーマモード: light, dark, system */
export type ThemeMode = "light" | "dark" | "system";

export const themeMode = new StorageItem<ThemeMode>(
	STORAGE_KEYS.THEME_MODE,
	"system",
	themeModeSchema,
);

/** Booth本体用ダークモード設定 */
export type BoothDarkModeSettings = {
	enabled: boolean;
	mode: ThemeMode;
};

export const boothDarkMode = new StorageItem<BoothDarkModeSettings>(
	STORAGE_KEYS.BOOTH_DARK_MODE,
	{ enabled: false, mode: "system" },
	boothDarkModeSchema,
);

/** 価格トラッカーのデフォルト設定 */
const defaultPriceTrackerSettings: PriceTrackerSettings = {
	enabled: true,
	lastCheckedAt: null,
	items: [],
};

/** 価格トラッカー設定 */
export const priceTracker = new StorageItem<PriceTrackerSettings>(
	STORAGE_KEYS.PRICE_TRACKER,
	defaultPriceTrackerSettings,
	priceTrackerSettingsSchema,
);

/** 全ストレージアイテムをまとめた名前空間 */
export const storage = {
	blockedShops,
	autoRedirectToSearch,
	hiddenSections,
	infiniteScrollEnabled,
	searchProfiles,
	multiSearchProfiles,
	themeMode,
	boothDarkMode,
	priceTracker,
} as const;

export type StorageNamespace = typeof storage;

type InferStorageValue<T> = T extends StorageItem<infer Value> ? Value : never;

/** 全StorageItemを評価したスナップショット型 */
export type StorageSnapshot = {
	-readonly [K in keyof StorageNamespace]: InferStorageValue<
		StorageNamespace[K]
	>;
};

/**
 * 全StorageItemを一括読み込みしてスナップショットを返す
 * 複数機能の判断をまとめて行う場合に効率的
 */
export async function readStorageSnapshot(
	namespace: StorageNamespace = storage,
): Promise<StorageSnapshot> {
	// グローバルストレージの場合は一括取得で最適化
	if (namespace === storage) {
		const rawValues = await storageBackend.get(Object.values(STORAGE_KEYS));
		return {
			blockedShops: namespace.blockedShops.fromRaw(
				rawValues[STORAGE_KEYS.BLOCKED_SHOPS],
			),
			autoRedirectToSearch: namespace.autoRedirectToSearch.fromRaw(
				rawValues[STORAGE_KEYS.AUTO_REDIRECT],
			),
			hiddenSections: namespace.hiddenSections.fromRaw(
				rawValues[STORAGE_KEYS.HIDDEN_SECTIONS],
			),
			infiniteScrollEnabled: namespace.infiniteScrollEnabled.fromRaw(
				rawValues[STORAGE_KEYS.INFINITE_SCROLL_ENABLED],
			),
			searchProfiles: namespace.searchProfiles.fromRaw(
				rawValues[STORAGE_KEYS.SEARCH_PROFILES],
			),
			multiSearchProfiles: namespace.multiSearchProfiles.fromRaw(
				rawValues[STORAGE_KEYS.MULTI_SEARCH_PROFILES],
			),
			themeMode: namespace.themeMode.fromRaw(
				rawValues[STORAGE_KEYS.THEME_MODE],
			),
			boothDarkMode: namespace.boothDarkMode.fromRaw(
				rawValues[STORAGE_KEYS.BOOTH_DARK_MODE],
			),
			priceTracker: namespace.priceTracker.fromRaw(
				rawValues[STORAGE_KEYS.PRICE_TRACKER],
			),
		} satisfies StorageSnapshot;
	}

	// カスタム名前空間の場合は個別に取得
	const [
		blockedShopsValue,
		autoRedirectValue,
		hiddenSectionsValue,
		infiniteScrollValue,
		searchProfilesValue,
		multiSearchProfilesValue,
		themeModeValue,
		boothDarkModeValue,
		priceTrackerValue,
	] = await Promise.all([
		namespace.blockedShops.getValue(),
		namespace.autoRedirectToSearch.getValue(),
		namespace.hiddenSections.getValue(),
		namespace.infiniteScrollEnabled.getValue(),
		namespace.searchProfiles.getValue(),
		namespace.multiSearchProfiles.getValue(),
		namespace.themeMode.getValue(),
		namespace.boothDarkMode.getValue(),
		namespace.priceTracker.getValue(),
	]);

	return {
		blockedShops: blockedShopsValue,
		autoRedirectToSearch: autoRedirectValue,
		hiddenSections: hiddenSectionsValue,
		infiniteScrollEnabled: infiniteScrollValue,
		searchProfiles: searchProfilesValue,
		multiSearchProfiles: multiSearchProfilesValue,
		themeMode: themeModeValue,
		boothDarkMode: boothDarkModeValue,
		priceTracker: priceTrackerValue,
	} satisfies StorageSnapshot;
}
