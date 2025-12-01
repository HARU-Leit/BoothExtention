import { PERFORMANCE, TIMEOUTS } from "@/config/constants";

/**
 * 開発時に処理時間を計測するプロファイラー
 *
 * 本番環境では何も実行しない（ノーオペレーション）
 *
 * @example
 * ```ts
 * perfProfiler.mark('operation:start');
 * // 処理...
 * perfProfiler.measure('operation:total', 'operation:start');
 * ```
 */
class PerformanceProfiler {
	private marks = new Map<string, number>();
	private measurements: Array<{
		name: string;
		duration: number;
		timestamp: number;
	}> = [];

	/** 計測開始マークを設定 */
	mark(name: string): void {
		if (!import.meta.env.DEV) return;
		this.marks.set(name, performance.now());
	}

	/**
	 * 開始マークからの経過時間を計測
	 * @returns 経過時間（ミリ秒）、本番環境では0
	 */
	measure(name: string, startMark: string): number {
		if (!import.meta.env.DEV) return 0;

		const start = this.marks.get(startMark);
		if (!start) {
			console.warn(`Start mark "${startMark}" not found`);
			return 0;
		}

		const duration = performance.now() - start;
		this.measurements.push({
			name,
			duration,
			timestamp: Date.now(),
		});

		if (duration > PERFORMANCE.FRAME_BUDGET_MS) {
			console.warn(
				`⚠️ Performance: ${name} took ${duration.toFixed(2)}ms (frame drop risk)`,
			);
		} else {
			console.debug(`✓ Performance: ${name} took ${duration.toFixed(2)}ms`);
		}

		this.marks.delete(startMark);
		return duration;
	}

	/** 遅い操作のレポートを生成（上位10件） */
	getReport(): string {
		if (!import.meta.env.DEV) return "";

		const sorted = [...this.measurements].sort(
			(a, b) => b.duration - a.duration,
		);
		const top10 = sorted.slice(0, 10);

		return [
			"=== Performance Report (Top 10 slowest operations) ===",
			...top10.map(
				(m, i) =>
					`${i + 1}. ${m.name}: ${m.duration.toFixed(2)}ms ${
						m.duration > PERFORMANCE.FRAME_BUDGET_MS ? "⚠️" : "✓"
					}`,
			),
			`Total measurements: ${this.measurements.length}`,
		].join("\n");
	}

	/** 計測データをクリア */
	clear(): void {
		this.marks.clear();
		this.measurements = [];
	}
}

/** グローバルなパフォーマンスプロファイラー */
export const perfProfiler = new PerformanceProfiler();

/**
 * ブラウザがアイドル状態のときにコールバックを実行
 *
 * requestIdleCallbackがない環境ではsetTimeoutでフォールバック
 *
 * @param callback - 実行する関数
 * @param options - タイムアウト設定
 */
export function runWhenIdle(
	callback: () => void,
	options?: { timeout?: number },
): void {
	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(callback, options);
	} else {
		setTimeout(callback, TIMEOUTS.RUN_WHEN_IDLE_FALLBACK_MS);
	}
}

/**
 * 指定ミリ秒待機するPromiseを返す
 * @param ms - 待機時間（ミリ秒）
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 高頻度イベントを最後の1回だけ実行するデバウンス関数を生成
 *
 * @param callback - デバウンスする関数
 * @param wait - 待機時間（ミリ秒）
 * @returns デバウンスされた関数
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce((query: string) => {
 *   api.search(query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: unknown[]) => void>(
	callback: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			callback(...args);
			timeoutId = null;
		}, wait);
	};
}

/**
 * 一定間隔ごとに処理を許可するスロットル関数を生成
 *
 * @param callback - スロットルする関数
 * @param interval - 最小実行間隔（ミリ秒）
 * @returns スロットルされた関数
 *
 * @example
 * ```ts
 * const throttledScroll = throttle(() => {
 *   updatePosition();
 * }, 100);
 * ```
 */
export function throttle<T extends (...args: unknown[]) => void>(
	callback: T,
	interval: number,
): (...args: Parameters<T>) => void {
	let lastCallTime = 0;
	let timeoutId: NodeJS.Timeout | null = null;

	return (...args: Parameters<T>) => {
		const now = Date.now();

		if (now - lastCallTime >= interval) {
			callback(...args);
			lastCallTime = now;
		} else {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(
				() => {
					callback(...args);
					lastCallTime = Date.now();
					timeoutId = null;
				},
				interval - (now - lastCallTime),
			);
		}
	};
}
