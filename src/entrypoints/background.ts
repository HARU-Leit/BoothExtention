import {
	autoRedirectToSearch,
	multiSearchProfiles,
	priceTracker,
} from "@/app/storage";
import { RULE_ID_RANGES } from "@/config/constants";
import {
	detectPriceChanges,
	filterUnnotifiedChanges,
	markAsNotified,
	showPriceDropNotifications,
	updateBadge,
	updateTrackedItems,
} from "@/features/price-tracker";
import { TrackingBlocker } from "@/features/tracking-blocker/TrackingBlocker";
import { logger } from "@/shared/core/logger";
import {
	buildAbsoluteSearchUrl,
	createDefaultMultiProfileSettings,
	DEFAULT_SEARCH_PROFILE_LOCALE,
	getActiveProfile,
	type MultiSearchProfileSettings,
} from "@/shared/search";
import {
	BOOTH_PATH_LOCALES,
	type BoothPathLocale,
} from "@/shared/url/boothUrl";
import type { WishlistItem } from "@/shared/wishlist";

const BOOTH_DOMAIN = "booth.pm";
const BOOTH_BASE_URL = `https://${BOOTH_DOMAIN}`;
const BASE_REDIRECT_RULE_ID = RULE_ID_RANGES.REDIRECT.START;

const PRICE_CHECK_THRESHOLD_MS = 12 * 60 * 60 * 1000;
const WISHLIST_EXTRACTION_TIMEOUT_MS = 3 * 60 * 1000;
const ROUTE_SOURCES = [
	{ kind: "root" } as const,
	...BOOTH_PATH_LOCALES.map(
		(locale): RedirectSource => ({ kind: "locale", locale }),
	),
] as const satisfies readonly RedirectSource[];
const REDIRECT_RULE_IDS = ROUTE_SOURCES.map(
	(_, index) => BASE_REDIRECT_RULE_ID + index,
);

let cachedProfiles: MultiSearchProfileSettings =
	createDefaultMultiProfileSettings();
let redirectEnabled = false;

type RedirectSource =
	| { kind: "root" }
	| { kind: "locale"; locale: BoothPathLocale };

interface RedirectRuleDescriptor {
	readonly id: number;
	readonly pattern: string;
	readonly targetUrl: string;
}

export default defineBackground({
	main(): void {
		logger.info("Background: 準備完了");

		initRedirectRules();
		initTrackingBlocker();
		initPriceTracker();

		autoRedirectToSearch.watch((enabled) => {
			redirectEnabled = enabled;
			void updateRedirectRules(redirectEnabled, cachedProfiles);
		});

		multiSearchProfiles.watch((profiles) => {
			cachedProfiles = profiles;
			if (redirectEnabled) {
				void updateRedirectRules(true, cachedProfiles);
			}
		});

		browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
			const msg = message as { type?: string; items?: WishlistItem[] };
			if (msg.type === "WISHLIST_ITEMS_EXTRACTED") {
				void handleWishlistItems(msg.items ?? []);
				if (sender.tab?.id && backgroundWishlistTabId === sender.tab.id) {
					void closeBackgroundTab(sender.tab.id);
				}
				sendResponse({ success: true });
			} else if (msg.type === "CHECK_PRICE_TRACKER_NEEDED") {
				void checkAndTriggerPriceTracker().then((triggered) => {
					sendResponse({ triggered });
				});
				return true;
			} else if (msg.type === "TRIGGER_PRICE_CHECK") {
				void triggerWishlistExtraction();
				sendResponse({ success: true });
			}
			return true;
		});
	},
});

async function initRedirectRules(): Promise<void> {
	const [enabled, profiles] = await Promise.all([
		autoRedirectToSearch.getValue(),
		multiSearchProfiles.getValue(),
	]);
	redirectEnabled = enabled;
	cachedProfiles = profiles;
	await updateRedirectRules(redirectEnabled, cachedProfiles);
}

async function updateRedirectRules(
	enabled: boolean,
	profiles: MultiSearchProfileSettings,
): Promise<void> {
	if (enabled) {
		const descriptors = buildRedirectRuleDescriptors(profiles);
		const rules = descriptors.map(({ id, pattern, targetUrl }) =>
			createRedirectRule(id, pattern, targetUrl),
		);
		await browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: REDIRECT_RULE_IDS,
			addRules: rules,
		});
		logger.info("Home redirect rules enabled for all languages");
	} else {
		await browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: REDIRECT_RULE_IDS,
		});
		logger.info("Home redirect rules disabled");
	}
}

function createRedirectRule(
	id: number,
	regexFilter: string,
	targetUrl: string,
): browser.declarativeNetRequest.Rule {
	return {
		id,
		priority: 1,
		action: {
			type: "redirect",
			redirect: { url: targetUrl },
		},
		condition: {
			regexFilter,
			resourceTypes: ["main_frame"],
		},
	};
}

async function initTrackingBlocker(): Promise<void> {
	const blocker = new TrackingBlocker({ enabled: true });
	await blocker.init();
}

function buildRedirectRuleDescriptors(
	profiles: MultiSearchProfileSettings,
): RedirectRuleDescriptor[] {
	return ROUTE_SOURCES.map((source, index) => {
		const locale =
			source.kind === "root" ? resolveDefaultLocale() : source.locale;
		return {
			id: BASE_REDIRECT_RULE_ID + index,
			pattern: buildSourcePattern(source),
			targetUrl: getLocaleTargetUrl(locale, profiles),
		};
	});
}

function getLocaleTargetUrl(
	locale: BoothPathLocale,
	settings: MultiSearchProfileSettings,
): string {
	if (!settings.enabled) {
		return `${BOOTH_BASE_URL}/${locale}/items`;
	}
	const profile = getActiveProfile(settings);
	if (!profile) {
		return `${BOOTH_BASE_URL}/${locale}/items`;
	}
	return buildAbsoluteSearchUrl(locale, profile, {
		origin: BOOTH_BASE_URL,
		page: 1,
	});
}

function resolveDefaultLocale(): BoothPathLocale {
	return DEFAULT_SEARCH_PROFILE_LOCALE;
}

function buildSourcePattern(source: RedirectSource): string {
	const domainRegex = escapeRegex(BOOTH_DOMAIN);
	switch (source.kind) {
		case "root":
			return `^https?://${domainRegex}/?$`;
		case "locale":
			return `^https?://${domainRegex}/${source.locale}/?$`;
	}
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const WISHLIST_PAGE_URL = "https://accounts.booth.pm/wish_lists";
let backgroundWishlistTabId: number | null = null;

async function closeBackgroundTab(tabId: number): Promise<void> {
	try {
		await browser.tabs.remove(tabId);
		logger.info("Wishlist tab closed");
	} catch {
	} finally {
		if (backgroundWishlistTabId === tabId) {
			backgroundWishlistTabId = null;
		}
	}
}

async function initPriceTracker(): Promise<void> {
	await updatePriceDropBadge();
}

async function checkAndTriggerPriceTracker(): Promise<boolean> {
	const settings = await priceTracker.getValue();

	if (!settings.enabled) {
		logger.info("Price tracker is disabled");
		return false;
	}

	const lastCheckedAt = settings.lastCheckedAt;
	if (!lastCheckedAt) {
		logger.info("First price check triggered");
		void triggerWishlistExtraction();
		return true;
	}

	const elapsed = Date.now() - new Date(lastCheckedAt).getTime();
	if (elapsed > PRICE_CHECK_THRESHOLD_MS) {
		logger.info("Price check triggered", {
			hoursSinceLastCheck: Math.round(elapsed / 3600000),
		});
		void triggerWishlistExtraction();
		return true;
	}

	logger.info("Price check skipped", {
		hoursSinceLastCheck: Math.round(elapsed / 3600000),
	});
	return false;
}

async function triggerWishlistExtraction(): Promise<void> {
	const settings = await priceTracker.getValue();

	if (!settings.enabled) {
		logger.info("Price tracker is disabled, skipping extraction");
		return;
	}

	if (backgroundWishlistTabId !== null) {
		logger.info("Wishlist extraction already in progress");
		return;
	}

	logger.info("Triggering wishlist extraction...");
	const tab = await browser.tabs.create({
		url: WISHLIST_PAGE_URL,
		active: false,
	});

	if (tab.id) {
		backgroundWishlistTabId = tab.id;
		const tabId = tab.id;
		const onUpdated = (
			updatedTabId: number,
			changeInfo: { status?: string },
		) => {
			if (updatedTabId === tabId && changeInfo.status === "complete") {
				browser.tabs.onUpdated.removeListener(onUpdated);
				setTimeout(() => {
					void browser.tabs.sendMessage(tabId, {
						type: "TRIGGER_WISHLIST_EXTRACTION",
					});
				}, 1000);
			}
		};
		browser.tabs.onUpdated.addListener(onUpdated);

		setTimeout(() => {
			if (tabId && backgroundWishlistTabId === tabId) {
				browser.tabs.onUpdated.removeListener(onUpdated);
				void closeBackgroundTab(tabId);
				logger.warn("Wishlist tab closed by timeout");
			}
		}, WISHLIST_EXTRACTION_TIMEOUT_MS);
	}
}

async function handleWishlistItems(items: WishlistItem[]): Promise<void> {
	logger.info("Received wishlist items", { count: items.length });

	const settings = await priceTracker.getValue();

	if (!settings.enabled) {
		logger.info("Price tracker is disabled");
		return;
	}

	const priceChanges = detectPriceChanges(items, settings.items);
	const updatedItems = updateTrackedItems(items, settings.items);
	const updatedSettings = {
		...settings,
		lastCheckedAt: new Date().toISOString(),
		items: updatedItems,
	};

	await priceTracker.setValue(updatedSettings);
	const unnotifiedChanges = filterUnnotifiedChanges(priceChanges);

	if (unnotifiedChanges.length > 0) {
		logger.info("Found price drops", { count: unnotifiedChanges.length });
		await showPriceDropNotifications(unnotifiedChanges);
		const notifiedMap = new Map(
			unnotifiedChanges.map((c) => [c.item.id, c.newPrice]),
		);
		const markedSettings = markAsNotified(updatedSettings, notifiedMap);
		await priceTracker.setValue(markedSettings);
		await updateBadge(unnotifiedChanges.length);
	} else {
		logger.info("No price drops found");
	}
}

async function updatePriceDropBadge(): Promise<void> {
	const settings = await priceTracker.getValue();
	let priceDropCount = 0;

	for (const item of settings.items) {
		if (item.priceHistory.length < 2) continue;

		const latestPrice = item.priceHistory[item.priceHistory.length - 1].price;
		const previousPrice = item.priceHistory[item.priceHistory.length - 2].price;

		if (
			latestPrice < previousPrice &&
			(item.lastNotifiedPrice === null || item.lastNotifiedPrice > latestPrice)
		) {
			priceDropCount++;
		}
	}

	await updateBadge(priceDropCount);
}
