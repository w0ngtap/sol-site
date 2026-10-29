# Sol's website, first full draft

The marketing site for Sol. It's static: plain HTML, CSS and JS, with no build step. three.js and anime.js are in `vendor/`.
This is separate from `site/` at the root of the repo, which is the beta install page testers get (#295, PR #299).

**Run it:** `cd sol/design/website/site && python3 -m http.server 8765`, then open http://localhost:8765.
Use a server, not file://. The three.js and demo modules need one.

## How the page flows

1. **The desk** (`desk.js`, `minis.js`). A Mac desktop with Sol's name and the download in the middle. Around it are five small
   live demos: say hello, make it yours, blocks, talk to it, the notch. There are also icons and stickers. Each one opens something, and they can all be dragged.
2. **See it** (`see.js`). Scrolling plays the story. Today you are the glue between eight apps, then with Sol you talk to one, then it grows what you need.
3. **Your turn** (`demo.js`, `demo.css`). Sol's real window, rebuilt from the app's own values. It plays on its own until you type.
4. **Bring your people** (`cowork.js`, `cowork.css`). A live Cowork room with a poll, the decision log and the action board.
5. **The sun is still rising** (`pillars.js`, `pillars.css`). A three.js sunrise with the three pillars. Customizable and convenient are
   today's first look. Personalizable is next. Under all three: Sol builds its own parts on the fly.
6. **Good morning**. The download again.

The blog (`blog.html`, `post.html`, posts in `posts.js`) and the films are reached from the notch menu (`nav.js`).
Each `*-preview.html` file shows one component on its own.

## What's not done

- The footer's GitHub and Discord links are `#`. The download points at the sol-beta latest release (`posts.js`, `DL`).
- No meta, Open Graph or share images, no analytics, no hosting chosen.
- The blog posts are first drafts. The films are 5-second Higgsfield clips.
- The live window shows five AIs in its picker. The app today has Claude and Codex.
- On a phone the desk's live demos are hidden, and only the name and download show.
- The copy was written for the build, not yet for marketing. Sharpening it is the point of this handoff.
