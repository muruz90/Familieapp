import { db } from "./db";
import { aggregate, normName, type ShoppingItem } from "./shopping";
import { guessCategory, isCategory, type Category } from "./categories";
import { taskPeriod, todayLocal } from "./format";
import { availability, type Availability } from "./tasks";
import type { User } from "./auth";

export function listKey(from: string, to: string) {
  return `${from}_${to}`;
}

export function members(): User[] {
  return db().prepare("SELECT id, name, username, role, color FROM users ORDER BY role DESC, name").all() as User[];
}

export function children(): User[] {
  return members().filter((m) => m.role === "child");
}

export type Balance = { user: User; earned: number; paidOut: number; balance: number };

export function balances(): Balance[] {
  const rows = db()
    .prepare(
      `SELECT user_id,
         SUM(CASE WHEN kind IN ('earned','bonus','adjust') THEN amount ELSE 0 END) AS earned,
         SUM(CASE WHEN kind = 'payout' THEN amount ELSE 0 END) AS paid
       FROM ledger GROUP BY user_id`,
    )
    .all() as { user_id: number; earned: number; paid: number }[];
  const byUser = new Map(rows.map((r) => [r.user_id, r]));
  return children().map((user) => {
    const r = byUser.get(user.id);
    const earned = r?.earned ?? 0;
    const paidOut = r?.paid ?? 0;
    return { user, earned, paidOut, balance: earned - paidOut };
  });
}

export type LedgerRow = { id: number; user_id: number; kind: string; amount: number; note: string; created_at: string; user_name: string };

export function ledger(userId?: number, limit = 100): LedgerRow[] {
  const where = userId ? "WHERE l.user_id = ?" : "";
  const args = userId ? [userId, limit] : [limit];
  return db()
    .prepare(`SELECT l.*, u.name AS user_name FROM ledger l JOIN users u ON u.id = l.user_id ${where} ORDER BY l.created_at DESC, l.id DESC LIMIT ?`)
    .all(...args) as LedgerRow[];
}

export type Task = {
  id: number;
  title: string;
  description: string;
  reward: number;
  assigned_to: number | null;
  repeat: "once" | "daily" | "weekly";
  times_per_week: number;
  assignee_name: string | null;
};

export function activeTasks(): Task[] {
  return db()
    .prepare(`SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to WHERE t.active = 1
       AND NOT (t.repeat = 'once' AND EXISTS (SELECT 1 FROM task_completions c WHERE c.task_id = t.id AND c.status = 'approved'))
       ORDER BY CASE t.repeat WHEN 'daily' THEN 0 WHEN 'weekly' THEN 1 ELSE 2 END, t.title`)
    .all() as Task[];
}

export type Completion = { id: number; task_id: number; user_id: number; status: string; amount: number; completed_at: string; title: string; user_name: string };

export type TaskState = { avail: Availability; current: Completion[]; takenBy?: string };

/** Ikke-afviste udførelser (lokal dato) af en opgave, for ét barn eller (uden userId) for alle. */
export function completionDates(taskId: number, userId?: number): string[] {
  const rows = userId
    ? db().prepare("SELECT completed_on FROM task_completions WHERE task_id = ? AND user_id = ? AND status != 'rejected'").all(taskId, userId)
    : db().prepare("SELECT completed_on FROM task_completions WHERE task_id = ? AND status != 'rejected'").all(taskId);
  return (rows as { completed_on: string }[]).map((r) => r.completed_on);
}

/** Status for hver (opgave, barn): må den udføres nu, og hvilke udførelser hører til den aktuelle periode. */
export function taskStates(tasks: Task[], kids: User[]): Map<string, TaskState> {
  const rows = db()
    .prepare(
      `SELECT c.*, t.title, u.name AS user_name FROM task_completions c
       JOIN tasks t ON t.id = c.task_id JOIN users u ON u.id = c.user_id
       WHERE c.status != 'rejected' AND t.active = 1 ORDER BY c.completed_on, c.id`,
    )
    .all() as (Completion & { period: string; completed_on: string })[];
  const grouped = new Map<string, typeof rows>();
  for (const r of rows) grouped.set(`${r.task_id}:${r.user_id}`, [...(grouped.get(`${r.task_id}:${r.user_id}`) ?? []), r]);
  const today = todayLocal();
  const map = new Map<string, TaskState>();
  for (const t of tasks) {
    const period = taskPeriod(t.repeat);
    // En fri opgave kan kun tages af ét barn; de andre ser, hvem der har taget den.
    const taker = t.repeat === "once" ? rows.find((r) => r.task_id === t.id) : undefined;
    for (const k of kids) {
      if (t.assigned_to && t.assigned_to !== k.id) continue;
      const list = grouped.get(`${t.id}:${k.id}`) ?? [];
      if (taker && taker.user_id !== k.id) {
        map.set(`${t.id}:${k.id}`, { avail: { allowed: false, doneInPeriod: 0 }, current: [], takenBy: taker.user_name });
        continue;
      }
      map.set(`${t.id}:${k.id}`, {
        avail: availability(t.repeat, t.times_per_week, list.map((c) => c.completed_on), today),
        current: list.filter((c) => c.period === period),
      });
    }
  }
  return map;
}

export function pendingCompletions(): Completion[] {
  return db()
    .prepare(
      `SELECT c.*, t.title, u.name AS user_name FROM task_completions c
       JOIN tasks t ON t.id = c.task_id JOIN users u ON u.id = c.user_id
       WHERE c.status = 'pending' ORDER BY c.completed_at`,
    )
    .all() as Completion[];
}

export type Recipe = { id: number; name: string; servings: number; instructions: string };
export type RecipeIngredient = { id: number; name: string; quantity: number | null; unit: string };

export function recipes(): Recipe[] {
  return db().prepare("SELECT id, name, servings, instructions FROM recipes ORDER BY name COLLATE NOCASE").all() as Recipe[];
}

export type RecipeSection = { id: number | null; name: string; instructions: string; ingredients: RecipeIngredient[] };

/** En opskrift med sine afsnit (fx Boller, Sovs, Tilbehør). Ældre opskrifter uden afsnit får ét unavngivet afsnit. */
export function recipe(id: number): (Recipe & { sections: RecipeSection[] }) | null {
  const r = db().prepare("SELECT id, name, servings, instructions FROM recipes WHERE id = ?").get(id) as Recipe | undefined;
  if (!r) return null;
  const sections = db().prepare("SELECT id, name, instructions FROM recipe_sections WHERE recipe_id = ? ORDER BY position").all(id) as Omit<RecipeSection, "ingredients">[];
  const ingredients = db()
    .prepare("SELECT id, name, quantity, unit, section_id FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position")
    .all(id) as (RecipeIngredient & { section_id: number | null })[];
  const result: RecipeSection[] = sections.map((s) => ({ ...s, ingredients: ingredients.filter((i) => i.section_id === s.id) }));
  const loose = ingredients.filter((i) => !i.section_id || !sections.some((s) => s.id === i.section_id));
  if (result.length === 0 || loose.length > 0 || r.instructions) {
    result.unshift({ id: null, name: "", instructions: r.instructions, ingredients: loose });
  }
  return { ...r, sections: result };
}

export type Meal = { id: number; date: string; recipe_id: number; servings: number; name: string; base_servings: number };

export function mealsBetween(from: string, to: string): Meal[] {
  return db()
    .prepare(
      `SELECT m.id, m.date, m.recipe_id, m.servings, r.name, r.servings AS base_servings
       FROM meal_plan m JOIN recipes r ON r.id = m.recipe_id
       WHERE m.date BETWEEN ? AND ? ORDER BY m.date, m.id`,
    )
    .all(from, to) as Meal[];
}

/** Kategori for en vare: den, familien selv har valgt, ellers appens gæt. */
export function categoryLookup(): (name: string) => Category {
  const saved = new Map(
    (db().prepare("SELECT name_key, category FROM item_categories").all() as { name_key: string; category: string }[]).map((r) => [r.name_key, r.category]),
  );
  return (name) => {
    const c = saved.get(normName(name));
    return c && isCategory(c) ? c : guessCategory(name);
  };
}

export function shoppingList(from: string, to: string): (ShoppingItem & { checked: boolean; category: Category })[] {
  const meals = mealsBetween(from, to);
  const ingStmt = db().prepare("SELECT name, quantity, unit FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position");
  const items = aggregate(
    meals.map((m) => ({
      recipe: m.name,
      factor: m.servings / m.base_servings,
      ingredients: ingStmt.all(m.recipe_id) as RecipeIngredient[],
    })),
  );
  const checked = new Set(
    (db().prepare("SELECT item_key FROM shopping_checks WHERE list_key = ?").all(listKey(from, to)) as { item_key: string }[]).map((r) => r.item_key),
  );
  const category = categoryLookup();
  return items.map((i) => ({ ...i, checked: checked.has(i.key), category: category(i.name) }));
}

export type ExtraItem = { id: number; name: string; quantity: number | null; unit: string; checked: number; category: Category };

export function extraItems(): ExtraItem[] {
  const category = categoryLookup();
  return (db().prepare("SELECT id, name, quantity, unit, checked FROM shopping_extra ORDER BY id").all() as Omit<ExtraItem, "category">[]).map((e) => ({
    ...e,
    category: category(e.name),
  }));
}

export type EventRow = {
  id: number;
  uid: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: number;
  location: string;
  notes: string;
  user_id: number | null;
  updated_at: string;
  who: string | null;
  color: string | null;
};

export function eventsFrom(fromDate: string, limit = 200): EventRow[] {
  return db()
    .prepare(
      `SELECT e.*, u.name AS who, u.color FROM events e LEFT JOIN users u ON u.id = e.user_id
       WHERE substr(e.ends_at, 1, 10) >= ? ORDER BY e.starts_at LIMIT ?`,
    )
    .all(fromDate, limit) as EventRow[];
}

export function allEventsForFeed(sinceDate: string): EventRow[] {
  return db()
    .prepare(`SELECT e.*, u.name AS who, u.color FROM events e LEFT JOIN users u ON u.id = e.user_id WHERE substr(e.ends_at, 1, 10) >= ? ORDER BY e.starts_at`)
    .all(sinceDate) as EventRow[];
}

export function event(id: number): EventRow | null {
  return (db().prepare("SELECT e.*, NULL AS who, NULL AS color FROM events e WHERE e.id = ?").get(id) as EventRow | undefined) ?? null;
}
