import { cn } from "../../utils/classNames";

interface ProgressiveBlurProps {
  className?: string;
  direction?: "top" | "bottom" | "left" | "right";
}

export function ProgressiveBlur({
  className,
  direction = "bottom",
}: ProgressiveBlurProps) {
  const directionMap = {
    top: "bg-gradient-to-t",
    bottom: "bg-gradient-to-b",
    left: "bg-gradient-to-l",
    right: "bg-gradient-to-r",
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 w-full h-24 backdrop-blur-[2px]",
        directionMap[direction],
        "from-white/0 to-white/90 dark:from-neutral-950/0 dark:to-neutral-950/90",
        direction === "top" ? "top-0" : direction === "bottom" ? "bottom-0" : "",
        className
      )}
      style={{
        maskImage: `linear-gradient(to ${
          direction === "top"
            ? "bottom"
            : direction === "bottom"
            ? "top"
            : direction === "left"
            ? "right"
            : "left"
        }, black, transparent)`,
        WebkitMaskImage: `linear-gradient(to ${
          direction === "top"
            ? "bottom"
            : direction === "bottom"
            ? "top"
            : direction === "left"
            ? "right"
            : "left"
        }, black, transparent)`,
      }}
    />
  );
}
