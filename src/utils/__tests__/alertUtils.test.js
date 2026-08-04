import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isReadyForPickupOverdue, isStageOverdue, isInactiveClaim } from '../alertUtils';

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString();
}

describe('alertUtils', () => {
  beforeEach(() => {
    // freeze time to a known timestamp
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('isReadyForPickupOverdue should detect unpicked cars past threshold', () => {
    const claim = { gataDeRidicare: true, ridicata: false, dataGataRidicare: isoDaysAgo(5) };
    expect(isReadyForPickupOverdue(claim, 3)).toBe(true);
    expect(isReadyForPickupOverdue(claim, 7)).toBe(false);
  });

  it('isStageOverdue should detect overdue stage based on dataSchimbareStatus', () => {
    const claim = { status: 'in_lucru', dataSchimbareStatus: isoDaysAgo(4), termenAlertaZile: 3 };
    expect(isStageOverdue(claim)).toBe(true);
    const claim2 = { status: 'facturat', dataSchimbareStatus: isoDaysAgo(10) };
    expect(isStageOverdue(claim2)).toBe(false);
  });

  it('isInactiveClaim should detect inactivity excluding closed statuses', () => {
    const recent = { status: 'in_lucru', dataUltimeiActualizari: isoDaysAgo(3) };
    expect(isInactiveClaim(recent, 7)).toBe(false);
    const old = { status: 'in_lucru', dataUltimeiActualizari: isoDaysAgo(10) };
    expect(isInactiveClaim(old, 7)).toBe(true);
    const closed = { status: 'facturat', dataUltimeiActualizari: isoDaysAgo(30) };
    expect(isInactiveClaim(closed, 7)).toBe(false);
  });
});
