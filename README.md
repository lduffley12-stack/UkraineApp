# Вивчай Українську — Learn Ukrainian

A self-contained browser app for learning Ukrainian — a little like Duolingo, but you own it. It starts with single words (greetings, numbers, colors) and gradually works up to short phrases and full sentences.

For every item you can:

- **Hear it** — the app reads the word in Ukrainian (text-to-speech).
- **Hear it slowly** — slows playback down for harder words.
- **See how to say it** — every item shows a syllable-by-syllable pronunciation breakdown with the stressed syllable highlighted (e.g. "pry-**VIT**"), plus a short tip about any tricky sounds.
- **Say it back** — press the microphone button and repeat. The app listens in Ukrainian and grades you. Get it right and that item is marked complete.
- **Show translation** — hide the English by default so you practice recall, and reveal it when you need a hint.

### How grading works

- **Without Azure (default):** the browser transcribes your voice to Cyrillic, and the app computes a text-match score (Levenshtein similarity). Simple and works offline-ish, but it grades whether you were *understood*, not whether you sounded Ukrainian.
- **With Azure Speech configured (recommended):** the app sends your audio to Azure's **Pronunciation Assessment** service, which scores you on four dimensions — Accuracy, Fluency, Completeness, and Prosody — at the phoneme level. You'll see an overall score, word-by-word color coding (green / yellow / red), and up to two concrete tips about which sounds or words to fix. See the Azure setup section below.

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

## Premium voice (optional): Azure Speech

Out of the box the app uses whatever Ukrainian voice your operating system has installed. If you want a dramatically better, natural neural voice, you can plug in a free Microsoft Azure Speech key. Two ways to do it:

### Option A — In-app settings panel (nothing to edit)

1. Sign in at <https://portal.azure.com>, search **Speech services** → **Create** → region near you → pricing tier **Free F0** (500,000 chars/month).
2. Open the resource → **Keys and Endpoint** → copy **KEY 1** and note the **Region**.
3. In the app, click the **⚙** gear icon, choose **Azure Speech**, paste the key, pick the region and a voice (Polina / Ostap), click **Test voice**, then **Save**.

Your key is stored only in your browser's localStorage — nothing is uploaded to Git.

### Option B — Local config file (auto-load, zero clicks)

If you'd rather not touch the settings panel each time you open the app on a new browser, create a gitignored `config.local.js` file:

```
cp config.local.example.js config.local.js
```

Open `config.local.js`, paste your Azure key, set your region, and save. Reload the app — you'll see "Using Polina (Azure Speech)" under the Hear-it button. The file is listed in `.gitignore`, so it never gets committed.

### ⚠ Keep your key out of Git

**Never paste your key into `app.js`, `README.md`, or any other committed file.** Public GitHub repos are scraped constantly, and a leaked key can be used by anyone until you rotate it. If you intend to use Azure Speech at all, either:

- Use the in-app settings panel (localStorage only — safe), **or**
- Use `config.local.js` (gitignored — safe), **and**
- Consider making the repo **private** on GitHub: open your repo → **Settings** → scroll to **Danger Zone** → **Change repository visibility** → **Make private**. This is belt-and-suspenders in case `.gitignore` is ever mis-edited.

If you ever suspect your key has leaked: go back to the Azure portal → your Speech resource → **Keys and Endpoint** → **Regenerate Key 1**.

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
