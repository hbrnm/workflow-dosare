import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(
  path.join(__dirname, "../migrations/supabase-migration-47-drop-permissive-rls.sql"),
  "utf8"
);
// Doar instrucțiunile SQL, fără comentarii (rollback-ul din antet e comentariu).
const sql = migration.replace(/--.*$/gm, "");

describe("migrarea 47 — politici RLS permisive", () => {
  it.each([
    ["dosare_all_authenticated", "public.dosare"],
    ["istoric_all_authenticated", "public.istoric_dosar"],
    ["setari_all_authenticated", "public.setari"],
  ])("șterge %s", (policy, table) => {
    expect(sql).toContain(`drop policy if exists "${policy}" on ${table};`);
  });

  it("se oprește înainte de ștergeri dacă lipsesc politicile pe atelier sau RPC-urile", () => {
    const guard = sql.indexOf("do $$");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(sql.indexOf("drop policy"));
    for (const req of ["('dosare', 'SELECT')", "('dosare', 'INSERT')", "('dosare', 'UPDATE')", "('istoric_dosar', 'SELECT')"]) {
      expect(sql).toContain(req);
    }
    expect(sql).toContain("to_regprocedure('public.delete_dosar_with_archive(uuid)') is null");
    expect(sql).toContain("to_regprocedure('public.is_default_atelier_admin()') is null");
  });

  it("nu creează nicio politică *_all_authenticated", () => {
    expect(sql).not.toMatch(/create policy "[^"]*all_authenticated"/);
  });

  it("scrierea în setari rămâne doar pentru adminul atelierului default", () => {
    expect(sql).toMatch(
      /create policy "admin_write_setari"[\s\S]*?using \(public\.is_default_atelier_admin\(\)\)[\s\S]*?with check \(public\.is_default_atelier_admin\(\)\);/
    );
  });

  it("singura politică using (true) e citirea setărilor", () => {
    const usingTrue = sql.match(/create policy "[^"]+"[\s\S]*?using \(true\)/g) || [];
    expect(usingTrue).toHaveLength(1);
    expect(usingTrue[0]).toContain('"authenticated_read_setari"');
    expect(usingTrue[0]).toContain("for select");
  });
});

describe("scripturile de setup nu recreează politicile permisive", () => {
  it.each([
    "../migrations/supabase-migration-complete-fix.sql",
    "../setup-new-supabase-project.sql",
  ])("%s", (file) => {
    const script = fs.readFileSync(path.join(__dirname, file), "utf8").replace(/--.*$/gm, "");
    expect(script).not.toMatch(/create policy "[^"]*all_authenticated"/);
  });
});
