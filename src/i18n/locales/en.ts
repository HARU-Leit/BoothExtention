import { type Translations, translationsSchema } from "@/shared/schema";

export const en: Translations = translationsSchema.parse({
	extensionName: "Booth Optimizer",
	extensionDescription: "Optimize your Booth browsing experience",

	buttons: {
		block: "Block",
		unblock: "Unblock",
		add: "Add",
		remove: "Remove",
		unblockShort: "Unblock",
		save: "Save",
		reset: "Reset",
	},

	status: {
		loading: "Loading...",
	},

	popup: {
		title: "Booth Optimizer",
	},

	blockedShops: {
		title: "Blocked Shops",
		empty: "No blocked shops",
		hint: "Add shops from shop pages",
	},

	settings: {
		title: "Settings",
		infiniteScroll: "Infinite Scroll",
		autoRedirect: "Home → Search Page Redirect",
		theme: "Theme",
		themeOptions: {
			light: "Light",
			dark: "Dark",
			system: "System",
		},
	},

	sections: {
		title: "Section Hiding",
		categoryResults: "Category Results",
		recentViewed: "Recently Viewed",
	},
	searchProfile: {
		title: "Search Profiles",
		addProfile: "Add Profile",
		deleteProfile: "Delete Profile",
		profileName: "Profile Name",
		profileNamePlaceholder: "e.g., VRChat Items",
		maxProfilesReached: "Maximum number of profiles reached",
		cannotDeleteLast: "Cannot delete the last profile",
	},
	boothDarkMode: {
		title: "Booth Dark Mode",
		description: "Apply dark theme to Booth.pm website",
		enable: "Enable dark mode for Booth",
	},
	priceTracker: {
		title: "Price Tracker",
		trackedCount: "Tracked",
		priceDrops: "Price drops",
		hint: "Updates prices from your wishlist page",
		lastChecked: "Last checked",
		neverChecked: "Never checked",
		checkNow: "Check now",
		priceDropped: "Price dropped!",
		checking: "Checking...",
	},
	searchProfiles: {
		title: "Search Profiles",
		description:
			"Save your preferred filters once and auto-apply them on every Booth listing.",
		enabledToggle: "Enable saved filters",
		keyword: "Keyword",
		tags: "Tags",
		tagsHint: "One per line. Sent as tags[].",
		except: "Exclude Words",
		exceptHint: "One per line. Sent as except_words[].",
		inStockOnly: "Hide sold-out items",
		recentOnly: "Only recently published",
		sort: "Sort",
		sortForcedByRecent:
			"Booth forces 'Newest' whenever 'Only recently published' is enabled.",
		sortOptions: {
			popularity: "Popularity",
			new: "Newest",
			wish_lists: "Wish count",
			price_desc: "Price: High → Low",
			price_asc: "Price: Low → High",
		},
		adult: "Adult filter",
		adultOptions: {
			absent: "All ages",
			include: "All ages + R18",
			only: "R18 only",
		},
		minPrice: "Min Price",
		maxPrice: "Max Price",
		priceHint: "No limit",
	},
});
