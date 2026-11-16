import { useEffect, useRef, useState } from 'react';
import { useAnimationsAllowed } from '../contexts/AnimationsContext';
import { findDepartedPlayers, findRemovedColumns, ghostCards } from '../game/tableChanges';
import flyCard from '../utils/flyCard';

// Timings of the removed column animation
const REMOVED_CARD_FLIGHT_MS = 450;
const REMOVED_CARD_GAP_MS = 150;

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Follows what changes on the table between two refreshes of the game:
// - a removed column: its cards fly to the discard pile one by one (discardRef), then the grid closes up;
// - a player who left: the info bubble says so.
// leavingCardId (from useThrowToDiscard): a thrown card still flying; a removed column waits for it, since the
// column goes on top of it. gridRows is the number of rows of a grid (from the rules of the API).
// Returns the notice for the info bubble, how many of the last discarded cards are not shown yet
// (discardHidden), the cards of a removed column that have left the grid (flownCardIds), and the cards of the
// removed columns still to draw in each grid (extraCardsOf).
export default function useTableChanges({
  players, discardTop, currentPlayerId, dealing, discardRef, leavingCardId, gridRows,
}) {
  // Columns gone since the previous refresh, animated one after the other
  const [removals, setRemovals] = useState([]);
  // How many of the last discarded cards are not shown on the discard pile yet (still to land)
  const [discardHidden, setDiscardHidden] = useState(0);
  // Cards of the removed column that have left the grid (their flying copy is on its way)
  const [flownCardIds, setFlownCardIds] = useState([]);
  // "player_one removed a column of 5s!" or "player_two left the game.", shown in the info bubble until the turn
  // passes again
  const [notice, setNotice] = useState(null);
  const animationsAllowed = useAnimationsAllowed();

  // Compare the grids with the previous refresh to find the removed columns, for every player.
  // Adjusting state during render is React's pattern for reacting to a prop change.
  const [previousPlayers, setPreviousPlayers] = useState(players);
  if (players !== previousPlayers) {
    setPreviousPlayers(players);
    const found = dealing ? [] : findRemovedColumns(previousPlayers, players, discardTop);
    // Players who quit the game since the previous refresh
    const departed = findDepartedPlayers(previousPlayers, players);
    if (departed.length > 0) {
      const names = departed.map(player => player.username).join(' and ');
      setNotice({ text: `${names} left the game.`, currentPlayerId });
    }
    if (found.length > 0) {
      const last = found[found.length - 1];
      setNotice({
        text: `${last.isMe ? 'You' : last.username} removed a column of ${last.value}s!`,
        currentPlayerId,
      });
      // Without animations, the column is simply gone and the grid closes up at once
      if (animationsAllowed) {
        setRemovals(queued => [...queued, ...found]);
        setDiscardHidden(hidden => hidden + gridRows * found.length);
      }
    }
  }
  if (notice && notice.currentPlayerId !== currentPlayerId) setNotice(null);

  // Leaving the tab drops the columns still to animate: the discard pile shows its real top card and the grids
  // are closed up at once
  if (!animationsAllowed && (removals.length > 0 || discardHidden > 0 || flownCardIds.length > 0)) {
    setRemovals([]);
    setDiscardHidden(0);
    setFlownCardIds([]);
  }

  const animatingRemovalRef = useRef(false);
  // Changes when the animation of the removed columns is dropped: a running one stops at its next step
  const removalRunRef = useRef(0);
  useEffect(() => {
    if (animationsAllowed) return;
    removalRunRef.current += 1;
    animatingRemovalRef.current = false;
  }, [animationsAllowed]);
  useEffect(() => {
    // Wait for the replaced or thrown card to land first: the column goes on top of it
    if (removals.length === 0 || leavingCardId || animatingRemovalRef.current) return;
    animatingRemovalRef.current = true;
    const removal = removals[0];
    const run = removalRunRef.current;
    const dropped = () => removalRunRef.current !== run;

    (async () => {
      await nextFrame();
      for (const card of ghostCards(removal, gridRows)) {
        if (dropped()) return;
        const element = document.querySelector(`[data-card-id="${card.id}"]`);
        if (element && discardRef.current) {
          const { element: flyingCard, finished } = flyCard({
            from: element.getBoundingClientRect(),
            to: discardRef.current.getBoundingClientRect(),
            card,
            duration: REMOVED_CARD_FLIGHT_MS,
            easing: 'ease-in-out',
          });
          setFlownCardIds(ids => [...ids, card.id]);
          await finished;
          if (dropped()) {
            flyingCard.remove();
            return;
          }
          setDiscardHidden(hidden => hidden - 1);
          // Let React show the card on the discard pile before removing the flying one, so nothing blinks
          await nextFrame();
          await nextFrame();
          flyingCard.remove();
        } else {
          setDiscardHidden(hidden => hidden - 1);
        }
        await wait(REMOVED_CARD_GAP_MS);
      }
      if (dropped()) return;

      // The column leaves the grid: the remaining columns close up (see PlayerGrid)
      setRemovals(queued => queued.slice(1));
      setFlownCardIds([]);
      animatingRemovalRef.current = false;
    })();
  }, [removals, leavingCardId, discardRef, gridRows]);

  const extraCardsOf = player => removals
    .filter(removal => removal.playerId === player.id)
    .flatMap(removal => ghostCards(removal, gridRows));

  return { notice: notice?.text, discardHidden, flownCardIds, extraCardsOf };
}
