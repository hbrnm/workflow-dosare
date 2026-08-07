import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStatusAlertDays,
  getClaimAlertDays,
  cacheStatusAlertOverrides,
  getStatusAlertOverrides,
} from '../config';

function mockLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

describe('status alert thresholds', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getStatusAlertDays falls back to STATUSES.alertDays', () => {
    expect(getStatusAlertDays('deschidere')).toBe(3);
    expect(getStatusAlertDays('in_lucru')).toBe(7);
    expect(getStatusAlertDays('predat_client')).toBe(14);
  });

  it('getStatusAlertDays uses Setări overrides map', () => {
    expect(getStatusAlertDays('deschidere', { deschidere: 2 })).toBe(2);
    expect(getStatusAlertDays('in_lucru', { in_lucru: 1 })).toBe(1);
  });

  it('cacheStatusAlertOverrides persists and is read by getClaimAlertDays', () => {
    cacheStatusAlertOverrides({
      deschidere: 2,
      reconstatare: 3,
      accept_plata: 3,
      piese_comandate: 4,
      programat: 3,
      in_lucru: 7,
      gata_de_ridicare: 1,
      predat_client: 10,
      facturat: 30,
    });
    expect(getStatusAlertOverrides().deschidere).toBe(2);
    expect(getClaimAlertDays({ status: 'deschidere', termenAlertaZile: 99 })).toBe(2);
    expect(getClaimAlertDays({ status: 'predat_client', termenAlertaZile: 3 })).toBe(10);
    expect(getClaimAlertDays({ status: 'in_lucru' })).toBe(7);
  });

  it('getClaimAlertDays ignores frozen termenAlertaZile on claim', () => {
    expect(getClaimAlertDays({ status: 'programat', termenAlertaZile: 1 })).toBe(3);
    expect(getClaimAlertDays({ status: 'in_lucru', termenAlertaZile: 1 })).toBe(7);
  });
});
