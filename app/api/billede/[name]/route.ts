import fs from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { contentType, IMAGE_NAME, imageDir } from "@/lib/images";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  await requireUser();
  const { name } = await params;
  if (!IMAGE_NAME.test(name)) return new Response("Ikke fundet", { status: 404 });
  try {
    const data = await fs.readFile(path.join(imageDir, name));
    // Filnavnet skifter, når billedet skiftes, så det må gemmes længe i browseren.
    return new Response(new Uint8Array(data), { headers: { "Content-Type": contentType(name), "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch {
    return new Response("Ikke fundet", { status: 404 });
  }
}
