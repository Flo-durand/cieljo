import './TableCenter.scss';

// The middle of the table during the game: the draw pile and the discard pile.
// drawPile and discardPile are the cards to show on each pile (the card in hand sits on the pile it was
// taken from), with their labels. An inactive pile is dimmed: it cannot be used at this step of the turn.
// pileRef points at the draw pile card, where the deal animation starts, and discardRef at the discard
// pile card, where a swapped card flies.
// entering fades the piles in when the game starts, as the room code fades out. leaving hides them when the
// round is over, as the scores show up: 'animated' fades them out, 'instant' hides them at once.
export default function TableCenter({
  drawPile, drawLabel, drawInactive = false,
  discardPile, discardLabel, discardInactive = false,
  pileRef, discardRef, entering = false, leaving = null,
}) {
  const pileClass = inactive => `table-center__pile ${inactive ? 'table-center__pile--inactive' : ''}`;
  const classes = ['table-center'];
  if (entering) classes.push('table-center--entering');
  if (leaving) classes.push(`table-center--leaving-${leaving}`);

  return (
    <div className={classes.join(' ')} aria-hidden={leaving ? true : undefined}>
      <div className="table-center__piles">
        <div className={pileClass(drawInactive)}>
          <div ref={pileRef}>{drawPile}</div>
          <span>{drawLabel}</span>
        </div>
        <div className={pileClass(discardInactive)}>
          <div ref={discardRef}>{discardPile}</div>
          <span>{discardLabel}</span>
        </div>
      </div>
    </div>
  );
}
