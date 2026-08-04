import { useState, useCallback } from 'react';

export interface TriggerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useSharedElementModal() {
  const [triggerRect, setTriggerRect] = useState<TriggerRect | null>(null);

  const captureTrigger = useCallback((e?: React.MouseEvent | HTMLElement | null) => {
    if (!e) {
      setTriggerRect(null);
      return;
    }

    if ('currentTarget' in e && e.currentTarget instanceof HTMLElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTriggerRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    } else if (e instanceof HTMLElement) {
      const rect = e.getBoundingClientRect();
      setTriggerRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  return {
    triggerRect,
    captureTrigger,
    setTriggerRect
  };
}
