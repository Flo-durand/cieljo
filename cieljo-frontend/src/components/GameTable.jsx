import { useMemo, useRef } from 'react';
import useCardDrag from '../hooks/useCardDrag';
import useDealAnimation from '../hooks/useDealAnimation';
import useTableChanges from '../hooks/useTableChanges';
import useThrowToDiscard from '../hooks/useThrowToDiscard';
import Card from './Card';
import InfoButton from './InfoButton';
import PlayerGrid from './PlayerGrid';
import RoomCode from './RoomCode';
import TableCenter from './TableCenter';
import TableLayout from './TableLayout';
import { faceUpCount, tableMessage } from '../game/tableMessage';

// rules are the rules of the game from the API (see rulesFromApi in src/game/rules.js).
// deal (from buildDeal) plays the deal animation; onDealEnd is called once it is over.
// hand is the card the current player has drawn (or null); busy is true while an action is being sent.
// The turn actions (onDraw, onSwap, onDiscard, onTakeAndSwap) return a promise of true when they worked.
// discardRecent lists the last discarded cards, oldest first: a removed column shows them landing one by one.
export default function GameTable({
  roomCode, rules, players, drawPileCount, discardTop, discardRecent = [], hand, initialReveal, currentPlayerId, busy,
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
  const { throwToDiscard, leavingCardId, flippedDiscardId } = useThrowToDiscard(discardRef);

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

  // --- Removed columns and players who left, since the previous refresh ---
  const { notice, discardHidden, flownCardIds, extraCardsOf } = useTableChanges({
    players, discardTop, currentPlayerId, dealing, discardRef, leavingCardId, gridRows: rules.gridRows,
  });

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
  const canRevealCard = card => !dealing && initialReveal && !card.face_up && faceUpCount(me) < rules.initialRevealCount;
  const canDiscardFor = card => !busy && myHand?.drawn_from === 'draw_pile' && !card.face_up;
  const canClickCard = card => canRevealCard(card) || canDiscardFor(card);
  const onCardClick = card => (initialReveal ? onRevealCard(card.id) : discardAndThrow(card.id));

  const renderPlayer = (player, { small }) => (
    <PlayerGrid
      player={player}
      gridRows={rules.gridRows}
      gridColumns={rules.gridColumns}
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
          message={tableMessage({
            me, players, initialReveal, initialRevealCount: rules.initialRevealCount, currentPlayerId, dealing,
            hand: myHand, notice,
          })}
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
