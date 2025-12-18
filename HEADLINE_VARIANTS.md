# Hero Headline Variants - A/B Testing Guide

## Current Implementation: Variant A (Hierarchy Poster)

### How to Switch Variants

**Method 1: Change HTML class**
In `index.html`, change the class on `<h2>`:
- `headline-variant-a` (current)
- `headline-variant-b` 
- `headline-variant-c`

**Method 2: Uncomment CSS rules**
In `styles.css`, uncomment the variant styles you want to test.

## Variant A: Hierarchy Poster (CURRENT)
```html
<h2 class="second-screen-title headline-variant-a">
    <span class="line line-big">TRUSTED</span>
    <span class="line line-mid">BY</span>
    <span class="line line-big">THOUSANDS</span>
    <span class="line line-small">— because</span>
    <span class="line line-mid">EVERY DETAIL</span>
    <span class="line line-big">MATTERS</span>
</h2>
```

## Variant B: Clean Tech Poster
```html
<h2 class="second-screen-title headline-variant-b">
    <span class="line line-big">TRUSTED</span>
    <span class="line line-mid">BY THOUSANDS</span>
    <span class="line line-small">— BECAUSE</span>
    <span class="line line-mid">EVERY DETAIL MATTERS</span>
</h2>
```

## Variant C: Terminal/Tech
```html
<h2 class="second-screen-title headline-variant-c">
    <span class="line line-big">TRUSTED</span>
    <span class="line line-mid">BY_1000+</span>
    <span class="line line-mid">DETAILS > NO_SURPRISES</span>
    <span class="line line-small">every detail matters.</span>
</h2>
```

## Typography Specs

- **Font**: Inter Tight, Roboto Condensed, system-ui fallback
- **BIG lines**: clamp(44px, 6vw, 84px), weight: 900, tracking: -0.04em
- **MID lines**: clamp(28px, 4vw, 52px), weight: 800, tracking: -0.02em  
- **SMALL lines**: 14px, weight: 400, tracking: 0.18em, opacity: 0.85
- **Line height**: 0.92-0.95 for tight poster feel
- **Max width**: 11ch desktop, 16ch mobile

## Mobile Responsive

Mobile (< 768px):
- BIG: clamp(36px, 8vw, 64px)
- MID: clamp(24px, 6vw, 42px)
- SMALL: 13px
- Max-width: 16ch
- Gap: 6px

## Acceptance Criteria ✅

- [x] No accidental line wrapping
- [x] Intentional, poster-style layout
- [x] Condensed font with tight tracking
- [x] Typographic hierarchy (big/mid/small)
- [x] Mobile + desktop responsive
- [x] "MATTERS" spelled correctly (not "MATTER")
- [x] Easy variant switching
- [x] Works with purple->black gradient background

