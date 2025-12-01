import type { ZodMiniType } from "zod/mini";
import { gridItemsAppendedSchema } from "@/shared/schema";
import type { Cleanup } from "@/types";

/**
 * アプリ内でやり取りされるイベントの定義
 */
export interface AppEvents extends Record<string, unknown> {
	[event: string]: unknown;
	/**
	 * 商品カード（検索結果）のDOMにアイテムが追加されたとき
	 * 無限スクロールなどから発火される
	 */
	"grid:items-appended": Element[];
}

type EventSchemaMap<TEvents extends Record<string, unknown>> = Partial<{
	[K in keyof TEvents]: ZodMiniType<TEvents[K]>;
}>;

export const appEventSchemas: EventSchemaMap<AppEvents> = {
	"grid:items-appended": gridItemsAppendedSchema,
};

export interface EventPublisher<TEvents extends Record<string, unknown>> {
	on<K extends keyof TEvents>(
		event: K,
		handler: EventHandler<TEvents[K]>,
	): Cleanup;
	emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;
	clear(): void;
}

type EventHandler<Payload> = (payload: Payload) => void | Promise<void>;

type ListenerMap<TEvents extends Record<string, unknown>> = Partial<{
	[K in keyof TEvents]: Set<EventHandler<TEvents[K]>>;
}>;

export class EventBus<TEvents extends Record<string, unknown>>
	implements EventPublisher<TEvents>
{
	private readonly listeners: ListenerMap<TEvents> = {};

	public constructor(private readonly schemaMap?: EventSchemaMap<TEvents>) {}

	public on<K extends keyof TEvents>(
		event: K,
		handler: EventHandler<TEvents[K]>,
	): Cleanup {
		const handlers =
			this.listeners[event] ?? new Set<EventHandler<TEvents[K]>>();
		handlers.add(handler);
		this.listeners[event] = handlers;

		return () => {
			handlers.delete(handler);
			if (handlers.size === 0) {
				delete this.listeners[event];
			}
		};
	}

	public emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
		const handlers = this.listeners[event];
		if (!handlers || handlers.size === 0) return;
		const safePayload = this.validatePayload(event, payload);

		for (const handler of [...handlers]) {
			try {
				const result = handler(safePayload);
				if (result instanceof Promise) {
					result.catch((error) => {
						this.handleHandlerError(event, error);
					});
				}
			} catch (error) {
				this.handleHandlerError(event, error);
			}
		}
	}

	public clear(): void {
		for (const key of Object.keys(this.listeners)) {
			delete this.listeners[key as keyof TEvents];
		}
	}

	private validatePayload<K extends keyof TEvents>(
		event: K,
		payload: TEvents[K],
	): TEvents[K] {
		const schema = this.schemaMap?.[event];
		if (!schema) return payload;
		return schema.parse(payload);
	}

	private handleHandlerError(event: keyof TEvents, error: unknown): void {
		console.error(
			`Unhandled error in event handler for "${String(event)}"`,
			error,
		);
	}
}

export class LazyEventBus<TEvents extends Record<string, unknown>>
	implements EventPublisher<TEvents>
{
	private bus: EventBus<TEvents> | null = null;

	public constructor(private readonly schemaMap?: EventSchemaMap<TEvents>) {}

	private ensureBus(): EventBus<TEvents> {
		if (!this.bus) {
			this.bus = new EventBus(this.schemaMap);
		}
		return this.bus;
	}

	public on<K extends keyof TEvents>(
		event: K,
		handler: EventHandler<TEvents[K]>,
	): Cleanup {
		return this.ensureBus().on(event, handler);
	}

	public emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
		this.bus?.emit(event, payload);
	}

	public clear(): void {
		this.bus?.clear();
		this.bus = null;
	}
}
