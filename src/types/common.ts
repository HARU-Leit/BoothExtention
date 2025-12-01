export interface ObserverConfig {
	readonly root?: Element | Document | null;
	readonly rootMargin?: string;
	readonly threshold?: number | readonly number[];
}

export interface ILogger {
	debug(message: string, context?: unknown): void;
	info(message: string, context?: unknown): void;
	warn(message: string, context?: unknown): void;
	error(message: string, error?: Error | unknown, context?: unknown): void;
}
