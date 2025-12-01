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
