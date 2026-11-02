import { requireParent } from "@/lib/auth";
import ImportForm from "@/components/ImportForm";

export default async function ImportPage() {
  await requireParent();
  return (
    <>
      <h1>Importér opskrifter</h1>
      <p className="muted">Vælg en opskriftsfil. Opskrifter med et navn, der allerede findes, bliver sprunget over.</p>
      <ImportForm />
    </>
  );
}
