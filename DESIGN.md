---
name: SPARK
description: AICTE Activity Points tracking and live event geo-verification dashboard.
colors:
  primary: "#1A1A1A"
  background-light: "#F8F9FA"
  background-dark: "#121212"
  card-light: "#FFFFFF"
  card-dark: "#1E1E1E"
  surface-light: "#ffffff"
  surface-dark: "#2a2a2a"
  subtle-light: "#E9ECEF"
  subtle-dark: "#2D2D2D"
  text-light: "#212529"
  text-dark: "#F8F9FA"
  text-muted-light: "#6C757D"
  text-muted-dark: "#ADB5BD"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background-light}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "#333333"
  card:
    backgroundColor: "{colors.card-light}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: SPARK

## 1. Overview

**Creative North Star: "The Campus Canvas"**

SPARK visualizes campus life as an interactive canvas. By pairing solid, high-contrast dark accents against light-toned backgrounds (with dark-mode equivalencies), the UI frames active student participation clearly. The design focuses on high-impact visual segments, clear map modules, and vibrant verification badges instead of empty decorative widgets. 

It rejects dry, administrative interfaces and SaaS-like monochrome cards, favoring clean, physical-feeling layout separations and micro-animations that respond directly to student check-ins and state changes.

**Key Characteristics:**
- Refined, high-contrast boundaries
- Soft, responsive tactile depth on active actions
- Dynamic color feedback (blue for discovery, green for verified proof, amber for points progress)
- Clean, balanced typography with deliberate line-length ceilings

## 2. Colors

The color palette utilizes high-contrast neutral roles paired with saturated, state-bound status colors that serve functional purposes.

### Primary
- **Ink Obsidian** (#1A1A1A): Used for primary headers, high-contrast active buttons, and major UI boundaries.

### Neutral
- **Alabaster Base** (#F8F9FA): The primary page background under light mode, providing high contrast and cleanliness.
- **Deep Velvet** (#121212): The primary background for dark mode.
- **Canvas White** (#FFFFFF): Background for card panels and active containers.
- **Muted Steel** (#6C757D): Used for secondary labels, metadata, and placeholder text.

### Named Rules
**The Color-State Rule.** Saturated accent colors (Blue, Green, Amber, Red) are bound strictly to domain state context: Blue is for Event Discovery, Green for Verified Proof, Amber for points targets, and Red for alerts. Do not use them decoratively.

**The Contrast Floor Rule.** All text elements (including muted placeholders and sub-headers) must maintain a minimum contrast ratio of 4.5:1 against their backgrounds.

## 3. Typography

**Display Font:** Plus Jakarta Sans (sans-serif)
**Body Font:** Plus Jakarta Sans (sans-serif)

**Character:** A modern geometric sans-serif pairing that maintains clarity at small scale on maps and has an impactful, confident display weight.

### Hierarchy
- **Display** (ExtraBold, clamp(2.25rem, 6vw, 4.5rem), 1.1): Used for main page welcome states and hero headlines.
- **Headline** (Bold, 2rem, 1.2): Used for primary page section titles.
- **Title** (SemiBold, 1.25rem, 1.3): Used for cards and modal headers.
- **Body** (Regular, 1rem, 1.5): Standard reading text. Line length is capped at a maximum of 75ch.
- **Label** (SemiBold, 0.75rem, normal): Small uppercase status text and buttons.

### Named Rules
**The Type-Scale Rule.** Never drop body copy below 14px (0.875rem) to ensure legible reading of geo-coordinates.
**The Balanced Headline Rule.** Use `text-wrap: balance` on all headers (h1–h3) to prevent awkward multi-line break orphans.

## 4. Elevation

SPARK uses a flat-by-default presentation, communicating physical depth through clean borders and thin separation lines. Soft shadows are reserved exclusively for active states or overlay panels.

### Shadow Vocabulary
- **Tactile Hover** (`box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05)`): Applied to cards and active buttons only on hover to provide state feedback.
- **Overlay Drop** (`box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15)`): Applied to fixed navigation headers, modals, and notifications.

### Named Rules
**The Flat-Rest Rule.** All cards and UI elements sit completely flat against the base canvas at rest. Shadows must only appear as a physical response to mouse hover or focus.

## 5. Components

### Buttons
- **Shape:** Soft rounded corners (8px / radius-md).
- **Primary:** High-contrast background (#1A1A1A / primary) with light text (#F8F9FA), padded with 12px vertical and 24px horizontal.
- **Hover:** Dark gray (#333333) with a slight upward translation transition (`translate-y-[-2px]`).

### Cards / Containers
- **Corner Style:** Rounded corners (16px / radius-lg). Corner radius must never exceed 16px to prevent an overly rounded, unpolished appearance.
- **Background:** Solid Canvas White (#FFFFFF) under light mode, dark gray (#1E1E1E) under dark mode.
- **Border:** Thin solid border (#E9ECEF) at rest.
- **Shadow:** No shadows at rest. Soft hover shadow on interactive cards.

### Inputs / Fields
- **Style:** Light gray border (#ADB5BD), white background, 8px radius.
- **Focus:** 1px border shift to primary accent (#1A1A1A).

### Navigation
- **Style:** Fixed horizontal headers with thin borders, using high-contrast hover links and transparent backdrops.

## 6. Do's and Don'ts

### Do:
- **Do** bind colors to function (Green only for valid status, Blue for discovering activities).
- **Do** limit card border-radius to 16px.
- **Do** enforce a maximum 75ch character ceiling for long-form event descriptions.
- **Do** ensure custom transition speeds are responsive and respect `prefers-reduced-motion`.

### Don't:
- **Don't** use the "ghost-card" pattern: never combine a border with a drop shadow on the same card element at rest.
- **Don't** use neon gradient text overlays on display headings.
- **Don't** repeat small wide-tracked kickers as section eyebrows across page layouts.
- **Don't** use monospace fonts unless displaying raw latitude/longitude coordinates or EXIF date strings.
