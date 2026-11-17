import { useEffect, useMemo, useRef, useState } from 'react';
import { useAnimationsAllowed } from '../contexts/AnimationsContext';
import useCardDrag from '../hooks/useCardDrag';
import useDealAnimation from '../hooks/useDealAnimation';
import useTableChanges from '../hooks/useTableChanges';
import useThrowToDiscard from '../hooks/useThrowToDiscard';
import Card from './Card';
import InfoButton from './InfoButton';
import PlayerGrid from './PlayerGrid';
import RoomCode from './RoomCode';
import RoundScores from './RoundScores';
import ScoreTable from './ScoreTable';
import TableCenter from './TableCenter';
import TableLayout from './TableLayout';
import { cardLabel, discardPileLabel, drawPileLabel } from '../game/cardLabel';
import { playedRounds } from '../game/roundScores';
import { faceUpCount, tableMessage } from '../game/tableMessage';

// rules are the rules of the game from the API (see rulesFromApi in src/game/rules.js).
// deal (from buildDeal) plays the deal animation; onDealEnd is called once it is over.
// hand is the card the current player has drawn (or null); busy is true while an action is being sent.
// The turn actions (onDraw, onSwap, onDiscard, onTakeAndSwap) return a promise of true when they worked.
// discardRecent lists the last discarded cards, oldest first: a removed column shows them landing one by one.
// A swap is played by dragging the card in hand (or the discard pile card) onto the grid, or by clicks, which also
// works with the keyboard: click the card in hand to select it, then the grid card to replace.
// lastRound is true once a player (roundEnderId) has revealed all their cards. Once the round is scored
// (roundScored), the scores replace the piles: between two rounds (roundOver), onReady says the player is ready
// for the next one, which starts at nextRoundDeadline at the latest; at the end of the game, onBack goes back to
// the home page. GameRoom gives each round its own GameTable (key), so every round starts afresh.
export default function GameTable({
  roomCode, rules, players, drawPileCount, discardTop, discardRecent = [], hand, initialReveal, currentPlayerId, busy,
  lastRound = false, roundEnderId = null, roundScored = false, roundNumber = 1, roundOver = false,
  nextRoundDeadline = null, onReady,
  onRevealCard, onDraw, onSwap, onDiscard, onTakeAndSwap, onBack, deal, onDealEnd,
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

  // --- End of the round: the scores show once the last moves have landed (a removed column, a thrown card) ---
  // They fade in only when the player sees them appear (see AnimationsContext).
  const animationsAllowed = useAnimationsAllowed();
  const tableIdle = discardHidden === 0 && flownCardIds.length === 0 && !leavingCardId;
  const [scoresShown, setScoresShown] = useState(null); // null, 'animated' or 'instant'
  if (roundScored && tableIdle && !scoresShown) setScoresShown(animationsAllowed ? 'animated' : 'instant');

  // The card that can be dragged onto the grid: the card in hand, or the discard pile card before drawing
  const canDrag = !busy && (Boolean(myHand) || (canDraw && Boolean(discardTop)));
  const drag = useCardDrag({
    canDropOn: cardId => canDrag && me.grid.some(card => card.id === cardId),
    onDrop: cardId => swapAndThrow(cardId, myHand ? onSwap : onTakeAndSwap),
  });
  const onPointerDown = canDrag ? drag.onPointerDown : undefined;

  // --- Swap by clicks: the card in hand is selected, then the grid card to replace is clicked ---
  // The selection is kept by card id, so it ends by itself when the card in hand is played.
  const [selectedHandId, setSelectedHandId] = useState(null);
  const handSelected = Boolean(myHand) && selectedHandId === myHand.id;
  const toggleHand = () => setSelectedHandId(handSelected ? null : myHand.id);
  const handElement = () => document.querySelector(`.table-center [data-card-id="${myHand.id}"]`);
  // The card in hand glides to the grid card like a dropped card (see useCardDrag)
  const swapByClick = cardId => {
    setSelectedHandId(null);
    return drag.moveTo(handElement(), cardId);
  };

  // With the keyboard, the pile that was pressed to draw is gone: the card drawn takes the focus it lost
  const myHandId = myHand?.id;
  useEffect(() => {
    if (myHandId && !busy && document.activeElement === document.body) {
      document.querySelector(`.table-center [data-card-id="${myHandId}"]`)?.focus();
    }
  }, [myHandId, busy]);
  // The dragged card stays hidden until the move is over, even if it changes place in between
  const isLifted = card => Boolean(card) && card.id === drag.draggedCardId;
  const liftedClass = card => (isLifted(card) ? 'card--lifted' : '');
  const isCardHidden = card =>
    isDealtLater(card) || isLifted(card) || card.id === leavingCardId || flownCardIds.includes(card.id);

  // --- Clicks on the player's own grid ---
  // During the initial reveal: reveal a card, until 2 are face up.
  // With the card in hand selected: swap it with the clicked card.
  // Otherwise, with a card drawn from the draw pile: throw it and reveal the clicked face-down card.
  const canRevealCard = card => !dealing && initialReveal && !card.face_up && faceUpCount(me) < rules.initialRevealCount;
  const canSwapWith = () => !busy && handSelected;
  const canDiscardFor = card => !busy && myHand?.drawn_from === 'draw_pile' && !card.face_up;
  const canClickCard = card => canRevealCard(card) || canSwapWith() || canDiscardFor(card);
  const onCardClick = card => {
    if (initialReveal) return onRevealCard(card.id);
    if (handSelected) return swapByClick(card.id);
    return discardAndThrow(card.id);
  };

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

  // The card in hand: the player can drag it, or click it to select it for a swap.
  // It flips over by itself as it turns face up (see Card.jsx).
  const handCard = hand && (
    <Card
      card={hand}
      onPointerDown={myHand ? onPointerDown : undefined}
      onClick={myHand && !busy ? toggleHand : undefined}
      pressed={myHand ? handSelected : undefined}
      label={`${holderLabel}, ${cardLabel(hand)}`}
      className={[liftedClass(hand), handSelected && 'card--selected'].filter(Boolean).join(' ')}
    />
  );

  let drawPile;
  let drawLabel = `Draw pile (${shownDrawCount})`;
  if (hand?.drawn_from === 'draw_pile') {
    drawPile = handCard;
    drawLabel = holderLabel;
  } else {
    drawPile = (
      <Card
        card={shownDrawCount > 0 ? { face_up: false } : null}
        onClick={canDraw ? () => onDraw('draw_pile') : undefined}
        label={drawPileLabel(shownDrawCount)}
      />
    );
  }

  let discardPile;
  let discardLabel = 'Discard pile';
  if (hand?.drawn_from === 'discard_pile') {
    discardPile = handCard;
    discardLabel = holderLabel;
  } else {
    // While a removed column is flying, the discard pile shows the cards that have already landed
    let shownDiscard = discardTop;
    if (discardHidden > 0) shownDiscard = discardRecent[discardRecent.length - 1 - discardHidden] ?? null;

    let discardClassName = '';
    if (dealing) discardClassName = landedCount < dealtCards ? 'card--hidden' : 'card--flip-in';
    else if (shownDiscard && shownDiscard.id === leavingCardId) discardClassName = 'card--hidden';
    else if (shownDiscard && shownDiscard.id === flippedDiscardId) discardClassName = 'card--flip-in';
    // Before drawing, the discard pile card can be clicked to take it, or dragged straight onto the grid.
    // Taken with a click, it is selected at once: a card from the discard pile can only be swapped, so the next
    // click on the grid swaps it (the selection keeps the card id, which stays the same once in hand).
    const canTakeDiscard = !myHand && canDraw && discardHidden === 0 && Boolean(shownDiscard);
    const takeDiscard = () => {
      setSelectedHandId(shownDiscard.id);
      onDraw('discard_pile');
    };
    discardPile = (
      <Card
        card={shownDiscard}
        onPointerDown={canTakeDiscard ? onPointerDown : undefined}
        onClick={canTakeDiscard ? takeDiscard : undefined}
        label={discardPileLabel(shownDiscard)}
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
            hand: myHand, handSelected, notice, lastRound, roundEnderId, roundScored, roundOver, roundNumber,
          })}
        >
          {/* The total of each player (the points of the round in progress are under the names) */}
          {playedRounds(players).length > 0
            ? <ScoreTable players={players} caption="Scores of the game, the lowest total wins" light totalOnly />
            : <p className="info-button__note">No round scored yet.</p>}
        </InfoButton>
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
        leaving={scoresShown}
      />

      {scoresShown && (
        <RoundScores
          players={players}
          roundNumber={roundNumber}
          roundOver={roundOver}
          endScore={rules.endScore}
          nextRoundDeadline={nextRoundDeadline}
          onReady={onReady}
          onBack={onBack}
          busy={busy}
          entering={scoresShown === 'animated'}
        />
      )}

      {/* The room code shown in the lobby fades out as the piles fade in (the next rounds only fade the piles in) */}
      {dealing && roundNumber === 1 && <RoomCode code={roomCode} lines={['The game is starting!', '', '']} className="room-code--leaving" />}
    </TableLayout>
  );
}
