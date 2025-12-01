/**
 * Browser API型定義の拡張
 */

declare namespace browser.storage {
	interface StorageChange {
		oldValue?: unknown;
		newValue?: unknown;
	}

	interface StorageArea {
		get(
			keys?: string | string[] | Record<string, unknown>,
		): Promise<Record<string, unknown>>;
		set(items: Record<string, unknown>): Promise<void>;
		remove(keys: string | string[]): Promise<void>;
		clear(): Promise<void>;
	}

	interface StorageChangedEvent {
		addListener(
			callback: (
				changes: Record<string, StorageChange>,
				areaName: string,
			) => void,
		): void;
		removeListener(
			callback: (
				changes: Record<string, StorageChange>,
				areaName: string,
			) => void,
		): void;
	}

	const sync: StorageArea;
	const local: StorageArea;
	const onChanged: StorageChangedEvent;
}

declare namespace browser.declarativeNetRequest {
	type RuleActionType =
		| "block"
		| "redirect"
		| "allow"
		| "upgradeScheme"
		| "modifyHeaders"
		| "allowAllRequests";

	type ResourceType =
		| "main_frame"
		| "sub_frame"
		| "stylesheet"
		| "script"
		| "image"
		| "font"
		| "object"
		| "xmlhttprequest"
		| "ping"
		| "csp_report"
		| "media"
		| "websocket"
		| "webtransport"
		| "webbundle"
		| "other";

	interface Rule {
		id: number;
		priority?: number;
		action: {
			type: RuleActionType;
			redirect?: {
				regexSubstitution?: string;
				url?: string;
			};
			requestHeaders?: Array<{
				header: string;
				operation: "append" | "set" | "remove";
				value?: string;
			}>;
			responseHeaders?: Array<{
				header: string;
				operation: "append" | "set" | "remove";
				value?: string;
			}>;
		};
		condition: {
			regexFilter?: string;
			urlFilter?: string;
			resourceTypes?: ResourceType[];
		};
	}

	interface UpdateRuleOptions {
		addRules?: Rule[];
		removeRuleIds?: number[];
	}

	function updateDynamicRules(options: UpdateRuleOptions): Promise<void>;
	function getDynamicRules(): Promise<Rule[]>;
}

/**
 * `chrome.*` API (Manifest V3) の最小定義
 */
declare const chrome: {
	storage?: {
		sync?: browser.storage.StorageArea;
		local: browser.storage.StorageArea;
		onChanged: browser.storage.StorageChangedEvent;
	};
	runtime?: {
		lastError?: { message: string };
	};
};
