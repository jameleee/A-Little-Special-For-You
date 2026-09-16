# Collage Background and Unified Mobile Frame Design

## Goal

Refine the existing romantic letter site so every screen uses one consistent content frame, remains comfortable on modern phones including large iPhones, and gains a restrained scrapbook background. Preserve the existing envelope, teasing decline, scratch gift, accepted, and music flows while adding the previously selected emotional and playful details.

## Visual direction

The page keeps its warm kraft-paper palette and handwritten typography. The background gains three quiet collage elements inspired by the supplied reference: a torn newspaper fragment, a dried botanical sprig, and a partial book-page edge. The paper fragments stay muted while the botanical artwork becomes ivory white with a soft shadow, creating a clear accent against the kraft background. None of these elements overlaps readable text or controls.

Desktop shows all three elements around the central frame. Phone layouts show two cropped corner elements. Screens narrower than 360px further reduce their size and opacity. The treatment must feel like a lightly decorated desk rather than a dense collage.

## Unified frame

Every application screen uses the same outer content frame dimensions. The frame width is fluid up to the existing 420px maximum. Its height is calculated from the dynamic viewport and safe-area insets, with a desktop maximum so it does not become excessively tall.

The frame remains constant while navigating. Short content is vertically balanced inside it. Long letters, galleries, question content, scratch content, and music content scroll inside the frame. Navigation controls remain reachable, and no horizontal scrolling is permitted.

The layout targets CSS viewport widths from 320px through 430px and uses `100dvh` with a `100svh` fallback. Safe-area padding covers devices with rounded corners and home indicators. Headings, paragraph spacing, card padding, polaroid gaps, and scratch controls use responsive `clamp()` values so the content fits narrow and tall phones without tiny tap targets. Interactive controls remain at least 44px high.

## Removed chrome

Remove the repeated masthead containing “MỘT CHÚT THẬT LÒNG / anh gửi em”. Remove the bottom footer sentence and progress dots from every screen. These elements are removed from rendering rather than merely hidden, freeing vertical space on phones.

The page title inside the actual content remains. The request to remove the title refers to the repeated masthead, not each screen’s main heading.

## Consistent screen contents

Intro paper, envelope scene, letter paper, gallery, question paper, scratch card, accepted paper, and music paper occupy the same shared frame area. Their visual objects retain small rotations, torn edges, and shadows, while their usable content boundary stays consistent.

Long text is edited for shorter line lengths and fewer redundant sentences. The JSON content stays editable. Missing photos, gift artwork, or music continue to show graceful placeholders.

## Story and voice

All visible copy uses the “anh – em” form of address. The letter follows one continuous emotional arc: an ordinary beginning, conversations and small meetings becoming meaningful, the realization that the feeling is more than casual, a wish for more shared days, a clear intention to be serious, and finally the confession.

The voice is conversational, sincere, and restrained. Each letter screen advances one idea and uses no more than two short paragraphs. Repeated statements about liking, ordinary days, and future dates are consolidated so the question feels earned rather than repeated. Playful language remains in the decline reactions and scratch gift, after the sincere confession has landed.

## Personal and emotional details

Add editable settings for recipient name, anniversary date, gift title, and gift promise. The envelope shows the recipient name and a small date mark without restoring the removed masthead. Gallery entries show a date next to their captions when a date is present in JSON.

On acceptance, a restrained burst of small hearts and paper confetti appears for about 2.5 seconds. It overlays the transition without delaying access to the scratch gift. Reduced-motion mode replaces the burst with a brief opacity change.

Music volume ramps up over roughly 1.5 seconds after the user presses play. Missing audio keeps the existing disabled fallback state.

## Playful interactions

Each decline message is paired with a configurable cat-style reaction glyph. The sequence uses five reactions and stops on the final reaction and final sentence. The decline button never moves.

After the third decline, the accept button receives a subtle glow. The effect stops when leaving the question screen and is disabled in reduced-motion mode.

Scratch progress cycles through short configurable prompts such as “Sắp thấy rồi…” and “Thêm một chút nữa…”. After reveal, show the gift title, gift promise, and a scrapbook stamp reading “Đã thuộc về chị”. The accessible reveal button remains available.

## Data model

All new copy and personal values live in `data/content.json`, including:

- recipient name and anniversary date
- reaction glyphs paired with tease messages
- scratch progress messages
- gift title, promise, and stamp text
- acceptance celebration settings
- music fade duration

Defaults are complete sample values that can be replaced without editing JavaScript.

## Error handling and accessibility

The validator checks the new optional fields and rejects malformed values while allowing them to be omitted for backward compatibility. Missing decorative art falls back to CSS shapes. Missing user media keeps the current placeholder behavior.

The fixed frame preserves keyboard focus, semantic headings, accessible labels, and pointer support for mouse, touch, and pen. Internal scrolling must not trap keyboard users. Motion effects obey `prefers-reduced-motion`.

## Verification

Run the content validator and JavaScript syntax check. Exercise the full flow in a browser at 320px, 390px, 430px, and desktop width. Verify constant frame dimensions across every screen, no horizontal overflow, safe-area spacing, internal scrolling, envelope animation, all decline reactions, final-message clamping, acceptance celebration, scratch progress and reveal, missing asset fallbacks, music fade, keyboard access, and reduced-motion CSS.

Rebuild `dist/` and `thiepqr-github-pages.zip` only after the source and browser checks pass.
