import { describe, expect, it } from 'vitest';
import { buildDeal } from './deal';
import { players } from './testHelpers';

describe('buildDeal', () => {
  it('deals one card at a time to each player in turn, then the discard card', () => {
    const deal = buildDeal(players(3), { id: 999 });

    // Card 0 of players 1, 2, 3, then card 1 of each, and so on
    expect(deal.cardIds.slice(0, 6)).toEqual([100, 200, 300, 101, 201, 301]);
    expect(deal.cardIds).toHaveLength(36);
    expect(deal.discardCardId).toBe(999);
  });

  it('deals nothing to empty grids', () => {
    expect(buildDeal(players(2, { grids: { 1: [], 2: [] } }), null)).toEqual({ cardIds: [], discardCardId: undefined });
  });
});
