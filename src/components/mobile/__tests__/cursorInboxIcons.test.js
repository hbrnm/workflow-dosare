import { describe, it, expect } from "vitest";
import {
  LayoutGrid,
  Crosshair,
  RotateCcw,
  CheckCircle2,
  Folder,
  FolderPlus,
  Search,
  Mic,
  Plus,
} from "lucide-react";

describe("Cursor inbox lucide icons", () => {
  it("exports the icons used by the mobile inbox chrome", () => {
    [
      LayoutGrid,
      Crosshair,
      RotateCcw,
      CheckCircle2,
      Folder,
      FolderPlus,
      Search,
      Mic,
      Plus,
    ].forEach((Icon) => {
      expect(Icon).toBeTruthy();
    });
  });
});
