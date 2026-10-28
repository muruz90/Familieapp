import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { recipes } from "@/lib/queries";

export default async function RecipesPage() {
  await requireUser();
  const all = recipes();
  return (
    <>
      <div className="spread" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Opskrifter</h1>
        <span className="row">
          <Link className="btn secondary" href="/opskrifter/importer">Importér</Link>
          <Link className="btn" href="/opskrifter/ny">+ Ny opskrift</Link>
        </span>
      </div>
      <div className="card">
        {all.length === 0 && <p className="muted">Ingen opskrifter endnu. Opret den første!</p>}
        <ul className="list">
          {all.map((r) => (
            <li key={r.id} className="spread">
              <Link href={`/opskrifter/${r.id}`}><strong>{r.name}</strong></Link>
              <span className="muted">{r.servings} pers.</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
