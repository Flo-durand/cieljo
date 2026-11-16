import { useEffect, useMemo, useRef, useState } from 'react';
import useCardDrag from '../hooks/useCardDrag';
import useDealAnimation from '../hooks/useDealAnimation';
import flyCard from '../utils/flyCard';
import prefersReducedMotion from '../utils/prefersReducedMotion';
import Card from './Card';
import InfoButton from './InfoButton';
import PlayerGrid from './PlayerGrid';
import RoomCode from './RoomCode';
import TableCenter from './TableCenter';
import TableLayout from './TableLayout';

// Must match Game::INITIAL_REVEAL_COUNT in the backend
const INITIAL_REVEAL_COUNT = 2;

const faceUpCount = player => player.grid.filter(card => card.face_up).length;

// Timings of the removed column animation
const REMOVED_CARD_FLIGHT_MS = 450;
const REMOVED_CARD_GAP_MS = 150;
const GRID_ROWS = 3;

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// The most frequent face-up value of a list of cards (the value of a column about to be removed)
function mostFrequentValue(cards) {
  const counts = new Map();
  cards.filter(card => card.face_up).forEach(card => counts.set(card.value, (counts.get(card.value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// The columns that were in a grid at the previous refresh and are gone now
function findRemovedColumns(previousPlayers, players, discardTop) {
  const removals = [];
  players.forEach(player => {
    const before = previousPlayers.find(previous => previous.id === player.id);
    if (!before || before.grid.length === 0 || player.grid.length === 0) return;

    const columnsNow = new Set(player.grid.map(card => card.column));
    const columnsBefore = [...new Set(before.grid.map(card => card.column))];
    columnsBefore.filter(column => !columnsNow.has(column)).forEach(column => {
      const value = mostFrequentValue(before.grid.filter(card => card.column === column)) ?? discardTop?.value;
      removals.push({ playerId: player.id, column, value, username: player.username, isMe: player.current_user });
    });
  });
  return removals;
}

// The 3 cards of a removed column, shown in the grid while they fly to the discard pile
const ghostCards = removal => Array.from({ length: GRID_ROWS }, (_, row) => ({
  id: `removed-${removal.playerId}-${removal.column}-${row}`,
  row,
  column: removal.column,
  face_up: true,
  value: removal.value,
}));

// Message shown in the info bubble (see InfoButton)
function tableMessage(state) {
  const message = turnMessage(state);
  return state.notice ? `${state.notice} ${message}` : message;
}

function turnMessage({ me, players, initialReveal, currentPlayerId, dealing, hand }) {
  if (dealing) return 'Dealing the cards...';

  if (initialReveal) {
    const left = INITIAL_REVEAL_COUNT - faceUpCount(me);
    if (left > 0) return `Reveal ${left} card${left > 1 ? 's' : ''} of your grid.`;
    return 'Waiting for the other players to reveal their cards...';
  }

  const playing = players.find(player => player.id === currentPlayerId);
  if (!playing) return '';
  if (!playing.current_user) return `It's ${playing.username}'s turn.`;

  if (!hand) return 'Your turn: draw a card from the draw pile, or take the discard pile card.';
  if (hand.drawn_from === 'draw_pile') {
    return 'Drag the card onto your grid to swap it, or click a hidden card to throw it and reveal that card.';
  }
  return 'Drag the card onto your grid to swap it.';
}

// deal (from buildDeal) plays the deal animation; onDealEnd is called once it is over.
// hand is the card the current player has drawn (or null); busy is true while an action is being sent.
// The turn actions (onDraw, onSwap, onDiscard, onTakeAndSwap) return a promise of true when they worked.
// discardRecent lists the last discarded cards, oldest first: a removed column shows them landing one by one.
export default function GameTable({
  roomCode, players, drawPileCount, discardTop, discardRecent = [], hand, initialReveal, currentPlayerId, busy,
  onRevealCard, onDraw, onSwap, onDiscard, onTakeAndSwap, deal, onDealEnd,
}) {
  const me = players.find(player => player.current_user);

  // --- Deal animation ---
  const pileRef = useRef(null);
  const landedCount = useDealAnimation(deal, pileRef, onDealEnd);
  const dealing = Boolean(deal);
  const dealtCards = deal ? deal.cardIds.length + 1 : 0; // the grids, then the discard card

  // Position of each grid card in the deal, to hide the ones that have not landed yet
  const dealIndex = useMemo(
    () => new Map((deal?.cardIds ?? []).map((cardId, index) => [cardId, index])),
    [deal],
  );
  const isDealtLater = card => dealing && (dealIndex.get(card.id) ?? -1) >= landedCount;

  // --- Whose turn and what can be done ---
  const myTurn = Boolean(me) && !dealing && !initialReveal && currentPlayerId === me.id;
  const myHand = hand && me && hand.player_id === me.id ? hand : null;
  const canDraw = myTurn && !hand && !busy;
  const holder = hand && players.find(player => player.id === hand.player_id);
  const holderLabel = holder?.current_user ? 'Your card' : `${holder?.username}'s card`;

  // --- Animations of the cards thrown onto the discard pile ---
  const discardRef = useRef(null);
  // The thrown card, hidden on the discard pile until its flying copy lands there
  const [leavingCardId, setLeavingCardId] = useState(null);
  // A thrown card that was face down: it flips over once on the discard pile
  const [flippedDiscardId, setFlippedDiscardId] = useState(null);

  // Plays a move that throws `card` onto the discard pile, then makes it fly there from `fromElement`.
  // The flight starts once the move is played, so a refused move never shows. A face-down card travels
  // face down and flips over on the pile.
  const throwToDiscard = async (card, fromElement, play) => {
    const animate = Boolean(card && fromElement) && !prefersReducedMotion();
    const from = fromElement?.getBoundingClientRect();

    if (animate) setLeavingCardId(card.id);
    const played = await play();
    if (!played || !animate || !discardRef.current) {
      setLeavingCardId(null);
      return played;
    }

    const { element: flyingCard, finished } = flyCard({
      from,
      to: discardRef.current.getBoundingClientRect(),
      card: card.face_up ? card : { face_up: false },
      duration: card.face_up ? 450 : 650,
      flipAtTheEnd: !card.face_up,
      easing: 'ease-in-out',
    });
    finished.then(async () => {
      if (!card.face_up) setFlippedDiscardId(card.id);
      setLeavingCardId(null);
      // Let React show the real card before removing the flying one, so nothing blinks
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      flyingCard.remove();
    });
    return played;
  };

  // Swap: the replaced grid card goes from the grid to the discard pile.
  // It is hidden in the grid right away, since the dragged card has just been put on top of it.
  const swapAndThrow = (cardId, play) => throwToDiscard(
    me.grid.find(card => card.id === cardId),
    document.querySelector(`[data-card-id="${cardId}"]`),
    () => play(cardId),
  );

  // Discard: the card drawn from the draw pile goes from the draw pile to the discard pile,
  // and the clicked grid card flips over (see Card.jsx)
  const discardAndThrow = cardId => throwToDiscard(myHand, pileRef.current, () => onDiscard(cardId));

  // --- Removed columns: their cards fly to the discard pile one by one, then the grid closes up ---
  // Columns gone since the previous refresh, animated one after the other
  const [removals, setRemovals] = useState([]);
  // How many of the last discarded cards are not shown on the discard pile yet (still to land)
  const [discardHidden, setDiscardHidden] = useState(0);
  // Cards of the removed column that have left the grid (their flying copy is on its way)
  const [flownCardIds, setFlownCardIds] = useState([]);
  // "player_one removed a column of 5s!" or "player_two left the game.", shown in the info bubble until the turn
  // passes again
  const [notice, setNotice] = useState(null);

  // Compare the grids with the previous refresh to find the removed columns, for every player.
  // Adjusting state during render is React's pattern for reacting to a prop change.
  const [previousPlayers, setPreviousPlayers] = useState(players);
  if (players !== previousPlayers) {
    setPreviousPlayers(players);
    const found = dealing ? [] : findRemovedColumns(previousPlayers, players, discardTop);
    // Players who quit the game since the previous refresh
    const departed = previousPlayers.filter(previous => !players.some(player => player.id === previous.id));
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
      if (!prefersReducedMotion()) {
        setRemovals(queued => [...queued, ...found]);
        setDiscardHidden(hidden => hidden + GRID_ROWS * found.length);
      }
    }
  }
  if (notice && notice.currentPlayerId !== currentPlayerId) setNotice(null);

  const animatingRemovalRef = useRef(false);
  useEffect(() => {
    // Wait for the replaced or thrown card to land first: the column goes on top of it
    if (removals.length === 0 || leavingCardId || animatingRemovalRef.current) return;
    animatingRemovalRef.current = true;
    const removal = removals[0];

    (async () => {
      await nextFrame();
      for (const card of ghostCards(removal)) {
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

      // The column leaves the grid: the remaining columns close up (see PlayerGrid)
      setRemovals(queued => queued.slice(1));
      setFlownCardIds([]);
      animatingRemovalRef.current = false;
    })();
  }, [removals, leavingCardId]);

  const extraCardsOf = player => removals
    .filter(removal => removal.playerId === player.id)
    .flatMap(ghostCards);

  // The card that can be dragged onto the grid: the card in hand, or the discard pile card before drawing
  const canDrag = !busy && (Boolean(myHand) || (canDraw && Boolean(discardTop)));
  const drag = useCardDrag({
    canDropOn: cardId => canDrag && me.grid.some(card => card.id === cardId),
    onDrop: cardId => swapAndThrow(cardId, myHand ? onSwap : onTakeAndSwap),
    // Clicking the discard pile card takes it
    onClick: () => {
      if (!myHand && canDraw) onDraw('discard_pile');
    },
  });
  const onPointerDown = canDrag ? drag.onPointerDown : undefined;
  // The dragged card stays hidden until the move is over, even if it changes place in between
  const isLifted = card => Boolean(card) && card.id === drag.draggedCardId;
  const liftedClass = card => (isLifted(card) ? 'card--lifted' : '');
  const isCardHidden = card =>
    isDealtLater(card) || isLifted(card) || card.id === leavingCardId || flownCardIds.includes(card.id);

  // --- Clicks on the player's own grid ---
  // During the initial reveal: reveal a card, until 2 are face up.
  // With a card drawn from the draw pile: throw it and reveal the clicked face-down card.
  const canRevealCard = card => !dealing && initialReveal && !card.face_up && faceUpCount(me) < INITIAL_REVEAL_COUNT;
  const canDiscardFor = card => !busy && myHand?.drawn_from === 'draw_pile' && !card.face_up;
  const canClickCard = card => canRevealCard(card) || canDiscardFor(card);
  const onCardClick = card => (initialReveal ? onRevealCard(card.id) : discardAndThrow(card.id));

  const renderPlayer = (player, { small }) => (
    <PlayerGrid
      player={player}
      small={small}
      isPlaying={player.id === currentPlayerId}
      canClickCard={player.current_user ? canClickCard : undefined}
      onCardClick={onCardClick}
      isCardHidden={isCardHidden}
      isDropTarget={card => card.id === drag.hoveredCardId}
      extraCards={extraCardsOf(player)}
    />
  );

  // --- The piles: the card in hand sits on the pile it was taken from ---
  const shownDrawCount = drawPileCount + Math.max(0, dealtCards - landedCount); // cards in flight during the deal

  let drawPile;
  let drawLabel = `Draw pile (${shownDrawCount})`;
  if (hand?.drawn_from === 'draw_pile') {
    drawPile = (
      <Card
        card={hand}
        onPointerDown={myHand ? onPointerDown : undefined}
        // The card flips over by itself as it turns face up (see Card.jsx)
        className={liftedClass(hand)}
      />
    );
    drawLabel = holderLabel;
  } else {
    drawPile = (
      <Card
        card={shownDrawCount > 0 ? { face_up: false } : null}
        onClick={canDraw ? () => onDraw('draw_pile') : undefined}
      />
    );
  }

  let discardPile;
  let discardLabel = 'Discard pile';
  if (hand?.drawn_from === 'discard_pile') {
    discardPile = <Card card={hand} onPointerDown={myHand ? onPointerDown : undefined} className={liftedClass(hand)} />;
    discardLabel = holderLabel;
  } else {
    // While a removed column is flying, the discard pile shows the cards that have already landed
    let shownDiscard = discardTop;
    if (discardHidden > 0) shownDiscard = discardRecent[discardRecent.length - 1 - discardHidden] ?? null;

    let discardClassName = '';
    if (dealing) discardClassName = landedCount < dealtCards ? 'card--hidden' : 'card--flip-in';
    else if (shownDiscard && shownDiscard.id === leavingCardId) discardClassName = 'card--hidden';
    else if (shownDiscard && shownDiscard.id === flippedDiscardId) discardClassName = 'card--flip-in';
    // Before drawing, the discard pile card can be dragged straight onto the grid
    discardPile = (
      <Card
        card={shownDiscard}
        onPointerDown={!myHand && canDraw && discardHidden === 0 ? onPointerDown : undefined}
        className={`${discardClassName} ${liftedClass(shownDiscard)}`.trim()}
      />
    );
  }

  return (
    <TableLayout
      players={players}
      renderPlayer={renderPlayer}
      corner={me && (
        <InfoButton
          message={tableMessage({ me, players, initialReveal, currentPlayerId, dealing, hand: myHand, notice: notice?.text })}
        />
      )}
    >
      <TableCenter
        drawPile={drawPile}
        drawLabel={drawLabel}
        drawInactive={Boolean(myHand) && myHand.drawn_from !== 'draw_pile'}
        discardPile={discardPile}
        discardLabel={discardLabel}
        discardInactive={Boolean(myHand) && myHand.drawn_from !== 'discard_pile'}
        pileRef={pileRef}
        discardRef={discardRef}
        entering={dealing}
      />

      {/* The room code shown in the lobby fades out as the piles fade in */}
      {dealing && <RoomCode code={roomCode} lines={['The game is starting!', '', '']} className="room-code--leaving" />}
    </TableLayout>
  );
}
