// ストレージモジュールの公開API
// 内部実装は backend.ts, item.ts, searchProfileItem.ts, instances.ts に分割

export type { StorageBackend, StorageChangeListener } from "./backend";
export { storageBackend } from "./backend";
export { StorageBinder } from "./binder";
export {
	autoRedirectToSearch,
	type BlockedShop,
	type BoothDarkModeSettings,
	blockedShops,
	boothDarkMode,
	type HiddenSections,
	hiddenSections,
	infiniteScrollEnabled,
	type MultiSearchProfileSettings,
	multiSearchProfiles,
	type NamedSearchProfile,
	type PriceTrackerSettings,
	priceTracker,
	readStorageSnapshot,
	type SearchProfileSettings,
	type StorageNamespace,
	type StorageSnapshot,
	searchProfiles,
	storage,
	type ThemeMode,
	themeMode,
} from "./instances";
export { StorageItem } from "./item";
export { SearchProfileStorageItem } from "./searchProfileItem";
