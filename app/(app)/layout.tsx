import Link from "next/link";
import Nav from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">🏡 Familie</Link>
          <div className="who">
            <span className="dot" style={{ background: user.color }} />
            {user.name}
            <form action={logout} className="inline">
              <button className="link" type="submit">Log ud</button>
            </form>
          </div>
        </div>
        <Nav isParent={user.role === "parent"} />
      </header>
      <main>{children}</main>
    </>
  );
}
