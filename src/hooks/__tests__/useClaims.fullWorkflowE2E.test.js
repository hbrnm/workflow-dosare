// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const dbWrites = [];
let mockRows = [];

vi.mock("../../supabaseClient", () => {
  const chain = (table) => {
    const state = { op: "select" };
    const c = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") {
            return (resolve) => {
              if (state.op !== "select") dbWrites.push({ table, op: state.op, body: state.body });
              resolve({ data: state.op === "select" ? mockRows : null, error: null });
            };
          }
          return (...args) => {
            if (["update", "insert", "upsert", "delete"].includes(prop)) {
              state.op = prop;
              state.body = args[0];
            }
            return c;
          };
        },
      }
    );
    return c;
  };
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    supabase: {
      from: (table) => chain(table),
      channel: () => channel,
      removeChannel: () => {},
      auth: { getSession: async () => ({ data: {} }) },
    },
  };
});

import { useClaims } from "../useClaims";
import { emptyClaim } from "../../utils/claimModel";
import { canChangeStatus, canEditWorkshop } from "../../constants/roles";

describe("E2E User Workflow — Ciclul de Viață Complet al unui Dosar de Reparație", () => {
  beforeEach(() => {
    dbWrites.length = 0;
    mockRows = [];
  });

  it("utilizatorul deschide un dosar și îl parcurge prin toate etapele operaționale până la facturare", async () => {
    const showNotice = vi.fn();
    const user = { id: "u-receptioner", email: "receptie@service.ro" };

    // Dosar inițial în etapa 1: deschidere
    const initial = {
      id: "dosar-e2e-1",
      atelier_id: "atelier-1",
      numar_dosar: "DOS-2026-999",
      numar_inmatriculare: "B 777 CLM",
      client: "Gheorghe Marin",
      telefon_client: "0722111222",
      status: "deschidere",
      created_by_email: "receptie@service.ro",
    };
    mockRows = [initial];

    const { result } = renderHook(() =>
      useClaims({ user }, showNotice, { atelierId: "atelier-1", tenancyReady: true })
    );

    await waitFor(() => expect(result.current.claims.length).toBe(1));
    expect(result.current.claims[0].status).toBe("deschidere");

    // Definim permisiunea de mutare ca utilizator de atelier autorizat
    const canMoveFn = (claim) => canChangeStatus("receptioner") || canEditWorkshop("receptioner");

    // 1. Deschidere -> Piese Comandate
    let ok = false;
    act(() => {
      ok = result.current.moveToStatus(result.current.claims[0], "piese_comandate", canMoveFn);
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.claims[0].status).toBe("piese_comandate"));
    expect(dbWrites.some((w) => w.op === "update" && w.body.status === "piese_comandate")).toBe(true);

    // 2. În Piese Comandate: sosesc piesele -> patch pieseSosite
    await act(async () => {
      await result.current.patchClaim(result.current.claims[0].id, { pieseSosite: true });
    });
    expect(result.current.claims[0].pieseSosite).toBe(true);

    // 3. Piese Comandate -> Programat (cu dată programare)
    await act(async () => {
      await result.current.patchClaim(result.current.claims[0].id, {
        status: "programat",
        dataProgramare: "2026-10-15T09:00:00.000Z",
      });
    });
    expect(result.current.claims[0].status).toBe("programat");
    expect(result.current.claims[0].dataProgramare).toBe("2026-10-15T09:00:00.000Z");

    // 4. Programat -> Reparație (in_lucru)
    act(() => {
      ok = result.current.moveToStatus(result.current.claims[0], "in_lucru", canMoveFn);
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.claims[0].status).toBe("in_lucru"));

    // 5. Verificare regulă de tranziție: Nu se poate sări direct la Facturat fără Accept Plată!
    act(() => {
      ok = result.current.moveToStatus(result.current.claims[0], "facturat", canMoveFn);
    });
    expect(ok).toBe(false);
    expect(showNotice).toHaveBeenCalledWith(expect.stringContaining("Accept plată"), "error");
    expect(result.current.claims[0].status).toBe("in_lucru");

    // 6. Reparație -> Accept Plată
    act(() => {
      ok = result.current.moveToStatus(result.current.claims[0], "accept_plata", canMoveFn);
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.claims[0].status).toBe("accept_plata"));

    // 7. Accept Plată -> Facturat (acum este permis)
    act(() => {
      ok = result.current.moveToStatus(result.current.claims[0], "facturat", canMoveFn);
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(result.current.claims[0].status).toBe("facturat"));
    expect(dbWrites.some((w) => w.op === "update" && w.body.status === "facturat")).toBe(true);
  });

  it("utilizatorul anulează mutarea cu Undo în intervalul de 5 secunde și stadiul este restaurat", async () => {
    const showNotice = vi.fn();
    const user = { id: "u-receptioner", email: "receptie@service.ro" };

    const initial = {
      id: "dosar-undo-1",
      atelier_id: "atelier-1",
      numar_dosar: "DOS-UNDO",
      numar_inmatriculare: "B 111 UND",
      status: "deschidere",
    };
    mockRows = [initial];

    let undoCallback = null;
    const { result } = renderHook(() =>
      useClaims({ user }, showNotice, { atelierId: "atelier-1", tenancyReady: true })
    );

    await waitFor(() => expect(result.current.claims.length).toBe(1));

    act(() => {
      result.current.moveToStatus(
        result.current.claims[0],
        "piese_comandate",
        () => true,
        {
          onUndoToast: (toast) => {
            undoCallback = toast.onUndo;
          },
        }
      );
    });

    // Stadiul devine piese_comandate în UI
    expect(result.current.claims[0].status).toBe("piese_comandate");
    expect(typeof undoCallback).toBe("function");

    // Utilizatorul apasă Undo
    act(() => {
      undoCallback();
    });

    // Stadiul revine la deschidere
    await waitFor(() => expect(result.current.claims[0].status).toBe("deschidere"));
    expect(showNotice).toHaveBeenCalledWith(expect.stringContaining("Status restaurat"), "success");
  });
});
