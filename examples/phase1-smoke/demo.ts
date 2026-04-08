import { app } from '../../packages/core/dist/index.js'

app('Phase 1 Smoke', (ui) => {
  const text = ui.text('Phase 1 baseline is running')
  ui.button('Ping', () => {
    text.update('Button click handled and FRAGMENT rendered')
  })
})
