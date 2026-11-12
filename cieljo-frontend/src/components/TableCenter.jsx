import './TableCenter.scss';

// The middle of the table during the game: the draw pile, the discard pile, and the game message below.
// drawPile and discardPile are the cards to show on each pile (the card in hand sits on the pile it was
// taken from), with their labels. An inactive pile is dimmed: it cannot be used at this step of the turn.
// pileRef points at the draw pile card, where the deal animation starts.
// entering fades the piles in when the game starts, as the room code fades out.
export default function TableCenter({
  drawPile, drawLabel, drawInactive = false,
  discardPile, discardLabel, discardInactive = false,
  pileRef, entering = false, children,
}) {
  const pileClass = inactive => `table-center__pile ${inactive ? 'table-center__pile--inactive' : ''}`;

  return (
    <div className={`table-center ${entering ? 'table-center--entering' : ''}`}>
      <div className="table-center__piles">
        <div className={pileClass(drawInactive)}>
          <div ref={pileRef}>{drawPile}</div>
          <span>{drawLabel}</span>
        </div>
        <div className={pileClass(discardInactive)}>
          {discardPile}
          <span>{discardLabel}</span>
        </div>
      </div>
      <div className="table-center__message">{children}</div>
    </div>
  );
}
