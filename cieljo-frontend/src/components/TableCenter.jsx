import Card from './Card';
import './TableCenter.scss';

// The middle of the table during the game: the draw pile, the discard pile, and the game message below.
// pileRef points at the draw pile card, where the deal animation starts.
// entering fades the piles in when the game starts, as the room code fades out.
export default function TableCenter({ drawPileCount, discardTop, discardClassName = '', pileRef, entering = false, children }) {
  return (
    <div className={`table-center ${entering ? 'table-center--entering' : ''}`}>
      <div className="table-center__piles">
        <div className="table-center__pile">
          <div ref={pileRef}>
            <Card card={drawPileCount > 0 ? { face_up: false } : null} />
          </div>
          <span>Draw pile ({drawPileCount})</span>
        </div>
        <div className="table-center__pile">
          <Card card={discardTop} className={discardClassName} />
          <span>Discard pile</span>
        </div>
      </div>
      <div className="table-center__message">{children}</div>
    </div>
  );
}
