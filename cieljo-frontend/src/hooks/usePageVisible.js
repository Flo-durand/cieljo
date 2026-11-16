import { useEffect, useState } from 'react';

// True while the tab is visible (not another tab in front, not a minimized window)
export default function usePageVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return visible;
}
