import type { Cleanup } from "@/types";
import type { Observer } from "@/types/core";

/** useObserverのオプション */
interface UseObserverOptions<T extends Observer> {
	/** Observerを生成するファクトリ関数 */
	readonly setup: () => T;
	/** disconnect時に呼び出されるコールバック */
	readonly onDisconnect?: (observer: T) => void;
	/** クリーンアップ関数を登録するコールバック */
	readonly registerCleanup?: (cleanup: Cleanup) => void;
}

/**
 * Observerの生成と破棄を一括で扱うヘルパー
 *
 * disconnectメソッドをラップし、クリーンアップ登録を自動化する
 *
 * @typeParam T - Observer型（IntersectionObserver, MutationObserver等）
 * @returns 設定済みのObserverインスタンス
 *
 * @example
 * ```ts
 * const observer = useObserver({
 *   setup: () => new IntersectionObserver(callback, options),
 *   registerCleanup: (cleanup) => cleanups.push(cleanup),
 * });
 * observer.observe(element);
 * ```
 */
export function useObserver<T extends Observer>({
	setup,
	onDisconnect,
	registerCleanup,
}: UseObserverOptions<T>): T {
	const observer = setup();
	const originalDisconnect = observer.disconnect.bind(observer);

	observer.disconnect = () => {
		onDisconnect?.(observer);
		originalDisconnect();
	};

	registerCleanup?.(() => {
		observer.disconnect();
	});

	return observer;
}
