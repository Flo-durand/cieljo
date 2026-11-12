// A card that flies over the table from one place to another, used by the deal and the turn animations.
// It is a plain element added to the page with the card--flying class; only transform is animated, so
// the layout does not move. fill: 'forwards' keeps it on its target until the caller removes it, once the
// real card is shown, so nothing blinks.
//   from, to: DOMRects of the start and the target (the card is resized to the target)
//   card: { face_up, value } to show on the flying card (face down when face_up is false)
//   flipAtTheEnd: the card ends edge-on (rotated by 90deg), so the real card can finish the flip
// Returns the element and a promise that resolves when the flight is over.
export default function flyCard({ from, to, card = { face_up: false }, duration, flipAtTheEnd = false, easing = 'ease-out' }) {
  const element = document.createElement('div');
  element.className = `card ${card.face_up ? 'card--face-up' : 'card--face-down'} card--flying`;
  if (card.face_up) element.textContent = card.value;
  Object.assign(element.style, {
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
  });
  document.body.appendChild(element);

  const moved = `translate(${to.left - from.left}px, ${to.top - from.top}px) ` +
    `scale(${to.width / from.width}, ${to.height / from.height})`;
  const keyframes = flipAtTheEnd
    ? [{ transform: 'none' }, { transform: moved, offset: 0.7 }, { transform: `${moved} rotateY(90deg)` }]
    : [{ transform: 'none' }, { transform: moved }];

  const animation = element.animate(keyframes, { duration, easing, fill: 'forwards' });
  return { element, finished: animation.finished };
}
