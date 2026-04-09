import { escapeHtml } from './renderer';

export function createHtmlShell(input: {
  title: string;
  initialTheme: 'light' | 'dark';
  includeToolbar: boolean;
  bodyHtml: string;
  clientScriptPath: string;
}): string {
  const toolbar = input.includeToolbar
    ? `<header class="lk-toolbar">
      <div class="lk-brand">Lastriko</div>
      <button id="lk-theme-toggle" class="lk-theme-toggle" type="button">Theme</button>
    </header>`
    : '';

  return `<!doctype html>
<html lang="en" data-theme="${input.initialTheme}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <link rel="stylesheet" href="/style.css" />
    <script>
      (function () {
        try {
          var q = new URLSearchParams(window.location.search);
          if (q.get('debug') === '1') {
            sessionStorage.setItem('lk-debug-ws', '1');
          }
          if (sessionStorage.getItem('lk-debug-ws') === '1') {
            window.__LK_DEBUG_WS__ = true;
          }
        } catch (e) {}
      })();
    </script>
    <script type="module" src="${escapeHtml(input.clientScriptPath)}"></script>
  </head>
  <body>
    ${toolbar}
    <main id="lk-root" class="lk-page">${input.bodyHtml}</main>
    <div id="lk-toast-root" class="lk-toast-root"></div>
  </body>
</html>`;
}
