import { roundRanking } from '../game/roundScores';
import './RoundScores.scss';

// The scores at the end of the round, shown in the middle of the table over the piles, which fade out (the grids
// stay around, every card face up). The lowest score wins; the points of the player who ended the round without
// the lowest score are doubled (round_doubled).
// entering fades the scores in, once the last cards have flipped over.
export default function RoundScores({ players, onBack, busy = false, entering = false }) {
  const ranking = roundRanking(players);

  return (
    <div className={`round-scores ${entering ? 'round-scores--entering' : ''}`}>
      <h1 className="round-scores__title">Round over</h1>
      <table className="round-scores__table">
        <caption className="round-scores__caption">Scores of the round, the lowest score wins</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Player</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map(player => (
            <tr
              key={player.id}
              className={[
                player.rank === 1 && 'round-scores__row--winner',
                player.current_user && 'round-scores__row--me',
              ].filter(Boolean).join(' ')}
            >
              <td>{player.rank === 1 ? <span aria-label="Winner">🏆</span> : player.rank}</td>
              <th scope="row" className="round-scores__name">
                {player.username}{player.current_user && ' (you)'}
              </th>
              <td className="round-scores__points">
                {player.score}
                {player.round_doubled && (
                  <span
                    className="round-scores__doubled"
                    title="Doubled: this player ended the round without the lowest score"
                  >
                    {' '}×2<span className="round-scores__caption"> (doubled: ended the round without the lowest score)</span>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn--success round-scores__back" onClick={onBack} disabled={busy}>
        Back to the home page
      </button>
    </div>
  );
}
