---
name: Obsidian Metric System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e2beba'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#a98985'
  outline-variant: '#5a413d'
  surface-tint: '#ffb4aa'
  primary: '#ffb4aa'
  on-primary: '#690004'
  primary-container: '#ff5f52'
  on-primary-container: '#640004'
  inverse-primary: '#b32822'
  secondary: '#ffb961'
  on-secondary: '#472a00'
  secondary-container: '#e49102'
  on-secondary-container: '#533200'
  tertiary: '#83da85'
  on-tertiary: '#00390e'
  tertiary-container: '#53a759'
  on-tertiary-container: '#00360d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#910a0e'
  secondary-fixed: '#ffddb9'
  secondary-fixed-dim: '#ffb961'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#663e00'
  tertiary-fixed: '#9ff79f'
  tertiary-fixed-dim: '#83da85'
  on-tertiary-fixed: '#002105'
  on-tertiary-fixed-variant: '#005318'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  metric-xl:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 1.5rem
  stack-gap: 1rem
  item-gap: 0.5rem
  section-margin: 2rem
  grid-gutter: 1rem
---

## Brand & Style

This design system is built for high-performance productivity and data monitoring. It adopts a **Corporate / Modern** style with a dark-mode first philosophy, utilizing deep obsidian surfaces to let vibrant accent colors drive user attention. 

The brand personality is authoritative yet encouraging, using high-contrast status colors (orange, green, red) to communicate progress and urgency effectively. The aesthetic is clean and structured, prioritizing legibility and information density for analytical workflows. It evokes a sense of focus, precision, and momentum.

## Colors

The palette is optimized for a low-light, high-contrast environment.

- **Primary (Action/Alert):** A vibrant coral-red used for primary calls to action and critical failure states.
- **Secondary (Warning/Progress):** A warm amber-orange used for cautionary alerts, active progress, and mid-tier metrics.
- **Tertiary (Success):** A crisp mint-green reserved for completed tasks and positive trend indicators.
- **Neutral/Background:** The system relies on a deep black background (`#000000`) with elevated surfaces in charcoal and graphite tones to create distinct visual containers.
- **Text:** High-emphasis text uses pure white, while secondary metadata uses a muted grey to maintain hierarchy.

## Typography

The typography system uses **Manrope** for structural headings to provide a modern, geometric character, while **Inter** is utilized for all functional data and body text due to its exceptional legibility at small sizes.

- **Dashboard Headers:** Use bold weights with tight letter spacing to create a strong anchor for each section.
- **Metric Cards:** Numerical data should be prominent, often using `metric-xl` or `headline-md` to ensure the core "value" is the first thing a user sees.
- **Labels:** System labels use uppercase styling with increased tracking to differentiate them from interactive content.

## Layout & Spacing

This design system utilizes a **Fixed Grid** approach for desktop dashboards, centering content in a structured column to maintain focus.

- **Rhythm:** An 8px linear scale governs all spacing.
- **Containers:** Dashboard modules are contained within cards with consistent internal padding (24px).
- **Responsive Behavior:** 
  - **Desktop:** Multi-column layout for metric cards, transitioning to single-column for detailed tables.
  - **Tablet:** 2-column grid for metrics, full-width for tables.
  - **Mobile:** Single-column stack with horizontal margins reduced to 16px.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and subtle **Low-contrast outlines** rather than heavy shadows.

- **Level 0 (Background):** Pure black (`#000000`).
- **Level 1 (Section Cards):** Dark graphite (`#1A1A1A`) with a subtle 1px border (`#2A2A2A`) to define the perimeter.
- **Level 2 (Nested Items):** Inner lists or progress bars use a slightly lighter surface or a transparent overlay to appear "inset" or "on top" of the section card.
- **Interactive States:** Hovering over list items or buttons triggers a subtle background lightening or a colored border-left accent.

## Shapes

The shape language is consistently **Rounded**.

- **Main Containers:** Use a 16px (1rem) radius for a friendly but professional appearance.
- **Inner Elements:** Buttons, progress bars, and status pills use a 8px (0.5rem) radius.
- **Indicator Strips:** Vertical accent bars (found on the left side of cards) have rounded caps to match the container's curvature.

## Components

### Metric Cards
Metric cards feature a large numerical display, a capped label at the top, and a subtle background fill. For critical metrics, apply a 4px vertical accent border to the left side in the corresponding status color (orange/green/red).

### Data Tables
Tables should be minimalist with horizontal dividers only. Row height should be generous (min 48px). Use status-colored text for the primary data point in each row to allow for quick scanning.

### Status Indicators & Chips
- **Status Pills:** Small, rounded-pill containers with low-opacity background tints (15% opacity) and 100% opacity text.
- **Progress Bars:** Thin (8px height), using a background-track color and a vibrant foreground-fill color.

### Action Buttons
Primary buttons use the `primary_color_hex` (Coral-Red) with white centered text and an icon suffix. Secondary buttons are outlined with a light grey border.

### Feedback Blocks
Notice boxes (like mentor feedback or critical warnings) use an amber border and a dedicated icon slot on the left to separate them from standard data cards.