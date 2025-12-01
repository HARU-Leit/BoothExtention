export type Observer = MutationObserver | IntersectionObserver | ResizeObserver;

export interface DebouncedMutationObserverConfig {
	callback: (mutations: MutationRecord[]) => void;
	debounceDelay?: number;
	target: Element;
	observerOptions: MutationObserverInit;
}
