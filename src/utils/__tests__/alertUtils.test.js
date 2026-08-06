import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isReadyForPickupOverdue,
  isStageOverdue,
  isInactiveClaim,
  isBlocked,
  isLoanerOverdue,
  isPartsArrivedUnscheduled,
  isDeliveryDeadlineOverdue,
  buildAlertBuckets,
  filterAlertItems,
  normalizeAlertTab,
} from '../alertUtils';

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString();
}

describe('alertUtils', () => {
  beforeEach(() => {
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

  it('isBlocked respects alerteAck', () => {
    expect(isBlocked({ blocat: true })).toBe(true);
    expect(isBlocked({ blocat: true, alerteAck: true })).toBe(false);
  });

  it('isLoanerOverdue detects Audatex overrun', () => {
    const claim = {
      masinaSchimb: 'Dacia Logan',
      status: 'in_lucru',
      zileChirieAudatex: 5,
      dataDariiLaSchimb: isoDaysAgo(8),
    };
    expect(isLoanerOverdue(claim)).toBe(true);
    expect(isLoanerOverdue({ ...claim, zileChirieAudatex: 10 })).toBe(false);
  });

  it('isPartsArrivedUnscheduled detects missing schedule', () => {
    expect(isPartsArrivedUnscheduled({ pieseSosite: true, dataProgramare: null })).toBe(true);
    expect(isPartsArrivedUnscheduled({ pieseSosite: true, dataProgramare: '2026-08-01' })).toBe(false);
  });

  it('isDeliveryDeadlineOverdue detects passed delivery date without confirmation', () => {
    expect(isDeliveryDeadlineOverdue({
      status: 'piese_comandate',
      pieseSosite: false,
      termenLivrarePiese: '2026-08-01',
    })).toBe(true);
    expect(isDeliveryDeadlineOverdue({
      status: 'piese_comandate',
      pieseSosite: false,
      termenLivrarePiese: '2026-08-10',
    })).toBe(false);
    expect(isDeliveryDeadlineOverdue({
      status: 'piese_comandate',
      pieseSosite: true,
      termenLivrarePiese: '2026-08-01',
    })).toBe(false);
  });

  it('normalizeAlertTab maps depasite → stagnate', () => {
    expect(normalizeAlertTab('depasite')).toBe('stagnate');
    expect(normalizeAlertTab('blocate')).toBe('blocate');
  });

  it('buildAlertBuckets returns unified counts and items', () => {
    const claims = [
      { id: '1', blocat: true, motivBlocare: 'Litigiu', status: 'in_lucru' },
      {
        id: '2',
        status: 'in_lucru',
        dataSchimbareStatus: isoDaysAgo(5),
        termenAlertaZile: 3,
      },
      {
        id: '3',
        status: 'accept_plata',
        blocat: false,
      },
      {
        id: '4',
        gataDeRidicare: true,
        ridicata: false,
        dataGataRidicare: isoDaysAgo(4),
        status: 'gata_de_ridicare',
      },
      {
        id: '5',
        pieseSosite: true,
        dataProgramare: null,
        status: 'piese_comandate',
      },
      {
        id: '6',
        masinaSchimb: 'VW Golf',
        zileChirieAudatex: 3,
        dataDariiLaSchimb: isoDaysAgo(6),
        status: 'in_lucru',
      },
      {
        id: '7',
        status: 'in_lucru',
        dataUltimeiActualizari: isoDaysAgo(10),
        dataSchimbareStatus: isoDaysAgo(1),
        termenAlertaZile: 3,
      },
      {
        id: '8',
        status: 'piese_comandate',
        pieseSosite: false,
        termenLivrarePiese: '2026-08-01',
      },
    ];

    const buckets = buildAlertBuckets(claims, { pragRidicare: 3, pragInactivitate: 7 });
    expect(buckets.counts.blocate).toBe(1);
    expect(buckets.counts.stagnate).toBe(1);
    expect(buckets.counts.depasite).toBe(1);
    expect(buckets.counts.accept_plata).toBe(1);
    expect(buckets.counts.neridicate).toBe(1);
    expect(buckets.counts.piese).toBe(1);
    expect(buckets.counts.livrare_piese).toBe(1);
    expect(buckets.counts.masini_schimb).toBe(1);
    expect(buckets.counts.inactivitate).toBe(1);
    expect(buckets.totalAlertsCount).toBe(8);
    expect(buckets.items).toHaveLength(8);

    const onlyBlocked = filterAlertItems(buckets.items, 'blocate');
    expect(onlyBlocked).toHaveLength(1);
    expect(onlyBlocked[0].type).toBe('blocate');

    const viaAlias = filterAlertItems(buckets.items, 'depasite');
    expect(viaAlias).toHaveLength(1);
    expect(viaAlias[0].type).toBe('stagnate');
  });
});
