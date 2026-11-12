import { useEffect, useId, useRef, useState } from 'react';
import './InfoButton.scss';

// An "i" button that shows the game message in a bubble above it.
// A yellow dot appears on the button when the message changes, until the player opens the bubble.
// The bubble closes with a second click, with Escape, or with a click anywhere else.
export default function InfoButton({ message }) {
  const [open, setOpen] = useState(false);
  // The last message the player has seen in the bubble
  const [seenMessage, setSeenMessage] = useState(null);
  const rootRef = useRef(null);
  const bubbleId = useId();

  // While the bubble is open, a new message is seen right away.
  // Adjusting state during render is React's pattern for reacting to a prop change.
  if (open && message !== seenMessage) setSeenMessage(message);
  const unread = Boolean(message) && message !== seenMessage;

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOnClickOutside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnClickOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnClickOutside);
    };
  }, [open]);

  return (
    <div className="info-button" ref={rootRef}>
      {open && (
        <div id={bubbleId} className="info-button__bubble">
          {message || 'Nothing to do for now.'}
        </div>
      )}

      <button
        type="button"
        className="info-button__button"
        aria-label={unread ? 'Game info (new)' : 'Game info'}
        aria-expanded={open}
        aria-controls={bubbleId}
        onClick={() => setOpen(isOpen => !isOpen)}
      >
        i
        {unread && <span className="info-button__dot" />}
      </button>

      {/* Screen readers hear every new message, even when the bubble is closed */}
      <p className="info-button__live" aria-live="polite">{message}</p>
    </div>
  );
}
