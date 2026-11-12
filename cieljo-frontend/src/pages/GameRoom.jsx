import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL, authHeaders } from '../api';
import GameTable from '../components/GameTable';
import PlayerGrid from '../components/PlayerGrid';
import RoomCode from '../components/RoomCode';
import TableLayout from '../components/TableLayout';
import { buildDeal, prefersReducedMotion } from '../hooks/useDealAnimation';
import './GameRoom.scss';

// How often the player list is refreshed (until real-time updates with ActionCable)
const REFRESH_INTERVAL_MS = 3000;

export default function GameRoom() {
  // Read the room code from the URL (e.g. /game/XF4G)
  const { room_code } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('pending');
  const [drawPileCount, setDrawPileCount] = useState(0);
  const [discardTop, setDiscardTop] = useState(null);
  const [hand, setHand] = useState(null);
  const [initialReveal, setInitialReveal] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [error, setError] = useState('');
  // True while an action (start, reveal, turn) is being sent, to block double clicks
  const [isActing, setIsActing] = useState(false);
  // The deal being animated, set when this page sees the game go from pending to in progress
  const [deal, setDeal] = useState(null);
  const lastStatusRef = useRef(null);
  const handleDealEnd = useCallback(() => setDeal(null), []);

  const loadGame = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/games/${room_code}`, { headers: authHeaders() });
      const data = await response.json();

      if (response.ok) {
        // Only animate a start seen live: reopening a started game shows the cards right away
        if (lastStatusRef.current === 'pending' && data.data.status === 'in_progress' && !prefersReducedMotion()) {
          setDeal(buildDeal(data.data.players, data.data.discard_top));
        }
        lastStatusRef.current = data.data.status;

        setPlayers(data.data.players);
        setStatus(data.data.status);
        setDrawPileCount(data.data.draw_pile_count);
        setDiscardTop(data.data.discard_top);
        setHand(data.data.hand);
        setInitialReveal(data.data.initial_reveal);
        setCurrentPlayerId(data.data.current_player_id);
        setError('');
      } else {
        setError(data.error || 'Could not load the game.');
      }
    } catch (err) {
      setError(`Could not reach the backend server. Details: ${err.message || err}`);
    }
  }, [room_code]);

  // Loads the game now, then every few seconds
  useEffect(() => {
    // loadGame only sets state after the request has answered (after await), not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGame();
    const intervalId = setInterval(loadGame, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [loadGame]);

  // Sends an action on the game, then reloads it (unless reload is false).
  // Returns true when the action worked, so the drag and drop knows whether the card was played.
  const postAction = async (action, body = {}, { reload = true } = {}) => {
    setIsActing(true);
    try {
      const response = await fetch(`${API_URL}/games/${room_code}/${action}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'This action did not work.');
        return false;
      }
      if (reload) await loadGame();
      return true;
    } catch (err) {
      setError(`Could not reach the backend server. Details: ${err.message || err}`);
      return false;
    } finally {
      setIsActing(false);
    }
  };

  // Only the host can start the game
  const isHost = players.some(player => player.host && player.current_user);
  const canStart = players.length >= 2 && !isActing;

  const handleStartGame = () => postAction('start');
  const handleRevealCard = cardId => postAction('reveal', { card_id: cardId });
  const handleDraw = source => postAction('draw', { source });
  const handleSwap = cardId => postAction('swap', { card_id: cardId });
  const handleDiscard = cardId => postAction('discard', { card_id: cardId });
  // Dragging the discard pile card straight onto the grid: take it, then swap it
  const handleTakeAndSwap = async cardId => {
    if (!(await postAction('draw', { source: 'discard_pile' }, { reload: false }))) return false;
    const swapped = await handleSwap(cardId);
    // If the swap failed, the card is now in hand: show it so the player can still play it
    if (!swapped) await loadGame();
    return swapped;
  };

  const handleLeaveGame = () => {
    // Later, notify the Rails backend through the API or ActionCable
    navigate('/');
  };

  let waiting = 'Everyone is here? Start the game!';
  if (players.length < 2) waiting = 'Waiting for other players...';
  else if (!isHost) waiting = 'Waiting for the host to start the game...';

  // Before the deal, the players already sit at their seats, and the room code is in the middle of the table
  const lobby = (
    <TableLayout
      players={players}
      renderPlayer={(player, { small }) => <PlayerGrid player={player} small={small} />}
    >
      <RoomCode
        code={room_code}
        lines={['Share this code with your friends so they can join your game!', waiting]}
      >
        {isHost && (
          <button
            className="btn btn--success game-room__start"
            onClick={handleStartGame}
            disabled={!canStart}
          >
            {isActing
              ? 'Starting...'
              : players.length < 2
                ? 'Start the game (requires at least 2 players)'
                : 'Start the game'}
          </button>
        )}
      </RoomCode>
    </TableLayout>
  );

  return (
    <div className="game-room">
      <div className="game-room__header">
        <h2>🎰 Skyjo table: Cieljo</h2>
        <button
          onClick={handleLeaveGame}
          className="btn btn--danger"
        >
          Leave the table
        </button>
      </div>

      {error && <p className="game-room__error">{error}</p>}

      {status === 'pending' ? lobby : (
        <GameTable
          roomCode={room_code}
          players={players}
          drawPileCount={drawPileCount}
          discardTop={discardTop}
          hand={hand}
          initialReveal={initialReveal}
          currentPlayerId={currentPlayerId}
          busy={isActing}
          onRevealCard={handleRevealCard}
          onDraw={handleDraw}
          onSwap={handleSwap}
          onDiscard={handleDiscard}
          onTakeAndSwap={handleTakeAndSwap}
          deal={deal}
          onDealEnd={handleDealEnd}
        />
      )}
    </div>
  );
}
