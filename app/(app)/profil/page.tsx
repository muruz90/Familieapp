import { requireUser } from "@/lib/auth";
import PasswordForm from "@/components/PasswordForm";

export default async function ProfilePage() {
  const me = await requireUser();
  return (
    <>
      <h1>{me.name}</h1>
      <p className="muted">Brugernavn: @{me.username}</p>
      <PasswordForm />
    </>
  );
}
