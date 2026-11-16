import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationsAllowed } from '../contexts/AnimationsContext';

// Below this distance, pressing and releasing a card is a click, not a drag
const DRAG_THRESHOLD_PX = 6;
const DROP_MS = 150; // the dragged card settles on its target
const MOVE_MS = 300; // a card moved by clicks glides from its place to its target
const RETURN_MS = 200; // the dragged card goes back to its place when it is not dropped on a target

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

// Moves the dragged copy (positioned on `origin`) onto `target`
function glide(copy, origin, target, duration) {
  const transform = `translate(${target.left - origin.left}px, ${target.top - origin.top}px) ` +
    `scale(${target.width / origin.width}, ${target.height / origin.height})`;
  return copy.animate(
    [{ transform: copy.style.transform || 'none' }, { transform }],
    { duration, easing: 'ease-out', fill: 'forwards' },
  ).finished;
}

// A copy of the card `source`, fixed on top of it, that can move over the table
function makeCopy(source, origin) {
  const copy = source.cloneNode(true);
  copy.classList.add('card--dragging');
  copy.classList.remove('card--selected');
  copy.removeAttribute('aria-label');
  copy.setAttribute('aria-hidden', 'true');
  Object.assign(copy.style, {
    // The copy must not replay an animation of the card (e.g. the flip of the card in hand)
    animation: 'none',
    left: `${origin.left}px`,
    top: `${origin.top}px`,
    width: `${origin.width}px`,
    height: `${origin.height}px`,
  });
  document.body.appendChild(copy);
  return copy;
}

// Drag and drop of one card with Pointer Events, so it works with a mouse, a finger or a pen.
// Put the returned onPointerDown on the card to drag. While it moves, a copy of the card follows the
// pointer (only transform changes, no layout work). draggedCardId is the id of the moved card until the
// move is over: hide every card with this id, wherever it is shown (on a pile, then in the grid once the
// move is played), so the real card never shows up under or next to its copy.
//   canDropOn(cardId): whether the card under the pointer (found by its data-card-id) is a valid target
//   onDrop(cardId): plays the move; returns a promise of true when it worked, false otherwise
// Pressing and releasing a card without moving it is a plain click, handled by the card's own onClick. The click
// a browser may still send at the end of a drag (a touch screen keeps the pointer on the card) is ignored.
// hoveredCardId is the valid target under the pointer, to highlight it.
// moveTo(source, cardId) plays the same move without dragging (a swap chosen by clicks or with the keyboard):
// the copy glides from the card `source` to the target, when the animations are allowed.
export default function useCardDrag({ canDropOn, onDrop }) {
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const animationsAllowed = useAnimationsAllowed();

  // Latest callbacks, read by the pointer listeners without rebinding them
  const callbacksRef = useRef({ canDropOn, onDrop, animationsAllowed });
  useEffect(() => {
    callbacksRef.current = { canDropOn, onDrop, animationsAllowed };
  });

  // Removes a copy left on screen if the component goes away during a move
  const copyRef = useRef(null);
  useEffect(() => () => copyRef.current?.remove(), []);

  // Starts a move: the real card is hidden while its copy is on screen
  const lift = useCallback((source, origin) => {
    const copy = makeCopy(source, origin);
    copyRef.current = copy;
    setDraggedCardId(Number(source.dataset.cardId));
    return copy;
  }, []);

  // Ends a move: the copy settles on the target and the move is played, or the copy goes back to its place.
  // Returns true when the move was played.
  const land = useCallback(async (copy, origin, target, duration) => {
    let dropped = false;
    if (target) {
      await glide(copy, origin, target.element.getBoundingClientRect(), duration);
      dropped = await callbacksRef.current.onDrop(target.cardId);
    }
    if (!dropped) await glide(copy, origin, origin, RETURN_MS);

    setDraggedCardId(null);
    // Let React show the result of the move before removing the copy, so nothing blinks
    await nextFrame();
    await nextFrame();
    copy.remove();
    copyRef.current = null;
    return dropped;
  }, []);

  const onPointerDown = useCallback(event => {
    if (event.button !== 0 || copyRef.current) return;
    // No preventDefault: the card is a button, which must still be focused and clicked. touch-action: none
    // (card--draggable) keeps the finger from scrolling the page, and user-select: none from selecting text.

    const source = event.currentTarget;
    const origin = source.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY };
    const { pointerId } = event;
    let copy = null;
    let hoveredId = null;

    const targetAt = (x, y) => {
      const element = document.elementFromPoint(x, y)?.closest('[data-card-id]');
      if (!element) return null;
      const cardId = Number(element.dataset.cardId);
      return callbacksRef.current.canDropOn(cardId) ? { element, cardId } : null;
    };

    const move = moveEvent => {
      if (moveEvent.pointerId !== pointerId) return;
      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;

      if (!copy) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        copy = lift(source, origin);
      }

      copy.style.transform = `translate(${dx}px, ${dy}px)`;
      const cardId = targetAt(moveEvent.clientX, moveEvent.clientY)?.cardId ?? null;
      if (cardId !== hoveredId) {
        hoveredId = cardId;
        setHoveredCardId(cardId);
      }
    };

    const finish = endEvent => {
      if (endEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (!copy) return; // a click, handled by the card's onClick

      // The click sent right after the pointer is released, if any, belongs to the drag
      const ignoreClick = clickEvent => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
      };
      window.addEventListener('click', ignoreClick, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', ignoreClick, { capture: true }));

      setHoveredCardId(null);
      const target = endEvent.type === 'pointerup' ? targetAt(endEvent.clientX, endEvent.clientY) : null;
      land(copy, origin, target, DROP_MS);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }, [lift, land]);

  const moveTo = useCallback(async (source, cardId) => {
    if (copyRef.current) return false;
    const element = document.querySelector(`.player-grid [data-card-id="${cardId}"]`);
    if (!source || !element || !callbacksRef.current.animationsAllowed) return callbacksRef.current.onDrop(cardId);

    const origin = source.getBoundingClientRect();
    return land(lift(source, origin), origin, { element, cardId }, MOVE_MS);
  }, [lift, land]);

  return { onPointerDown, moveTo, draggedCardId, hoveredCardId };
}
