import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import ClaimModal from "../ClaimModal";
import QuickViewDrawer from "../../common/QuickViewDrawer";
import ClaimDriveTab from "../claim/ClaimDriveTab";
import { emptyClaim } from "../../../utils/claimModel";

describe("ClaimModal and Drawer render tests", () => {
  it("renders with desktopUi and full props", () => {
    const claim = emptyClaim("deschidere");
    expect(() => {
      renderToString(
        React.createElement(ClaimModal, {
          claim: claim,
          allClaims: [claim],
          onClose: () => {},
          onSave: () => {},
          onPatch: () => {},
          onDelete: () => {},
          desktopUi: true,
          userEmail: "test@example.com",
          manoperaTarife: null,
          readOnly: false,
          insurersList: ["Omniasig VIG"]
        })
      );
    }).not.toThrow();
  });

  it("renders QuickViewDrawer with claim", () => {
    const claim = emptyClaim("deschidere");
    expect(() => {
      renderToString(
        React.createElement(QuickViewDrawer, {
          claim: claim,
          onClose: () => {},
          onOpenFull: () => {},
          onPatch: () => {},
          onMoveToStatus: () => {},
          onNotify: () => {},
          canEdit: true
        })
      );
    }).not.toThrow();
  });

  it("renders ClaimDriveTab", () => {
    const claim = { ...emptyClaim("deschidere"), numarInmatriculare: "B 12 RIS" };
    expect(() => {
      renderToString(
        React.createElement(ClaimDriveTab, {
          form: claim,
          onNotify: () => {}
        })
      );
    }).not.toThrow();
  });

  it("renders ClaimModal in piese_comandate and programat statuses without error", () => {
    const claimPiese = { ...emptyClaim("piese_comandate"), numarInmatriculare: "B 12 RIS", pieseSosite: true };
    expect(() => {
      renderToString(
        React.createElement(ClaimModal, {
          claim: claimPiese,
          allClaims: [claimPiese],
          onClose: () => {},
          onSave: () => {},
          onPatch: () => {},
          desktopUi: true,
        })
      );
    }).not.toThrow();

    const claimProg = { ...emptyClaim("programat"), dataProgramare: "2026-09-20T10:00:00" };
    expect(() => {
      renderToString(
        React.createElement(ClaimModal, {
          claim: claimProg,
          allClaims: [claimProg],
          onClose: () => {},
          onSave: () => {},
          onPatch: () => {},
          desktopUi: true,
        })
      );
    }).not.toThrow();
  });
});
