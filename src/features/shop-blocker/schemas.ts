import { z } from "zod/mini";

export const shopNameSchema = z.string().check(z.trim(), z.minLength(1));
