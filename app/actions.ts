"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endSession, hashPassword, requireParent, requireUser, startSession, userCount, verifyLogin } from "@/lib/auth";
import { parseKr, taskPeriod, todayLocal } from "@/lib/format";
import { availability } from "@/lib/tasks";
import { completionDates, listKey } from "@/lib/queries";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const int = (fd: FormData, key: string) => {
  const raw = String(fd.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
};

export type FormState = { error?: string } | undefined;

// ---------- Login og familie ----------

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const user = verifyLogin(str(fd, "username"), String(fd.get("password") ?? ""));
  if (!user) return { error: "Forkert brugernavn eller adgangskode." };
  await startSession(user.id);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function setupFirstParent(_: FormState, fd: FormData): Promise<FormState> {
  if (userCount() > 0) redirect("/login");
  const name = str(fd, "name");
  const username = str(fd, "username");
  const password = String(fd.get("password") ?? "");
  if (!name || !username) return { error: "Udfyld navn og brugernavn." };
  if (password.length < 6) return { error: "Adgangskoden skal være mindst 6 tegn." };
  const id = db()
    .prepare("INSERT INTO users (name, username, password_hash, role, color) VALUES (?, ?, ?, 'parent', '#4f7cff')")
    .run(name, username, hashPassword(password)).lastInsertRowid;
  await startSession(Number(id));
  redirect("/familie");
}

export async function addMember(_: FormState, fd: FormData): Promise<FormState> {
  await requireParent();
  const name = str(fd, "name");
  const username = str(fd, "username");
  const password = String(fd.get("password") ?? "");
  const role = str(fd, "role") === "parent" ? "parent" : "child";
  const color = str(fd, "color") || "#4f7cff";
  if (!name || !username) return { error: "Udfyld navn og brugernavn." };
  if (password.length < 4) return { error: "Adgangskoden skal være mindst 4 tegn." };
  try {
    db().prepare("INSERT INTO users (name, username, password_hash, role, color) VALUES (?, ?, ?, ?, ?)").run(name, username, hashPassword(password), role, color);
  } catch {
    return { error: "Brugernavnet er allerede i brug." };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function updateMember(fd: FormData) {
  const me = await requireParent();
  const id = int(fd, "id");
  if (!id) return;
  const name = str(fd, "name");
  const color = str(fd, "color");
  const password = String(fd.get("password") ?? "");
  if (name) db().prepare("UPDATE users SET name = ?, color = ? WHERE id = ?").run(name, color || "#4f7cff", id);
  const role = str(fd, "role");
  if (role === "parent" || role === "child") {
    // Der skal altid være mindst én forælder tilbage, ellers kan ingen styre appen.
    const parents = (db().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'parent' AND id != ?").get(id) as { n: number }).n;
    if (role === "parent" || parents > 0) db().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  }
  if (password.length >= 4) {
    db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
    if (id !== me.id) db().prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  revalidatePath("/", "layout");
}

export async function deleteMember(fd: FormData) {
  const me = await requireParent();
  const id = int(fd, "id");
  if (!id || id === me.id) return;
  db().prepare("DELETE FROM users WHERE id = ?").run(id);
  revalidatePath("/", "layout");
}

export async function changeOwnPassword(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  const password = String(fd.get("password") ?? "");
  if (password.length < 4) return { error: "Adgangskoden skal være mindst 4 tegn." };
  db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), me.id);
  return { error: undefined };
}

// ---------- Opgaver og lommepenge ----------

export async function saveTask(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireParent();
  const id = int(fd, "id");
  const title = str(fd, "title");
  const reward = parseKr(str(fd, "reward") || "0");
  const assigned = int(fd, "assigned_to") || null;
  const repeat = ["once", "daily", "weekly"].includes(str(fd, "repeat")) ? str(fd, "repeat") : "once";
  const timesPerWeek = repeat === "weekly" ? Math.min(7, Math.max(1, int(fd, "times_per_week") ?? 1)) : 1;
  if (!title) return { error: "Opgaven skal have en titel." };
  if (reward === null || reward < 0) return { error: "Beløbet er ikke gyldigt." };
  if (id) {
    db().prepare("UPDATE tasks SET title = ?, description = ?, reward = ?, assigned_to = ?, repeat = ?, times_per_week = ? WHERE id = ?").run(title, str(fd, "description"), reward, assigned, repeat, timesPerWeek, id);
  } else {
    db().prepare("INSERT INTO tasks (title, description, reward, assigned_to, repeat, times_per_week, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)").run(title, str(fd, "description"), reward, assigned, repeat, timesPerWeek, me.id);
  }
  revalidatePath("/", "layout");
  if (id) redirect("/opgaver");
  return {};
}

export async function archiveTask(fd: FormData) {
  await requireParent();
  db().prepare("UPDATE tasks SET active = 0 WHERE id = ?").run(int(fd, "id"));
  revalidatePath("/", "layout");
}

/** Barnet melder en opgave færdig. Forældre der melder færdig på et barns vegne godkender med det samme. */
export async function completeTask(fd: FormData) {
  const me = await requireUser();
  const taskId = int(fd, "task_id");
  const forUser = me.role === "parent" ? int(fd, "user_id") : me.id;
  if (!taskId || !forUser) return;
  const task = db().prepare("SELECT * FROM tasks WHERE id = ? AND active = 1").get(taskId) as
    | { id: number; title: string; reward: number; repeat: "once" | "daily" | "weekly"; times_per_week: number; assigned_to: number | null }
    | undefined;
  if (!task || (task.assigned_to && task.assigned_to !== forUser)) return;
  const today = todayLocal();
  const dates = task.repeat === "once" ? completionDates(task.id) : completionDates(task.id, forUser);
  if (!availability(task.repeat, task.times_per_week, dates, today).allowed) return;
  const period = taskPeriod(task.repeat);
  const tx = db().transaction(() => {
    const status = me.role === "parent" ? "approved" : "pending";
    const cid = db()
      .prepare("INSERT INTO task_completions (task_id, user_id, period, completed_on, status, amount, reviewed_by, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(task.id, forUser, period, today, status, task.reward, status === "approved" ? me.id : null, status === "approved" ? new Date().toISOString() : null)
      .lastInsertRowid;
    if (status === "approved" && task.reward > 0) {
      db().prepare("INSERT INTO ledger (user_id, kind, amount, note, completion_id, created_by) VALUES (?, 'earned', ?, ?, ?, ?)").run(forUser, task.reward, task.title, cid, me.id);
    }
  });
  tx();
  revalidatePath("/", "layout");
}

export async function undoCompletion(fd: FormData) {
  const me = await requireUser();
  const id = int(fd, "id");
  // Børn kan fortryde egne afventende; forældre kan fortryde alt (og fjerner samtidig optjeningen).
  if (me.role === "parent") {
    db().transaction(() => {
      db().prepare("DELETE FROM ledger WHERE completion_id = ?").run(id);
      db().prepare("DELETE FROM task_completions WHERE id = ?").run(id);
    })();
  } else {
    db().prepare("DELETE FROM task_completions WHERE id = ? AND user_id = ? AND status = 'pending'").run(id, me.id);
  }
  revalidatePath("/", "layout");
}

export async function reviewCompletion(fd: FormData) {
  const me = await requireParent();
  const id = int(fd, "id");
  const approve = str(fd, "decision") === "approve";
  const c = db()
    .prepare("SELECT c.*, t.title FROM task_completions c JOIN tasks t ON t.id = c.task_id WHERE c.id = ? AND c.status = 'pending'")
    .get(id) as { id: number; user_id: number; amount: number; title: string } | undefined;
  if (!c) return;
  db().transaction(() => {
    db().prepare("UPDATE task_completions SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(approve ? "approved" : "rejected", me.id, new Date().toISOString(), c.id);
    if (approve && c.amount > 0) {
      db().prepare("INSERT INTO ledger (user_id, kind, amount, note, completion_id, created_by) VALUES (?, 'earned', ?, ?, ?, ?)").run(c.user_id, c.amount, c.title, c.id, me.id);
    }
  })();
  revalidatePath("/", "layout");
}

export async function addLedgerEntry(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireParent();
  const userId = int(fd, "user_id");
  const kind = str(fd, "kind");
  const amount = parseKr(str(fd, "amount"));
  if (!userId) return { error: "Vælg et barn." };
  if (!["payout", "bonus", "adjust"].includes(kind)) return { error: "Ugyldig type." };
  if (amount === null || amount === 0) return { error: "Skriv et beløb." };
  if (kind !== "adjust" && amount < 0) return { error: "Beløbet skal være positivt." };
  db().prepare("INSERT INTO ledger (user_id, kind, amount, note, created_by) VALUES (?, ?, ?, ?, ?)").run(userId, kind, amount, str(fd, "note"), me.id);
  revalidatePath("/", "layout");
  return {};
}

export async function deleteLedgerEntry(fd: FormData) {
  await requireParent();
  const id = int(fd, "id");
  const row = db().prepare("SELECT completion_id FROM ledger WHERE id = ?").get(id) as { completion_id: number | null } | undefined;
  if (!row) return;
  db().transaction(() => {
    db().prepare("DELETE FROM ledger WHERE id = ?").run(id);
    if (row.completion_id) db().prepare("DELETE FROM task_completions WHERE id = ?").run(row.completion_id);
  })();
  revalidatePath("/", "layout");
}

// ---------- Opskrifter, madplan og indkøb ----------

export async function saveRecipe(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  const id = int(fd, "id");
  const name = str(fd, "name");
  const servings = Math.max(1, int(fd, "servings") ?? 4);
  if (!name) return { error: "Opskriften skal have et navn." };
  const names = fd.getAll("ing_name").map((v) => String(v).trim());
  const quantities = fd.getAll("ing_quantity").map((v) => String(v).trim().replace(",", "."));
  const units = fd.getAll("ing_unit").map((v) => String(v).trim());
  const ingredients = names
    .map((n, i) => ({ name: n, quantity: quantities[i] ? Number(quantities[i]) : null, unit: units[i] ?? "" }))
    .filter((i) => i.name);
  if (ingredients.some((i) => i.quantity !== null && !Number.isFinite(i.quantity))) return { error: "En af mængderne er ikke et tal." };

  let recipeId = id;
  db().transaction(() => {
    if (recipeId) {
      db().prepare("UPDATE recipes SET name = ?, servings = ?, instructions = ? WHERE id = ?").run(name, servings, str(fd, "instructions"), recipeId);
      db().prepare("DELETE FROM recipe_ingredients WHERE recipe_id = ?").run(recipeId);
    } else {
      recipeId = Number(db().prepare("INSERT INTO recipes (name, servings, instructions, created_by) VALUES (?, ?, ?, ?)").run(name, servings, str(fd, "instructions"), me.id).lastInsertRowid);
    }
    const ins = db().prepare("INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, position) VALUES (?, ?, ?, ?, ?)");
    ingredients.forEach((i, pos) => ins.run(recipeId, i.name, i.quantity, i.unit, pos));
  })();
  revalidatePath("/", "layout");
  redirect(`/opskrifter/${recipeId}`);
}

export async function deleteRecipe(fd: FormData) {
  await requireUser();
  db().prepare("DELETE FROM recipes WHERE id = ?").run(int(fd, "id"));
  revalidatePath("/", "layout");
  redirect("/opskrifter");
}

export async function addMeal(fd: FormData) {
  await requireUser();
  const date = str(fd, "date");
  const recipeId = int(fd, "recipe_id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !recipeId) return;
  const recipe = db().prepare("SELECT servings FROM recipes WHERE id = ?").get(recipeId) as { servings: number } | undefined;
  if (!recipe) return;
  const servings = Math.max(1, int(fd, "servings") ?? recipe.servings);
  db().prepare("INSERT INTO meal_plan (date, recipe_id, servings) VALUES (?, ?, ?)").run(date, recipeId, servings);
  revalidatePath("/", "layout");
}

export async function removeMeal(fd: FormData) {
  await requireUser();
  db().prepare("DELETE FROM meal_plan WHERE id = ?").run(int(fd, "id"));
  revalidatePath("/", "layout");
}

export async function toggleShoppingItem(fd: FormData) {
  await requireUser();
  const from = str(fd, "from");
  const to = str(fd, "to");
  const item = str(fd, "item");
  const key = listKey(from, to);
  const del = db().prepare("DELETE FROM shopping_checks WHERE list_key = ? AND item_key = ?").run(key, item);
  if (del.changes === 0) db().prepare("INSERT INTO shopping_checks (list_key, item_key) VALUES (?, ?)").run(key, item);
  revalidatePath("/indkob");
}

export async function addExtraItem(fd: FormData) {
  await requireUser();
  const name = str(fd, "name");
  if (!name) return;
  const qty = str(fd, "quantity").replace(",", ".");
  db().prepare("INSERT INTO shopping_extra (name, quantity, unit) VALUES (?, ?, ?)").run(name, qty && Number.isFinite(Number(qty)) ? Number(qty) : null, str(fd, "unit"));
  revalidatePath("/indkob");
}

export async function toggleExtraItem(fd: FormData) {
  await requireUser();
  db().prepare("UPDATE shopping_extra SET checked = 1 - checked WHERE id = ?").run(int(fd, "id"));
  revalidatePath("/indkob");
}

export async function clearCheckedExtras() {
  await requireUser();
  db().prepare("DELETE FROM shopping_extra WHERE checked = 1").run();
  revalidatePath("/indkob");
}

export async function resetShoppingChecks(fd: FormData) {
  await requireUser();
  db().prepare("DELETE FROM shopping_checks WHERE list_key = ?").run(listKey(str(fd, "from"), str(fd, "to")));
  revalidatePath("/indkob");
}

// ---------- Kalender ----------

export async function saveEvent(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  const id = int(fd, "id");
  const title = str(fd, "title");
  const allDay = fd.get("all_day") === "on";
  let start = str(fd, allDay ? "start_date" : "start");
  let end = str(fd, allDay ? "end_date" : "end");
  if (!title) return { error: "Skriv en titel." };
  if (!start) return { error: "Vælg starttidspunkt." };
  if (allDay) {
    if (!end || end < start) end = start;
  } else {
    if (!end || end <= start) {
      const d = new Date(start + ":00Z");
      d.setUTCHours(d.getUTCHours() + 1);
      end = d.toISOString().slice(0, 16);
    }
    start = start.slice(0, 16);
    end = end.slice(0, 16);
  }
  const userId = int(fd, "user_id") || null;
  if (id) {
    db().prepare("UPDATE events SET title = ?, starts_at = ?, ends_at = ?, all_day = ?, location = ?, notes = ?, user_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(title, start, end, allDay ? 1 : 0, str(fd, "location"), str(fd, "notes"), userId, id);
  } else {
    db().prepare("INSERT INTO events (uid, title, starts_at, ends_at, all_day, location, notes, user_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(`${crypto.randomUUID()}@familie`, title, start, end, allDay ? 1 : 0, str(fd, "location"), str(fd, "notes"), userId, me.id);
  }
  revalidatePath("/", "layout");
  redirect("/kalender");
}

export async function deleteEvent(fd: FormData) {
  await requireUser();
  db().prepare("DELETE FROM events WHERE id = ?").run(int(fd, "id"));
  revalidatePath("/", "layout");
  redirect("/kalender");
}
