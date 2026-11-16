import { useEffect, useId, useState } from 'react';
import './LeaveGameDialog.scss';

// Asks how to leave the table.
// - In the lobby: leave it (the player can join again with the room code).
// - During a game: pause it (come back later from the home page) or quit it for good (forfeit), which is
//   confirmed in a second step since it cannot be undone.
// onLeave() leaves the lobby or forfeits the game, onPause() goes back home and keeps the seat,
// onClose() keeps playing. Escape closes the dialog.
export default function LeaveGameDialog({ inProgress, busy = false, onLeave, onPause, onClose }) {
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  let title;
  let text;
  let actions;
  if (!inProgress) {
    title = 'Leave the table?';
    text = 'You will leave the lobby. You can join again with the room code.';
    actions = (
      <>
        <button type="button" className="btn btn--danger" onClick={onLeave} disabled={busy} autoFocus>Leave</button>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Stay</button>
      </>
    );
  } else if (!confirmingQuit) {
    title = 'Leave the game?';
    text = 'Pause it to come back later from the home page, or quit it for good.';
    actions = (
      <>
        <button type="button" className="btn btn--primary" onClick={onPause} autoFocus>Pause the game</button>
        <button type="button" className="btn btn--danger" onClick={() => setConfirmingQuit(true)}>Quit the game</button>
        <button type="button" className="btn btn--secondary" onClick={onClose}>Stay</button>
      </>
    );
  } else {
    title = 'Quit for good?';
    text = 'Your cards leave the game and the other players go on without you. You cannot come back.';
    actions = (
      <>
        <button type="button" className="btn btn--danger" onClick={onLeave} disabled={busy} autoFocus>Yes, quit</button>
        <button type="button" className="btn btn--secondary" onClick={() => setConfirmingQuit(false)}>Back</button>
      </>
    );
  }

  return (
    <div className="leave-dialog" onClick={onClose}>
      <div
        className="leave-dialog__box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={event => event.stopPropagation()}
      >
        <h3 id={titleId} className="leave-dialog__title">{title}</h3>
        <p className="leave-dialog__text">{text}</p>
        <div className="leave-dialog__actions">{actions}</div>
      </div>
    </div>
  );
}
