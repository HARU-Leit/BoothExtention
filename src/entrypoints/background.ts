import { autoRedirectToSearch, multiSearchProfiles } from "@/app/storage";
import { RULE_ID_RANGES } from "@/config/constants";
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

const BOOTH_DOMAIN = "booth.pm";
const BOOTH_BASE_URL = `https://${BOOTH_DOMAIN}`;
const BASE_REDIRECT_RULE_ID = RULE_ID_RANGES.REDIRECT.START;

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
