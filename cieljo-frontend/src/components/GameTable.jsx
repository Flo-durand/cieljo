import { useMemo, useRef } from 'react';
import useDealAnimation from '../hooks/useDealAnimation';
import PlayerGrid from './PlayerGrid';
import RoomCode from './RoomCode';
import TableCenter from './TableCenter';
import TableLayout from './TableLayout';
import './GameTable.scss';

// Must match Game::INITIAL_REVEAL_COUNT in the backend
const INITIAL_REVEAL_COUNT = 2;

const faceUpCount = player => player.grid.filter(card => card.face_up).length;

// Message shown in the middle of the table
function tableMessage({ me, players, initialReveal, currentPlayerId, dealing }) {
  if (dealing) return 'Dealing the cards...';

  if (initialReveal) {
    const left = INITIAL_REVEAL_COUNT - faceUpCount(me);
    if (left > 0) return `Reveal ${left} card${left > 1 ? 's' : ''} of your grid.`;
    return 'Waiting for the other players to reveal their cards...';
  }

  const playing = players.find(player => player.id === currentPlayerId);
  if (!playing) return '';
  return playing.current_user ? "It's your turn!" : `It's ${playing.username}'s turn.`;
}

// deal (from buildDeal) plays the deal animation; onDealEnd is called once it is over
export default function GameTable({
  roomCode, players, drawPileCount, discardTop, initialReveal, currentPlayerId, onRevealCard, deal, onDealEnd,
}) {
  const me = players.find(player => player.current_user);

  const pileRef = useRef(null);
  const landedCount = useDealAnimation(deal, pileRef, onDealEnd);
  const dealing = Boolean(deal);
  const dealtCards = deal ? deal.cardIds.length + 1 : 0; // the grids, then the discard card

  // Position of each grid card in the deal, to hide the ones that have not landed yet
  const dealIndex = useMemo(
    () => new Map((deal?.cardIds ?? []).map((cardId, index) => [cardId, index])),
    [deal],
  );
  const isCardHidden = card => dealing && (dealIndex.get(card.id) ?? -1) >= landedCount;

  let discardClassName = '';
  if (dealing) discardClassName = landedCount < dealtCards ? 'card--hidden' : 'card--flip-in';

  // During the initial reveal, the player can click their face-down cards until 2 are face up
  const canRevealCard = card =>
    !dealing && initialReveal && !card.face_up && faceUpCount(me) < INITIAL_REVEAL_COUNT;

  const renderPlayer = (player, { small }) => (
    <PlayerGrid
      player={player}
      small={small}
      isPlaying={player.id === currentPlayerId}
      canClickCard={player.current_user ? canRevealCard : undefined}
      onCardClick={card => onRevealCard(card.id)}
      isCardHidden={isCardHidden}
    />
  );

  return (
    <TableLayout players={players} renderPlayer={renderPlayer}>
      <TableCenter
        // During the deal, the cards still in flight or waiting are counted in the pile
        drawPileCount={drawPileCount + Math.max(0, dealtCards - landedCount)}
        discardTop={discardTop}
        discardClassName={discardClassName}
        pileRef={pileRef}
        entering={dealing}
      >
        {me && (
          <p className="game-table__message">
            {tableMessage({ me, players, initialReveal, currentPlayerId, dealing })}
          </p>
        )}
      </TableCenter>

      {/* The room code shown in the lobby fades out as the piles fade in */}
      {dealing && <RoomCode code={roomCode} lines={['The game is starting!', '']} className="room-code--leaving" />}
    </TableLayout>
  );
}
