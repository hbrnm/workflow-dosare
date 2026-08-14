import { describe, it, expect } from 'vitest';
import {
  ALERT_GROUPS,
  resolveAlertGroupKey,
  countAlertsForGroup,
  getAlertTypesForTab,
} from '../alertCategories';

describe('alert groups', () => {
  it('exposes four compact UI groups (without Blocate)', () => {
    expect(ALERT_GROUPS.map((g) => g.key)).toEqual([
      'intarzieri',
      'piese',
      'predare',
      'plati',
    ]);
    expect(ALERT_GROUPS.every((g) => g.label.length <= 12)).toBe(true);
  });

  it('maps fine types into groups', () => {
    expect(resolveAlertGroupKey('stagnate')).toBe('intarzieri');
    expect(resolveAlertGroupKey('accept_plata')).toBe('plati');
    expect(resolveAlertGroupKey('masini_schimb')).toBe('predare');
    expect(getAlertTypesForTab('piese')).toEqual([
      'livrare_piese',
      'piese',
    ]);
    expect(getAlertTypesForTab('plati')).toEqual([
      'accept_plata',
      'restante',
    ]);
  });

  it('counts group totals from type counts', () => {
    const counts = {
      stagnate: 2,
      inactivitate: 1,
      piese: 1,
      livrare_piese: 3,
      accept_plata: 2,
      restante: 1,
    };
    expect(countAlertsForGroup(counts, 'intarzieri')).toBe(3);
    expect(countAlertsForGroup(counts, 'piese')).toBe(4);
    expect(countAlertsForGroup(counts, 'plati')).toBe(3);
  });
});
