import { describe, it, expect } from "vitest";
import { buildAppTokensFromTheme, applyThemeToRoot } from "../themeApply";
import { getMobileTheme, MOBILE_THEME_LIST } from "../mobileThemes";

describe("buildAppTokensFromTheme", () => {
  it("maps mobile vars to app tokens for atelier", () => {
    const theme = getMobileTheme("atelier");
    const tokens = buildAppTokensFromTheme(theme);
    expect(tokens["--app-bg"]).toBe(theme.vars["--m-bg"]);
    expect(tokens["--app-surface"]).toBe(theme.vars["--m-surface"]);
    expect(tokens["--app-chrome"]).toBe(theme.vars["--m-header"]);
    expect(tokens["--app-accent"]).toBe(theme.vars["--m-accent"]);
  });

  it("applies theme fonts when present", () => {
    const theme = getMobileTheme("sport");
    const tokens = buildAppTokensFromTheme(theme);
    expect(tokens["--app-font-body"]).toBe(theme.fonts.body);
    expect(tokens["--app-font-display"]).toBe(theme.fonts.display);
  });

  it("covers all registered themes", () => {
    MOBILE_THEME_LIST.forEach((theme) => {
      const tokens = buildAppTokensFromTheme(theme);
      expect(tokens["--app-bg"]).toBeTruthy();
      expect(tokens["--app-text"]).toBeTruthy();
    });
  });
});

describe("applyThemeToRoot", () => {
  function mockRoot() {
    const style = { props: {} };
    style.setProperty = (key, val) => { style.props[key] = val; };
    style.getPropertyValue = (key) => style.props[key] || "";
    return { dataset: {}, style };
  }

  it("sets data-mtheme and CSS vars on element", () => {
    const el = mockRoot();
    applyThemeToRoot(el, { themeId: "forge" });
    expect(el.dataset.mtheme).toBe("forge");
    expect(el.style.getPropertyValue("--m-bg")).toBe("#010409");
    expect(el.style.getPropertyValue("--app-bg")).toBe("#010409");
  });

  it("brand accent overrides theme accent", () => {
    const el = mockRoot();
    applyThemeToRoot(el, { themeId: "atelier", accentColor: "#FF0000" });
    expect(el.style.getPropertyValue("--app-accent")).toBe("#FF0000");
    expect(el.style.getPropertyValue("--brand-accent")).toBe("#FF0000");
  });
});
