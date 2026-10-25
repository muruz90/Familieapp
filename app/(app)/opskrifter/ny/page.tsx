import { requireUser } from "@/lib/auth";
import RecipeForm from "@/components/RecipeForm";

export default async function NewRecipePage() {
  await requireUser();
  return (
    <>
      <h1>Ny opskrift</h1>
      <RecipeForm />
    </>
  );
}
