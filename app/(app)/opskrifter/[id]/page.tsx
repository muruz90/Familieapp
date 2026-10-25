import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { recipe as getRecipe } from "@/lib/queries";
import { deleteRecipe } from "@/app/actions";
import { prettyNumber } from "@/lib/format";
import RecipeForm from "@/components/RecipeForm";

export default async function RecipePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ret?: string }> }) {
  await requireUser();
  const r = getRecipe(Number((await params).id));
  if (!r) notFound();
  if ((await searchParams).ret) {
    return (
      <>
        <h1>Ret opskrift</h1>
        <RecipeForm recipe={r} />
      </>
    );
  }
  return (
    <>
      <p><Link href="/opskrifter">← Opskrifter</Link></p>
      <div className="spread" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>{r.name}</h1>
        <Link className="btn secondary" href={`/opskrifter/${r.id}?ret=1`}>Ret</Link>
      </div>
      <div className="card">
        <h2>Ingredienser <span className="muted">({r.servings} pers.)</span></h2>
        <ul className="list">
          {r.ingredients.map((i) => (
            <li key={i.id} className="spread">
              <span>{i.name}</span>
              <span className="muted">{i.quantity !== null ? prettyNumber(i.quantity) : ""} {i.unit}</span>
            </li>
          ))}
        </ul>
      </div>
      {r.instructions && (
        <div className="card">
          <h2>Fremgangsmåde</h2>
          <pre className="plain">{r.instructions}</pre>
        </div>
      )}
      <form action={deleteRecipe}>
        <input type="hidden" name="id" value={r.id} />
        <button type="submit" className="danger small">Slet opskrift</button>
      </form>
    </>
  );
}
