# Paper motion implementation plan

Use the approved existing photograph and opening wings. Render the configured first letter inside the card at a miniature scale, then animate the actual destination screen from the same position, rotation and scale into the full app frame. Do not add a second card design. Replace swipe transitions with an outgoing page that peels diagonally from bottom right toward top left, revealing the next page beneath. Keep reduced-motion navigation immediate and remove outgoing layers when complete or interrupted.

1. In js/app.js resolve the opening destination once; render its letter content as a miniature preview and compute its transform from the live card dimensions.
2. In show(), animate the destination from that transform and retain a noninteractive outgoing page only for later page turns.
3. In css/style.css add diagonal peel/shadow styling and remove the old photo zoom/fade that hides the miniature.
4. Verify opening, the first two page turns, Back, cleanup, and syntax. Sync the static distribution and archive.
