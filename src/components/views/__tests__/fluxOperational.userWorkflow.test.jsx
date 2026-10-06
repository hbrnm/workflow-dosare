// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { PhaseCardRedesign, StackedPhaseCardGroup } from "../../views/FluxOperational";
import FluxOperational from "../../views/FluxOperational";
import { emptyClaim } from "../../../utils/claimModel";
import { STATUSES } from "../../../constants/config";

describe("FluxOperational & Card Workflow Integration Tests", () => {
  let sampleClaim;
  let onMoveToStatusMock;
  let onOpenMock;
  let onNotifyMock;

  beforeEach(() => {
    cleanup();
    onMoveToStatusMock = vi.fn();
    onOpenMock = vi.fn();
    onNotifyMock = vi.fn();

    sampleClaim = {
      ...emptyClaim("deschidere"),
      id: "dosar-test-1",
      numarDosar: "DOS-2026-001",
      numarInmatriculare: "B 123 ABC",
      client: "Ion Popescu",
      marcaModel: "Dacia Duster",
    };
  });

  describe("PhaseCardRedesign — Comportament Card Utilizator", () => {
    it("afișează numărul de înmatriculare, dosar și clientul", () => {
      render(
        <PhaseCardRedesign
          claim={sampleClaim}
          onOpen={onOpenMock}
          onMoveToStatus={onMoveToStatusMock}
          hideStatusSelect={false}
        />
      );

      expect(screen.getByText("B 123 ABC")).toBeDefined();
      expect(screen.getByText(/DOS-2026-001/)).toBeDefined();
      expect(screen.getByText("Ion Popescu")).toBeDefined();
    });

    it("utilizatorul schimbă stadiul din selectorul cardului și declanșează onMoveToStatus fără a deschide dosarul", () => {
      render(
        <PhaseCardRedesign
          claim={sampleClaim}
          onOpen={onOpenMock}
          onMoveToStatus={onMoveToStatusMock}
          hideStatusSelect={false}
        />
      );

      const select = screen.getByTitle("Schimbă stadiul dosarului");
      expect(select.value).toBe("deschidere");

      // Utilizatorul alege „Piese comandate”
      fireEvent.change(select, { target: { value: "piese_comandate" } });

      expect(onMoveToStatusMock).toHaveBeenCalledTimes(1);
      expect(onMoveToStatusMock).toHaveBeenCalledWith(sampleClaim, "piese_comandate");
      // Nu trebuie să se deschidă modalul dosarului (stopPropagation)
      expect(onOpenMock).not.toHaveBeenCalled();
    });

    it("în modul compact (hideStatusSelect=true), selectorul rapid este prezent și funcționează", () => {
      render(
        <PhaseCardRedesign
          claim={sampleClaim}
          onOpen={onOpenMock}
          onMoveToStatus={onMoveToStatusMock}
          hideStatusSelect={true}
        />
      );

      const compactSelect = screen.getByTitle(
        "Mută dosarul direct în alt stadiu (sau trage cardul pe etapele de sus)"
      );
      expect(compactSelect.value).toBe("deschidere");

      // Utilizatorul alege „Reparație”
      fireEvent.change(compactSelect, { target: { value: "in_lucru" } });

      expect(onMoveToStatusMock).toHaveBeenCalledWith(sampleClaim, "in_lucru");
      expect(onOpenMock).not.toHaveBeenCalled();
    });

    it("utilizatorul dă click pe card pentru a deschide detaliile dosarului", () => {
      render(
        <PhaseCardRedesign
          claim={sampleClaim}
          onOpen={onOpenMock}
          onMoveToStatus={onMoveToStatusMock}
          hideStatusSelect={true}
        />
      );

      const card = screen.getByText("B 123 ABC").closest(".app-flux-card");
      fireEvent.click(card);

      expect(onOpenMock).toHaveBeenCalledTimes(1);
      expect(onOpenMock).toHaveBeenCalledWith(sampleClaim);
    });
  });

  describe("StackedPhaseCardGroup — Dosare Stivuite pe aceeași mașină", () => {
    it("când sunt multiple dosare pe aceeași mașină, schimbarea stadiului din grup mută toate dosarele stivuite", () => {
      const claim1 = { ...sampleClaim, id: "c1", status: "deschidere" };
      const claim2 = { ...sampleClaim, id: "c2", status: "deschidere" };
      const groupClaims = [claim1, claim2];

      render(
        <StackedPhaseCardGroup
          groupKey="B 123 ABC"
          groupClaims={groupClaims}
          onOpen={onOpenMock}
          onMoveToStatus={onMoveToStatusMock}
          onNotify={onNotifyMock}
        />
      );

      // Verificăm insigna multiplicator „×2”
      expect(screen.getByText("×2")).toBeDefined();

      const groupSelect = screen.getByTitle(
        "Mută toate cele 2 dosare stivuite de pe B 123 ABC în alt stadiu"
      );
      expect(groupSelect.value).toBe("deschidere");

      fireEvent.change(groupSelect, { target: { value: "in_lucru" } });

      // Ambele dosare trebuie mutate
      expect(onMoveToStatusMock).toHaveBeenCalledWith(claim1, "in_lucru");
      expect(onMoveToStatusMock).toHaveBeenCalledWith(claim2, "in_lucru");
      expect(onNotifyMock).toHaveBeenCalledWith(
        expect.stringContaining("Toate cele 2 dosare de pe B 123 ABC au fost mutate"),
        "success"
      );
    });
  });

  describe("FluxOperational View — Întregul Tablou Operațional", () => {
    it("randează corect etapele vizibile și distribuția dosarelor", () => {
      const claims = [
        { ...sampleClaim, id: "c1", status: "deschidere" },
        { ...sampleClaim, id: "c2", status: "piese_comandate", numarInmatriculare: "B 999 ZZZ" },
      ];

      render(
        <FluxOperational
          claims={claims}
          onOpenClaim={onOpenMock}
          onMoveToStatus={onMoveToStatusMock}
          onNotify={onNotifyMock}
        />
      );

      // Verificăm prezența numerelor pe tabloul operațional
      expect(screen.getAllByText("B 123 ABC").length).toBeGreaterThan(0);
      expect(screen.getAllByText("B 999 ZZZ").length).toBeGreaterThan(0);
    });

    it("utilizatorul trage un card pe zona altei etape (Drag & Drop) și mută dosarul", () => {
      const claims = [
        { ...sampleClaim, id: "c1", status: "deschidere" },
        { ...sampleClaim, id: "c2", status: "piese_comandate", numarInmatriculare: "B 777 XYZ" },
      ];

      const { container } = render(
        <FluxOperational
          claims={claims}
          onOpenClaim={onOpenMock}
          onMoveToStatus={onMoveToStatusMock}
          onNotify={onNotifyMock}
        />
      );

      const targetSection = container.querySelector("#flux-stage-piese_comandate");
      expect(targetSection).not.toBeNull();

      // Simulăm drop-ul cu payload JSON de drag
      const dragPayload = JSON.stringify({ claimId: "c1", claimIds: ["c1"] });
      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: (format) => (format === "text/plain" ? dragPayload : ""),
        },
      };

      fireEvent.drop(targetSection, dropEvent);

      expect(onMoveToStatusMock).toHaveBeenCalledWith(claims[0], "piese_comandate");
    });
  });
});
