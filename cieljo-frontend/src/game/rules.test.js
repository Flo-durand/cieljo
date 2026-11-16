import { describe, expect, it } from 'vitest';
import { rulesFromApi } from './rules';

describe('rulesFromApi', () => {
  it('reads the rules sent by the API', () => {
    const rules = rulesFromApi({ grid_rows: 3, grid_columns: 4, initial_reveal_count: 2, max_players: 8 });

    expect(rules).toEqual({ gridRows: 3, gridColumns: 4, initialRevealCount: 2, maxPlayers: 8 });
  });
});
