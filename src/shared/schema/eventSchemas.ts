import { z } from "zod/mini";

/**
 * DOM要素のスキーマ
 *
 * Element型が定義されている場合は、Element型を、
 * そうでない場合は、任意の値を表すスキーマを返す
 */
const elementSchema =
	typeof Element === "undefined" ? z.any() : z.instanceof(Element);

export const elementArraySchema = z.array(elementSchema);

export const gridItemsAppendedSchema = elementArraySchema;
