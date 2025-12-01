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

export type Cleanup = () => void | Promise<void>;
