import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FolderOpen } from 'lucide-react';
import {
  MOBILE_THEMES,
  MOBILE_THEME_LIST,
  MOBILE_THEME_STORAGE_KEY,
  getMobileTheme,
  loadMobileThemeId,
  saveMobileThemeId,
} from '../mobileThemes';

function installMemoryStorage() {
  const store = new Map();
  const memory = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  globalThis.localStorage = memory;
  return memory;
}

describe('mobileThemes', () => {
  beforeEach(() => {
    installMemoryStorage().clear();
  });

  afterEach(() => {
    installMemoryStorage().clear();
  });

  it('exposes six named themes with distinct palettes', () => {
    expect(MOBILE_THEME_LIST).toHaveLength(6);
    expect(Object.keys(MOBILE_THEMES).sort()).toEqual([
      'agora',
      'atelier',
      'forge',
      'guide',
      'pulse',
      'sport',
    ]);
    const accents = new Set(MOBILE_THEME_LIST.map((t) => t.vars['--m-accent']));
    expect(accents.size).toBe(6);
  });

  it('forge uses GitHub-like inbox home and floating dock', () => {
    const forge = getMobileTheme('forge');
    expect(forge.homeStyle).toBe('inbox');
    expect(forge.navStyle).toBe('pill');
    expect(forge.labels.brief).toBe('Brief');
    expect(forge.labels.dosare).toBe('Dosare');
    expect(forge.labels.programari).toBe('Programări');
    expect(forge.icons.dosare).toBe(FolderOpen);
    expect(forge.vars['--m-bg']).toBe('#010409');
    expect(forge.vars['--m-nav-active']).toBe('#58A6FF');
  });

  it('returns atelier for unknown ids', () => {
    expect(getMobileTheme('missing').id).toBe('atelier');
    expect(getMobileTheme(undefined).id).toBe('atelier');
  });

  it('persists theme id in localStorage', () => {
    expect(loadMobileThemeId()).toBe('atelier');
    saveMobileThemeId('forge');
    expect(localStorage.getItem(MOBILE_THEME_STORAGE_KEY)).toBe('forge');
    expect(loadMobileThemeId()).toBe('forge');
  });

  it('falls back when stored id is invalid', () => {
    localStorage.setItem(MOBILE_THEME_STORAGE_KEY, 'not-a-theme');
    expect(loadMobileThemeId()).toBe('atelier');
  });

  it('each theme has icons, labels, nav and header styles', () => {
    for (const theme of MOBILE_THEME_LIST) {
      expect(theme.icons.capture).toBeTruthy();
      expect(theme.icons.brief).toBeTruthy();
      expect(theme.icons.dosare).toBeTruthy();
      expect(theme.icons.programari).toBeTruthy();
      expect(theme.labels.capture).toBeTruthy();
      expect(['dock', 'pill', 'underline']).toContain(theme.navStyle);
      expect(['dark', 'light', 'brand']).toContain(theme.headerStyle);
    }
  });
});
