import { useEffect, useId, useRef, useState } from 'react';
import './LeaveGameDialog.scss';

// Asks how to leave the table.
// - In the lobby: leave it (the player can join again with the room code).
// - During a game: pause it (come back later from the home page) or quit it for good (forfeit), which is
//   confirmed in a second step since it cannot be undone.
// onLeave() leaves the lobby or forfeits the game, onPause() goes back home and keeps the seat,
// onClose() keeps playing. Escape closes the dialog.
// For keyboard players, Tab stays inside the dialog while it is open, and the focus goes back to the button that
// opened it once it is closed.
export default function LeaveGameDialog({ inProgress, busy = false, onLeave, onPause, onClose }) {
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const titleId = useId();
  const boxRef = useRef(null);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !boxRef.current) return;

      // Tab from the last button goes back to the first one, Shift+Tab from the first one to the last one
      const buttons = [...boxRef.current.querySelectorAll('button:not(:disabled)')];
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const inside = boxRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // The element focused before the dialog opened (the "Leave the table" button) gets the focus back.
  // It is read at the first render, before the autoFocus of the dialog's buttons moves the focus.
  const [opener] = useState(() => document.activeElement);
  useEffect(() => {
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opener]);

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
        ref={boxRef}
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
