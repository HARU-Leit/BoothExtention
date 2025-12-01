import { z } from "zod/mini";
import { THEME_MODES } from "@/config/constants";
import { ADULT_FILTER_OPTIONS, SEARCH_SORT_OPTIONS } from "@/shared/search";

const nonEmptyString = () => z.string().check(z.minLength(1));

export const blockedShopSchema = z.object({
	id: nonEmptyString(),
	name: nonEmptyString(),
	blockedAt: nonEmptyString(),
});

export const blockedShopListSchema = z.array(blockedShopSchema);

export const hiddenSectionsSchema = z.object({
	categoryResults: z.boolean(),
	recentlyViewed: z.boolean(),
});

export const booleanFlagSchema = z.boolean();

const searchSortSchema = z.enum(SEARCH_SORT_OPTIONS);
const adultFilterSchema = z.enum(ADULT_FILTER_OPTIONS);

const nullablePositiveInt = z.union([z.number().check(z.minimum(1)), z.null()]);

const searchProfileSchema = z.object({
	keyword: z.string(),
	sort: searchSortSchema,
	tags: z.array(z.string()),
	exceptWords: z.array(z.string()),
	inStockOnly: z.boolean(),
	recentOnly: z.boolean(),
	adult: adultFilterSchema,
	minPrice: nullablePositiveInt,
	maxPrice: nullablePositiveInt,
});

export const searchProfileSettingsSchema = z.object({
	enabled: z.boolean(),
	profile: searchProfileSchema,
});

const namedSearchProfileSchema = z.object({
	id: z.string().check(z.minLength(1)),
	name: z.string(),
	keyword: z.string(),
	sort: searchSortSchema,
	tags: z.array(z.string()),
	exceptWords: z.array(z.string()),
	inStockOnly: z.boolean(),
	recentOnly: z.boolean(),
	adult: adultFilterSchema,
	minPrice: nullablePositiveInt,
	maxPrice: nullablePositiveInt,
});

export const multiSearchProfileSettingsSchema = z.object({
	enabled: z.boolean(),
	activeProfileId: z.union([z.string(), z.null()]),
	profiles: z.array(namedSearchProfileSchema),
});

export const themeModeSchema = z.enum(THEME_MODES);

export const boothDarkModeSchema = z.object({
	enabled: z.boolean(),
	mode: z.enum(THEME_MODES),
});

// 価格履歴エントリ
const priceHistoryEntrySchema = z.object({
	price: z.number(),
	checkedAt: nonEmptyString(),
});

// 追跡商品のスキーマ
export const trackedItemSchema = z.object({
	id: nonEmptyString(),
	name: z.string(),
	url: nonEmptyString(),
	priceHistory: z.array(priceHistoryEntrySchema),
	lastNotifiedPrice: z.union([z.number(), z.null()]),
});

// 価格トラッカー設定
export const priceTrackerSettingsSchema = z.object({
	enabled: z.boolean(),
	lastCheckedAt: z.union([nonEmptyString(), z.null()]),
	items: z.array(trackedItemSchema),
});
