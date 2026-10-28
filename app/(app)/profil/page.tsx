import { requireUser } from "@/lib/auth";
import PasswordForm from "@/components/PasswordForm";
import PushToggle from "@/components/PushToggle";
import { vapidPublicKey } from "@/lib/push";

export default async function ProfilePage() {
  const me = await requireUser();
  return (
    <>
      <h1>{me.name}</h1>
      <p className="muted">Brugernavn: @{me.username}</p>
      <PushToggle publicKey={vapidPublicKey()} />
      <PasswordForm />
    </>
  );
}
