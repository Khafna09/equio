import { lazy, Suspense, type CSSProperties } from 'react';

const Renderer = lazy(() => import('./EChartRenderer'));

interface EChartProps {
  option: object;
  style?: CSSProperties;
}

export function EChart({ option, style }: EChartProps) {
  return (
    <Suspense fallback={<div style={style} aria-hidden="true"
      className="min-h-[200px] w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />}>
      <Renderer option={option} style={style} />
    </Suspense>
  );
}
