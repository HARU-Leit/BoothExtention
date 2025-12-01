/**
 * Boothダークモード機能のエクスポート
 */
import type { Feature } from "@/app/feature";
import { DarkModeFeature } from "./DarkModeFeature";

/**
 * DarkModeFeatureのファクトリ関数
 */
export function createDarkModeFeature(): Feature {
	return new DarkModeFeature();
}
