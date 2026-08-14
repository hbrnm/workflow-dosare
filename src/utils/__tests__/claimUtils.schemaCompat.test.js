import { describe, it, expect, vi } from "vitest";
import {
  toDb,
  emptyClaim,
  parseMissingColumnError,
  writeDosarWithSchemaCompat,
} from "../claimUtils";

describe("toDb optional tracking/settlement columns", () => {
  it("omits mesaj_client when empty so create works without migration 27", () => {
    const row = toDb({ ...emptyClaim(), id: "n1", mesajClient: "", trackingToken: "" });
    expect(row).not.toHaveProperty("mesaj_client");
    expect(row).not.toHaveProperty("tracking_token");
    expect(row).not.toHaveProperty("devize");
  });

  it("includes tracking_token when emptyClaim generates one", () => {
    const claim = emptyClaim();
    const row = toDb({ ...claim, id: "n2" });
    expect(row.tracking_token).toBeTruthy();
  });

  it("includes mesaj_client when set", () => {
    const row = toDb({ ...emptyClaim(), id: "n1", mesajClient: "Gata mâine" });
    expect(row.mesaj_client).toBe("Gata mâine");
  });
});

describe("schema-compat writes", () => {
  it("parseMissingColumnError extracts column name", () => {
    expect(
      parseMissingColumnError("Could not find the 'mesaj_client' column of 'dosare' in the schema cache")
    ).toBe("mesaj_client");
    expect(parseMissingColumnError("other error")).toBeNull();
  });

  it("retries upsert after stripping missing column", async () => {
    const calls = [];
    const supabase = {
      from: () => ({
        upsert: (body) => {
          calls.push({ ...body });
          if (Object.prototype.hasOwnProperty.call(body, "mesaj_client")) {
            return Promise.resolve({
              error: {
                message: "Could not find the 'mesaj_client' column of 'dosare' in the schema cache",
              },
            });
          }
          return Promise.resolve({ error: null });
        },
      }),
    };

    const { error, payload } = await writeDosarWithSchemaCompat(supabase, "upsert", {
      id: "1",
      numar_dosar: "X",
      mesaj_client: "hi",
    });

    expect(error).toBeNull();
    expect(payload).not.toHaveProperty("mesaj_client");
    expect(calls).toHaveLength(2);
  });
});
