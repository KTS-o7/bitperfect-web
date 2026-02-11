# bitperfect - Design Language & Aesthetic Guidelinesw

## Overview
SIDE A follows a **Brutalist Minimalist** design language inspired by clean typography, structured layouts, and industrial aesthetics. This document defines the visual system to ensure consistency across all components.

---

## Core Principles

### 1. **Structural Clarity**
- Use tables and grids over cards
- Clear visual hierarchy through spacing and typography, not decoration
- Minimal use of backgrounds and rounded corners
- Dividers and borders define structure

### 2. **Typography First**
- Hierarchy achieved through size, weight, and opacity
- Monospace fonts for metadata
- Sans-serif for content
- Generous letter-spacing for labels

### 3. **Minimal Color Palette**
- Base: Pure black (`#000000`) and white (`#FFFFFF`)
- Opacity variations for hierarchy:
  - Primary text: `white/100` or `white/90`
  - Secondary text: `white/50` - `white/70`
  - Tertiary text: `white/30` - `white/40`
  - Disabled/inactive: `white/20`

### 4. **No Decoration**
- No gradients, shadows, or blur effects (except backdrop-blur for sticky headers)
- No rounded corners on data elements
- Borders are functional, not decorative
- Hover states use subtle opacity changes, not background fills

---

## Typography System

### Headings & Titles
```css
font-weight: 500-600 (medium/semibold)
font-size: 14-16px
color: white/90 (default), white/100 (active/hover)
letter-spacing: -0.01em
```

### Body Text
```css
font-weight: 400 (regular)
font-size: 13px
color: white/50 (default), white/70 (hover)
```

### Labels & Metadata
```css
font-family: monospace
font-weight: 400-700
font-size: 9-12px
text-transform: uppercase
letter-spacing: 0.1em (tracking-widest)
color: white/40
```

### Data & Numbers
```css
font-family: monospace
font-variant-numeric: tabular-nums
font-size: 12px
color: white/40 (default), white/60 (hover)
```

---

## Layout System

### Grid-Based Tables

**Desktop Grid Structure:**
```
grid-cols-[50px_40px_1fr_180px_120px_80px]
gap: 16px (gap-4)
```

**Mobile Grid Structure:**
```
grid-cols-[40px_40px_1fr_60px]
gap: 16px (gap-4)
```

**Spacing:**
- Row padding: `py-3` (12px vertical)
- Container padding: `px-6` (24px horizontal)
- Column gap: `gap-4` (16px)
- Section spacing: `gap-6` to `gap-8`

### Borders & Dividers
```css
/* Row dividers */
border-bottom: 1px solid rgba(255, 255, 255, 0.1)

/* Container borders */
border: 1px solid rgba(255, 255, 255, 0.1)

/* Active/Playing accent */
border-left: 3px solid white
```

---

## Component Patterns

### Table Headers
```tsx
<div className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl border-b border-white/10">
  <div className="grid grid-cols-[...] gap-4 px-6 py-3">
    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
      LABEL
    </span>
  </div>
</div>
```

**Rules:**
- Always sticky
- Monospace uppercase labels
- 10px font size
- `tracking-widest` letter spacing
- `white/40` opacity
- Match grid structure of rows below

### Table Rows
```tsx
<div className="
  grid grid-cols-[...] gap-4 items-center
  px-6 py-3 border-b border-white/10 cursor-pointer
  transition-all duration-200
  hover:bg-white/[0.02]
">
  {/* Content */}
</div>
```

**Rules:**
- Full-width clickable area
- Minimal hover state (`bg-white/[0.02]`)
- Border dividers between rows
- No rounded corners
- Match grid structure of header

### Active/Playing State
```css
/* Left border accent */
border-left: 3px solid white
padding-left: 21px /* Compensate for border */

/* Text color */
color: white (full opacity)
```

**Rules:**
- Use left border, not background fill
- Full white text opacity
- Adjust padding to prevent layout shift

### Cover Art / Images
```tsx
<div className="w-10 h-10 shrink-0 bg-white/5 border border-white/10 overflow-hidden">
  <Image
    src={coverUrl}
    alt="Cover"
    width={40}
    height={40}
    className="w-full h-full object-cover"
  />
</div>
```

**Rules:**
- Always square (1:1 aspect ratio)
- No rounded corners
- Thin border (`border-white/10`)
- Subtle background for empty state
- 40px × 40px standard size

### Badges & Pills
```tsx
<span className="
  text-[9px] font-bold font-mono
  px-1.5 py-0.5
  border border-white/20
  text-white/60
  uppercase tracking-wider
">
  LABEL
</span>
```

**Rules:**
- Outline only, no background
- Monospace bold uppercase
- 9px font size
- Minimal padding
- No rounded corners

### Tabs / Navigation
```tsx
<button className="
  relative pb-3
  text-xs font-mono uppercase tracking-widest
  transition-all
  text-white/40 hover:text-white/70
">
  <span className="flex items-center gap-2">
    <Icon className="w-3.5 h-3.5" />
    LABEL
  </span>
  {/* Active state: bottom underline */}
  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
</button>
```

**Rules:**
- Use underlines, not backgrounds
- Monospace uppercase labels
- Small icons (3.5 × 3.5)
- Opacity-based states
- 2px bottom border for active state

### Header
```tsx
<header className="sticky top-0 z-30 bg-black border-b border-white/10">
  <div className="max-w-6xl mx-auto px-6 py-4">
    <div className="flex items-center gap-8">
      {/* Logo with VHS Icon */}
      <div className="flex-shrink-0 flex items-center gap-3">
        {/* VHS Cassette Icon - 3 colored bars */}
        <div className="flex flex-col gap-[2px]">
          <div className="w-3 h-[2px] bg-[#FF9FCF]" />
          <div className="w-3 h-[2px] bg-[#9AC0FF]" />
          <div className="w-3 h-[2px] bg-[#7FEDD0]" />
        </div>

        <div>
          <h1 className="text-base font-mono uppercase tracking-widest text-white leading-tight">
            SIDE A
          </h1>
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">
            HI-FI SEARCH
          </p>
        </div>
      </div>

      {/* Search or other content */}
      <div className="flex-1">
        {/* Content */}
      </div>
    </div>
  </div>
</header>
```

**Rules:**
- Solid black background, no blur
- Clean border bottom (`border-white/10`)
- Monospace uppercase logo
- VHS icon: 3 horizontal bars with brand colors
  - Pink: `#FF9FCF`
  - Blue: `#9AC0FF`
  - Teal: `#7FEDD0`
- Bar dimensions: 12px wide × 2px tall, 2px gap
- Sticky positioning
- Structured layout with clear spacing

### Search Bar
```tsx
<form className="w-full max-w-3xl">
  <div className="relative">
    {/* Icon */}
    <div className="absolute left-4 top-1/2 -translate-y-1/2">
      <Search className="w-4 h-4 text-white/40" />
    </div>

    {/* Input */}
    <input
      type="text"
      placeholder="SEARCH MUSIC"
      className="w-full pl-11 pr-32 py-3
                 text-sm font-mono uppercase tracking-wider
                 bg-transparent border-b-2 border-white/20
                 text-white placeholder-white/30
                 focus:outline-none focus:border-white
                 hover:border-white/40
                 transition-colors duration-200"
    />

    {/* Clear Button */}
    <button className="absolute right-24 top-1/2 -translate-y-1/2
                       text-white/40 hover:text-white">
      <X className="w-4 h-4" />
    </button>

    {/* Submit Button */}
    <button className="absolute right-0 top-1/2 -translate-y-1/2
                       px-4 py-1.5 border border-white
                       text-[10px] font-mono uppercase tracking-widest
                       bg-white text-black hover:bg-white/90">
      SEARCH
    </button>
  </div>
</form>
```

**Rules:**
- Bottom border only, no backgrounds
- Monospace uppercase text
- Clean transitions on focus
- Minimal button styling
- No rounded corners or shadows
- Icon size: 4×4 (16px)

### Empty States
```tsx
<div className="flex items-center justify-center min-h-[60vh]">
  <div className="text-center max-w-md border border-white/10 px-12 py-16">
    {/* Icon */}
    <div className="mb-6">
      <Icon className="w-10 h-10 text-white/20 mx-auto" />
    </div>

    {/* Heading */}
    <h3 className="text-sm font-mono uppercase tracking-widest text-white/90 mb-2">
      NO RESULTS
    </h3>

    {/* Description */}
    <p className="text-[11px] font-mono uppercase tracking-wider text-white/40">
      Try different keywords
    </p>
  </div>
</div>
```

**Rules:**
- Bordered box, no background
- Monospace uppercase text
- Minimal icon (10×10, white/20)
- Centered layout
- No animations or decorations
- Clear, functional messaging

---

## Interaction States

### Default
- Clean presentation
- Readable opacity levels
- Clear visual hierarchy

### Hover
```css
/* Text */
color: increase opacity by 20-30%
/* Example: white/50 → white/70 */

/* Background (minimal) */
background: white/[0.02] /* Very subtle */

/* No borders, shadows, or transformations */
```

### Active/Selected
```css
/* Border accent */
border-left: 3px solid white

/* Text */
color: white /* Full opacity */

/* Optional: underline for tabs */
border-bottom: 2px solid white
```

### Loading/Disabled
```css
opacity: 0.5
pointer-events: none
```

### Focus
```css
/* Minimal, use browser default or subtle outline */
outline: 2px solid white/20
outline-offset: 2px
```

---

## Responsive Behavior

### Breakpoints
```css
/* Mobile first */
Default: < 768px

/* Tablet */
md: 768px

/* Desktop */
lg: 1024px
```

### Grid Adaptation
**Mobile (< 768px):**
- Collapse to essential columns
- Stack secondary information
- Reduce padding
- Maintain dividers for structure

**Desktop (≥ 1024px):**
- Full grid with all columns
- Generous spacing
- All metadata visible

### Typography Scaling
```css
/* Mobile */
Titles: 14px
Body: 12px
Labels: 9-10px

/* Desktop */
Titles: 15-16px
Body: 13px
Labels: 10px
```

---

## Animation Guidelines

### Transitions
```css
/* Standard transition */
transition: all 200ms ease-in-out

/* Text/opacity changes */
transition: color 200ms, opacity 200ms

/* Layout changes (use Motion) */
transition: { type: "spring", stiffness: 400, damping: 30 }
```

### Motion Layout
```tsx
<motion.div
  layoutId="uniqueId"
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
/>
```

**Use for:**
- Tab indicators
- Active state indicators
- Layout shifts

### Wave Animation (Playing State)
```tsx
<div className="flex items-end gap-[3px] h-5">
  <div className="w-1 bg-white rounded-full animate-[wave1_0.6s_ease-in-out_infinite]" />
  <div className="w-1 bg-white rounded-full animate-[wave2_0.6s_ease-in-out_infinite]"
       style={{ animationDelay: '0.1s' }} />
  <div className="w-1 bg-white rounded-full animate-[wave3_0.6s_ease-in-out_infinite]"
       style={{ animationDelay: '0.2s' }} />
</div>
```

**Rules:**
- Reserved for playing indicator only
- 3 bars, staggered timing
- Subtle, not distracting

---

## Don'ts - Anti-Patterns

### ❌ Avoid These:
1. **Rounded corners on data elements**
   - ❌ `rounded-lg`, `rounded-xl`
   - ✅ Sharp corners for tables and data

2. **Background fills for hierarchy**
   - ❌ `bg-white/10`, `bg-gradient-to-r`
   - ✅ Use opacity and borders

3. **Heavy hover effects**
   - ❌ `hover:scale-105`, `hover:shadow-xl`
   - ✅ Subtle opacity changes only

4. **Decorative shadows**
   - ❌ `shadow-lg`, `drop-shadow-xl`
   - ✅ Borders and dividers for depth

5. **Colored accents everywhere**
   - ❌ Multiple accent colors
   - ✅ White/black with minimal color

6. **Complex animations**
   - ❌ `animate-bounce`, elaborate transitions
   - ✅ Simple, functional motion only

7. **Pill-shaped buttons**
   - ❌ `rounded-full` for data navigation
   - ✅ Underlines or borders

---

## Code Examples

### Complete Table Row Example
```tsx
<div className="
  grid grid-cols-[50px_40px_1fr_180px_120px_80px]
  gap-4 items-center
  px-6 py-3
  border-b border-white/10
  border-l-[3px] border-l-transparent
  cursor-pointer
  transition-all duration-200
  hover:bg-white/[0.02]
">
  {/* Track Number */}
  <div className="text-center">
    <span className="text-sm font-mono text-white/40">01</span>
  </div>

  {/* Cover Art */}
  <div className="w-10 h-10 bg-white/5 border border-white/10">
    <img src="..." className="w-full h-full object-cover" />
  </div>

  {/* Title + Artist */}
  <div className="min-w-0">
    <h3 className="font-medium text-[15px] text-white/90 truncate">
      Song Title
    </h3>
    <p className="text-[13px] text-white/50 truncate">
      Artist Name
    </p>
  </div>

  {/* Album */}
  <div className="hidden lg:block min-w-0">
    <span className="text-[13px] text-white/30 italic truncate">
      Album Name
    </span>
  </div>

  {/* Quality Badge */}
  <div className="hidden lg:flex gap-1.5">
    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 border border-white/20 text-white/60 uppercase">
      HI-RES
    </span>
  </div>

  {/* Duration */}
  <div className="text-right">
    <span className="text-[12px] font-mono text-white/40 tabular-nums">
      3:45
    </span>
  </div>
</div>
```

---

## Accessibility

### Focus States
- Maintain visible focus indicators
- Use `outline` with sufficient contrast
- Don't remove focus styles

### Color Contrast
- All text meets WCAG AA standards
- Minimum contrast ratio: 4.5:1
- Use higher opacity for important content

### Keyboard Navigation
- Full keyboard support for all interactive elements
- Logical tab order
- Clear focus indicators

### Screen Readers
- Proper semantic HTML
- ARIA labels where needed
- Alt text for images

---

## File Organization

```
components/
├── search/
│   ├── TrackRow.tsx          # Brutalist table row
│   ├── TableHeader.tsx        # Sticky table header
│   └── SearchResults.tsx      # Container with tabs
app/
└── globals.css                # Wave animations, base styles
docs/
└── DESIGN_LANGUAGE.md         # This file
```

---

## Maintaining Consistency

### Before Creating New Components:
1. Review this design language doc
2. Use existing components as reference
3. Follow the grid and typography systems
4. Test responsive behavior
5. Verify accessibility

### When Updating Components:
1. Ensure changes align with core principles
2. Update this document if introducing new patterns
3. Apply changes consistently across similar components
4. Test all interaction states

---

## Version History
- **v1.0** - 2026-02-02 - Initial brutalist design system for SIDE A music search
