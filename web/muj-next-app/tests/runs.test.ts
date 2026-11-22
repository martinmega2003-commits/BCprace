import { describe, expect, it } from 'vitest';
import { MAX_BODU, ulozBehSchema } from '@/lib/runs';

function platnyBeh() {
  return {
    external_id: '3f8a1c2e-5b6d-4e7f-8a9b-0c1d2e3f4a5b',
    started_at: '2026-11-21T17:30:00.000Z',
    elapsed_time_s: 1800,
    moving_time_s: 1750,
    distance_m: 5000,
    body: [
      { cas: 1763746200000, lat: 49.19, lon: 16.6, presnost: 5, segment: 0 },
      { cas: 1763746201000, lat: 49.1901, lon: 16.6001, presnost: 6, segment: 0 },
    ],
  };
}

describe('ulozBehSchema', () => {
  it('platny beh projde', () => {
    expect(ulozBehSchema.safeParse(platnyBeh()).success).toBe(true);
  });

  it('spatne UUID neprojde', () => {
    const beh = { ...platnyBeh(), external_id: 'abc' };
    expect(ulozBehSchema.safeParse(beh).success).toBe(false);
  });

  it('zaporna vzdalenost neprojde', () => {
    const beh = { ...platnyBeh(), distance_m: -5 };
    expect(ulozBehSchema.safeParse(beh).success).toBe(false);
  });

  it('souradnice mimo rozsah neprojde', () => {
    const beh = platnyBeh();
    beh.body[0].lat = 95;
    expect(ulozBehSchema.safeParse(beh).success).toBe(false);
  });

  it('jeden bod nestaci', () => {
    const beh = platnyBeh();
    beh.body = [beh.body[0]];
    expect(ulozBehSchema.safeParse(beh).success).toBe(false);
  });

  it('vic nez MAX_BODU neprojde', () => {
    const beh = platnyBeh();
    const bod = beh.body[0];
    beh.body = [];
    for (let poradi = 0; poradi <= MAX_BODU; poradi = poradi + 1) {
      beh.body.push({ ...bod, cas: bod.cas + poradi * 1000 });
    }
    expect(ulozBehSchema.safeParse(beh).success).toBe(false);
  });
});