import { redirect } from "next/navigation";
import { userCount } from "@/lib/auth";
import SetupForm from "@/components/SetupForm";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (userCount() > 0) redirect("/login");
  return (
    <div className="center" style={{ padding: "0 16px" }}>
      <h1>Velkommen</h1>
      <p className="muted">Opret den første forælder. Bagefter kan du oprette resten af familien.</p>
      <SetupForm />
    </div>
  );
}
