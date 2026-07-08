# Strokes Game Design System

A design system for **Strokes Game** — a golf fantasy/stats game built around PGA Tour Strokes Gained data. Players draft golfers by SG category (putting, approach, around the green, off the tee), track season-long performance, and compete across regular, signature, and playoff events.

**Sources used:** Three UI screenshots provided by the user (local project at `/Users/wyatt/Desktop/Strokes Game`). No Figma file, codebase, or logo was provided.

---

## Content Fundamentals

**Tone:** Dry, confident, and slightly sardonic — like a golf analyst who's seen everything and finds it mildly amusing. Not casual-bro, not stiff-corporate. Factual with personality.

**Casing:** 
- UI labels: ALL CAPS, tightly tracked (FEDEX CUP POSITION, SG: PUTTING, NOTABLE FINISHES)
- Headlines/player names: Title Case (FedEx St. Jude Championship, Alex Smalley)
- Narrative prose: sentence case, punchy short sentences
- Buttons: ALL CAPS, tracked

**Voice examples:**
- "On to the BMW." — declarative, no fuss
- "The iron play got sharp at exactly the right time. You were not chasing pins. You were bothering them."
- "Round one is handled. Now the season gets sharper, and so does the math."

**Numbers:** Always formatted with + prefix for positive SG, no prefix for negative (just the minus). Currency with $ and commas. Positions as "No. X" in banners, plain digits in stat grids.

**Emoji:** Never used.

---

## Visual Foundations

### Colors
Two-tone: warm cream backgrounds + deep forest green. Red/green for negative/positive SG values.
- **Page background:** warm cream `oklch(96% 0.012 85)` — not white, has parchment warmth
- **Cards/surfaces:** slightly lighter cream `oklch(98% 0.006 85)`
- **Banner green:** `oklch(33% 0.09 145)` — deep, saturated forest green
- **Positive green:** `oklch(38% 0.10 145)` — used for text and card borders
- **Negative red:** `oklch(42% 0.17 25)` — used for text only, never for backgrounds
- **Borders:** warm light gray `oklch(86% 0.013 85)` — never pure gray, always warm-tinted

### Typography
Two fonts only:
- **Gemunu Libre** (condensed display sans) — all hero numbers, player name headlines, tournament title headlines. Condensed geometry gives a scoreboard/leaderboard feel at large sizes.
- **Switzer** (geometric sans) — ALL CAPS labels, body prose, UI chrome, buttons. Clean and neutral; never competes with Gemunu at display sizes.

Hierarchy is strict:
- **Eyebrow labels** (10px, DM Sans 600, +0.07em tracking, ALL CAPS) — above any key value
- **Display numbers** (44–58px, Playfair Display Bold, −0.02em tracking) — the score, the stat
- **Player names as primary subject** (17px, Playfair Display Bold) — when someone is being *featured*
- **Player names in rows** (15px, DM Sans 500) — when listing
- **Body/narrative** (15px, DM Sans 400, 1.55 leading) — prose and descriptions

### Backgrounds & Surfaces
Flat. No gradients, no textures, no blur. The cream background is the only "warmth." Cards are defined by a 1px border (`oklch(86% 0.013 85)`), not shadows.

### Cards
- 1px warm-gray border, 8px radius
- Positive SG card: light green bg + green border
- Negative SG card: light red bg + light red border
- Default card: cream surface bg + warm gray border
- No shadows whatsoever

### Buttons
- **Primary:** near-black pill (`oklch(14% 0.005 85)`), cream text, ALL CAPS tracked label
- **Secondary:** transparent pill, black border, black ALL CAPS label
- **Ghost:** no border, muted text — used for inline actions
- Border-radius: 999px (pill always)
- No hover color changes — opacity 0.85 on hover is preferred

### Borders & Dividers
Only horizontal dividers between rows. Left-border accent (3px, green-700) used on narrative/quote blocks. No vertical separators except the banner column grid.

### Animation
None apparent. This is a data-display app; transitions if any should be subtle fades (150ms ease-out) only.

### Corner Radii
- 4px — badges (PLAYOFF, SIGNATURE, REGULAR), chips
- 8px — stat cards, player pick cards
- 999px — buttons, COMPLETE pill badge

### Iconography
No icon system apparent. Unicode glyphs used inline (→ for position change). Circular ⓘ info icon used once next to "TRUE STROKES GAINED." No emoji.

---

## Visual Foundations — Layout

The UI is a single-column mobile-first layout with a full-width dark green banner at top. Content sections are separated by 24–32px gaps. Cards within a section sit in a tight 1px-bordered grid (no gaps between adjacent borders — they collapse).

---

## Files

- `styles.css` — root CSS entry; imports all token files
- `tokens/colors.css` — color palette + semantic aliases
- `tokens/typography.css` — font families, scale, weights, composite roles
- `tokens/spacing.css` — spacing scale, padding shorthands, radii
- `guidelines/` — specimen cards for the Design System tab
- `components/` — reusable JSX primitives
- `ui_kits/recap/` — full recap screen UI kit

### Intentional Additions
- `Badge` component added (not explicitly in source, but PLAYOFF/SIGNATURE/REGULAR tags appear consistently and warrant a component)

---

## Notes / Caveats

- **No logo provided.** The brand name "Strokes Game" is rendered in plain type wherever a mark would go.
- **No codebase access.** This system was derived from three UI screenshots. Exact pixel values (padding, font sizes) are matched by visual inspection.
- **Font substitution:** If the original app uses a different font, provide the .ttf/.woff2 files and the @font-face rules will be updated.
