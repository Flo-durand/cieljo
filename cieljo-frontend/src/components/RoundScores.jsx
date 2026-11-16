import useCountdown from '../hooks/useCountdown';
import { nextRoundText, playedRounds, roundRanking } from '../game/roundScores';
import './RoundScores.scss';

// The scores once a round is scored, shown in the middle of the table over the piles, which fade out (the grids
// stay around, every card face up): the points of each round and the total of each player, the lowest total
// first. The points of the player who ended a round without the lowest score are doubled (doubled).
// Between two rounds (roundOver), each player says they are ready (onReady); the next round starts once everyone
// is, or when the countdown to nextRoundDeadline (a time in ms, from Date.now()) ends. At the end of the game
// (once a player has reached endScore), onBack goes back to the home page.
// entering fades the scores in, once the last cards have flipped over.
export default function RoundScores({
  players, roundNumber, roundOver, endScore, nextRoundDeadline = null, onReady, onBack, busy = false, entering = false,
}) {
  const ranking = roundRanking(players);
  const rounds = playedRounds(players);
  const me = players.find(player => player.current_user);
  const secondsLeft = useCountdown(roundOver ? nextRoundDeadline : null);

  const caption = roundOver
    ? `Scores after round ${roundNumber}, the lowest total wins once a player reaches ${endScore} points`
    : 'Final scores, the lowest total wins';

  return (
    <div className={`round-scores ${entering ? 'round-scores--entering' : ''}`}>
      <h1 className="round-scores__title">{roundOver ? `Round ${roundNumber} over` : 'Game over'}</h1>
      {/* Many rounds make the table wider than the middle of the table: it scrolls sideways */}
      <div className="round-scores__scroll">
        <table className="round-scores__table">
          <caption className="round-scores__caption">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col" className="round-scores__points">Total</th>
              {rounds.map(number => (
                <th key={number} scope="col" className="round-scores__points round-scores__round">
                  <abbr title={`Round ${number}`}>R{number}</abbr>
                </th>
              ))}
              {roundOver && <th scope="col">Ready</th>}
            </tr>
          </thead>
          <tbody>
            {ranking.map(player => {
              const pointsOf = new Map((player.rounds ?? []).map(round => [round.round_number, round]));
              return (
                <tr
                  key={player.id}
                  className={[
                    player.rank === 1 && 'round-scores__row--winner',
                    player.current_user && 'round-scores__row--me',
                  ].filter(Boolean).join(' ')}
                >
                  <td>{player.rank === 1 && !roundOver ? <span aria-label="Winner">🏆</span> : player.rank}</td>
                  <th scope="row" className="round-scores__name">
                    {player.username}{player.current_user && ' (you)'}
                  </th>
                  <td className="round-scores__points round-scores__total">{player.score}</td>
                  {rounds.map(number => {
                    const round = pointsOf.get(number);
                    return (
                      <td key={number} className="round-scores__points round-scores__round">
                        {round ? round.points : '–'}
                        {round?.doubled && (
                          <span
                            className="round-scores__doubled"
                            title="Doubled: this player ended the round without the lowest score"
                          >
                            ×2<span className="round-scores__caption"> (doubled: ended the round without the lowest score)</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {roundOver && (
                    <td className="round-scores__ready">
                      {player.ready ? <span aria-label="Ready">✓</span> : <span aria-label="Not ready">…</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {roundOver ? (
        <>
          {me && (
            <button
              type="button"
              className="btn btn--success round-scores__action"
              onClick={onReady}
              disabled={busy || me.ready}
            >
              {me.ready ? 'Ready!' : `Ready for round ${roundNumber + 1}`}
            </button>
          )}
          <p className="round-scores__next" aria-live="polite">{nextRoundText(players, secondsLeft)}</p>
        </>
      ) : (
        <button type="button" className="btn btn--success round-scores__action" onClick={onBack} disabled={busy}>
          Back to the home page
        </button>
      )}
    </div>
  );
}
