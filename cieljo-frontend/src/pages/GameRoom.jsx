import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import GameTable from '../components/GameTable';
import PlayerGrid from '../components/PlayerGrid';
import RoomCode from '../components/RoomCode';
import TableLayout from '../components/TableLayout';
import { buildDeal } from '../hooks/useDealAnimation';
import prefersReducedMotion from '../utils/prefersReducedMotion';
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
  const [discardRecent, setDiscardRecent] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState(null);
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

  // Loads of the game can cross (the refresh every few seconds and the reload after an action): every load gets
  // a number, and an answer is shown only if it is newer than the one on screen. Otherwise a late answer to an
  // older request would bring back the game as it was before, for a few seconds.
  const loadCountRef = useRef(0);
  const shownLoadRef = useRef(0);
  // Loads numbered below this one are ignored: while an action is sent, the server may answer a load with the
  // game as it was before the action (see postAction)
  const firstValidLoadRef = useRef(0);

  const loadGame = useCallback(async () => {
    loadCountRef.current += 1;
    const loadNumber = loadCountRef.current;
    // False when a newer load is already on screen: this answer is outdated
    const isLatest = () => {
      if (loadNumber <= shownLoadRef.current || loadNumber < firstValidLoadRef.current) return false;
      shownLoadRef.current = loadNumber;
      return true;
    };

    try {
      const response = await apiFetch(`/games/${room_code}`);
      const data = await response.json();
      if (!isLatest()) return;

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
        setDiscardRecent(data.data.discard_recent);
        setMaxPlayers(data.data.max_players);
        setHand(data.data.hand);
        setInitialReveal(data.data.initial_reveal);
        setCurrentPlayerId(data.data.current_player_id);
        setError('');
      } else {
        setError(data.error || 'Could not load the game.');
      }
    } catch (err) {
      if (isLatest()) setError(`Could not reach the backend server. Details: ${err.message || err}`);
    }
  }, [room_code]);

  // Loads the game now, then every few seconds, but only while the tab is visible: a hidden tab stops asking
  // the server, and catches up as soon as it is shown again
  useEffect(() => {
    let intervalId = null;

    const startRefreshing = () => {
      if (intervalId) return;
      loadGame();
      intervalId = setInterval(loadGame, REFRESH_INTERVAL_MS);
    };
    const stopRefreshing = () => {
      clearInterval(intervalId);
      intervalId = null;
    };
    const onVisibilityChange = () => (document.hidden ? stopRefreshing() : startRefreshing());

    if (!document.hidden) startRefreshing();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopRefreshing();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadGame]);

  // Sends an action on the game, then reloads it (unless reload is false).
  // Returns true when the action worked, so the drag and drop knows whether the card was played.
  const postAction = async (action, body = {}, { reload = true } = {}) => {
    setIsActing(true);
    // While the action is sent, every load is ignored, even one started meanwhile: the server may have read
    // the game before the action
    firstValidLoadRef.current = Infinity;
    try {
      const response = await apiFetch(`/games/${room_code}/${action}`, { method: 'POST', body });
      // The action is played (or refused): the loads started from now on show the game after it
      firstValidLoadRef.current = loadCountRef.current + 1;
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
      // The request failed before the server answered: let the next loads show the game again
      if (firstValidLoadRef.current === Infinity) firstValidLoadRef.current = loadCountRef.current + 1;
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
  const isFull = maxPlayers !== null && players.length >= maxPlayers;
  const playerCount = maxPlayers === null ? '' : `${players.length}/${maxPlayers} players${isFull ? ' (the table is full)' : ''}`;

  // Before the deal, the players already sit at their seats, and the room code is in the middle of the table
  const lobby = (
    <TableLayout
      players={players}
      renderPlayer={(player, { small }) => <PlayerGrid player={player} small={small} />}
    >
      <RoomCode
        code={room_code}
        lines={['Share this code with your friends so they can join your game!', playerCount, waiting]}
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
    // The title on the left of the table and the leave button on its right. The error message sits under the
    // title, so the table never moves when one shows up.
    <div className="game-room">
      <div className="game-room__side game-room__side--left">
        <h2 className="game-room__title">🎰 Skyjo table: Cieljo</h2>
        {error && <p className="game-room__error">{error}</p>}
      </div>

      {status === 'pending' ? lobby : (
        <GameTable
          roomCode={room_code}
          players={players}
          drawPileCount={drawPileCount}
          discardTop={discardTop}
          discardRecent={discardRecent}
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

      <div className="game-room__side game-room__side--right">
        <button onClick={handleLeaveGame} className="btn btn--danger">
          Leave the table
        </button>
      </div>
    </div>
  );
}
