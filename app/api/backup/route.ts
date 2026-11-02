import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { db } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { todayLocal } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Forældre kan hente en kopi af hele databasen og gemme den et andet sted end serveren. */
export async function GET() {
  await requireParent();
  const file = path.join(os.tmpdir(), `familie-backup-${process.pid}-${Date.now()}.db`);
  try {
    await db().backup(file);
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="familie-${todayLocal()}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await fs.rm(file, { force: true });
  }
}
