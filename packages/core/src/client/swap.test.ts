import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetVirtualTableStateForTests,
  applyBatch,
  applyFragmentSwap,
  applyRender,
  restoreHotReloadSnapshot,
  saveHotReloadSnapshot,
} from './swap';

class MockIntersectionObserver {
  private static instances: MockIntersectionObserver[] = [];
  private observed = new Set<Element>();
  private readonly callback: IntersectionObserverCallback;

  public constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
  }

  disconnect(): void {
    this.observed.clear();
  }

  public trigger(isIntersecting = true): void {
    const entries = Array.from(this.observed).map((target) => ({
      isIntersecting,
      target,
      intersectionRatio: isIntersecting ? 1 : 0,
    })) as IntersectionObserverEntry[];
    this.callback(entries, this as unknown as IntersectionObserver);
  }

  public static latest(): MockIntersectionObserver | undefined {
    return MockIntersectionObserver.instances.at(-1);
  }

  public static clear(): void {
    MockIntersectionObserver.instances = [];
  }
}

function installDom(html = '<div id="lk-root"></div><div id="lk-toast-root"></div>'): void {
  document.body.innerHTML = html;
}

function buildVirtualRows(total: number): string {
  const rows = Array.from({ length: total }, (_, i) => ({
    id: `r-${i + 1}`,
    data: { idx: i + 1, name: `row-${i + 1}` },
  }));
  return JSON.stringify(rows).replaceAll('"', '&quot;');
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), 0);
  });
}

describe('client swap helpers', () => {
  const realIntersectionObserver = globalThis.IntersectionObserver;
  const realRaf = globalThis.requestAnimationFrame;
  const realCaf = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    installDom();
    __resetVirtualTableStateForTests();
    MockIntersectionObserver.clear();
    globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 0) as unknown as number;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id as unknown as NodeJS.Timeout)) as typeof cancelAnimationFrame;
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    globalThis.IntersectionObserver = realIntersectionObserver;
    globalThis.requestAnimationFrame = realRaf;
    globalThis.cancelAnimationFrame = realCaf;
    __resetVirtualTableStateForTests();
    document.body.innerHTML = '';
    window.sessionStorage.clear();
  });

  it('restores multiSelect arrays across hot reload snapshots', () => {
    installDom(`
      <div data-lk-id="multiSelect-1" data-lk-kind="multiSelect">
        <label><input type="checkbox" data-lk-multi-option value="a" checked /></label>
        <label><input type="checkbox" data-lk-multi-option value="b" /></label>
      </div>
    `);
    saveHotReloadSnapshot();

    installDom(`
      <div data-lk-id="multiSelect-1" data-lk-kind="multiSelect">
        <label><input type="checkbox" data-lk-multi-option value="a" /></label>
        <label><input type="checkbox" data-lk-multi-option value="b" /></label>
      </div>
    `);
    restoreHotReloadSnapshot();

    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('[data-lk-id="multiSelect-1"] input[type="checkbox"]'));
    expect(boxes[0]?.checked).toBe(true);
    expect(boxes[1]?.checked).toBe(false);
  });

  it('virtualizes large tables on render and scroll updates', async () => {
    const escapedRows = buildVirtualRows(240);
    applyRender({
      html: `<div class="lk-table-wrap" data-lk-id="table-1" data-lk-kind="table" data-lk-virtualized="true" data-lk-table-row-height="36" data-lk-table-empty="No data" data-lk-table-columns="[&quot;idx&quot;,&quot;name&quot;]" data-lk-table-rows="${escapedRows}" style="max-height:420px;overflow:auto;display:block;"><table class="lk-table"><thead><tr><th scope="col" aria-sort="none">idx</th><th scope="col" aria-sort="none">name</th></tr></thead><tbody></tbody></table></div>`,
      title: 'Virtual',
      theme: 'light',
    });

    MockIntersectionObserver.latest()?.trigger(true);
    await nextFrame();

    const table = document.querySelector<HTMLElement>('.lk-table-wrap[data-lk-id="table-1"]');
    const tbody = table?.querySelector('tbody');
    expect(tbody?.querySelectorAll('tr').length).toBeGreaterThan(0);
    expect(tbody?.querySelectorAll('tr').length).toBeLessThan(240);

    if (!table) {
      throw new Error('Expected virtualized table element');
    }
    table.scrollTop = 1800;
    table.dispatchEvent(new Event('scroll'));
    await nextFrame();

    const refreshed = Array.from(tbody?.querySelectorAll('tr[data-lk-table-row-id]') ?? []);
    expect(refreshed.length).toBeGreaterThan(0);
    const firstId = refreshed[0]?.getAttribute('data-lk-table-row-id') ?? '';
    expect(firstId.startsWith('r-')).toBe(true);
    expect(firstId).not.toBe('r-1');
  });

  it('hydrates virtualized tables on fragment and batch updates', async () => {
    installDom('<div id="lk-root"></div><div id="lk-toast-root"></div>');
    const escapedRows = buildVirtualRows(140);
    const html = `<div class="lk-table-wrap" data-lk-id="table-2" data-lk-kind="table" data-lk-virtualized="true" data-lk-table-row-height="36" data-lk-table-empty="No data" data-lk-table-columns="[&quot;idx&quot;,&quot;name&quot;]" data-lk-table-rows="${escapedRows}" style="max-height:420px;overflow:auto;display:block;"><table class="lk-table"><thead><tr><th scope="col" aria-sort="none">idx</th><th scope="col" aria-sort="none">name</th></tr></thead><tbody></tbody></table></div>`;
    document.getElementById('lk-root')!.innerHTML = html;

    applyFragmentSwap('table-2', html);
    MockIntersectionObserver.latest()?.trigger(true);
    await nextFrame();
    const fromFragment = document.querySelectorAll('[data-lk-id="table-2"] tbody tr');
    expect(fromFragment.length).toBeGreaterThan(0);

    applyBatch({
      messages: [
        {
          type: 'FRAGMENT',
          payload: { id: 'table-2', html },
        },
      ],
    });
    MockIntersectionObserver.latest()?.trigger(true);
    await nextFrame();
    const fromBatch = document.querySelectorAll('[data-lk-id="table-2"] tbody tr');
    expect(fromBatch.length).toBeGreaterThan(0);
  });
});
