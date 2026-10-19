import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/i18nContextValue";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  onEnd?: () => void;
}

export function CountUp({
  to,
  from = 0,
  duration = 1,
  decimals = 0,
  className = "",
  prefix = "",
  suffix = "",
  onEnd,
}: CountUpProps) {
  const { language } = useI18n();
  const [count, setCount] = useState(from);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressRatio = Math.min(progress / (duration * 1000), 1);
      
      // Easing function (easeOutExpo)
      const easeOut = progressRatio === 1 ? 1 : 1 - Math.pow(2, -10 * progressRatio);
      
      const currentCount = from + (to - from) * easeOut;
      setCount(currentCount);

      if (progressRatio < 1) {
        animationFrame = requestAnimationFrame(updateCount);
      } else {
        setCount(to);
        if (onEnd) onEnd();
      }
    };

    animationFrame = requestAnimationFrame(updateCount);

    return () => cancelAnimationFrame(animationFrame);
  }, [to, from, duration, onEnd]);

  const formattedValue = new Intl.NumberFormat(language === "es" ? "es-PE" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(count);

  return (
    <span className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}
