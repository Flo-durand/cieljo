import { describe, expect, it } from 'vitest';
import { lastRoundText, roundRanking, winnersText } from './roundScores';
import { players } from './testHelpers';

// Players 1..count with the given scores; player 1 is the current user unless `me` says otherwise
const scored = (scores, { me = 1 } = {}) =>
  players(scores.length, { me }).map((player, index) => ({ ...player, score: scores[index] }));

describe('roundRanking', () => {
  it('ranks the players from the lowest score to the highest', () => {
    const ranking = roundRanking(scored([30, 10, 20]));

    expect(ranking.map(player => [player.id, player.rank])).toEqual([[2, 1], [3, 2], [1, 3]]);
  });

  it('gives tied players the same rank, in turn order', () => {
    const ranking = roundRanking(scored([20, 5, 5, 20]));

    expect(ranking.map(player => [player.id, player.rank])).toEqual([[2, 1], [3, 1], [1, 3], [4, 3]]);
  });

  it('ranks negative scores first', () => {
    expect(roundRanking(scored([0, -3]))[0].id).toBe(2);
  });
});

describe('winnersText', () => {
  it('names a single winner', () => {
    expect(winnersText(scored([1, 9]))).toBe('you win!');
    expect(winnersText(scored([9, 1]))).toBe('player_2 wins!');
  });

  it('names every winner on a tie, the current user first', () => {
    expect(winnersText(scored([4, 4], { me: 2 }))).toBe('you and player_1 win!');
    expect(winnersText(scored([9, 4, 4, 4]))).toBe('player_2, player_3 and player_4 win!');
  });
});

describe('lastRoundText', () => {
  const all = players(2);

  it('says nothing before the last round', () => {
    expect(lastRoundText({ lastRound: false, roundEnderId: null, players: all })).toBe('');
  });

  it('says who ended the round', () => {
    expect(lastRoundText({ lastRound: true, roundEnderId: 1, players: all }))
      .toBe('Last round: you revealed all your cards.');
    expect(lastRoundText({ lastRound: true, roundEnderId: 2, players: all }))
      .toBe('Last round: player_2 revealed all their cards.');
  });

  it('still says it is the last round when that player has quit', () => {
    expect(lastRoundText({ lastRound: true, roundEnderId: null, players: all })).toBe('Last round!');
  });
});
