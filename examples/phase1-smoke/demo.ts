/**
 * From this folder: `npm install` then `npm run dev`.
 * Open the URL printed by the server; each Ping updates the text with a new timestamp (FRAGMENT proof).
 *
 * This demo imports core source directly so it works without building packages/core first.
 */
import { app } from '../../packages/core/src/index.ts'

function fragmentTimestampLabel(): string {
  const d = new Date()
  const wall = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${wall}.${ms}`
}

await app(
  'Phase 1 Smoke',
  (ui) => {
    const text = ui.text(
      'Phase 1 baseline is running. Each Ping sends a FRAGMENT with a fresh timestamp below.',
    )
    ui.button('Ping', () => {
      text.update(
        `FRAGMENT refreshed at ${fragmentTimestampLabel()} (local time, ms shown).`,
      )
    })
  },
  { server: { port: 3500 } },
)
