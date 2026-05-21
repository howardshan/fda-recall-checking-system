---
name: Clinical Clarity
colors:
  surface: '#f4faff'
  surface-dim: '#c0dfee'
  surface-bright: '#f4faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e6f6ff'
  surface-container: '#d9f2ff'
  surface-container-high: '#ceedfd'
  surface-container-highest: '#c9e7f7'
  on-surface: '#001f2a'
  on-surface-variant: '#3f4945'
  inverse-surface: '#163440'
  inverse-on-surface: '#e0f4ff'
  outline: '#707975'
  outline-variant: '#bfc9c4'
  surface-tint: '#29695b'
  primary: '#00342b'
  on-primary: '#ffffff'
  primary-container: '#004d40'
  on-primary-container: '#7ebdac'
  inverse-primary: '#94d3c1'
  secondary: '#a43c12'
  on-secondary: '#ffffff'
  secondary-container: '#fe7e4f'
  on-secondary-container: '#6b1f00'
  tertiary: '#2e2e29'
  on-tertiary: '#ffffff'
  tertiary-container: '#44443f'
  on-tertiary-container: '#b3b1ab'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#afefdd'
  primary-fixed-dim: '#94d3c1'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#065043'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ffb59c'
  on-secondary-fixed: '#380c00'
  on-secondary-fixed-variant: '#822800'
  tertiary-fixed: '#e5e2db'
  tertiary-fixed-dim: '#c9c6c0'
  on-tertiary-fixed: '#1c1c18'
  on-tertiary-fixed-variant: '#474742'
  background: '#f4faff'
  on-background: '#001f2a'
  surface-variant: '#c9e7f7'
typography:
  display-lg:
    fontFamily: Merriweather
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Merriweather
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Merriweather
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-sm:
    fontFamily: Merriweather
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
  body-lg:
    fontFamily: Fira Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Fira Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Fira Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Fira Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1120px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system is built for a high-stakes public health environment where clarity can mitigate panic. The brand personality is **authoritative yet empathetic**—functioning as a steady hand for consumers navigating drug safety concerns. 

The aesthetic is **Refined Minimalist with Humanist undercurrents**. It rejects the cold, sterile feeling of traditional government portals in favor of a "warm clinical" approach. The interface relies on generous whitespace, high-quality typography, and a deliberate lack of decorative elements (no gradients or heavy shadows) to ensure the information remains the sole focus. The emotional response should be one of "informed calm."

## Colors
This design system utilizes a palette grounded in trust and urgency. 
- **Primary (Deep Teal):** Used for navigation, primary headings, and structural elements to establish authority.
- **Surface (Soft Cream):** The off-white background reduces eye strain and provides a warmer, more human feel than pure white.
- **Action (Warm Coral):** Reserved strictly for primary calls to action, providing a high-contrast but non-aggressive focal point.
- **Severity Tiers:** Used functionally to categorize risk. 
    - **Class I (Crimson):** Immediate danger.
    - **Class II (Amber):** Potential for temporary/reversible health issues.
    - **Class III (Slate):** Unlikely to cause adverse health consequences.

## Typography
The typographic scale emphasizes legibility and an editorial rhythm. 
- **Titles (Merriweather):** A serif typeface is used for headlines to convey a sense of history, truth, and importance. It provides a literary quality that feels more like a trusted journal than a generic app.
- **Body & UI (Fira Sans):** A humanist sans-serif provides excellent readability for dense drug information and instructions. It maintains a friendly, open character even at small sizes.
- **Hierarchy:** Use `display-lg` for landing hero sections, and `headline-md` for specific drug names or recall titles. `label-md` should be set in all-caps when used for the Severity Chips.

## Layout & Spacing
The design system employs a **fixed-center grid** for desktop to maintain a readable line length for medical information, and a **fluid grid** for mobile.

- **Grid:** A 12-column grid on desktop, transitioning to 4 columns on mobile.
- **Vertical Rhythm:** A strict 8px baseline grid ensures consistent alignment between text and icons.
- **Density:** High whitespace is encouraged. Content blocks (like recall details) should have a minimum of 32px (4 units) of internal padding to prevent visual clutter.

## Elevation & Depth
In alignment with the "no heavy shadows" constraint, this design system uses **Tonal Layers** and **Low-Contrast Outlines** to create hierarchy.

- **Flat Depth:** Most cards and surfaces sit directly on the Soft Cream background, distinguished by a subtle 1px border (#004D40 at 10% opacity).
- **Active Elevation:** When an element requires focus (e.g., a hovered card), use a slightly darker background tint (e.g., a soft taupe) rather than a shadow.
- **Z-Index:** Content layers are defined by their semantic importance. Modals use a dimming background overlay (Deep Teal at 40% opacity) rather than drop shadows.

## Shapes
The shape language is **balanced and professional**. 
- **Standard UI:** Elements like input fields and cards use a "Soft" 4px radius (0.25rem), providing a structured, trustworthy appearance.
- **Severity Chips:** These are the exception, utilizing a **Pill-shape (Full Rounding)** to distinguish them as status indicators rather than interactive buttons or data fields.

## Components
- **Severity Chips:** Pill-shaped labels. Class I uses a Crimson background with white text; Class II uses Amber with dark teal text; Class III uses Slate with white text.
- **Result State Banners:** Large, full-width banners at the top of a page or card. These do not use shadows. They use solid backgrounds in the three severity colors with high-contrast Merriweather text to announce the status immediately.
- **Buttons:**
    - **Primary:** Warm Coral background, white text, 4px radius. 
    - **Secondary:** Deep Teal outline, Deep Teal text.
- **Input Fields:** 1px border in Slate, Soft Cream background. Focus state is a 2px Deep Teal border.
- **Recall Detail Cards:** Large cards containing drug imagery, lot numbers, and manufacturer data. These use the 1px subtle outline and 24px internal padding.
- **Search Bar:** A prominent component featuring a "magnifying glass" icon and a clear, large type size to assist users in quick drug identification.