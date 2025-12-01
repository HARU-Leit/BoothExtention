/** Boothがサポートするソートオプション */
export const SEARCH_SORT_OPTIONS = [
	"popularity",
	"new",
	"wish_lists",
	"price_desc",
	"price_asc",
] as const;

/** ソートオプションの型 */
export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number];

/**
 * Boothのデフォルトソート
 *
 * sortパラメータを省略した場合、Boothは人気順でソートする
 */
export const DEFAULT_SEARCH_SORT: SearchSortOption = "popularity";

/**
 * ソート値を有効なオプションに正規化
 * @param value - 検証するソート値
 * @returns 有効なソートオプション、無効な場合はデフォルト値
 */
function normalizeSort(value: string): SearchSortOption {
	return (SEARCH_SORT_OPTIONS as readonly string[]).includes(value)
		? (value as SearchSortOption)
		: DEFAULT_SEARCH_SORT;
}

/**
 * プロファイルから実際に適用されるソート順を取得
 *
 * 新着のみフィルタが有効な場合は強制的に新着順を返す
 *
 * @param profile - ソート設定を含むプロファイル
 * @returns 適用されるソートオプション
 */
export function getEffectiveSort(
	profile: Pick<LanguageSearchProfile, "sort" | "recentOnly">,
): SearchSortOption {
	if (profile.recentOnly) {
		return "new";
	}
	return normalizeSort(profile.sort);
}

/** 年齢制限フィルターのオプション */
export const ADULT_FILTER_OPTIONS = ["absent", "include", "only"] as const;

/** 年齢制限フィルターの型 */
export type AdultFilterOption = (typeof ADULT_FILTER_OPTIONS)[number];

/**
 * 言語別検索プロファイル
 *
 * 検索条件を保持するためのインターフェース
 */
export interface LanguageSearchProfile {
	/** 検索キーワード */
	keyword: string;
	/** ソート順 */
	sort: SearchSortOption;
	/** 絞り込みタグ */
	tags: string[];
	/** 除外ワード */
	exceptWords: string[];
	/** 在庫ありのみ */
	inStockOnly: boolean;
	/** 新着のみ */
	recentOnly: boolean;
	/** 年齢制限フィルター */
	adult: AdultFilterOption;
	/** 最低価格（円）、null=制限なし */
	minPrice: number | null;
	/** 最高価格（円）、null=制限なし */
	maxPrice: number | null;
}

/**
 * 名前付き検索プロファイル
 *
 * IDと名前を持つ検索プロファイル
 */
export interface NamedSearchProfile extends LanguageSearchProfile {
	/** プロファイルのユニークID */
	id: string;
	/** ユーザー定義のプロファイル名 */
	name: string;
}

/**
 * 検索プロファイルの設定
 *
 * プロファイルの有効/無効状態とプロファイル本体を保持
 */
export interface SearchProfileSettings {
	/** プロファイルが有効かどうか */
	enabled: boolean;
	/** 検索プロファイル */
	profile: LanguageSearchProfile;
}

/** プロファイルの最大数 */
export const MAX_PROFILES = 5;

/**
 * 複数検索プロファイルの設定
 *
 * 複数のプロファイルを保持し、アクティブなプロファイルを管理
 */
export interface MultiSearchProfileSettings {
	/** プロファイル機能が有効かどうか */
	enabled: boolean;
	/** 現在アクティブなプロファイルのID（null=適用なし） */
	activeProfileId: string | null;
	/** 保存されたプロファイルの配列 */
	profiles: NamedSearchProfile[];
}

/** デフォルトの検索プロファイルロケール */
export const DEFAULT_SEARCH_PROFILE_LOCALE = "ja" as const;

/**
 * デフォルトの検索プロファイルを生成
 * @returns 初期値が設定されたLanguageSearchProfile
 */
export function createDefaultLanguageProfile(): LanguageSearchProfile {
	return {
		keyword: "",
		sort: DEFAULT_SEARCH_SORT,
		tags: [],
		exceptWords: [],
		inStockOnly: false,
		recentOnly: false,
		adult: "absent",
		minPrice: null,
		maxPrice: null,
	};
}

/**
 * デフォルトの検索プロファイル設定を生成
 * @returns 有効状態とデフォルトプロファイルを含む設定
 */
export function createDefaultSearchProfileSettings(): SearchProfileSettings {
	return {
		enabled: true,
		profile: createDefaultLanguageProfile(),
	};
}

/**
 * ユニークなプロファイルIDを生成
 * @returns ランダムなID文字列
 */
export function generateProfileId(): string {
	return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * デフォルトの名前付きプロファイルを生成
 * @param name - プロファイル名（省略時は "New Profile"）
 * @returns IDと名前を持つデフォルトプロファイル
 */
export function createDefaultNamedProfile(
	name = "New Profile",
): NamedSearchProfile {
	return {
		...createDefaultLanguageProfile(),
		id: generateProfileId(),
		name,
	};
}

/**
 * デフォルトの複数プロファイル設定を生成
 * @returns 有効状態と空のプロファイル配列を含む設定
 */
export function createDefaultMultiProfileSettings(): MultiSearchProfileSettings {
	return {
		enabled: true,
		activeProfileId: null,
		profiles: [],
	};
}

/**
 * 文字列配列をサニタイズ
 *
 * 空白をトリムし、空文字列を除去し、重複を排除する
 *
 * @param values - サニタイズする文字列配列
 * @returns サニタイズ済みの配列
 */
export function sanitizeArray(values: readonly string[]): string[] {
	return values
		.map((value) => value.trim())
		.filter(
			(value, index, self) => value.length > 0 && self.indexOf(value) === index,
		);
}

/**
 * 価格値をサニタイズ
 *
 * 正の整数に正規化し、無効な値はnullを返す
 *
 * @param value - サニタイズする価格値
 * @returns サニタイズ済みの価格、または無効な場合はnull
 */
export function sanitizePrice(value: number | null | undefined): number | null {
	if (value == null) {
		return null;
	}
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return null;
	}
	const intValue = Math.trunc(value);
	if (intValue <= 0) {
		return null;
	}
	return intValue;
}

/**
 * 検索プロファイルをサニタイズ
 *
 * キーワードのトリム、ソート値の正規化、配列のサニタイズ、価格の正規化を行う
 *
 * @param profile - サニタイズするプロファイル
 * @returns サニタイズ済みのプロファイル
 */
export function sanitizeProfile(
	profile: LanguageSearchProfile,
): LanguageSearchProfile {
	const minPrice = sanitizePrice(profile.minPrice);
	const maxPrice = sanitizePrice(profile.maxPrice);

	return {
		...profile,
		keyword: profile.keyword.trim(),
		sort: normalizeSort(profile.sort),
		tags: sanitizeArray(profile.tags),
		exceptWords: sanitizeArray(profile.exceptWords),
		minPrice,
		maxPrice:
			minPrice !== null && maxPrice !== null && maxPrice < minPrice
				? minPrice
				: maxPrice,
	};
}

/**
 * 検索プロファイル設定を正規化
 *
 * 不正な値をデフォルト値で補完する
 *
 * @param settings - 正規化する設定
 * @returns 正規化済みの設定
 */
export function normalizeSearchProfileSettings(
	settings: SearchProfileSettings,
): SearchProfileSettings {
	const enabled =
		typeof settings.enabled === "boolean" ? settings.enabled : true;
	const profile = settings.profile
		? sanitizeProfile(settings.profile)
		: createDefaultLanguageProfile();

	return {
		enabled,
		profile,
	};
}

/**
 * 名前付きプロファイルをサニタイズ
 *
 * @param profile - サニタイズするプロファイル
 * @returns サニタイズ済みのプロファイル
 */
export function sanitizeNamedProfile(
	profile: NamedSearchProfile,
): NamedSearchProfile {
	return {
		...sanitizeProfile(profile),
		id: profile.id || generateProfileId(),
		name: (profile.name || "").trim() || "Unnamed",
	};
}

/**
 * 複数プロファイル設定を正規化
 *
 * @param settings - 正規化する設定
 * @returns 正規化済みの設定
 */
export function normalizeMultiProfileSettings(
	settings: MultiSearchProfileSettings,
): MultiSearchProfileSettings {
	const enabled =
		typeof settings.enabled === "boolean" ? settings.enabled : true;

	const profiles = Array.isArray(settings.profiles)
		? settings.profiles.slice(0, MAX_PROFILES).map(sanitizeNamedProfile)
		: [];

	const activeProfileId =
		typeof settings.activeProfileId === "string" &&
		profiles.some((p) => p.id === settings.activeProfileId)
			? settings.activeProfileId
			: null;

	return {
		enabled,
		activeProfileId,
		profiles,
	};
}

/**
 * アクティブなプロファイルを取得
 *
 * @param settings - 複数プロファイル設定
 * @returns アクティブなプロファイル、または見つからない場合はnull
 */
export function getActiveProfile(
	settings: MultiSearchProfileSettings,
): NamedSearchProfile | null {
	if (!settings.activeProfileId) {
		return null;
	}
	return (
		settings.profiles.find((p) => p.id === settings.activeProfileId) ?? null
	);
}
