import { useEffect, useState } from 'react';

const secondsUntil = deadline => (deadline === null ? 0 : Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));

// The whole seconds left until deadline (a time in ms, from Date.now()), updated a few times per second; 0 once it
// has passed, or without a deadline
export default function useCountdown(deadline) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    const tick = () => setSecondsLeft(secondsUntil(deadline));
    tick();
    if (deadline === null) return undefined;
    const intervalId = setInterval(tick, 250);
    return () => clearInterval(intervalId);
  }, [deadline]);

  return secondsLeft;
}
