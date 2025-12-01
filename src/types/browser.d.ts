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

declare namespace browser.alarms {
	interface Alarm {
		name: string;
		scheduledTime: number;
		periodInMinutes?: number;
	}

	interface AlarmCreateInfo {
		when?: number;
		delayInMinutes?: number;
		periodInMinutes?: number;
	}

	function create(name: string, alarmInfo: AlarmCreateInfo): Promise<void>;
	function get(name: string): Promise<Alarm | undefined>;
	function getAll(): Promise<Alarm[]>;
	function clear(name: string): Promise<boolean>;
	function clearAll(): Promise<boolean>;

	const onAlarm: {
		addListener(callback: (alarm: Alarm) => void): void;
		removeListener(callback: (alarm: Alarm) => void): void;
	};
}

declare namespace browser.notifications {
	type TemplateType = "basic" | "image" | "list" | "progress";

	interface NotificationOptions {
		type: TemplateType;
		iconUrl: string;
		title: string;
		message: string;
		contextMessage?: string;
		priority?: number;
		eventTime?: number;
		imageUrl?: string;
		items?: Array<{ title: string; message: string }>;
		progress?: number;
		requireInteraction?: boolean;
		silent?: boolean;
	}

	function create(
		notificationId: string,
		options: NotificationOptions,
	): Promise<string>;
	function update(
		notificationId: string,
		options: NotificationOptions,
	): Promise<boolean>;
	function clear(notificationId: string): Promise<boolean>;
	function getAll(): Promise<Record<string, NotificationOptions>>;

	const onClicked: {
		addListener(callback: (notificationId: string) => void): void;
		removeListener(callback: (notificationId: string) => void): void;
	};

	const onClosed: {
		addListener(
			callback: (notificationId: string, byUser: boolean) => void,
		): void;
		removeListener(
			callback: (notificationId: string, byUser: boolean) => void,
		): void;
	};
}

declare namespace browser.action {
	function setBadgeText(details: {
		text: string;
		tabId?: number;
	}): Promise<void>;
	function setBadgeBackgroundColor(details: {
		color: string | [number, number, number, number];
		tabId?: number;
	}): Promise<void>;
	function getBadgeText(details: { tabId?: number }): Promise<string>;
}

declare namespace browser.runtime {
	function getURL(path: string): string;
	function sendMessage<T = unknown>(message: unknown): Promise<T>;
	function getManifest(): { version: string; name: string };

	const lastError: { message: string } | undefined;

	const onMessage: {
		addListener(
			callback: (
				message: unknown,
				sender: { tab?: { id?: number }; id?: string },
				sendResponse: (response?: unknown) => void,
			) => boolean | undefined | Promise<unknown>,
		): void;
		removeListener(
			callback: (
				message: unknown,
				sender: { tab?: { id?: number }; id?: string },
				sendResponse: (response?: unknown) => void,
			) => boolean | undefined | Promise<unknown>,
		): void;
	};
}

declare namespace browser.tabs {
	interface Tab {
		id?: number;
		url?: string;
		title?: string;
		active: boolean;
		windowId: number;
	}

	interface CreateProperties {
		url?: string;
		active?: boolean;
		windowId?: number;
	}

	interface UpdateProperties {
		url?: string;
		active?: boolean;
	}

	function create(createProperties: CreateProperties): Promise<Tab>;
	function remove(tabIds: number | number[]): Promise<void>;
	function get(tabId: number): Promise<Tab>;
	function query(queryInfo: {
		active?: boolean;
		currentWindow?: boolean;
		url?: string | string[];
	}): Promise<Tab[]>;
	function update(
		tabId: number,
		updateProperties: UpdateProperties,
	): Promise<Tab>;
	function sendMessage<T = unknown>(
		tabId: number,
		message: unknown,
	): Promise<T>;

	const onUpdated: {
		addListener(
			callback: (
				tabId: number,
				changeInfo: { status?: string; url?: string },
				tab: Tab,
			) => void,
		): void;
		removeListener(
			callback: (
				tabId: number,
				changeInfo: { status?: string; url?: string },
				tab: Tab,
			) => void,
		): void;
	};

	const onRemoved: {
		addListener(
			callback: (
				tabId: number,
				removeInfo: { windowId: number; isWindowClosing: boolean },
			) => void,
		): void;
		removeListener(
			callback: (
				tabId: number,
				removeInfo: { windowId: number; isWindowClosing: boolean },
			) => void,
		): void;
	};
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
