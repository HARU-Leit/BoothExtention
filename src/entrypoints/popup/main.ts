/**
 * ポップアップUIエントリーポイント
 *
 * Svelteアプリケーションをマウントして拡張機能の設定画面を表示する
 */
import { mount } from "svelte";
import App from "./App.svelte";
import "./app.scss";

const appElement = document.getElementById("app");
if (!appElement) {
	throw new Error("App element not found");
}

/** マウント済みのSvelteアプリケーションインスタンス */
const app = mount(App, {
	target: appElement,
});

export default app;
