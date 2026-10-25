import { redirect } from "next/navigation";
import { currentUser, userCount } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (userCount() === 0) redirect("/opsaetning");
  if (await currentUser()) redirect("/");
  return (
    <div className="center" style={{ padding: "0 16px" }}>
      <h1>🏡 Familie</h1>
      <LoginForm />
    </div>
  );
}
