import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escapeHtml';

describe('HTML tooltip escaping', () => {
  it('escapes markup without corrupting UTF-8 names', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)"> & \'')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;',
    );
    expect(escapeHtml('Caf\u00e9 / \u65c5\u884c')).toBe('Caf\u00e9 / \u65c5\u884c');
  });
});
