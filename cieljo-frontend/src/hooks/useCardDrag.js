import { useCallback, useEffect, useRef, useState } from 'react';

// Below this distance, pressing and releasing a card is a click, not a drag
const DRAG_THRESHOLD_PX = 6;
const DROP_MS = 150; // the dragged card settles on its target
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

// Drag and drop of one card with Pointer Events, so it works with a mouse, a finger or a pen.
// Put the returned onPointerDown on the card to drag. While it moves, a copy of the card follows the
// pointer (only transform changes, no layout work). draggedCardId is the id of the dragged card until the
// move is over: hide every card with this id, wherever it is shown (on a pile, then in the grid once the
// move is played), so the real card never shows up under or next to its copy.
//   canDropOn(cardId): whether the card under the pointer (found by its data-card-id) is a valid target
//   onDrop(cardId): plays the move; returns a promise of true when it worked, false otherwise
//   onClick(): called when the card is pressed and released without moving
// hoveredCardId is the valid target under the pointer, to highlight it.
export default function useCardDrag({ canDropOn, onDrop, onClick }) {
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);

  // Latest callbacks, read by the pointer listeners without rebinding them
  const callbacksRef = useRef({ canDropOn, onDrop, onClick });
  useEffect(() => {
    callbacksRef.current = { canDropOn, onDrop, onClick };
  });

  // Removes a copy left on screen if the component goes away during a drag
  const copyRef = useRef(null);
  useEffect(() => () => copyRef.current?.remove(), []);

  const onPointerDown = useCallback(event => {
    if (event.button !== 0 || copyRef.current) return;
    event.preventDefault();

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
        copy = source.cloneNode(true);
        copy.classList.add('card--dragging');
        Object.assign(copy.style, {
          // The copy must not replay an animation of the card (e.g. the flip of the card in hand)
          animation: 'none',
          left: `${origin.left}px`,
          top: `${origin.top}px`,
          width: `${origin.width}px`,
          height: `${origin.height}px`,
        });
        document.body.appendChild(copy);
        copyRef.current = copy;
        setDraggedCardId(Number(source.dataset.cardId));
      }

      copy.style.transform = `translate(${dx}px, ${dy}px)`;
      const cardId = targetAt(moveEvent.clientX, moveEvent.clientY)?.cardId ?? null;
      if (cardId !== hoveredId) {
        hoveredId = cardId;
        setHoveredCardId(cardId);
      }
    };

    const finish = async endEvent => {
      if (endEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);

      if (!copy) {
        if (endEvent.type === 'pointerup') callbacksRef.current.onClick?.();
        return;
      }

      setHoveredCardId(null);
      const target = endEvent.type === 'pointerup' ? targetAt(endEvent.clientX, endEvent.clientY) : null;
      let dropped = false;
      if (target) {
        await glide(copy, origin, target.element.getBoundingClientRect(), DROP_MS);
        dropped = await callbacksRef.current.onDrop(target.cardId);
      }
      if (!dropped) await glide(copy, origin, origin, RETURN_MS);

      setDraggedCardId(null);
      // Let React show the result of the move before removing the copy, so nothing blinks
      await nextFrame();
      await nextFrame();
      copy.remove();
      copyRef.current = null;
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }, []);

  return { onPointerDown, draggedCardId, hoveredCardId };
}
