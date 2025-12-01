/**
 * DOM関連ユーティリティのユニットテスト
 *
 * テスト対象:
 * - waitForElement: 要素の出現を待機
 * - toggleDisplay: 表示/非表示の切り替え
 * - removeElements: 要素の削除
 * - domBatcher: DOM操作のバッチ処理
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeElements, toggleDisplay, waitForElement } from "@/utils/dom";
import { domBatcher } from "@/utils/domBatcher";

// ========================
// waitForElement テスト
// ========================

describe("waitForElement", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	// --- 即座に見つかるケース ---

	describe("既存の要素を検索", () => {
		it("既に存在する要素を即座に返す", async () => {
			const testDiv = document.createElement("div");
			testDiv.className = "test-element";
			document.body.appendChild(testDiv);

			const result = await waitForElement(".test-element");

			expect(result).toBe(testDiv);
		});

		it("IDセレクターで既存要素を検索", async () => {
			const testDiv = document.createElement("div");
			testDiv.id = "test-id";
			document.body.appendChild(testDiv);

			const result = await waitForElement("#test-id");

			expect(result).toBe(testDiv);
		});

		it("複数要素がある場合は最初の要素を返す", async () => {
			const div1 = document.createElement("div");
			div1.className = "multi-element";
			div1.setAttribute("data-order", "first");
			const div2 = document.createElement("div");
			div2.className = "multi-element";
			div2.setAttribute("data-order", "second");

			document.body.appendChild(div1);
			document.body.appendChild(div2);

			const result = await waitForElement(".multi-element");

			expect(result).toBe(div1);
			expect(result?.getAttribute("data-order")).toBe("first");
		});
	});

	// --- 遅延して現れるケース ---

	describe("遅延して出現する要素", () => {
		it("100ms後に追加される要素を待機", async () => {
			const promise = waitForElement(".delayed-element", 1000);

			setTimeout(() => {
				const testDiv = document.createElement("div");
				testDiv.className = "delayed-element";
				document.body.appendChild(testDiv);
			}, 100);

			const result = await promise;

			expect(result).not.toBeNull();
			expect(result?.className).toBe("delayed-element");
		});

		it("ネストされた要素の追加も検出", async () => {
			const promise = waitForElement(".nested-child", 1000);

			setTimeout(() => {
				const parent = document.createElement("div");
				const child = document.createElement("span");
				child.className = "nested-child";
				parent.appendChild(child);
				document.body.appendChild(parent);
			}, 50);

			const result = await promise;

			expect(result).not.toBeNull();
			expect(result?.tagName.toLowerCase()).toBe("span");
		});
	});

	// --- タイムアウトケース ---

	describe("タイムアウト", () => {
		it("要素が見つからない場合nullを返す", async () => {
			const result = await waitForElement(".non-existent", 100);

			expect(result).toBeNull();
		});

		it("タイムアウト前に追加されれば要素を返す", async () => {
			const promise = waitForElement(".just-in-time", 200);

			setTimeout(() => {
				const div = document.createElement("div");
				div.className = "just-in-time";
				document.body.appendChild(div);
			}, 50);

			const result = await promise;

			expect(result).not.toBeNull();
		});
	});

	// --- エッジケース ---

	describe("エッジケース", () => {
		it("複雑なセレクターで検索", async () => {
			const container = document.createElement("div");
			container.className = "container";
			const item = document.createElement("div");
			item.className = "item active";
			container.appendChild(item);
			document.body.appendChild(container);

			const result = await waitForElement(".container .item.active");

			expect(result).toBe(item);
		});

		it("属性セレクターで検索", async () => {
			const input = document.createElement("input");
			input.setAttribute("data-test", "value");
			document.body.appendChild(input);

			const result = await waitForElement('[data-test="value"]');

			expect(result).toBe(input);
		});
	});
});

// ========================
// toggleDisplay テスト
// ========================

describe("toggleDisplay", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	// --- 非表示にする ---

	describe("要素を非表示", () => {
		it("単一要素を非表示", () => {
			const div = document.createElement("div");
			div.className = "toggle-test";
			document.body.appendChild(div);

			const elements = toggleDisplay(".toggle-test", false);

			expect(elements).toHaveLength(1);
			expect(div.style.display).toBe("none");
		});

		it("複数要素を一括で非表示", () => {
			const div1 = document.createElement("div");
			div1.className = "toggle-test";
			const div2 = document.createElement("div");
			div2.className = "toggle-test";
			const div3 = document.createElement("div");
			div3.className = "toggle-test";

			document.body.appendChild(div1);
			document.body.appendChild(div2);
			document.body.appendChild(div3);

			const elements = toggleDisplay(".toggle-test", false);

			expect(elements).toHaveLength(3);
			expect(div1.style.display).toBe("none");
			expect(div2.style.display).toBe("none");
			expect(div3.style.display).toBe("none");
		});

		it("既に非表示の要素はそのまま", () => {
			const div = document.createElement("div");
			div.className = "already-hidden";
			div.style.display = "none";
			document.body.appendChild(div);

			toggleDisplay(".already-hidden", false);

			expect(div.style.display).toBe("none");
		});
	});

	// --- 表示する ---

	describe("要素を表示", () => {
		it("非表示の要素を表示", () => {
			const div = document.createElement("div");
			div.className = "toggle-test";
			div.style.display = "none";
			document.body.appendChild(div);

			const elements = toggleDisplay(".toggle-test", true);

			expect(elements).toHaveLength(1);
			expect(div.style.display).toBe("");
		});

		it("既に表示されている要素はそのまま", () => {
			const div = document.createElement("div");
			div.className = "visible-test";
			document.body.appendChild(div);

			toggleDisplay(".visible-test", true);

			expect(div.style.display).toBe("");
		});

		it("インラインスタイルのdisplayがリセットされる", () => {
			const div = document.createElement("div");
			div.className = "inline-test";
			div.style.display = "none";
			document.body.appendChild(div);

			toggleDisplay(".inline-test", true);

			// display: "" はインラインスタイルを削除（CSSクラスのスタイルが適用される）
			expect(div.style.display).toBe("");
		});
	});

	// --- エッジケース ---

	describe("エッジケース", () => {
		it("要素が見つからない場合は空配列を返す", () => {
			const elements = toggleDisplay(".non-existent", false);

			expect(elements).toEqual([]);
		});

		it("複雑なセレクターで対象を絞り込み", () => {
			const div1 = document.createElement("div");
			div1.className = "item active";
			const div2 = document.createElement("div");
			div2.className = "item";

			document.body.appendChild(div1);
			document.body.appendChild(div2);

			const elements = toggleDisplay(".item.active", false);

			expect(elements).toHaveLength(1);
			expect(div1.style.display).toBe("none");
			expect(div2.style.display).toBe("");
		});
	});
});

// ========================
// removeElements テスト
// ========================

describe("removeElements", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	// --- 基本的な削除 ---

	describe("基本的な削除", () => {
		it("単一要素を削除", () => {
			const div = document.createElement("div");
			div.className = "remove-test";
			document.body.appendChild(div);

			const count = removeElements(".remove-test");

			expect(count).toBe(1);
			expect(document.querySelector(".remove-test")).toBeNull();
		});

		it("複数要素を一括削除", () => {
			for (let i = 0; i < 5; i++) {
				const div = document.createElement("div");
				div.className = "remove-multiple";
				document.body.appendChild(div);
			}

			const count = removeElements(".remove-multiple");

			expect(count).toBe(5);
			expect(document.querySelectorAll(".remove-multiple")).toHaveLength(0);
		});

		it("削除後も他の要素は残る", () => {
			const keepDiv = document.createElement("div");
			keepDiv.className = "keep";
			const removeDiv = document.createElement("div");
			removeDiv.className = "remove";

			document.body.appendChild(keepDiv);
			document.body.appendChild(removeDiv);

			removeElements(".remove");

			expect(document.querySelector(".keep")).toBe(keepDiv);
			expect(document.querySelector(".remove")).toBeNull();
		});
	});

	// --- ネストされた要素 ---

	describe("ネストされた要素", () => {
		it("子要素を削除（親は残る）", () => {
			const parent = document.createElement("div");
			parent.className = "parent";
			const child = document.createElement("div");
			child.className = "nested-remove";
			parent.appendChild(child);
			document.body.appendChild(parent);

			const count = removeElements(".nested-remove");

			expect(count).toBe(1);
			expect(document.querySelector(".parent")).toBe(parent);
			expect(parent.children).toHaveLength(0);
		});

		it("親要素を削除すると子も消える", () => {
			const parent = document.createElement("div");
			parent.className = "parent-remove";
			const child = document.createElement("span");
			child.className = "child";
			parent.appendChild(child);
			document.body.appendChild(parent);

			removeElements(".parent-remove");

			expect(document.querySelector(".parent-remove")).toBeNull();
			expect(document.querySelector(".child")).toBeNull();
		});
	});

	// --- エッジケース ---

	describe("エッジケース", () => {
		it("要素が見つからない場合は0を返す", () => {
			const count = removeElements(".non-existent");

			expect(count).toBe(0);
		});

		it("空のDOMでも安全に動作", () => {
			document.body.innerHTML = "";

			expect(() => removeElements(".any-selector")).not.toThrow();
		});

		it("IDセレクターで削除", () => {
			const div = document.createElement("div");
			div.id = "unique-id";
			document.body.appendChild(div);

			const count = removeElements("#unique-id");

			expect(count).toBe(1);
			expect(document.getElementById("unique-id")).toBeNull();
		});
	});
});

// ========================
// domBatcher テスト
// ========================

describe("domBatcher", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// --- 読み取りキュー ---

	describe("読み取りキュー", () => {
		it("readタスクがキューに追加される", () => {
			const task = vi.fn();

			domBatcher.read(task);
			domBatcher.flush();

			expect(task).toHaveBeenCalledTimes(1);
		});

		it("複数のreadタスクが順番に実行される", () => {
			const order: number[] = [];

			domBatcher.read(() => order.push(1));
			domBatcher.read(() => order.push(2));
			domBatcher.read(() => order.push(3));
			domBatcher.flush();

			expect(order).toEqual([1, 2, 3]);
		});
	});

	// --- 書き込みキュー ---

	describe("書き込みキュー", () => {
		it("writeタスクがキューに追加される", () => {
			const task = vi.fn();

			domBatcher.write(task);
			domBatcher.flush();

			expect(task).toHaveBeenCalledTimes(1);
		});

		it("複数のwriteタスクが順番に実行される", () => {
			const order: number[] = [];

			domBatcher.write(() => order.push(1));
			domBatcher.write(() => order.push(2));
			domBatcher.write(() => order.push(3));
			domBatcher.flush();

			expect(order).toEqual([1, 2, 3]);
		});
	});

	// --- 読み取り→書き込みの順序 ---

	describe("実行順序", () => {
		it("readタスクがwriteタスクより先に実行される", () => {
			const order: string[] = [];

			domBatcher.write(() => order.push("write1"));
			domBatcher.read(() => order.push("read1"));
			domBatcher.write(() => order.push("write2"));
			domBatcher.read(() => order.push("read2"));
			domBatcher.flush();

			// readが先、writeが後
			expect(order).toEqual(["read1", "read2", "write1", "write2"]);
		});

		it("readで計測してwriteで変更するパターン", () => {
			const div = document.createElement("div");
			div.style.width = "100px";
			document.body.appendChild(div);

			let measuredWidth = 0;

			domBatcher.read(() => {
				measuredWidth = div.offsetWidth;
			});
			domBatcher.write(() => {
				div.style.width = `${measuredWidth * 2}px`;
			});
			domBatcher.flush();

			// offsetWidth は jsdom では 0 だが、ロジックは正しく動作
			expect(div.style.width).toBe("0px");
		});
	});

	// --- flush ---

	describe("flush", () => {
		it("flushで即座に実行される", () => {
			const task = vi.fn();

			domBatcher.read(task);
			// rAFを待たずに即座に実行
			domBatcher.flush();

			expect(task).toHaveBeenCalled();
		});

		it("flush後はキューが空になる", () => {
			const task = vi.fn();

			domBatcher.read(task);
			domBatcher.flush();
			domBatcher.flush(); // 2回目

			expect(task).toHaveBeenCalledTimes(1);
		});
	});

	// --- 重複タスク ---

	describe("重複タスク", () => {
		it("同じタスクを複数回追加しても1回だけ実行", () => {
			const task = vi.fn();

			domBatcher.read(task);
			domBatcher.read(task);
			domBatcher.read(task);
			domBatcher.flush();

			// Setを使用しているため重複は除外される
			expect(task).toHaveBeenCalledTimes(1);
		});
	});
});

// ========================
// 組み合わせテスト
// ========================

describe("DOM操作の組み合わせ", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("toggleDisplay → removeElements の連携", () => {
		const div1 = document.createElement("div");
		div1.className = "target";
		const div2 = document.createElement("div");
		div2.className = "target";
		document.body.appendChild(div1);
		document.body.appendChild(div2);

		// まず非表示
		toggleDisplay(".target", false);
		expect(div1.style.display).toBe("none");

		// その後削除
		const removed = removeElements(".target");
		expect(removed).toBe(2);
		expect(document.querySelectorAll(".target")).toHaveLength(0);
	});

	it("動的に追加された要素をwaitForElementで検出し操作", async () => {
		const promise = waitForElement(".dynamic", 1000);

		setTimeout(() => {
			const div = document.createElement("div");
			div.className = "dynamic";
			document.body.appendChild(div);
		}, 50);

		const element = await promise;
		expect(element).not.toBeNull();

		// 検出した要素を操作
		if (element) {
			(element as HTMLElement).style.display = "none";
			expect((element as HTMLElement).style.display).toBe("none");
		}
	});
});
