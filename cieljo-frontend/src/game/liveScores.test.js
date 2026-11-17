import { describe, expect, it } from 'vitest';
import { livePoints, pointsText } from './liveScores';
import { grid, players } from './testHelpers';

describe('livePoints', () => {
  it('adds up the face-up cards only', () => {
    const [player] = players(1, { grids: { 1: grid(1, [5, undefined, -2, 12]) } });

    expect(livePoints(player)).toBe(15);
  });

  it('is 0 before any card is revealed', () => {
    expect(livePoints(players(1)[0])).toBe(0);
  });

  it('no longer counts a removed column', () => {
    const [player] = players(1, { grids: { 1: grid(1, [3, 4, 4, 4, 3, 4, 4, 4]) } });
    player.grid = player.grid.filter(card => card.column !== 0);

    expect(livePoints(player)).toBe(24);
  });

  it('shows the points saved by the server once the round is scored', () => {
    const [player] = players(1, { grids: { 1: grid(1, [5, 5]) } });

    expect(livePoints({ ...player, round_points: 20 })).toBe(20);
    expect(livePoints({ ...player, round_points: 0 })).toBe(0);
  });
});

describe('pointsText', () => {
  it('uses the singular for one point only', () => {
    expect(pointsText(14)).toBe('14 pts');
    expect(pointsText(1)).toBe('1 pt');
    expect(pointsText(-1)).toBe('-1 pt');
    expect(pointsText(0)).toBe('0 pts');
  });
});
