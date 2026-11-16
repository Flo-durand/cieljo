import { describe, expect, it } from 'vitest';
import { SEATS, seatOpponents } from './seating';
import { players } from './testHelpers';

// The places used for each number of players (see USED_SEATS in seating.js)
const EXPECTED = {
  2: ['top'],
  3: ['left', 'right'],
  4: ['left', 'top', 'right'],
  5: ['left', 'top-left', 'top-right', 'right'],
  6: ['left', 'top-left', 'top', 'top-right', 'right'],
  7: ['bottom-left', 'left', 'top-left', 'top-right', 'right', 'bottom-right'],
  8: ['bottom-left', 'left', 'top-left', 'top', 'top-right', 'right', 'bottom-right'],
};

const usedSeats = seats => SEATS.filter(seat => seats[seat].length > 0);
const seatedIds = seats => SEATS.flatMap(seat => seats[seat].map(player => player.id));

describe('seatOpponents', () => {
  it.each(Object.entries(EXPECTED))('uses the expected places with %s players', (count, places) => {
    const seats = seatOpponents(players(Number(count)));

    expect(usedSeats(seats)).toEqual(places);
  });

  it('never puts more than one player in a place', () => {
    for (let count = 2; count <= 8; count += 1) {
      const seats = seatOpponents(players(count));
      expect(SEATS.every(seat => seats[seat].length <= 1)).toBe(true);
    }
  });

  it('seats the opponents clockwise, starting with the player right after the current one', () => {
    // 8 players, the current user is player 3: the next one (4) sits at the bottom left, the previous one (2)
    // at the bottom right
    const seats = seatOpponents(players(8, { me: 3 }));

    expect(seatedIds(seats)).toEqual([4, 5, 6, 7, 8, 1, 2]);
    expect(seats['bottom-left'][0].id).toBe(4);
    expect(seats['bottom-right'][0].id).toBe(2);
  });

  it('never seats the current user among the opponents', () => {
    for (let me = 1; me <= 5; me += 1) {
      expect(seatedIds(seatOpponents(players(5, { me })))).not.toContain(me);
    }
  });

  it('seats nobody when the current user is alone in the lobby', () => {
    expect(usedSeats(seatOpponents(players(1)))).toEqual([]);
  });
});
