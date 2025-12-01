import { z } from "zod/mini";

export const translationsSchema = z.object({
	extensionName: z.string(),
	extensionDescription: z.string(),
	buttons: z.object({
		block: z.string(),
		unblock: z.string(),
		add: z.string(),
		remove: z.string(),
		unblockShort: z.string(),
		save: z.string(),
		reset: z.string(),
	}),
	status: z.object({
		loading: z.string(),
	}),
	popup: z.object({
		title: z.string(),
	}),
	blockedShops: z.object({
		title: z.string(),
		empty: z.string(),
		hint: z.string(),
	}),
	settings: z.object({
		title: z.string(),
		infiniteScroll: z.string(),
		autoRedirect: z.string(),
		theme: z.string(),
		themeOptions: z.object({
			light: z.string(),
			dark: z.string(),
			system: z.string(),
		}),
	}),
	sections: z.object({
		title: z.string(),
		categoryResults: z.string(),
		recentViewed: z.string(),
	}),
	searchProfile: z.object({
		title: z.string(),
		addProfile: z.string(),
		deleteProfile: z.string(),
		profileName: z.string(),
		profileNamePlaceholder: z.string(),
		maxProfilesReached: z.string(),
		cannotDeleteLast: z.string(),
	}),
	boothDarkMode: z.object({
		title: z.string(),
		description: z.string(),
		enable: z.string(),
	}),
	searchProfiles: z.object({
		title: z.string(),
		description: z.string(),
		enabledToggle: z.string(),
		keyword: z.string(),
		tags: z.string(),
		tagsHint: z.string(),
		except: z.string(),
		exceptHint: z.string(),
		inStockOnly: z.string(),
		recentOnly: z.string(),
		sort: z.string(),
		sortForcedByRecent: z.string(),
		sortOptions: z.object({
			popularity: z.string(),
			new: z.string(),
			wish_lists: z.string(),
			price_desc: z.string(),
			price_asc: z.string(),
		}),
		adult: z.string(),
		adultOptions: z.object({
			absent: z.string(),
			include: z.string(),
			only: z.string(),
		}),
		minPrice: z.string(),
		maxPrice: z.string(),
		priceHint: z.string(),
	}),
});

export type Translations = z.infer<typeof translationsSchema>;
