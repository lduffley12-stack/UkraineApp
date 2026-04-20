# Вивчай Українську — Learn Ukrainian

A self-contained browser app for learning Ukrainian — a little like Duolingo, but you own it. It starts with single words (greetings, numbers, colors) and gradually works up to short phrases and full sentences.

For every item you can:

- **Hear it** — the app reads the word in Ukrainian (text-to-speech).
- **Hear it slowly** — slows playback down for harder words.
- **Say it back** — press the microphone button and repeat. The app listens in Ukrainian, compares what you said to the expected answer, and grades you. Get it right and that item is marked complete.
- **Show translation** — hide the English by default so you practice recall, and reveal it when you need a hint.

Progress is saved in your browser (localStorage) so the app remembers where you left off:

- Lessons **build on each other** — later lessons are locked until you've completed at least 80% of the previous one.
- Every lesson after the first starts with a **spiral-review warm-up**: a few randomly-picked words from earlier lessons you've already learned. Passing them reinforces the earlier lesson (it won't fall off your progress).
- When you reopen a lesson, it automatically **jumps to the first item you haven't passed yet**, so you never have to redo work.
- The home screen shows a **"Continue where you left off"** banner so you can pick up with one click.

## Running it

There's no build step and no server required.

1. Open `index.html` in Chrome, Edge, or Safari. (Chrome gives the best speech-recognition experience.)
2. Allow microphone access when prompted.
3. Pick a lesson and start.

If you'd rather serve it over `http://localhost` (some browsers are stricter about microphones on `file://`):

```
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Keyboard shortcuts (during a lesson)

- **Space** — hear the current word
- **← / →** — previous / next item
- **M** — start/stop the microphone

## Tips for pronunciation matching

- Speak clearly and not too fast.
- If the browser doesn't have a Ukrainian voice installed, you'll see a warning. On macOS, add a Ukrainian voice under System Settings → Accessibility → Spoken Content → System voice → Manage Voices. On Windows, add the Ukrainian language pack under Settings → Time & Language → Language.
- Speech recognition needs an internet connection in most browsers.

## Structure

- `index.html` — app shell
- `styles.css` — styling
- `lessons.js` — lesson data (add your own words/phrases here)
- `app.js` — all the logic

To add a new lesson, append a new object to the `LESSONS` array in `lessons.js`.
