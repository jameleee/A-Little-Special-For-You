# Verification

- JavaScript syntax: passed.
- 38 production-validator cases plus empty, null and malformed inputs: passed.
- Full in-app browser flow visited every default screen; envelope auto-transition and history back passed.
- The application frame stayed 418 × 664 CSS pixels on every screen in the 729 × 722 in-app browser viewport. Gallery, question, and scratch overflow remained internal to the stage; document horizontal overflow stayed at zero.
- Responsive browser fixtures at 320 × 844, 390 × 844, and 430 × 844 showed the same full-height frame, safe mobile margins, readable type, reachable navigation, and no horizontal clipping. Intro, question, and scratch layouts were visually inspected at those widths.
- Repeated masthead, footer sentence, and progress dots are absent from the rendered DOM.
- The supplied scrapbook photographs now provide the full-screen decoration on desktop and phones; the earlier generated corner collage is disabled so it does not compete with the photographic paper, flowers, clips, and foliage.
- The complete letter was rewritten as one continuous “anh–em” story: meeting, growing closeness, recognizing affection, wanting more shared days, and making a clear proposal. No “chị” copy remains in the content configuration.
- Three supplied cream-paper photographs now rotate across the five letter chapters: torn-paper flowers, coffee and stationery, and softly shadowed paper with a brass clip. Each keeps the prose on a translucent reading sheet; all three were visually inspected in the desktop frame, and the first was rechecked at 320 × 844 with a 320px document width and no internal stage overflow.
- All five letter chapters now share a responsive reading-safe area with narrower paper margins, height-aware heading/body scaling, tighter short-screen rhythm, and bounded corner artwork. The final note participates in document flow instead of overlaying prose. At 418 × 664 every paper measured 324px wide, remained inside the 562px stage, required no internal scrolling, and produced zero horizontal overflow.
- Dancing Script 400/500 is bundled locally and applied to headings and letter copy for a lighter, connected pen style. Vietnamese diacritics, line wrapping, and visual hierarchy were inspected at 320, 390, 418, and 430 CSS pixels; controls retain the UI font for clarity.
- Phone-specific letter copy now scales from 16–18px with balanced headings and improved paragraph wrapping. At a 320 × 844 fixture, the app measured 308 × 832, the letter paper measured 276 × 397, document width stayed exactly 320px, and the stage required no overflow for the tested letter page.
- Four supplied scrapbook references are bundled as optimized JPEG assets: the fourth image is the intro cover, while the first three rotate across the envelope, letter, gallery, question, scratch, result, and music screens. Cover crops were visually inspected at 320, 390, 418, and 430 CSS pixels; letter, question, and scratch content remained readable over the paper textures with no document-level horizontal overflow.
- Intro copy now uses a dedicated safe column to the right of the rope and wax seal. At 320px the title wraps to three balanced lines; at 390–430px it uses two. The open action matches that column and uses a translucent cream surface, olive border, handwritten label, and a 52px minimum touch target.
- The closed envelope screen now renders the supplied kraft-card photograph itself, preserving its baby's-breath flowers, white tabletop, burlap band, string, wax seal, and typewritten “with love.” mark. A blurred copy fills unused space on tall phones without stretching the original. On activation, the band releases, both kraft doors swing outward, the center fold clears, and the inner letter expands. Closed and opening states were visually inspected at 418 × 664 and 320 × 844 with zero document-level horizontal overflow.
- Two additional supplied frame references are bundled as optimized JPEG templates. The first gallery places two images in the large frames; the second places five images in the collage. Template slots preserve the source aspect ratios at 418 × 664 and 320 × 844, keep navigation reachable, and fall back to labeled placeholders for `photo-01.jpg` through `photo-07.jpg`.
- Nút “Không” advanced through five paired messages and reactions, held the final 😼 reaction and message on later clicks, and kept both buttons stationary. The accept button glow starts after the third decline.
- The confirmation screen now fits its heading, supporting copy, question, reserved tease-message area, and both 48px choice buttons inside one non-scrolling viewport. At 418 × 664 the paper stayed within the 562px stage; “Đồng ý” and “Không” shared a fixed bottom row at 541–589px through all five decline messages, with zero horizontal or internal stage overflow.
- The “Đồng ý” flow runs `question → scratch-gift → accepted → music`; the celebration overlay rendered 18 bounded pieces and removed itself.
- Scratch gift pointer behavior remains unified for mouse, touch, and pen. The accessible reveal button exposed the configured title, promise, stamp, and continuation action.
- Missing `gift.jpg` rendered the configured paper fallback without a broken-image icon.
- Four classic gallery layouts and the new photo-template validator path passed; seven missing-photo placeholders verified in the two default gallery screens.
- Missing audio disables controls. Audio still requires an explicit play action; the new volume ramp is bounded by the validated 0–5000ms setting and is skipped for reduced motion.
- Additional ending screen rendered from JSON without changing app.js.
- Malformed JSON produced a visible error card.
- Desktop layout keeps a centered 420px maximum-width frame and a maximum 844px height.
- Relative references verified; nested fixture route exercised the same renderer. GitHub Pages root deployment requires no build.
- Reduced-motion CSS disables falling pieces and pulsing glow, removes scratch-cover transitions, and keeps the shorter auto-advance path. Physical iOS/Android devices were not available for testing.

Personal photos and song.mp3 are not supplied; configured graceful fallbacks are intentional.

The envelope now uses the latest full portrait reference at its original aspect ratio. Photographic halves rotate in the existing envelope DOM with a 160ms stagger and eased deceleration; the greeting fades in and navigation follows after 2600ms. Browser inspection confirmed the screen remains `envelope` during opening, with no horizontal overflow. The default route skips the legacy envelope-opening screen; Back returns to the closed card.

The final simplified sequence animates only the two photographic wings of the existing card, with left then right opening and navigation after 2800ms. The added accordion, calendar and pockets have been removed. Browser inspection confirmed one card, no accordion overlay, and the same envelope screen during opening.

After the wings open, the existing card zooms to 1.55× and fades over 800ms, then enters the first letter at 3000ms with a soft scale/fade. Subsequent content screens enter from left to right over 550ms. Browser inspection confirmed the card's scale/opacity during exit, `letter-arrive` on the first letter and `swipe-right` on the next. Reduced-motion settings retain the global shortened animations.

The current opening renders the configured first letter inside the photographic card, then animates the destination from that miniature's position, rotation and scale to the full frame over 1000ms. Later pages reveal the next screen by peeling the outgoing page diagonally from bottom right to top left over 900ms, with a moving fold shadow. Browser inspection verified the miniature contains the actual letter, the outgoing layer is removed (one screen remains), and Back still navigates. Syntax and all 38 validator cases passed.

Latest requested opening replaces moving wings with a match and canvas paper-burn mask. An irregular charred edge expands from the card center, exposing the configured first letter underneath; the same spatial zoom hands off to that letter. Canvas resolution is capped at 2×; animation frames and timers are canceled during navigation; reduced motion skips the burn. Browser inspection verified the reveal visually, and syntax plus all 38 validator cases passed.

GitHub Pages archive SHA-256: `56078115cb662440abe1c34b9f08a097b4fdceb81ea16166d0598c8f49cead34`.


## 2026-09-14 Travel paper-burn portal
- Screen 2 uses the supplied travel composition with baked UI removed.
- Live destination DOM is rendered once, revealed under canvas paper and promoted at completion.
- 2950ms opening, 500ms ignition, final 900ms transform; reduced motion uses 200ms fade.
- Browser checked opening, back/replay and subsequent page navigation; layouts viewed at 360×800, 390×844, 393×852, 430×932. No physical-device Safari test.
- 43 validator cases passed, plus malformed input checks. Source mirrored to dist and GitHub Pages archive rebuilt.

## 2026-09-15 Bidirectional notebook transition
- Content screens configured for 800ms mirrored diagonal folds; forward bottom-right, backward bottom-left. Cream textured reverse face and directional moving shadow.
- Destination rendered underneath before motion; both pages inert during turn; reduced-motion bypass and disposal supported. Opening fire sequence unchanged.
- Browser verified both directions, underlying destination and inert attributes. Geometry checks verify mirrored faces and monotonically revealed area; 45 validation cases pass.
