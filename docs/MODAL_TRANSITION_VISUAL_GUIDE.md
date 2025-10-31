# ModalTransition Visual Guide

Visual reference for choosing the right animation variant and transition type.

## Animation Variants Visualization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ANIMATION VARIANTS                                │
└─────────────────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════════════╗
║  VARIANT: default                                                     ║
║  ─────────────────────                                                ║
║                                                                        ║
║  Entry:  ↑ (y: +20)                                                   ║
║          ⤢ (scale: 0.95 → 1.0)                                        ║
║          ▓ (opacity: 0 → 1)                                           ║
║                                                                        ║
║  Exit:   ↓ (y: 0 → +20)                                               ║
║          ⤡ (scale: 1.0 → 0.95)                                        ║
║          ░ (opacity: 1 → 0)                                           ║
║                                                                        ║
║  Best for: General purpose modals, forms, settings                    ║
║  Feel: Smooth, professional, neutral                                  ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║  VARIANT: spring                                                      ║
║  ───────────────                                                      ║
║                                                                        ║
║  Entry:  ↑ (y: +20)                                                   ║
║          ⤢~~~⤢ (scale: 0.9 → 1.0, bouncy)                            ║
║          ▓ (opacity: 0 → 1)                                           ║
║                                                                        ║
║  Exit:   ↓ (y: 0 → +20)                                               ║
║          ⤡ (scale: 1.0 → 0.9, bouncy)                                ║
║          ░ (opacity: 1 → 0)                                           ║
║                                                                        ║
║  Physics: damping: 25, stiffness: 300, mass: 0.8                     ║
║  Best for: Confirmations, alerts, important actions                   ║
║  Feel: Energetic, attention-grabbing, playful                         ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║  VARIANT: slideUp                                                     ║
║  ─────────────────                                                    ║
║                                                                        ║
║  Entry:  ↑↑↑ (y: +100 → 0)                                            ║
║          ▓ (opacity: 0 → 1)                                           ║
║                                                                        ║
║  Exit:   ↓↓↓ (y: 0 → +100)                                            ║
║          ░ (opacity: 1 → 0)                                           ║
║                                                                        ║
║  Best for: Bottom sheets, mobile-style modals, filters                ║
║  Feel: Mobile-native, casual, familiar                                ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║  VARIANT: slideDown                                                   ║
║  ───────────────────                                                  ║
║                                                                        ║
║  Entry:  ↓↓↓ (y: -100 → 0)                                            ║
║          ▓ (opacity: 0 → 1)                                           ║
║                                                                        ║
║  Exit:   ↑↑↑ (y: 0 → -100)                                            ║
║          ░ (opacity: 1 → 0)                                           ║
║                                                                        ║
║  Best for: Notifications, dropdowns, top banners                      ║
║  Feel: Informative, non-intrusive, notification-like                  ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║  VARIANT: fade                                                        ║
║  ──────────────                                                       ║
║                                                                        ║
║  Entry:  ▓ (opacity: 0 → 1 only)                                      ║
║                                                                        ║
║  Exit:   ░ (opacity: 1 → 0 only)                                      ║
║                                                                        ║
║  Best for: Full-screen modals, image viewers, minimal interruption    ║
║  Feel: Subtle, minimal, unobtrusive                                   ║
╚══════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════╗
║  VARIANT: scale                                                       ║
║  ───────────────                                                      ║
║                                                                        ║
║  Entry:  ⤢ (scale: 0.8 → 1.0, no movement)                            ║
║          ▓ (opacity: 0 → 1)                                           ║
║                                                                        ║
║  Exit:   ⤡ (scale: 1.0 → 0.8)                                         ║
║          ░ (opacity: 1 → 0)                                           ║
║                                                                        ║
║  Best for: Image previews, centered content, zoom effects             ║
║  Feel: Focused, centered, zoom-like                                   ║
╚══════════════════════════════════════════════════════════════════════╝
```

## Transition Types Comparison

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       TRANSITION TIMINGS                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ default  ├──────────┤                        Duration: 0.2s      │
│          0ms    100ms    200ms                                   │
│          ▓▓▓▓▓▓▓▓▓▓▓▓▓                                           │
│          Entry/Exit                                              │
│                                                                  │
│ Use for: Most modals, standard UI                               │
│ Feel: Quick, responsive, standard                               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ spring   ├~~~~~~~~~~~┤                       Type: Physics       │
│          0ms    150ms    250ms                                   │
│          ▓▓▓▓▓▓~~~~▓▓▓                                           │
│          Bounce effect                                           │
│                                                                  │
│ Use for: Attention-grabbing, confirmations                      │
│ Feel: Bouncy, playful, energetic                               │
│ Config: damping: 25, stiffness: 300, mass: 0.8                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ smooth   ├──────────────┤                   Duration: 0.3s      │
│          0ms    150ms    300ms                                   │
│          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                       │
│          Ease: easeInOut                                         │
│                                                                  │
│ Use for: Complex content, detailed forms                        │
│ Feel: Elegant, smooth, deliberate                               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ fast     ├─────────┤                         Duration: 0.15s    │
│          0ms     75ms    150ms                                   │
│          ▓▓▓▓▓▓▓▓▓▓                                              │
│          Entry/Exit                                              │
│                                                                  │
│ Use for: Simple modals, toasts, quick actions                   │
│ Feel: Snappy, responsive, efficient                             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ slow     ├──────────────────┤               Duration: 0.4s      │
│          0ms    200ms    400ms                                   │
│          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                   │
│          Entry/Exit                                              │
│                                                                  │
│ Use for: Dramatic reveals, important modals                     │
│ Feel: Dramatic, deliberate, cinematic                           │
└──────────────────────────────────────────────────────────────────┘
```

## Variant + Transition Combinations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED COMBINATIONS                              │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────┬────────────────────┬───────────────────────────┐
│ Modal Type             │ Variant            │ Transition                │
├────────────────────────┼────────────────────┼───────────────────────────┤
│ General Dialog         │ default            │ default                   │
│ Settings Panel         │ default            │ smooth                    │
│ Form Modal             │ default            │ smooth                    │
│ Confirmation           │ spring             │ spring                    │
│ Alert/Warning          │ spring             │ spring                    │
│ Delete Confirmation    │ spring             │ spring                    │
│ Success Toast          │ slideDown          │ fast                      │
│ Error Toast            │ slideDown          │ fast                      │
│ Info Banner            │ slideDown          │ default                   │
│ Mobile Bottom Sheet    │ slideUp            │ smooth                    │
│ Filters Panel          │ slideUp            │ smooth                    │
│ Mobile Menu            │ slideUp            │ smooth                    │
│ Full-screen Viewer     │ fade               │ fast                      │
│ Code Review            │ fade               │ fast                      │
│ Image Lightbox         │ scale              │ smooth                    │
│ Preview Modal          │ scale              │ default                   │
│ Quick Action           │ fade               │ fast                      │
│ Complex Wizard         │ default            │ slow                      │
│ Onboarding Step        │ default            │ smooth                    │
└────────────────────────┴────────────────────┴───────────────────────────┘
```

## Z-Index Stacking Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Z-INDEX LAYERS                                  │
└─────────────────────────────────────────────────────────────────────────┘

Layer 9:  z-[99999]  ┌──────────────────────────────────────┐
                     │  Critical System Modals              │
                     │  (Emergency, System Errors)          │
                     └──────────────────────────────────────┘

Layer 8:  z-[9999]   ┌──────────────────────────────────────┐
                     │  Code Review Modal                   │
                     │  Full-screen Editors                 │
                     └──────────────────────────────────────┘

Layer 7:  z-[999]    ┌──────────────────────────────────────┐
                     │  Stacked Modal (3rd level)           │
                     │  Confirmation on Modal on Modal      │
                     └──────────────────────────────────────┘

Layer 6:  z-[99]     ┌──────────────────────────────────────┐
                     │  Stacked Modal (2nd level)           │
                     │  Detail view on top of list modal    │
                     └──────────────────────────────────────┘

Layer 5:  z-50       ┌──────────────────────────────────────┐
         (default)   │  Primary Modal                       │
                     │  Most common modals                  │
                     └──────────────────────────────────────┘

Layer 4:  z-40       ┌──────────────────────────────────────┐
                     │  Dropdown Menus                      │
                     │  Context Menus                       │
                     └──────────────────────────────────────┘

Layer 3:  z-30       ┌──────────────────────────────────────┐
                     │  Floating Panels                     │
                     │  Tooltips                            │
                     └──────────────────────────────────────┘

Layer 2:  z-20       ┌──────────────────────────────────────┐
                     │  Fixed Headers                       │
                     │  Sticky Elements                     │
                     └──────────────────────────────────────┘

Layer 1:  z-10       ┌──────────────────────────────────────┐
                     │  Content Overlays                    │
                     │  Badges, Labels                      │
                     └──────────────────────────────────────┘
```

## Animation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MODAL LIFECYCLE FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

    isOpen={false}
         │
         │ User clicks trigger
         ▼
    isOpen={true}
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
    ┌─────────┐                         ┌──────────┐
    │ Backdrop│  initial → animate       │  Modal   │
    │  Fade   │  opacity: 0 → 1          │ Container│
    └─────────┘                          └──────────┘
         │                                     │
         │                               ┌─────┴─────┐
         │                               │           │
         │                               ▼           ▼
         │                          Position    Appearance
         │                          ────────    ──────────
         │                          y: +20→0    opacity: 0→1
         │                          scale: 0.95→1.0
         │
         │ Both animate together
         ▼
    Modal Visible
    User interacts
         │
         │ User closes (backdrop click / button)
         ▼
    isOpen={false}
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
    ┌─────────┐                         ┌──────────┐
    │ Backdrop│  animate → exit          │  Modal   │
    │  Fade   │  opacity: 1 → 0          │ Container│
    └─────────┘                          └──────────┘
         │                                     │
         │                                     ▼
         │                               opacity: 1→0
         │                               scale: 1.0→0.95
         │                               y: 0→+20
         │
         │ Both exit together
         ▼
    DOM removed by AnimatePresence
```

## Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CHOOSING THE RIGHT VARIANT                            │
└─────────────────────────────────────────────────────────────────────────┘

START: What type of modal is this?
  │
  ├─ Full-screen modal? ─────────────────────► fade + fast
  │
  ├─ Important action/confirmation? ─────────► spring + spring
  │
  ├─ Mobile-style bottom sheet? ─────────────► slideUp + smooth
  │
  ├─ Notification/toast from top? ───────────► slideDown + fast
  │
  ├─ Image preview/lightbox? ────────────────► scale + smooth
  │
  ├─ Simple, subtle modal? ──────────────────► fade + default
  │
  └─ General purpose modal? ─────────────────► default + default


FOLLOW-UP: How complex is the content?
  │
  ├─ Very simple (1-2 buttons)? ────────────► Use: fast transition
  │
  ├─ Medium (form with 3-5 fields)? ────────► Use: default transition
  │
  ├─ Complex (long form, tables)? ──────────► Use: smooth transition
  │
  └─ Very complex (wizard steps)? ──────────► Use: slow transition


FINAL CHECK: Does it need attention?
  │
  ├─ Yes (critical action)? ────────────────► Consider: spring variant
  │
  └─ No (standard interaction)? ────────────► Keep: chosen variant
```

---

## Color Legend

```
Symbols Used:
  ▓ = Solid opacity (visible)
  ░ = Light opacity (fading)
  ↑ = Upward movement
  ↓ = Downward movement
  ⤢ = Scale up
  ⤡ = Scale down
  ~~~ = Bounce/spring effect
  ├─┤ = Duration bar
```

## Tips for Best Results

1. **Match Modal Importance to Animation Energy**
   - Critical actions → spring (energetic)
   - Standard actions → default (balanced)
   - Background tasks → fade (minimal)

2. **Consider User Context**
   - Desktop users → any variant works
   - Mobile users → prefer slideUp for bottom sheets
   - Touch devices → slightly longer transitions feel better

3. **Content Complexity**
   - Simple content → fast/default transition
   - Complex content → smooth/slow transition
   - Never use slow transition with spring variant (feels sluggish)

4. **Stacking**
   - Each modal should be 10+ z-index higher than the previous
   - Maximum recommended stack: 3 modals
   - Top modal should use fast transition for responsiveness

5. **Accessibility**
   - Don't use slow transitions for frequently-used modals
   - Ensure animations don't exceed 0.5s for accessibility
   - Consider users with motion sensitivity (provide option to disable)
