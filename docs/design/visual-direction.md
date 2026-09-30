# Visual direction: Jockey Silks

How the app looks and feels, as a small token system the implementation applies directly. Terms follow [`CONTEXT.md`](../../CONTEXT.md). Product facts are in [`PRODUCT.md`](../../PRODUCT.md). The UI kit and libraries are fixed by the [frontend stack](../specs/frontend-stack.md). This was decided in the ticket [Set the visual direction and design tokens](https://github.com/TadeoOL/tadeo-5396/issues/18).

| File | What it is |
| --- | --- |
| [`tokens.css`](tokens.css) | The tokens, in shadcn/ui's Tailwind 4 shape. The bootstrap issue pastes it into the web app's CSS entry. |
| [`prototype.html`](prototype.html) | A rough artifact to react to: a dashboard sketch, the Top-up dialog with a Declined outcome, and the token sheet. Open it through any static server, for example `npx serve docs/design`. |

## Direction

**Each Snail wears registered racing silks, and the money stays in plain ink.** The app speaks to a fictional snail-racing fan, as if it were a real product for them. Racing silks are something that fan knows by heart: every runner's colours are a registered, geometric, two-color design. Here each of the six Snails has its own silks, and the silks appear wherever that Snail appears: its bar in the Wins chart and its swatch in legends. Everything else (chrome, the Balance, the Top-up flow) is black ink on off-white, so the payment flow reads as plain and trustworthy.

**Tone:** playful in the racing, sober in the money. The charm comes from the silks and the condensed racecard headings, never from jokes in the payment copy.

**How it was chosen:** a direction round offered the Tote Board (an infield totalisator board, dark with lit numerals) as the assigned lead, Jockey Silks as the alternative, a split-flap departures board as a competitive challenger, five declined challengers and the standard shadcn look. The maintainer chose Jockey Silks.

**Rejected:**

- **Tote Board**: a dark board can turn casino-busy, and its lamp glow drifts into the neon-dashboard cliché.
- **Split-flap board**: it reads as travel, not racing.
- **Plain shadcn defaults**: the brief asks for design work, and the default look adds none.

## Theme: light only

The scene: a fan checks the day's races and tops up in daylight, on a phone or a laptop. Silks read as color on white, the way a racing colours register prints them. A dark theme would double the contrast checks and the pattern tuning for no requirement, so it is left out. The tokens are plain CSS variables, so a `.dark` block can be added later without touching components.

## Color

Rules:

- **One color, one meaning.** Silk colors belong to Snails. Outcome colors belong to Top-up outcomes. Chrome is ink and ground only.
- **Never color alone.** A silk always has a pattern and a label. An outcome always has an icon and a word.

### Surfaces and ink

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#fbfaf7` | Page ground |
| `card`, `popover` | `#ffffff` | Dialog, menus, the Top-up history table |
| `foreground`, `primary` | `#16161a` | Text, the primary button, the header bar |
| `primary-foreground` | `#fbfaf7` | Text on ink |
| `secondary`, `muted`, `accent` | `#efece4` | Hover fills, neutral badges |
| `muted-foreground` | `#5c5a55` | Secondary text, captions, chart summaries |
| `border` | `#d9d5ca` | Seams between regions, hairlines |
| `input` | `#8a867c` | Input borders (3:1 against the ground, as WCAG 1.4.11 requires) |
| `ring` | `#16161a` | Focus ring |

### Top-up outcomes

Each outcome is a shadcn `Badge` variant in the history, and an `Alert` inline in the Top-up form. Text color sits on its tinted surface.

| Outcome | Token pair | Icon (`lucide-react`) |
| --- | --- | --- |
| Credited | `success` `#176f33` on `success-surface` `#e7f5ea` | `Check` |
| Declined | `destructive` `#b3261e` on `destructive-surface` `#fbe9e7` | `X` |
| Failed | `destructive` on `destructive-surface` | `TriangleAlert` |
| Unknown | `warning` `#8a5a00` on `warning-surface` `#fdf2d0` | `CircleHelp` |
| Pending | `muted-foreground` on `muted` | `Clock` |

Declined and Failed share a color because both mean the Balance did not change. The word and the icon tell them apart.

The rows use the domain terms. The words the UI shows (Approved, Confirming, Processing) are in [Screens: outcome labels](screens.md#outcome-labels).

### Snail silks (the chart palette)

In the API's Snail order, which is also the bar chart's order:

| Snail | Token | Silks |
| --- | --- | --- |
| Comet | `chart-1` `#c8102e` + `chart-1-trim` `#ffffff` | Scarlet, white hoops |
| Mossback | `chart-2` `#00664f` + `chart-2-trim` `#f6c500` | Racing green, gold chevrons |
| Pepper | `chart-3` `#0033a0` + `chart-3-trim` `#ffffff` | Royal blue, white quarters |
| Drizzle | `chart-4` `#5b2a86` + `chart-4-trim` `#ffffff` | Purple, white spots |
| Nacho | `chart-5` `#f6c500` + `chart-5-trim` `#16161a` | Gold, black sash |
| Sprinkles | `chart-6` `#c4006a` + `chart-6-trim` `#ffffff` | Magenta, white stripes |

- Each pattern is an SVG `<pattern>` with the ids `silk-comet` … `silk-sprinkles`, defined once in a small `SilkPatterns` component that the app shell renders once, in a hidden `<svg>`, so the chart and every `SilkSwatch` can reference the patterns on any screen. Bars use `fill="url(#silk-<id>)"` through Recharts `Cell`. The exact pattern geometry is in the prototype's `<defs>`.
- **Every silk shape has a 1.5 px `silk-seam` (ink) outline.** The outline carries the 3:1 non-text contrast, which matters for Nacho: its gold is only 1.63:1 against white.
- Bars carry their value as a label, and each chart has a text summary ([frontend stack](../specs/frontend-stack.md#charts)), so no information depends on telling silks apart.

### Bets donut

Won Bets are solid ink (`bet-won`). Lost Bets are a diagonal hatch of `bet-lost` `#8a867c` over the ground. The two differ in both lightness and texture, and neither borrows a silk or an outcome color.

## Typography

- **One family: Archivo**, a variable grotesque with a width axis. The condensed caps read like a racecard; the normal width is a workhorse UI face.
- **Self-hosted** with `@fontsource-variable/archivo`, importing `@fontsource-variable/archivo/wdth.css` (family `Archivo Variable`, weights 100–900, widths 62–125%). Self-hosting keeps it inside the default CSP from the [security baseline](../specs/security.md), and it works offline. This adds one dependency to the [frontend stack](../specs/frontend-stack.md#dependencies).
- **Four sizes**, all Tailwind defaults. Rank is carried by weight, width and caps:

| Role | Size | Style |
| --- | --- | --- |
| Balance | `text-5xl` (3 rem) | 900, `font-stretch: 75%` |
| Headings (`h1`–`h3`) | `text-2xl` (1.5 rem); `h3` at `text-base` | 800, 75% wide, uppercase |
| Body, inputs | `text-base` (1 rem) | 400 |
| Meta, table cells, captions, buttons | `text-sm` (0.875 rem) | 400 or 700; buttons uppercase |

- `font-variant-numeric: tabular-nums` on `body`, so amounts and counts align.
- The wordmark is **Snailrace** (from the `@snailrace/contracts` package scope), set in 900 at 62% width, next to a small silks shirt.

## Spacing, radius and elevation

- **Spacing**: Tailwind's 4 px scale, limited to the steps 1, 2, 3, 4, 6, 8 and 12. More space goes above a heading than below it.
- **Radius**: `--radius: 0.375rem` (6 px). shadcn derives `sm`, `md` and `lg` from it. Badges are pills.
- **Seams instead of cards**: dashboard regions are separated by a 1.5 px dashed `border`, like the stitching between silk panels, not wrapped in same-size cards.
- **Elevation**, three levels only:
  - Flat with a seam: every region of the page.
  - `--shadow-float`: toasts and menus.
  - `--shadow-dialog` over a `--scrim`: the Top-up dialog.

## Motion

One authored moment: **the bars run in once**, growing from the baseline when the Wins chart first mounts (Recharts' own animation, about 700 ms, ease-out). With `prefers-reduced-motion: reduce`, the bars do not animate: Recharts 3's default `isAnimationActive="auto"` turns the animation off. Nothing else animates beyond Radix's default dialog and toast transitions.

## Accessibility

- **Contrast** (WCAG 2.2 AA), checked with the WCAG luminance formula:

| Pair | Ratio | Needs |
| --- | --- | --- |
| `foreground` on `background` | 17.29 | 4.5 |
| `muted-foreground` on `background` / `muted` / `card` | 6.60 / 5.83 / 6.89 | 4.5 |
| `primary-foreground` on `primary` | 17.29 | 4.5 |
| `success` on `success-surface` | 5.55 | 4.5 |
| `destructive` on `destructive-surface` | 5.58 | 4.5 |
| `warning` on `warning-surface` | 5.30 | 4.5 |
| `input` border on `background` / `card` | 3.48 / 3.63 | 3 |
| Silk bases on `card`: Comet, Mossback, Pepper, Drizzle, Sprinkles | 5.88, 6.97, 10.60, 9.90, 5.91 | 3 |
| Nacho gold on `card` | 1.63 | covered by the ink seam (18.04) |

- **Focus**: a 2 px `ring` outline with a 2 px offset on every control. Inside the ink header bar, the ring switches to `primary-foreground`.
- **Selection**: `::selection` uses the Nacho gold with ink text, so the browser default is themed too.
- Outcomes are never color-only, and charts are never silk-only (see [Color](#color)).

## Components: kit versus custom

The response document must declare this split.

**From shadcn/ui (Radix), restyled only through the tokens**: `Button` (`default`, `outline`, `ghost`), `Input`, `Label`, `Field`, `Switch`, `Dialog`, `Alert`, `Badge`, `Table`, `Skeleton`, `Chart` (Recharts), `Sonner`.

**Adapted from the kit**: `Badge` and `Alert` gain `success`, `warning` and `destructive` variants for the outcomes; `Button` text is uppercase at 700.

**Custom, built for this app**:

- `SilkPatterns`: the six SVG patterns.
- `SilkSwatch`: a small shirt icon filled with a Snail's silks, used in the header wordmark and in the row above the sign-in and sign-up titles.
- The Wins bar chart and the Bets donut: shadcn `Chart` configured with the silks, the value labels, the hatch and the text summaries.
- The Balance display and the header bar with the wordmark.

**Template**: none. No page template or UI generator was used. The prototype was written by hand with AI help, as described in [`ai-usage.md`](../ai-usage.md).

## Handoffs

- **Screens**: the layout of every screen and state, the copy, and the loading, empty and warm-up states. The prototype's layout is only indicative.
- **Implementation roadmap**: the bootstrap issue pastes `tokens.css` into the CSS entry, installs `@fontsource-variable/archivo`, and adds the shadcn components listed in the [frontend stack](../specs/frontend-stack.md#handoffs): every kit component above, plus `Switch` for the [simulation controls](screens.md#simulation-controls).
