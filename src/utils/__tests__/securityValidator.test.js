import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeLicensePlate,
  sanitizeVin,
  sanitizePhoneNumber,
} from "../securityValidator";

describe("securityValidator - XSS Prevention & Input Validation", () => {
  describe("sanitizeText", () => {
    it("elimină tag-urile HTML și script-urile malițioase", () => {
      const malicious = '<script>alert("XSS")</script>Client Nume<b>Bold</b>';
      const clean = sanitizeText(malicious);
      expect(clean).toBe('alert("XSS")Client NumeBold');
      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("</script>");
    });

    it("respectă limita maximă de caractere", () => {
      const longStr = "A".repeat(600);
      expect(sanitizeText(longStr, 100).length).toBe(100);
    });
  });

  describe("sanitizeUrl", () => {
    it("permite URL-uri HTTPS și HTTP valide", () => {
      expect(sanitizeUrl("https://storage.supabase.co/file.pdf")).toBe("https://storage.supabase.co/file.pdf");
      expect(sanitizeUrl("http://localhost:5173/test")).toBe("http://localhost:5173/test");
    });

    it("blochează schemele periculoase javascript: și data:text/html", () => {
      expect(sanitizeUrl('javascript:alert("XSS")')).toBe("");
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
      expect(sanitizeUrl("vbscript:msgbox(1)")).toBe("");
    });
  });

  describe("sanitizeLicensePlate", () => {
    it("păstrează doar litere mari, cifre și spații/cratime", () => {
      expect(sanitizeLicensePlate("b-123-abc; DROP TABLE;")).toBe("B-123-ABC DROP");
      expect(sanitizeLicensePlate(" <script> B 99 XYZ </script> ")).toBe("SCRIPT B 99 XYZ");
    });
  });

  describe("sanitizeVin", () => {
    it("curăță caracterele speciale din seria de șasiu", () => {
      expect(sanitizeVin("wvwzzz1kz9w123456!@#")).toBe("WVWZZZ1KZ9W123456");
      expect(sanitizeVin("VF1BB000000000000_EXTRA")).toBe("VF1BB000000000000");
    });
  });

  describe("sanitizePhoneNumber", () => {
    it("permite doar cifre și prefixul +", () => {
      expect(sanitizePhoneNumber("+40 722 123 456")).toBe("+40722123456");
      expect(sanitizePhoneNumber("0722-123-456 ext 100")).toBe("0722123456100");
    });
  });
});
