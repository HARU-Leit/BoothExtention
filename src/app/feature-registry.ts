import type { Feature } from "@/app/feature";
import {
	readStorageSnapshot,
	type StorageNamespace,
	type StorageSnapshot,
} from "@/app/storage";

// Feature モジュールのロード条件や優先度を表すメタデータ
type FeatureDescriptor = {
	readonly id: string;
	readonly priority: number;
	readonly condition: (snapshot: StorageSnapshot) => boolean;
	readonly loader: () => Promise<Feature>;
};

// 動的 import をメモ化して同じモジュールを再利用する
const lazyModule = <T>(importer: () => Promise<T>) => {
	let cached: Promise<T> | null = null;
	return (): Promise<T> => {
		if (!cached) {
			cached = importer();
		}
		return cached;
	};
};

const loadSectionHiderModule = lazyModule(
	() => import("@/features/section-hider"),
);
const loadShopBlockerModule = lazyModule(
	() => import("@/features/shop-blocker"),
);
const loadImageOptimizerModule = lazyModule(
	() => import("@/features/image-optimizer"),
);
const loadStickySidebarModule = lazyModule(
	() => import("@/features/sticky-sidebar"),
);
const loadInfiniteScrollModule = lazyModule(
	() => import("@/features/infinite-scroll"),
);
const loadSearchProfileModule = lazyModule(
	() => import("@/features/search-profile"),
);
const loadDarkModeModule = lazyModule(() => import("@/features/dark-mode"));

/**
 * コンテンツスクリプトで利用する Feature 一覧
 *
 * 各機能のconditionは現在`() => true`に設定されています。
 * これは意図的な設計で、以下の理由によります：
 * - 機能は内部で設定の有効/無効を監視し、動的に対応する
 * - 設定変更時にページをリロードせずに機能を切り替え可能
 * - 将来的に条件を追加する際の拡張ポイントとして機能
 *
 * パフォーマンスが問題になる場合は、conditionでストレージ状態を
 * チェックして不要な機能のロードをスキップすることも可能です。
 */
const FEATURE_DEFINITIONS: readonly FeatureDescriptor[] = [
	{
		// ダークモードは最優先で適用（FOUCを防ぐ）
		id: "dark-mode",
		priority: 1,
		condition: () => true,
		loader: async () => {
			const module = await loadDarkModeModule();
			return module.createDarkModeFeature();
		},
	},
	{
		id: "search-profile",
		priority: 5,
		condition: () => true,
		loader: async () => {
			const module = await loadSearchProfileModule();
			return module.createSearchProfileFeature();
		},
	},
	{
		id: "shop-blocker",
		priority: 10,
		condition: () => true,
		loader: async () => {
			const module = await loadShopBlockerModule();
			return module.createShopBlockerFeature();
		},
	},
	{
		id: "section-hider",
		priority: 20,
		condition: () => true,
		loader: async () => {
			const module = await loadSectionHiderModule();
			return module.createSectionHiderFeature();
		},
	},
	{
		id: "image-optimizer",
		priority: 30,
		condition: () => true,
		loader: async () => {
			const module = await loadImageOptimizerModule();
			return module.createImageOptimizerFeature();
		},
	},
	{
		id: "infinite-scroll",
		priority: 40,
		condition: () => true,
		loader: async () => {
			const module = await loadInfiniteScrollModule();
			return module.createInfiniteScrollFeature();
		},
	},
	{
		id: "sticky-sidebar",
		priority: 50,
		condition: () => true,
		loader: async () => {
			const module = await loadStickySidebarModule();
			return module.createStickySidebarFeature();
		},
	},
];

// ストレージ状態を見て必要な Feature を優先度順で読み込む
export async function resolveFeatures(
	storageNamespace: StorageNamespace,
): Promise<Feature[]> {
	const snapshot = await readStorageSnapshot(storageNamespace);
	const descriptors = FEATURE_DEFINITIONS.filter((definition) =>
		definition.condition(snapshot),
	).sort((a, b) => a.priority - b.priority);

	return Promise.all(descriptors.map((definition) => definition.loader()));
}
