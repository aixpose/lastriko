import { app } from 'lastriko';

app('Hello Lastriko', (ui) => {
  const text = ui.text('Welcome to your first Lastriko app.');

  ui.button('Update text', () => {
    text.update('Text updated via FRAGMENT message.');
  });
});
