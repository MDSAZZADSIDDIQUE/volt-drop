# VoltDrop design directions

Two directions for the VoltDrop design system (spec §9). Nothing is built until the founder picks one. After that choice, its colours, type and spacing become `packages/ui-tokens` (ADR-0018), and every app uses them.

- **Status:** awaiting the founder's choice.
- **Date:** 2026-09-11.

Ground rules from the spec:
- Ground every choice in the subject: cables and connectors, UK wiring colours, packaging, speed, local high streets.
- Avoid three defaults: near-black with a neon accent, cream with terracotta, and the generic SaaS kit of rounded cards, soft shadows and gradients.
- Spend boldness in one place, the live delivery tracker, and keep everything else quiet.
- Meet WCAG 2.2 AA. Contrast ratios below were calculated with the WCAG relative-luminance formula.
- Use only open-licensed typefaces, self-hosted, because a third-party font CDN would reveal visitors' IP addresses before consent.

---

## Direction A: Loom

UK flex cable colour codes (BS 7671: brown live, blue neutral, green and yellow earth, grey sheath) and the spec labels printed on tech packaging. The interface reads like a well-made cable label: exact, flat, factual. Colour always means something electrical.

### Colours

| Name | Hex | Role | Contrast |
|---|---|---|---|
| Insulation White | `#F7F8F9` | Page background | — |
| Conduit Black | `#16181B` | Text | 16.7:1 on Insulation White |
| Live Brown | `#6B3F22` | Primary actions ("Add to basket", "Accept order"), the live wire in the tracker | 8.9:1 with white text; 8.4:1 as text on Insulation White |
| Neutral Blue | `#1F5FA8` | Links, information, focus rings | 6.4:1 on white; 6.1:1 on Insulation White |
| Earth Green | `#2E7D32` | Done and verified (delivered, PIN checked), always paired with Earth Yellow stripes | 5.1:1 on white |
| Earth Yellow | `#F2C230` | Stripe graphics only, never text on light backgrounds | 10.6:1 behind Conduit Black text |
| Sheath Grey | `#5B6168` | Secondary text, 1 px rules, inactive states | 6.3:1 on white; 5.9:1 on Insulation White |

### Type

| Role | Typeface (licence) | Why |
|---|---|---|
| Headings | Archivo, narrow width (`wdth` 75), weights 600–700 (SIL OFL) | Condensed like the product names printed on cable packaging |
| Interface and body | Atkinson Hyperlegible Next (SIL OFL, Braille Institute) | Made for legibility: distinct I, l and 1 and open shapes, which matters on busy merchant tablets |
| Specs and codes | IBM Plex Mono (SIL OFL) | Watts, lengths, GTINs, order references and PINs line up like a spec label |

**Scale** (1.25 ratio, 16 px base): 13 · 16 · 20 · 25 · 31 · 39 · 49. Prices use tabular figures.

### Layout concept

Flat panels with 2 px corners, 1 px Sheath Grey rules, no shadows and no gradients. Every product card shows its deciding facts in the same order, set in mono: connector · length · power · data standard.

**Product card**

```text
┌──────────────────────────────────┐   2 px corners, 1 px Sheath Grey border
│        [ product photo 4:3 ]     │
├──────────────────────────────────┤
│ Anker USB-C to USB-C cable       │   Archivo narrow 600, 18/24
│ USB-C · 2 m · 100 W · USB 2.0    │   IBM Plex Mono 13/18, Sheath Grey
│                                  │
│ £12.99        Delivery £3.49     │   price 20/28 bold, tabular figures
│ about 35 min   [ Add to basket ] │   Live Brown button, 48 px high
└──────────────────────────────────┘
```

**Live tracker** (the bold moment)

```text
 Tech Hub, Oldham St                                 12 Dale St
 STORE ●━━━━━━━━━━━━━━━━━━━━━━━◉─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ○ YOU
        brown live wire: done   courier  blue dashed: to go

 Arriving about 12:41 · 9 min                     Delivery PIN
                                                  4 8 2 7   (Plex Mono, 40 px)
 Accepted ── Packed ── Collected ── On the way ── Delivered
 (when delivered, the wire becomes a green and yellow striped earth conductor)
```

**Merchant orders board** (tablet, landscape)

```text
┌ New (2) ─────────────┬ Preparing (1) ────┬ Ready (1) ────────┬ Handed over ─────┐
│▌VD-7K3Q9A     0:48   │ VD-4MX2PB         │ VD-9QW3TT         │ VD-2HJ8KK  11:02 │
│▌2 items · £24.98     │ Scanned 1 of 3    │ Bag code  K7Q     │                  │
│▌[ Accept order  ]    │ [ Scan next item ]│ [Handed to courier]│                 │
│▌[ Can't fulfil  ]    │                   │                   │                  │
└──────────────────────┴───────────────────┴───────────────────┴──────────────────┘
 New orders ring, and their Live Brown left edge pulses (reduced motion: a steady edge).
 Buttons are at least 56 px high.
```

### Principles

1. **Label, not billboard.** Show the facts that decide compatibility, always in the same order.
2. **Colour means electricity.** Brown means act, blue means information, green and yellow means done and safe, grey means inactive. There's no decorative colour.
3. **Flat and exact.** 2 px corners, 1 px rules, alignment to an 8 px grid.
4. **One live wire.** Only the tracker animates the brand; everything else is still.
5. **Counter-top legibility.** Merchant screens use large Atkinson type, 56 px targets and high contrast.

---

## Direction B: Shopfront

Traditional UK high streets: painted fascia boards, signwriters' slab lettering, gilt lining, white enamel street plates with a red border, and the red of a pillar box meaning "now". Warm and local, and fast when it matters.

### Colours

| Name | Hex | Role | Contrast |
|---|---|---|---|
| Enamel White | `#FFFFFF` | Page background and panels | — |
| Tarmac | `#111315` | Text | 18.6:1 on white |
| Fascia Green | `#1E4D3A` | Primary actions, the store label band | 9.6:1 with white text |
| Pillar Box Red | `#C8102E` | Only for "now": ringing orders, the ETA plate, errors | 5.9:1 with white text |
| Gilt | `#B08D3C` | 1 px lining rules and ornaments only, never text | 3.1:1 on white (passes the 3:1 non-text contrast rule) |
| Kerb Grey | `#4A4F55` | Secondary text, borders | 8.3:1 on white |

### Type

| Role | Typeface (licence) | Why |
|---|---|---|
| Headings, prices, ETA numerals | Zilla Slab, weights 600–700 (SIL OFL) | A slab serif in the spirit of painted shopfront lettering |
| Interface and body | Instrument Sans (SIL OFL) | A plain, contemporary sans that keeps the slab from feeling dated |
| Codes and PINs | JetBrains Mono (SIL OFL) | Unambiguous characters for references and PINs |

**Scale** (1.333 ratio, 16 px base): 12 · 16 · 21 · 28 · 38 · 50. ETA numerals use 56 px.

### Layout concept

White enamel panels with a 1 px Kerb Grey border and 6 px corners, separated by Gilt lining rules instead of shadows. The selling store appears as a small fascia label wherever the law needs it (product page, checkout, receipts). Browsing stays product-first.

**Product card**

```text
┌──────────────────────────────────┐   1 px Kerb Grey, 6 px corners
│        [ product photo 4:3 ]     │
│ Anker USB-C cable, 2 m, 100 W    │   Instrument Sans 600, 17/24
│ £12.99                           │   Zilla Slab 700, 22
│ Delivery £3.49 · about 35 min    │   Kerb Grey
│ ──────────── Gilt rule ───────── │
│ [ Add to basket ]                │   Fascia Green button, 48 px
└──────────────────────────────────┘
```

**Live tracker** (the bold moment: an enamel street plate)

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   3 px Pillar Box Red border, white plate
┃  ARRIVING IN                           ┃
┃  9 MIN                      12:41      ┃   Zilla Slab 700, 56 px
┃  Your courier has left Tech Hub        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  [ simple street map: Tarmac route line, Fascia Green store pin, red home pin ]
  Placed ─ Accepted ─ Packed ─ Collected ─ On the way ─ Delivered
  Delivery PIN  4827   (JetBrains Mono, 32 px)
```

**Merchant orders board** (tablet, landscape)

```text
 New orders          Preparing          Ready              Handed over
┏━━━━━━━━━━━━━━━━━┓ ┌───────────────┐  ┌───────────────┐  ┌──────────────┐
┃ ● VD-7K3Q9A 0:48┃ │ VD-4MX2PB     │  │ VD-9QW3TT     │  │ VD-2HJ8KK    │
┃ 2 items · £24.98┃ │ Scanned 1 of 3│  │ Bag code K7Q  │  │ 11:02        │
┃ [ACCEPT ORDER]  ┃ │ [Scan next]   │  │ [Handed to    │  │              │
┃ [Can't fulfil]  ┃ │               │  │   courier]    │  │              │
┗━━━━━━━━━━━━━━━━━┛ └───────────────┘  └───────────────┘  └──────────────┘
 A ringing order is a red plate. Accept is a 64 px Fascia Green button.
```

### Principles

1. **Red means now.** Pillar Box Red is only for time-critical moments. Nothing else competes with it.
2. **Signwriting, not chrome.** Slab headings and gilt lining do the work of shadows and gradients.
3. **Local, product-first.** Stores appear as an honest label, never as competing storefronts (spec §1).
4. **One enamel plate.** The ETA plate is the brand moment; the rest stays plain white.
5. **Shop-counter English.** "Your courier has left Tech Hub", not "Fulfilment dispatched".

---

## Second pass: checked against the generic defaults

Each direction was checked for anything that would look the same on any other product, and revised.

| Direction | Risk found | Revision made |
|---|---|---|
| A | Brown on off-white can read as a coffee brand. | Brown is only for actions and the live wire. It always sits with Neutral Blue and mono spec text, and the background is a cool white (`#F7F8F9`), not cream. |
| A | A grid of bordered product cards is standard e-commerce. | Each card leads with a fixed-order mono spec line, the fact customers compare. 2 px corners and no shadows. |
| A | Green and yellow stripes can look like caution tape. | Used only as a thin (4 px) diagonal stripe on "delivered" and "verified", matching the real earth conductor. |
| A | Archivo is a common web font. | Its narrow width axis gives a packaging-label feel that a default grotesque doesn't. |
| B | Dark green with gold reads as heritage luxury (banks, gin). | Gold appears only as 1 px lining, never text or fills. Pillar Box Red and plain white keep it everyday and urgent. |
| B | "Store as hero" contradicts spec §1: stores are suppliers, not storefronts. | Reduced to a compact fascia label, shown where law and trust need it (seller identity, spec §11.2). Browsing stays product-first. |
| B | Street-sign styling could imitate TfL or Royal Mail branding. | No roundels, no Royal Mail marks, no Transport or Johnston lookalike fonts. Only the general enamel-plate idea and a generic red. |
| Both | Rounded, shadowed cards; gradient washes; a dark theme with neon. | None used. Depth comes from rules (A) or lining (B). Both use light grounds. |

## My recommendation

**Direction A (Loom).** VoltDrop's first two promises are product-first shopping and compatibility help (spec §1). Loom makes the compatibility facts the visual system: a mono spec line on every card, and colour tied to electrical meaning. Its colours hold up for everyone: every text pairing passes AA, most pass AAA, and yellow never carries text. Atkinson Hyperlegible also suits merchant tablets. Direction B is warmer and more "local high street", which could suit marketing pages. It could be a later campaign treatment without becoming the product UI.

## After the choice

1. Put the chosen colours, type scale, spacing (8 px grid), corner radii and focus styles into `packages/ui-tokens`. They generate CSS variables for Tailwind 4 on web and a preset for NativeWind on native (ADR-0018).
2. Self-host the typefaces' font files in `packages/ui-tokens`, never from a third-party CDN.
3. Apply them to the M1 screens, and check the focus ring and every text pairing with axe.
