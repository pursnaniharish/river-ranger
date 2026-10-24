# River Ranger

A game for kids (about 10 years old) that teaches how road crossings (culverts and bridges) affect stream biodiversity. All facts come from the *Massachusetts Stream Crossings Handbook* (Division of Ecological Restoration, 2nd ed. 2012, reprinted 2018).

Kids help Trouty the brook trout swim upstream by fixing 7 crossings. Each crossing is a mini-game:

| # | Level | What kids learn | Game |
|---|-------|-----------------|------|
| 1 | Meet the Stream | Stream continuity, why animals move, DER | Quiz |
| 2 | Name That Crossing | Bridge, open-bottom arch, 3-sided box, embedded box, pipe, double box, perched, sliplined | Picture quiz |
| 3 | Good or Not-So-Good? | Spotting wildlife-friendly vs. problem crossings | 👍 / 👎 |
| 4 | Critter Rescue | Impacted species and why they travel | Matching |
| 5 | Jargon Jungle | DER, SCS, overtop, riparian, embedment, openness ratio… | Memory + quiz |
| 6 | Problem Detective | Undersized / shallow / perched crossings and their consequences | Drag-and-drop sort + quiz |
| 7 | Build a Super Crossing | The six Stream Crossing Standards and their numbers | Live builder + quiz |
| ⚡ | The Big Storm | Mixed review, with questions the kid missed coming back first | Quiz with 3 flood shields |

Kids earn points (with a ×2 bonus after 3 correct answers in a row), 1–3 stars per level (7 of 10 right to pass), badges, 18 Critter Cards, and a printable **Junior Stream Continuity Ranger** certificate. The **Field Guide** (glossary, crossing types, problems, standards) is always open.

## Running it

There is no build step, no backend and no database. It's just HTML, CSS and JavaScript.

- **On your own computer:** double-click `index.html`.
- **On the web:** upload the whole folder (`index.html`, `css/`, `js/`) to any static host, such as GitHub Pages, Netlify, or a school web server.

Progress is saved in the browser’s `localStorage`, so it stays on that device and browser only. Use ⚙️ Settings → *Reset all progress* to start over.

## Files

```
index.html            page shell and top bar
css/styles.css        all styles (responsive, print styles for the certificate)
js/storage.js         save/load progress safely
js/audio.js           sound effects (Web Audio, no files)
js/confetti.js        celebration confetti
js/svg.js             drawn crossings, fish, Trouty and the stream map
js/data/glossary.js   ranger words
js/data/species.js    critter cards
js/data/questions.js  levels, question banks, sort clues, builder steps
js/games/*.js         quiz, matching/memory, sort, builder mini-games
js/app.js             screens, scoring, rewards, field guide, certificate
```

## Editing content

All questions live in `js/data/`. In a multiple-choice question, **the first option is the correct one**. The game shuffles the options on screen. Add a question to a bank (for example `RR_DATA.banks.l1`) and it is picked up automatically, including in the Big Storm review.

The handbook’s photos and artwork are copyrighted, so every picture in the game is drawn in code. To use your own photos instead, put them in an `img/` folder and extend `RR.svg.crossing` or the question rendering in `js/games/quiz.js`.
