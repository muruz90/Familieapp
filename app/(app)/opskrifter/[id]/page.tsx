import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParent, requireUser } from "@/lib/auth";
import { recipe as getRecipe } from "@/lib/queries";
import { deleteRecipe } from "@/app/actions";
import { prettyNumber } from "@/lib/format";
import RecipeForm from "@/components/RecipeForm";
import WakeLockToggle from "@/components/WakeLockToggle";

export default async function RecipePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ret?: string }> }) {
  const me = await requireUser();
  const isParent = me.role === "parent";
  const r = getRecipe(Number((await params).id));
  if (!r) notFound();
  if ((await searchParams).ret) {
    await requireParent();
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
        {isParent && <Link className="btn secondary" href={`/opskrifter/${r.id}?ret=1`}>Ret</Link>}
      </div>
      {r.image && <img src={`/api/billede/${r.image}`} alt={r.name} className="recipe-img" />}
      <p className="muted">{r.servings} personer</p>
      <WakeLockToggle />
      {r.sections.map((sec, i) => (
        <div className="card" key={sec.id ?? `s${i}`}>
          {sec.name && <h2>{sec.name}</h2>}
          {sec.ingredients.length > 0 && (
            <>
              <h3>Ingredienser</h3>
              <ul className="list" style={{ marginBottom: "1rem" }}>
                {sec.ingredients.map((ing) => (
                  <li key={ing.id} className="spread" style={{ padding: ".4rem 0" }}>
                    <span>{ing.name}</span>
                    <span className="muted">{ing.quantity !== null ? prettyNumber(ing.quantity) : ""} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {sec.instructions && (
            <>
              <h3>Fremgangsmåde</h3>
              <pre className="plain">{sec.instructions}</pre>
            </>
          )}
        </div>
      ))}
      {isParent && (
        <form action={deleteRecipe}>
          <input type="hidden" name="id" value={r.id} />
          <button type="submit" className="danger small">Slet opskrift</button>
        </form>
      )}
    </>
  );
}
