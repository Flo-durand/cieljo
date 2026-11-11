import './RoomCode.scss';

// The room code and its instructions, shown in the middle of the table until the game starts.
// children: an optional action below the text (the start button). Its area keeps the same height
// even when empty, so the text does not move when the game starts and the room code fades out.
export default function RoomCode({ code, lines = [], className = '', children }) {
  return (
    <div className={`room-code ${className}`}>
      <h1 className="room-code__code">Room code: {code}</h1>
      {lines.map((line, index) => (
        <p key={index} className="room-code__line">{line}</p>
      ))}
      <div className="room-code__action">{children}</div>
    </div>
  );
}
