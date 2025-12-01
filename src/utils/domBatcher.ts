/** DOM操作タスクの型 */
export type DomTask = () => void;

/**
 * DOMの読み取り/書き込みを単一のrAFでバッチ処理するクラス
 *
 * レイアウトスラッシング（強制同期レイアウト）を防ぐため、
 * 読み取り操作を先に実行し、その後書き込み操作を実行する。
 *
 * @example
 * ```ts
 * domBatcher.read(() => {
 *   const height = element.offsetHeight;
 *   domBatcher.write(() => {
 *     element.style.height = `${height * 2}px`;
 *   });
 * });
 * ```
 */
class DomBatcher {
	private readQueue = new Set<DomTask>();
	private writeQueue = new Set<DomTask>();
	private rafId: number | null = null;

	/**
	 * DOM読み取りタスクをキューに追加
	 * @param task - 実行する読み取りタスク
	 */
	read(task: DomTask): void {
		this.readQueue.add(task);
		this.ensureScheduled();
	}

	/**
	 * DOM書き込みタスクをキューに追加
	 * @param task - 実行する書き込みタスク
	 */
	write(task: DomTask): void {
		this.writeQueue.add(task);
		this.ensureScheduled();
	}

	/**
	 * キュー内のタスクを即座に実行
	 * 保留中のrAFがあればキャンセルする
	 */
	flush(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.executeQueues();
	}

	private ensureScheduled(): void {
		if (this.rafId !== null) return;
		this.rafId = requestAnimationFrame(() => {
			this.rafId = null;
			this.executeQueues();
		});
	}

	private executeQueues(): void {
		for (const task of this.readQueue) {
			task();
		}
		this.readQueue.clear();

		for (const task of this.writeQueue) {
			task();
		}
		this.writeQueue.clear();
	}
}

/** グローバルなDomBatcherインスタンス */
export const domBatcher = new DomBatcher();
