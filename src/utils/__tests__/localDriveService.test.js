import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkDriveStatus,
  getDriveCars,
  createDriveCar,
  pushClaimToDrive,
  organizeDriveFiles,
  updateDriveCarStatus,
} from "../localDriveService";

describe("localDriveService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("checkDriveStatus returns connected true when network-info succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        localIp: "192.168.1.50",
        port: 3000,
        baseDir: "C:\\Users\\pc1\\Desktop\\DOSARE",
        totalCars: 87,
      }),
    });

    const status = await checkDriveStatus();
    expect(status.connected).toBe(true);
    expect(status.localIp).toBe("192.168.1.50");
    expect(status.totalKnownCars).toBe(87);
  });

  it("checkDriveStatus returns connected false when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    const status = await checkDriveStatus();
    expect(status.connected).toBe(false);
  });

  it("getDriveCars calls /api/cars and returns car list", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { name: "B 123 ABC", totalFiles: 12 },
        { name: "CJ 01 XYZ", totalFiles: 5 },
      ],
    });

    const cars = await getDriveCars();
    expect(cars).toHaveLength(2);
    expect(cars[0].name).toBe("B 123 ABC");
  });

  it("createDriveCar POSTs normalized plate and payload", async () => {
    let capturedBody = null;
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, plate: "B-999-ZZZ" }),
      });
    });

    const res = await createDriveCar("b-999-zzz", { clientName: "Ion Popescu" });
    expect(res.success).toBe(true);
    expect(capturedBody.plate).toBe("B-999-ZZZ");
    expect(capturedBody.clientName).toBe("Ion Popescu");
  });

  it("pushClaimToDrive maps claim fields correctly to hard drive status", async () => {
    let capturedBody = null;
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    const claim = {
      id: "claim-1",
      numarInmatriculare: "B 100 ABC",
      numarDosar: "DOS-2026-001",
      status: "in_lucru",
      client: "Vasile",
      telefonClient: "0712345678",
      asigurator: "Allianz-Tiriac",
      vin: "WAUZZZ8V123456",
      ceEsteDeReparat: "Bara fata + aripa",
      observatii: "Vopsire completa",
    };

    const res = await pushClaimToDrive(claim);
    expect(res.success).toBe(true);
    expect(capturedBody.plate).toBe("B 100 ABC");
    expect(capturedBody.numarDosar).toBe("DOS-2026-001");
    expect(capturedBody.workflowStatus).toBe("in_lucru");
    expect(capturedBody.clientName).toBe("Vasile");
  });

  it("organizeDriveFiles calls organize endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, organizedCount: 4 }),
    });

    const res = await organizeDriveFiles("B 123 ABC");
    expect(res.success).toBe(true);
    expect(res.organizedCount).toBe(4);
  });

  it("updateDriveCarStatus updates status.json metadata", async () => {
    let capturedBody = null;
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    const res = await updateDriveCarStatus("B 123 ABC", {
      workflowStatus: "gata_de_ridicare",
      notes: "Masina spalata",
    });
    expect(res.success).toBe(true);
    expect(capturedBody.workflowStatus).toBe("gata_de_ridicare");
    expect(capturedBody.notes).toBe("Masina spalata");
  });
});