import ReactEChartsCore from 'echarts-for-react/lib/core';
import { LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { CSSProperties } from 'react';

echarts.use([
  GridComponent,
  LegendComponent,
  LineChart,
  PieChart,
  SVGRenderer,
  TooltipComponent,
]);

interface EChartProps {
  option: object;
  style?: CSSProperties;
}

export function EChart({ option, style }: EChartProps) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option as EChartsCoreOption}
      opts={{ renderer: 'svg' }}
      style={style}
    />
  );
}
