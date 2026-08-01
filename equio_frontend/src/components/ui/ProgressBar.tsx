import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '../../utils/classNames';

gsap.registerPlugin(useGSAP);

interface ProgressBarProps {
  percentage: number;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ percentage, className, barClassName }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const safePercentage = Math.min(Math.max(percentage, 0), 100);
  let colorClass = "bg-secondary-500";
  if (safePercentage >= 90) {
    colorClass = "bg-tertiary-500";
  } else if (safePercentage >= 70) {
    colorClass = "bg-yellow-500";
  }

  useGSAP(() => {
    gsap.fromTo(
      barRef.current,
      { width: "0%" },
      { 
        width: `${safePercentage}%`, 
        duration: 1.2, 
        ease: "back.out(1.2)",
        delay: 0.1
      }
    );
  }, [safePercentage]);

  return (
    <div className={cn("h-3 w-full bg-neutral-100 rounded-full overflow-hidden", className)}>
      <div 
        ref={barRef}
        className={cn(`h-full rounded-full`, barClassName || colorClass)}
        style={{ width: 0 }}
      />
    </div>
  );
}
