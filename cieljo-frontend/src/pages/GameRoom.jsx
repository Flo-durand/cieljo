import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import GameTable from '../components/GameTable';
import LeaveGameDialog from '../components/LeaveGameDialog';
import PlayerGrid from '../components/PlayerGrid';
import RoomCode from '../components/RoomCode';
import TableLayout from '../components/TableLayout';
import { buildDeal } from '../game/deal';
import { AnimationsContext } from '../contexts/AnimationsContext';
import { animationsAllowed } from '../game/animations';
import { rulesFromApi } from '../game/rules';
import usePageVisible from '../hooks/usePageVisible';
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
  // The rules of the game from the API (grid size, cards to reveal, maximum of players); null until loaded
  const [rules, setRules] = useState(null);
  const [hand, setHand] = useState(null);
  const [initialReveal, setInitialReveal] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [error, setError] = useState('');
  // True while an action (start, reveal, turn) is being sent, to block double clicks
  const [isActing, setIsActing] = useState(false);
  // The deal being animated, set when this page sees the game go from pending to in progress
  const [deal, setDeal] = useState(null);
  const lastStatusRef = useRef(null);

  // The animations only play in front of the player (see src/game/animations.js); the table reads it from
  // AnimationsContext, and loadGame from animationsAllowedRef (it runs outside the render)
  const pageVisible = usePageVisible();
  const allowAnimations = animationsAllowed({ pageVisible, catchingUp: false, reducedMotion: prefersReducedMotion() });
  const animationsAllowedRef = useRef(allowAnimations);
  useEffect(() => {
    animationsAllowedRef.current = allowAnimations;
  }, [allowAnimations]);
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
        if (lastStatusRef.current === 'pending' && data.data.status === 'in_progress' && animationsAllowedRef.current) {
          setDeal(buildDeal(data.data.players, data.data.discard_top));
        }
        lastStatusRef.current = data.data.status;

        setPlayers(data.data.players);
        setStatus(data.data.status);
        setDrawPileCount(data.data.draw_pile_count);
        setDiscardTop(data.data.discard_top);
        setDiscardRecent(data.data.discard_recent);
        setRules(rulesFromApi(data.data.rules));
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

  // --- Leaving the table ---
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const closeLeaveDialog = useCallback(() => setLeaveDialogOpen(false), []);

  // Leaves the lobby, forfeits the game in progress, or leaves a finished game, then goes back home
  const leaveGame = async () => {
    setIsActing(true);
    try {
      const response = await apiFetch(`/games/${room_code}/leave`, { method: 'POST' });
      if (response.ok) {
        navigate('/');
        return;
      }
      const data = await response.json();
      setError(data.error || 'Could not leave the game.');
      setLeaveDialogOpen(false);
    } catch (err) {
      setError(`Could not reach the backend server. Details: ${err.message || err}`);
      setLeaveDialogOpen(false);
    } finally {
      setIsActing(false);
    }
  };

  // A finished game is left right away; otherwise the dialog asks how to leave
  const handleLeaveGame = () => (status === 'finished' ? leaveGame() : setLeaveDialogOpen(true));

  let waiting = 'Everyone is here? Start the game!';
  if (players.length < 2) waiting = 'Waiting for other players...';
  else if (!isHost) waiting = 'Waiting for the host to start the game...';
  const isFull = rules !== null && players.length >= rules.maxPlayers;
  const playerCount = rules === null ? '' : `${players.length}/${rules.maxPlayers} players${isFull ? ' (the table is full)' : ''}`;
  const renderSeat = (player, { small }) => (
    <PlayerGrid player={player} gridRows={rules.gridRows} gridColumns={rules.gridColumns} small={small} />
  );

  // Before the deal, the players already sit at their seats, and the room code is in the middle of the table
  const lobby = (
    <TableLayout
      players={players}
      renderPlayer={renderSeat}
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

  // A finished game: the players who quit are gone, the last one wins
  const me = players.find(player => player.current_user);
  const gameOver = (
    <TableLayout
      players={players}
      renderPlayer={renderSeat}
    >
      <div className="game-room__game-over">
        <h1 className="game-room__game-over-title">Game over</h1>
        <p>
          {me && players.length === 1
            ? 'The other players left the game: you win!'
            : 'The game is over.'}
        </p>
        <button type="button" className="btn btn--success game-room__start" onClick={leaveGame} disabled={isActing}>
          Back to the home page
        </button>
      </div>
    </TableLayout>
  );

  // Nothing is drawn before the first answer of the API, which gives the rules of the game
  let table = <p className="game-room__loading">Loading the game...</p>;
  if (rules && status === 'pending') {
    table = lobby;
  } else if (rules && status === 'finished') {
    table = gameOver;
  } else if (rules) {
    table = (
      <GameTable
        roomCode={room_code}
        rules={rules}
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
    );
  }

  return (
    // The title on the left of the table and the leave button on its right. The error message sits under the
    // title, so the table never moves when one shows up.
    <AnimationsContext.Provider value={allowAnimations}>
      <div className="game-room">
        <div className="game-room__side game-room__side--left">
          <h2 className="game-room__title">🎰 Skyjo table: Cieljo</h2>
          {error && <p className="game-room__error">{error}</p>}
        </div>

        {table}

        <div className="game-room__side game-room__side--right">
          <button onClick={handleLeaveGame} className="btn btn--danger" disabled={isActing}>
            Leave the table
          </button>
        </div>

        {leaveDialogOpen && (
          <LeaveGameDialog
            inProgress={status === 'in_progress'}
            busy={isActing}
            onLeave={leaveGame}
            onPause={() => navigate('/')}
            onClose={closeLeaveDialog}
          />
        )}
      </div>
    </AnimationsContext.Provider>
  );
}
