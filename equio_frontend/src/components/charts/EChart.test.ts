import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EChart } from './EChart';

describe('EChart', () => {
  it('renders the ECharts React component instead of a module object', () => {
    const chart = createElement(EChart, { option: { series: [] } });

    expect(() => renderToString(chart)).not.toThrow();
  });
});