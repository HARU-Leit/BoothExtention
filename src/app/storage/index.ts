// ストレージモジュールの公開API
// 内部実装は backend.ts, item.ts, searchProfileItem.ts, instances.ts に分割

export type { StorageBackend, StorageChangeListener } from "./backend";
export { storageBackend } from "./backend";
export { StorageBinder } from "./binder";
export {
	autoRedirectToSearch,
	// 型
	type BlockedShop,
	// Boothダークモード
	type BoothDarkModeSettings,
	// インスタンス
	blockedShops,
	boothDarkMode,
	type HiddenSections,
	hiddenSections,
	infiniteScrollEnabled,
	// 複数プロファイル
	type MultiSearchProfileSettings,
	multiSearchProfiles,
	type NamedSearchProfile,
	// 価格トラッカー
	type PriceTrackerSettings,
	priceTracker,
	// 関数
	readStorageSnapshot,
	type SearchProfileSettings,
	type StorageNamespace,
	type StorageSnapshot,
	searchProfiles,
	storage,
	// テーマ
	type ThemeMode,
	themeMode,
} from "./instances";
export { StorageItem } from "./item";
export { SearchProfileStorageItem } from "./searchProfileItem";
