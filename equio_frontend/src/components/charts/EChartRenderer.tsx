import ReactEChartsCore from 'echarts-for-react/esm/core';
import { LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { CSSProperties } from 'react';

echarts.use([GridComponent, LegendComponent, LineChart, PieChart, SVGRenderer, TooltipComponent]);

export default function EChartRenderer({ option, style }: { option: object; style?: CSSProperties }) {
  return <ReactEChartsCore echarts={echarts} option={option as EChartsCoreOption}
    opts={{ renderer: 'svg' }} style={style} />;
}
