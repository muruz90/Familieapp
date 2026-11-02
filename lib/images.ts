import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./db";

/** Opskriftsbilleder ligger i data-mappen (samme volume som databasen), så de kommer med i serverens backup af mappen. */
export const imageDir = path.join(dataDir, "billeder");
export const IMAGE_NAME = /^\d+-\d+\.(jpg|png|webp|heic)$/;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function saveRecipeImage(recipeId: number, file: File): Promise<string | null> {
  const ext = TYPES[file.type];
  if (!ext || file.size === 0 || file.size > MAX_IMAGE_BYTES) return null;
  fs.mkdirSync(imageDir, { recursive: true });
  const name = `${recipeId}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(imageDir, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export function removeImage(name: string | null | undefined) {
  if (name && IMAGE_NAME.test(name)) fs.rmSync(path.join(imageDir, name), { force: true });
}

export const contentType = (name: string) =>
  ({ jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" })[name.split(".").pop() ?? ""] ?? "application/octet-stream";
