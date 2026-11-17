import useCountdown from '../hooks/useCountdown';
import { nextRoundText } from '../game/roundScores';
import ScoreTable from './ScoreTable';
import './RoundScores.scss';

// The scores once a round is scored, shown in the middle of the table over the piles, which fade out (the grids
// stay around, every card face up): the points of each round and the total of each player (see ScoreTable).
// Between two rounds (roundOver), each player says they are ready (onReady); the next round starts once everyone
// is, or when the countdown to nextRoundDeadline (a time in ms, from Date.now()) ends. At the end of the game
// (once a player has reached endScore), onBack goes back to the home page.
// entering fades the scores in, once the last cards have flipped over.
export default function RoundScores({
  players, roundNumber, roundOver, endScore, nextRoundDeadline = null, onReady, onBack, busy = false, entering = false,
}) {
  const me = players.find(player => player.current_user);
  const secondsLeft = useCountdown(roundOver ? nextRoundDeadline : null);

  const caption = roundOver
    ? `Scores after round ${roundNumber}, the lowest total wins once a player reaches ${endScore} points`
    : 'Final scores, the lowest total wins';

  return (
    <div className={`round-scores ${entering ? 'round-scores--entering' : ''}`}>
      <h1 className="round-scores__title">{roundOver ? `Round ${roundNumber} over` : 'Game over'}</h1>
      <ScoreTable players={players} caption={caption} final={!roundOver} showReady={roundOver} />

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
