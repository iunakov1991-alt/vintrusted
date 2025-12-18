# Hero Headline Variants — A/B Testing Documentation

## Overview
This document describes the three headline variants for the "Trusted by thousands" section, implementing intentional poster-style typography with hierarchy and rhythm.

## Quick Switch Guide

### Method 1: Change JavaScript Constant
In `index.html`, find the headline switcher script and change the `VARIANT` constant:
```javascript
const VARIANT = 'A'; // Change to 'A', 'B', or 'C'
```

### Method 2: Use URL Query Parameter
Navigate to your page with `?variant=B` or `?variant=C` in the URL:
- Variant A: `index.html` or `index.html?variant=A`
- Variant B: `index.html?variant=B`
- Variant C: `index.html?variant=C`

---

## Variant A: Hierarchy Poster (Default)

### Copy
```
TRUSTED
BY
THOUSANDS
— because
EVERY DETAIL
MATTERS
```

### Typography
- **TRUSTED**: Big (clamp 44px–84px), font-weight 900, letter-spacing -0.04em
- **BY**: Mid (clamp 28px–52px), font-weight 800, letter-spacing -0.03em
- **THOUSANDS**: Big (clamp 44px–84px), font-weight 900, letter-spacing -0.04em
- **— because**: Small (14px), lowercase, opacity 0.75, letter-spacing 0.18em
- **EVERY DETAIL**: Mid (clamp 28px–52px), font-weight 800, letter-spacing -0.03em
- **MATTERS**: Big (clamp 44px–84px), font-weight 900, letter-spacing -0.04em

### Geometry
- Desktop: `max-width: 11ch`
- Mobile: `max-width: 14ch`

### Characteristics
- Maximum hierarchy with alternating sizes
- Deliberate, poster-like rhythm
- Connector line ("— because") creates visual break
- Each word on its own line for impact

---

## Variant B: Clean Tech Poster

### Copy
```
TRUSTED
BY THOUSANDS
— BECAUSE
EVERY DETAIL MATTERS
```

### Typography
- **TRUSTED**: Big (clamp 44px–84px), font-weight 900, letter-spacing -0.04em
- **BY THOUSANDS**: Mid (clamp 28px–52px), font-weight 800, letter-spacing -0.03em
- **— BECAUSE**: Small (14px), uppercase, opacity 0.75, letter-spacing 0.18em
- **EVERY DETAIL MATTERS**: Mid (clamp 28px–52px), font-weight 800, letter-spacing -0.03em

### Geometry
- Desktop: `max-width: 12ch`
- Mobile: `max-width: 16ch`

### Characteristics
- Cleaner, more condensed layout
- Grouping related words together
- All uppercase for connector line
- More balanced visual weight

---

## Variant C: Terminal/Tech

### Copy
```
TRUSTED
BY_1000+
DETAILS > NO_SURPRISES
every detail matters.
```

### Typography
- **TRUSTED**: Big (clamp 44px–84px), font-weight 900, letter-spacing -0.04em
- **BY_1000+**: Mid-mono (clamp 20px–36px), Courier New, letter-spacing 0.05em
- **DETAILS > NO_SURPRISES**: Mid-mono (clamp 20px–36px), Courier New, letter-spacing 0.05em
- **every detail matters.**: Small-lower (13px), lowercase, opacity 0.75, letter-spacing 0.18em

### Geometry
- Desktop: `max-width: 16ch`
- Mobile: `max-width: 18ch`

### Characteristics
- Tech/terminal aesthetic with monospace font
- Programming-style notation (underscore, greater-than)
- Mixed case for contrast
- Numeric representation (1000+)

---

## Technical Implementation

### Font Stack
```css
font-family: 'Inter Tight', 'Roboto Condensed', system-ui, sans-serif;
```

### Key CSS Features
1. **Responsive Sizing**: Uses `clamp()` for fluid typography
2. **Geometry Control**: `max-width` in `ch` units prevents accidental wrapping
3. **Line Height**: Tight (0.88–0.95) for poster effect
4. **Letter Spacing**: Negative for big lines, positive for small
5. **Visual Polish**: Subtle purple glow (`text-shadow: 0 2px 12px rgba(107, 0, 184, 0.3)`)

### Typing Animation
Each variant includes sequential typing animation with cursor effect:
- Lines type one at a time
- Cursor appears during typing, disappears after (except final line)
- Timing adjusted per variant based on line count

### Responsive Behavior
- Desktop: Uses specified line breaks as-is
- Mobile (≤768px): Adjusts `max-width` in `ch` units for better fit
- Font sizes scale down proportionally on smaller screens

---

## Acceptance Criteria ✓

- ✅ No accidental wrapping — line breaks are intentional
- ✅ Condensed font with tight tracking (Inter Tight)
- ✅ Typographic hierarchy (BIG, MID, SMALL)
- ✅ Readable on all screen sizes
- ✅ Desktop + Mobile deliberate line breaks
- ✅ 3 variants switchable via constant or URL param
- ✅ Correct grammar: "MATTERS" (not "MATTER")
- ✅ Subtle visual polish (text shadow/glow)
- ✅ Consistent line spacing (gap: 8px desktop, 6px mobile)

---

## Files Modified

### `index.html`
- Added variant switcher script
- Converted headline to dynamic rendering
- Added `id="heroHeadline"` for JavaScript targeting

### `styles.css`
- Comprehensive typography system for all variants
- Geometry control with `max-width` in `ch` units
- Typing animations for all three variants
- Responsive overrides for mobile
- Visual polish (text shadow)

---

## Testing Checklist

### Desktop (>768px)
- [ ] Headline looks like intentional poster, not broken wrap
- [ ] All three variants render correctly
- [ ] Typography hierarchy is clear
- [ ] Typing animation flows smoothly
- [ ] Text doesn't collide with logo/menu

### Mobile (iPhone width)
- [ ] Headline maintains intentional look
- [ ] No overflow or broken text
- [ ] Font sizes remain readable
- [ ] Variants switch correctly via URL param

### Functionality
- [ ] JavaScript constant switch works
- [ ] URL parameter switch works
- [ ] Fallback font works if Inter Tight unavailable
- [ ] Animations complete properly for all variants

---

## Recommendations

### For A/B Testing
1. **Traffic Split**: Allocate 33.3% to each variant initially
2. **Metrics to Track**:
   - Time on page
   - Scroll depth
   - Form submissions (VIN/Plate searches)
   - Mobile vs. desktop performance
3. **Duration**: Run test for at least 2 weeks or 1000+ sessions per variant

### Winner Prediction
- **Variant A**: Best for emotional impact and premium feel
- **Variant B**: Best for clarity and quick comprehension
- **Variant C**: Best for tech-savvy audience and differentiation

---

*Last updated: Dec 18, 2025*
