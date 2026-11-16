import { describe, expect, it } from 'vitest';
import { faceUpCount, tableMessage } from './tableMessage';
import { grid, players } from './testHelpers';

const table = (overrides = {}) => {
  const all = overrides.players ?? players(2);
  return {
    me: all.find(player => player.current_user),
    players: all,
    initialReveal: false,
    initialRevealCount: 2,
    currentPlayerId: 1,
    dealing: false,
    hand: null,
    ...overrides,
  };
};

describe('tableMessage', () => {
  it('says the cards are being dealt', () => {
    expect(tableMessage(table({ dealing: true }))).toBe('Dealing the cards...');
  });

  it('counts the cards left to reveal at the start', () => {
    const none = players(2);
    const one = players(2, { grids: { 1: grid(1, { 0: 3 }) } });
    const two = players(2, { grids: { 1: grid(1, { 0: 3, 5: 8 }) } });

    expect(tableMessage(table({ players: none, initialReveal: true }))).toBe('Reveal 2 cards of your grid.');
    expect(tableMessage(table({ players: one, initialReveal: true }))).toBe('Reveal 1 card of your grid.');
    expect(tableMessage(table({ players: two, initialReveal: true })))
      .toBe('Waiting for the other players to reveal their cards...');
  });

  it("says whose turn it is when it is another player's", () => {
    expect(tableMessage(table({ currentPlayerId: 2 }))).toBe("It's player_2's turn.");
  });

  it('guides the current player through their turn', () => {
    expect(tableMessage(table())).toBe('Your turn: draw a card from the draw pile, or take the discard pile card.');
    expect(tableMessage(table({ hand: { drawn_from: 'draw_pile' } })))
      .toBe('Drag the card onto your grid to swap it (or click it, then the card to replace), ' +
        'or click a hidden card to throw it and reveal that card.');
    expect(tableMessage(table({ hand: { drawn_from: 'discard_pile' } })))
      .toBe('Drag the card onto your grid to swap it (or click it, then the card to replace).');
  });

  it('tells how to finish a swap by clicks once the card in hand is selected', () => {
    const message = 'Click the card of your grid to replace, or click your card again to cancel.';
    expect(tableMessage(table({ hand: { drawn_from: 'draw_pile' }, handSelected: true }))).toBe(message);
    expect(tableMessage(table({ hand: { drawn_from: 'discard_pile' }, handSelected: true }))).toBe(message);
  });

  it('puts the notice first', () => {
    expect(tableMessage(table({ currentPlayerId: 2, notice: 'player_3 left the game.' })))
      .toBe("player_3 left the game. It's player_2's turn.");
  });

  it('reminds that it is the last round, after the notice', () => {
    expect(tableMessage(table({ currentPlayerId: 2, lastRound: true, roundEnderId: 1, notice: 'Column removed!' })))
      .toBe("Column removed! Last round: you revealed all your cards. It's player_2's turn.");
  });

  it('gives the winners once the round is scored', () => {
    const scored = players(2).map((player, index) => ({ ...player, score: [12, 3][index] }));

    expect(tableMessage(table({ players: scored, currentPlayerId: null, lastRound: false, roundScored: true })))
      .toBe('The round is over: player_2 wins!');
  });
});

describe('faceUpCount', () => {
  it('counts the face-up cards of a grid', () => {
    expect(faceUpCount({ grid: grid(1, { 1: 0, 2: -1, 11: 12 }) })).toBe(3);
  });
});
