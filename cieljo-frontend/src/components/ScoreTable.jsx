import { playedRounds, roundPointsText, roundRanking } from '../game/roundScores';
import './ScoreTable.scss';

// The scores of the game: the players from the lowest total to the highest (the lowest wins), with their total
// and the points of each round scored so far. The points of a round ender without the lowest score are doubled.
// Used over the piles once a round is scored (RoundScores) and in the info bubble during the game (light, on a
// white background, totalOnly: no column per round). final shows a trophy instead of rank 1 at the end of the game; showReady adds a column
// telling who is ready for the next round. caption names the table for screen readers.
export default function ScoreTable({
  players, caption, final = false, showReady = false, light = false, totalOnly = false,
}) {
  const ranking = roundRanking(players);
  const rounds = totalOnly ? [] : playedRounds(players);

  return (
    // Many rounds make the table wider than the space it has: it scrolls sideways
    <div className={`score-table ${light ? 'score-table--light' : ''}`.trim()}>
      <table className="score-table__table">
        <caption className="score-table__caption">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Player</th>
            <th scope="col" className="score-table__points">Total</th>
            {rounds.map(number => (
              <th key={number} scope="col" className="score-table__points score-table__round">
                <abbr title={`Round ${number}`}>R{number}</abbr>
              </th>
            ))}
            {showReady && <th scope="col">Ready</th>}
          </tr>
        </thead>
        <tbody>
          {ranking.map(player => {
            const pointsOf = new Map((player.rounds ?? []).map(round => [round.round_number, round]));
            return (
              <tr
                key={player.id}
                className={[
                  player.rank === 1 && 'score-table__row--winner',
                  player.current_user && 'score-table__row--me',
                ].filter(Boolean).join(' ')}
              >
                <td>{player.rank === 1 && final ? <span aria-label="Winner">🏆</span> : player.rank}</td>
                <th scope="row" className="score-table__name">
                  {player.username}{player.current_user && ' (you)'}
                </th>
                <td className="score-table__points score-table__total">{player.score}</td>
                {rounds.map(number => {
                  const round = pointsOf.get(number);
                  return (
                    <td key={number} className="score-table__points score-table__round">
                      {/* A doubled round reads "6×2": the points of the cards, then the doubling */}
                      {round ? (
                        <span
                          className={round.doubled ? 'score-table__doubled' : undefined}
                          title={round.doubled ? `Doubled: ${round.points} points, this player ended the round without the lowest score` : undefined}
                        >
                          {roundPointsText(round)}
                          {round.doubled && (
                            <span className="score-table__caption"> (doubled: {round.points} points, ended the round without the lowest score)</span>
                          )}
                        </span>
                      ) : '–'}
                    </td>
                  );
                })}
                {showReady && (
                  <td className="score-table__ready">
                    {player.ready ? <span aria-label="Ready">✓</span> : <span aria-label="Not ready">…</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
