import { describe, expect, it } from 'vitest';
import { findDepartedPlayers, findRemovedColumns, ghostCards, mostFrequentValue } from './tableChanges';
import { grid, players } from './testHelpers';

// The grid of player 1 after its column `column` was removed
const withoutColumn = (cards, column) => cards.filter(card => card.column !== column);

describe('findRemovedColumns', () => {
  it('finds a column that is gone, with its value and owner', () => {
    // Column 2 holds three 7s (indexes 2, 6 and 10)
    const before = players(2, { grids: { 1: grid(1, { 2: 7, 6: 7, 10: 7 }) } });
    const after = players(2, { grids: { 1: withoutColumn(before[0].grid, 2) } });

    expect(findRemovedColumns(before, after, { value: 7 })).toEqual([
      { playerId: 1, column: 2, value: 7, username: 'player_1', isMe: true },
    ]);
  });

  it('takes the value shared by the face-up cards, even if one of them was just replaced', () => {
    // Before the swap: two 5s and a face-down card; the swap made the column three 5s, then removed it
    const before = players(2, { grids: { 2: grid(2, { 0: 5, 4: 5 }) } });
    const after = players(2, { grids: { 2: withoutColumn(before[1].grid, 0) } });

    expect(findRemovedColumns(before, after, { value: 5 })[0]).toMatchObject({ playerId: 2, column: 0, value: 5 });
  });

  it('finds nothing when the columns did not change', () => {
    const before = players(3);

    expect(findRemovedColumns(before, players(3), null)).toEqual([]);
  });

  it('ignores the deal (empty grids before) and a player who left', () => {
    const lobby = players(2, { grids: { 1: [], 2: [] } });
    const dealt = players(2);

    expect(findRemovedColumns(lobby, dealt, null)).toEqual([]);
    expect(findRemovedColumns(players(3), players(2), null)).toEqual([]);
  });
});

describe('findDepartedPlayers', () => {
  it('finds the players who left the table', () => {
    const before = players(4);
    const after = before.filter(player => player.id !== 3);

    expect(findDepartedPlayers(before, after).map(player => player.username)).toEqual(['player_3']);
  });

  it('finds nobody when the same players are there', () => {
    expect(findDepartedPlayers(players(3), players(3))).toEqual([]);
  });
});

describe('mostFrequentValue', () => {
  it('returns the most frequent value of the face-up cards', () => {
    const cards = [{ face_up: true, value: 4 }, { face_up: true, value: 9 }, { face_up: true, value: 4 }];

    expect(mostFrequentValue(cards)).toBe(4);
  });

  it('ignores face-down cards and returns undefined without face-up cards', () => {
    expect(mostFrequentValue([{ face_up: false, value: null }])).toBeUndefined();
  });
});

describe('ghostCards', () => {
  it('builds the 3 face-up cards of a removed column', () => {
    const cards = ghostCards({ playerId: 2, column: 1, value: -2 }, 3);

    expect(cards.map(card => [card.row, card.column, card.value, card.face_up])).toEqual([
      [0, 1, -2, true], [1, 1, -2, true], [2, 1, -2, true],
    ]);
    expect(new Set(cards.map(card => card.id)).size).toBe(3);
  });
});
