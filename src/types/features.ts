export interface BlockedShop {
	readonly id: string;
	readonly name: string;
	readonly blockedAt: string;
}

export interface HiddenSections {
	categoryResults: boolean;
	recentlyViewed: boolean;
}

export interface ImageOptimizerConfig {
	readonly rootMargin?: string;
	readonly threshold?: number | readonly number[];
	readonly prefetchLimit?: number;
	readonly enableLQIP?: boolean;
}

export interface TrackingBlockerConfig {
	readonly blockList?: string[];
	readonly enabled?: boolean;
}

export interface PriceHistoryEntry {
	readonly price: number;
	readonly checkedAt: string;
}

export interface TrackedItem {
	readonly id: string;
	readonly name: string;
	readonly url: string;
	readonly priceHistory: readonly PriceHistoryEntry[];
	readonly lastNotifiedPrice: number | null;
}

export interface PriceTrackerSettings {
	enabled: boolean;
	lastCheckedAt: string | null;
	items: TrackedItem[];
}

export interface PriceChange {
	readonly item: TrackedItem;
	readonly oldPrice: number;
	readonly newPrice: number;
}

export type Cleanup = () => void | Promise<void>;
