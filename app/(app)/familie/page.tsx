import { requireParent } from "@/lib/auth";
import { members } from "@/lib/queries";
import { deleteMember, updateMember } from "@/app/actions";
import AddMemberForm from "@/components/AddMemberForm";
import PasswordForm from "@/components/PasswordForm";

export default async function FamilyPage() {
  const me = await requireParent();
  const all = members();
  return (
    <>
      <h1>Familien</h1>
      <div className="card">
        <ul className="list">
          {all.map((m) => (
            <li key={m.id}>
              <details>
                <summary className="spread" style={{ cursor: "pointer" }}>
                  <span className="row">
                    <span className="dot" style={{ background: m.color }} />
                    <strong>{m.name}</strong>
                    <span className="muted">@{m.username}</span>
                  </span>
                  <span className="badge">{m.role === "parent" ? "Forælder" : "Barn"}</span>
                </summary>
                <form action={updateMember} style={{ marginTop: ".75rem" }}>
                  <input type="hidden" name="id" value={m.id} />
                  <div className="form-grid">
                    <label>Navn<input name="name" defaultValue={m.name} /></label>
                    <label>Farve<input name="color" type="color" defaultValue={m.color} /></label>
                    <label>Ny adgangskode<input name="password" type="text" placeholder="Uændret" /></label>
                  </div>
                  <div className="row">
                    <button type="submit" className="small">Gem</button>
                  </div>
                </form>
                {m.id !== me.id && (
                  <form action={deleteMember} style={{ marginTop: ".5rem" }}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="danger small">Slet {m.name} (inkl. regnskab)</button>
                  </form>
                )}
              </details>
            </li>
          ))}
        </ul>
      </div>
      <AddMemberForm />
      <PasswordForm />
    </>
  );
}
