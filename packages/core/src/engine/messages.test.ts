import { describe, expect, it } from 'vitest';
import { parseClientMessage, serializeServerMessage } from './messages';

describe('messages', () => {
  it('parses known client message types and rejects unknown', () => {
    expect(parseClientMessage(JSON.stringify({
      type: 'READY',
      payload: { viewport: { width: 1, height: 2 }, theme: null },
    }))?.type).toBe('READY');

    expect(parseClientMessage(JSON.stringify({
      type: 'EVENT',
      payload: { id: 'x', event: 'change', value: 1 },
    }))?.type).toBe('EVENT');

    expect(parseClientMessage(JSON.stringify({
      type: 'THEME_CHANGE',
      payload: { mode: 'dark' },
    }))?.type).toBe('THEME_CHANGE');

    expect(parseClientMessage(JSON.stringify({
      type: 'RESIZE',
      payload: { width: 10, height: 20 },
    }))?.type).toBe('RESIZE');

    expect(parseClientMessage(JSON.stringify({
      type: 'UNKNOWN',
      payload: {},
    }))).toBeNull();
  });

  it('serializes server messages including BATCH', () => {
    const raw = serializeServerMessage({
      type: 'BATCH',
      payload: {
        messages: [
          { type: 'FRAGMENT', payload: { id: 'a', html: '<div></div>' } },
        ],
      },
    });
    expect(raw).toContain('"type":"BATCH"');
    expect(raw).toContain('"FRAGMENT"');
  });
});
