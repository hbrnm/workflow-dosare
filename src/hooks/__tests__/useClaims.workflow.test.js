// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const writes = [];
let rows = [];

vi.mock("../../supabaseClient", () => {
  const chain = (table) => {
    const state = { op: "select" };
    const c = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") {
            return (resolve) => {
              if (state.op !== "select") writes.push({ table, op: state.op });
              resolve({ data: state.op === "select" ? rows : null, error: null });
            };
          }
          return (...args) => {
            if (["update", "insert", "upsert", "delete"].includes(prop)) state.op = prop;
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

const dbRow = (id, status) => ({
  id,
  atelier_id: "a1",
  numar_dosar: `D-${id}`,
  numar_inmatriculare: "B 123 ABC",
  status,
});

async function setup(status) {
  rows = [dbRow("c1", status)];
  const showNotice = vi.fn();
  const hook = renderHook(() =>
    useClaims({ user: { id: "u1", email: "t@x.ro" } }, showNotice, { atelierId: "a1", tenancyReady: true })
  );
  await waitFor(() => expect(hook.result.current.claims.length).toBe(1));
  expect(hook.result.current.claims[0].status).toBe(status);
  writes.length = 0;
  return { hook, showNotice };
}

describe("useClaims — reguli de tranziție status", () => {
  beforeEach(() => {
    writes.length = 0;
  });

  it("moveToStatus blochează deschidere → facturat (fără scriere în DB)", async () => {
    const { hook, showNotice } = await setup("deschidere");
    let ok;
    act(() => {
      ok = hook.result.current.moveToStatus(hook.result.current.claims[0], "facturat");
    });
    expect(ok).toBe(false);
    expect(showNotice).toHaveBeenCalledWith(expect.stringContaining("Accept plată"), "error");
    expect(hook.result.current.claims[0].status).toBe("deschidere");
    expect(writes).toHaveLength(0);
  });

  it("moveToStatus permite accept_plata → facturat", async () => {
    const { hook } = await setup("accept_plata");
    let ok;
    act(() => {
      ok = hook.result.current.moveToStatus(hook.result.current.claims[0], "facturat");
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(hook.result.current.claims[0].status).toBe("facturat"));
    await waitFor(() => expect(writes.some((w) => w.op === "update")).toBe(true));
  });

  it("patchClaim blochează in_lucru → facturat", async () => {
    const { hook, showNotice } = await setup("in_lucru");
    let ok;
    await act(async () => {
      ok = await hook.result.current.patchClaim("c1", { status: "facturat" });
    });
    expect(ok).toBe(false);
    expect(showNotice).toHaveBeenCalledWith(expect.stringContaining("Accept plată"), "error");
    expect(hook.result.current.claims[0].status).toBe("in_lucru");
    expect(writes).toHaveLength(0);
  });

  it("patchClaim permite avansul la accept_plata din piese_comandate (pachet decont)", async () => {
    const { hook } = await setup("piese_comandate");
    let ok;
    await act(async () => {
      ok = await hook.result.current.patchClaim("c1", { status: "accept_plata" });
    });
    expect(ok).not.toBe(false);
    expect(hook.result.current.claims[0].status).toBe("accept_plata");
  });
});
