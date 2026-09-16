# Collage Background and Unified Mobile Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every screen one stable responsive frame, add restrained scrapbook background details, remove repeated chrome, and add configurable personal and playful interactions.

**Architecture:** Keep the existing static JSON-driven application. Extend validation and renderers in `js/app.js`, centralize frame sizing and decorative presentation in `css/style.css`, and keep all editable copy in `data/content.json`. Mirror final deployable files into `dist/` and rebuild the root GitHub Pages archive.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, JSON, Node.js validation script

**Spec:** `docs/superpowers/specs/2026-09-12-collage-unified-mobile-frame-design.md`

## Global Constraints

- No runtime dependencies, build step, external fonts, or remote assets.
- Support CSS viewport widths from 320px through 430px plus desktop.
- Use `100dvh` with `100svh` fallback and safe-area insets.
- Every screen uses the same outer frame width and height.
- Long content scrolls vertically inside the frame; horizontal scrolling is forbidden.
- Tap targets remain at least 44px high.
- All visible copy uses “anh – em”, and all new copy and personal values remain editable in `data/content.json`.
- Motion obeys `prefers-reduced-motion`.
- The decline button never moves and the final decline reaction remains fixed.

---

### Task 1: Extend configurable content and validation

**Files:**
- Modify: `data/content.json`
- Modify: `js/app.js`
- Modify: `tests/validate.cjs`

**Interfaces:**
- Consumes: existing `validate(content)`, `ui(key)`, screen renderer data.
- Produces: `settings.recipientName`, `settings.anniversaryDate`, `settings.musicFadeDuration`, `question.tease.reactions`, `scratch-gift.gift.title`, `gift.promise`, `gift.stampText`, and `gift.progressMessages`.

- [ ] **Step 1: Add failing validator cases**

Add tests that reject an empty recipient, a reactions array whose length differs from tease messages, an empty scratch progress list, and a music fade duration outside `0..5000`.

```js
test('tease reactions align with messages', d => {
  d.screens.find(s => s.type === 'question').tease.reactions = ['🥺'];
}, true);
test('scratch progress messages cannot be empty', d => {
  d.screens.find(s => s.type === 'scratch-gift').gift.progressMessages = [];
}, true);
test('music fade duration is bounded', d => { d.settings.musicFadeDuration = 9000; }, true);
```

- [ ] **Step 2: Run the validator and confirm the new cases fail**

Run: `node tests/validate.cjs`

Expected: at least one newly added invalid case does not throw.

- [ ] **Step 3: Add JSON defaults and validation**

Use complete sample values:

```json
"recipientName": "chị",
"anniversaryDate": "Ngày mình bắt đầu câu chuyện này",
"musicFadeDuration": 1500
```

Pair the five tease messages with `['😳', '🥺', '😿', '🙀', '😼']`. Add `title`, `promise`, `stampText`, and three progress messages to the scratch gift.

Validate non-empty strings, equal tease/reaction lengths, non-empty progress messages, and fade duration from 0 through 5000.

- [ ] **Step 4: Run tests**

Run: `node --check js/app.js && node tests/validate.cjs`

Expected: syntax succeeds and all validator cases pass.

### Task 2: Build the unified frame and restrained collage background

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: existing `#app`, `.screen`, `.stage`, navigation renderers.
- Produces: `.ambient-collage`, `.collage-newsprint`, `.collage-book`, `.collage-botanical`, and one stable `.screen` frame with scrollable `.stage` content.

- [ ] **Step 1: Add static ambient decoration markup**

Insert one `aria-hidden="true"` collage container beside `#app`, with three decorative children. Keep the application landmark unchanged.

```html
<div class="ambient-collage" aria-hidden="true">
  <span class="collage-newsprint"></span>
  <span class="collage-book"></span>
  <span class="collage-botanical"></span>
</div>
```

- [ ] **Step 2: Remove repeated masthead and footer rendering**

In `show()`, stop constructing `header.masthead`, `footer.footer`, and progress dots. Append only the stage and optional navigation to the screen. Preserve the document title and each screen heading.

- [ ] **Step 3: Implement stable frame sizing and internal scroll**

Set `html, body` to a non-scrolling viewport shell; make `#app` use `width:min(100%,420px)` and a height based on `100svh` followed by `100dvh`. Apply safe-area-aware outer padding. Give `.screen` a fixed inherited height, grid rows `minmax(0,1fr) auto`, and `overflow:hidden`; give `.stage` `overflow-y:auto`, `overscroll-behavior:contain`, and `scrollbar-gutter:stable` where supported.

Use responsive `clamp()` values for headings, paragraph text, padding, gaps, envelope height, gallery cards, scratch card, and navigation. Keep controls at least 44px high and set `overflow-x:clip` globally.

- [ ] **Step 4: Add restrained responsive collage CSS**

Build the newsprint and book fragments with layered gradients and repeated text-like lines. Use the existing `assets/stickers/flower.png` as an ivory-white botanical layer with a soft shadow. Desktop shows all three; widths below 600px show only the newsprint and botanical corners; widths below 360px reduce scale while preserving the white accent.

- [ ] **Step 5: Rewrite the story as one continuous arc**

Update `data/content.json` so the five letter screens move through ordinary beginning, meaningful small moments, realization, desire for more time together, and serious intent. Limit each screen to two concise paragraphs, then keep the confession question direct. Replace every remaining “chị” with “em”, including reactions and gift copy.

- [ ] **Step 6: Verify the source remains valid**

Run: `node --check js/app.js && node tests/validate.cjs`

Expected: both pass.

### Task 3: Add reactions, acceptance celebration, scratch prompts, and music fade

**Files:**
- Modify: `js/app.js`
- Modify: `css/style.css`
- Test: `tests/validate.cjs`

**Interfaces:**
- Consumes: validated fields from Task 1 and the unified screen frame from Task 2.
- Produces: `.tease-reaction`, `.accept-glow`, `.celebration`, `.gift-details`, `celebrate()`, `scratchPrompt(ratio)`, and `fadeAudioIn(audio, duration)` behavior.

- [ ] **Step 1: Render fixed decline reactions and accept glow**

Render a dedicated reaction span inside the reserved tease note. On each tease click, update message and reaction at the same clamped index. Add `accept-glow` to the primary button after the third decline; never alter button position or dimensions.

- [ ] **Step 2: Add the acceptance overlay**

Before navigating from the positive question action, append a fixed `aria-hidden` celebration layer containing a small bounded set of heart and paper pieces. Remove it after 2500ms. In reduced-motion mode render a short opacity transition and navigate without delay.

- [ ] **Step 3: Add scratch progress copy and revealed gift details**

Map scratch ratio to the configured prompt list, reserving the final prompt for the last third before the reveal threshold. On reveal, append/show the gift title, promise, and stamp below the image. Keep the accessible reveal button and focus transfer.

- [ ] **Step 4: Fade audio after explicit play**

Set volume to zero immediately before `audio.play()`, then raise it linearly to 1 using `requestAnimationFrame` over `settings.musicFadeDuration`. Cancel the frame when paused, ended, or the renderer is disposed. Skip the ramp in reduced-motion mode.

- [ ] **Step 5: Add reduced-motion and responsive styles**

Disable glow, falling pieces, and transforms under `prefers-reduced-motion: reduce`. Ensure reactions, gift copy, and the stamp wrap within 320px content width.

- [ ] **Step 6: Run automated checks**

Run: `node --check js/app.js && node tests/validate.cjs`

Expected: both pass.

### Task 4: Browser QA and GitHub Pages release

**Files:**
- Modify: `docs/verification.md`
- Replace mirrored files under: `dist/`
- Replace: `thiepqr-github-pages.zip`

**Interfaces:**
- Consumes: final source HTML, CSS, JavaScript, JSON, and local assets.
- Produces: tested `dist/` tree and root-structured GitHub Pages ZIP.

- [ ] **Step 1: Run local browser QA**

Exercise intro, envelope opening, every letter, gallery, all five declines plus one extra decline, accept, scratch progress, accessible reveal, accepted, and music screens. Check 320px, 390px, 430px, and desktop widths. Record frame bounding boxes and confirm width and height are identical across screens with zero horizontal overflow.

- [ ] **Step 2: Verify accessibility and fallbacks**

Confirm keyboard focus, back/next navigation, missing photo/gift/audio placeholders, 44px controls, safe-area spacing, and reduced-motion rules.

- [ ] **Step 3: Synchronize deployment files**

Copy `index.html`, `css/`, `js/`, `data/`, `assets/`, `.nojekyll`, `README.md`, and `GITHUB-PAGES.md` into `dist/`. Compare the source and mirrored HTML, CSS, JavaScript, and JSON byte-for-byte.

- [ ] **Step 4: Rebuild and verify archive**

Create `thiepqr-github-pages.zip` from the contents of `dist/` so `index.html` is at the archive root. Run `unzip -t thiepqr-github-pages.zip` and calculate SHA-256.

- [ ] **Step 5: Record verification and commit**

Update `docs/verification.md` with test results, viewport results, missing asset behavior, archive integrity, and hash. Run `git diff --check`, verify a clean release tree, then commit the implementation.
