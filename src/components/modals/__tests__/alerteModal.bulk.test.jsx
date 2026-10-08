// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AlerteModal from "../AlerteModal";

describe("AlerteModal — Bulk delete / acknowledge alerts", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  const sampleClaims = [
    {
      id: "claim-1",
      numarDosar: "DOS-001",
      numarInmatriculare: "B 101 ABC",
      status: "in_lucru",
      dataSchimbareStatus: "2026-08-01T10:00:00Z",
    },
    {
      id: "claim-2",
      numarDosar: "DOS-002",
      numarInmatriculare: "B 102 XYZ",
      status: "in_lucru",
      dataSchimbareStatus: "2026-08-01T10:00:00Z",
    },
  ];

  const mockBuckets = {
    counts: {
      stagnate: 2,
      intarzieri: 2,
      piese: 0,
      predare: 0,
      plati: 0,
    },
    totalAlertsCount: 2,
    byType: {
      stagnate: sampleClaims,
    },
    items: [
      {
        id: "stagnate-claim-1",
        claim: sampleClaims[0],
        type: "stagnate",
        title: "Întârziere în Reparație",
        reason: "În Reparație de 15 zile",
        severity: "info",
      },
      {
        id: "stagnate-claim-2",
        claim: sampleClaims[1],
        type: "stagnate",
        title: "Întârziere în Reparație",
        reason: "În Reparație de 15 zile",
        severity: "info",
      },
    ],
  };

  it("permite selectarea individuală și ștergerea/rezolvarea bulk a alertelor selectate", async () => {
    const onPatchClaimsBulk = vi.fn().mockResolvedValue(true);
    const onNotify = vi.fn();

    render(
      <AlerteModal
        claims={sampleClaims}
        alertBuckets={mockBuckets}
        initialTab="intarzieri"
        onPatchClaimsBulk={onPatchClaimsBulk}
        onNotify={onNotify}
        desktopUi
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(2);

    // Bifează prima alertă
    fireEvent.click(checkboxes[0]);

    // Verifică apariția barei de acțiuni bulk cu 1 selectată
    expect(screen.getByText(/1 alertă selectată/i)).toBeTruthy();
    const resolveSelectedBtn = screen.getByRole("button", { name: /Șterge \/ Rezolvă \(1\)/i });
    expect(resolveSelectedBtn).toBeTruthy();

    // Apasă butonul de ștergere/rezolvare bulk
    fireEvent.click(resolveSelectedBtn);

    await waitFor(() => {
      expect(onPatchClaimsBulk).toHaveBeenCalledWith(["claim-1"], { alerteAck: true });
    });
    expect(onNotify).toHaveBeenCalledWith(expect.stringContaining("1 alertă ștearsă/rezolvată"), "success");
  });

  it("permite 'Selectează tot' și ștergerea tuturor alertelor din categorie", async () => {
    const onPatchClaimsBulk = vi.fn().mockResolvedValue(true);
    const onNotify = vi.fn();

    render(
      <AlerteModal
        claims={sampleClaims}
        alertBuckets={mockBuckets}
        initialTab="intarzieri"
        onPatchClaimsBulk={onPatchClaimsBulk}
        onNotify={onNotify}
        desktopUi
      />
    );

    // Buton Selectează tot
    const selectAllBtn = screen.getByRole("button", { name: /Selectează tot/i });
    fireEvent.click(selectAllBtn);

    // Bara bulk arată 2 selectate
    expect(screen.getByText(/2 alerte selectate/i)).toBeTruthy();

    const resolveBtn = screen.getByRole("button", { name: /Șterge \/ Rezolvă \(2\)/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(onPatchClaimsBulk).toHaveBeenCalledWith(["claim-1", "claim-2"], { alerteAck: true });
    });
  });

  it("permite rezolvarea rapidă a întregii categorii", async () => {
    const onPatchClaimsBulk = vi.fn().mockResolvedValue(true);
    const onNotify = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <AlerteModal
        claims={sampleClaims}
        alertBuckets={mockBuckets}
        initialTab="intarzieri"
        onPatchClaimsBulk={onPatchClaimsBulk}
        onNotify={onNotify}
        desktopUi
      />
    );

    const catClearBtn = screen.getByRole("button", { name: /Rezolvă categoria \(2\)/i });
    fireEvent.click(catClearBtn);

    await waitFor(() => {
      expect(onPatchClaimsBulk).toHaveBeenCalledWith(["claim-1", "claim-2"], { alerteAck: true });
    });
  });

  it("permite ștergerea tuturor alertelor din atelier din header", async () => {
    const onPatchClaimsBulk = vi.fn().mockResolvedValue(true);
    const onNotify = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <AlerteModal
        claims={sampleClaims}
        alertBuckets={mockBuckets}
        initialTab="intarzieri"
        onPatchClaimsBulk={onPatchClaimsBulk}
        onNotify={onNotify}
        desktopUi
      />
    );

    const clearAllBtn = screen.getByRole("button", { name: /Șterge toate \(2\)/i });
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(onPatchClaimsBulk).toHaveBeenCalledWith(["claim-1", "claim-2"], { alerteAck: true });
    });
  });
});
