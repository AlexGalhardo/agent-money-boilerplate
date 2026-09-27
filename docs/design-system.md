# Design system

Source of truth for how the **mobile app** (`mobile/`) looks and how its UI
is built. If a screen and this document disagree, one of them is a bug —
fix the screen, or update this file in the same commit that changes the
system.

The web dashboard (`frontend/`) has its own light/dark theme in
`frontend/src/styles.css`; the two share only the brand green and the
categorical chart palette.

## Principles

1. **Dark only.** There is no light theme and no toggle (`app.json` →
   `userInterfaceStyle: "dark"`). Every surface is designed for a near-black
   canvas.
2. **Content first.** Screens lead with the number or list the user came
   for (balance, transactions) — no decorative heroes, no onboarding slides.
3. **Group with surfaces, not borders.** Sections are a slightly lighter
   surface on the canvas; rows inside are split by hairlines. No 1px border
   around every container, no card inside a card.
4. **Restraint.** Neutral UI; color carries meaning only: green = income /
   brand, red = expense / destructive, amber = needs attention.
5. **One source of truth.** Every color, size and radius is a token. A hex
   value or font size inside a screen is drift.
6. **Native behavior.** Stack headers from Expo Router (not hand-rolled),
   native `Alert` only for rare irreversible actions, pressed feedback on
   every touchable, safe areas respected.

These follow the Expo skills vendored in `.claude/skills/`
(`expo-design-system`, `expo-native-ui`) — read their "native slop" list
before adding a screen.

## Tokens

### Color — `mobile/src/theme/palette.js`

The palette is a CommonJS module required by `mobile/tailwind.config.js`
(so every token becomes a NativeWind class: `bg-surface`, `text-muted`,
`border-line`, …) and re-exported typed from `mobile/src/theme/index.ts`
(`colors.brand`) for props that can't take a class — icon colors,
`ActivityIndicator`, `placeholderTextColor`, the date picker. A test
(`src/theme/theme.test.ts`) fails if the two drift apart.

| Token        | Hex       | Use                                                     |
| ------------ | --------- | ------------------------------------------------------- |
| `canvas`     | `#09090B` | Screen background, status bar, headers, bottom bar      |
| `surface`    | `#131316` | Sections, stat tiles, cards                             |
| `raised`     | `#1C1C21` | Inputs, chips, secondary buttons, pressed rows          |
| `line`       | `#26262C` | Hairline separators between rows, bottom-bar top border |
| `fg`         | `#FAFAFA` | Primary text                                            |
| `muted`      | `#A1A1AA` | Secondary text, labels                                  |
| `subtle`     | `#71717A` | Tertiary text, placeholders, inactive icons             |
| `primary`    | `#FAFAFA` | Primary button background (white-on-black CTA)          |
| `on-primary` | `#09090B` | Text/icons on `primary`                                 |
| `brand`      | `#22C55E` | Brand mark, focus ring, active filter, PRO badges       |
| `income`     | `#34D399` | Income amounts and icons, success notices               |
| `expense`    | `#F87171` | Expense accents, negative balance                       |
| `warning`    | `#FBBF24` | "Needs review" counters, expired PIX                    |
| `danger`     | `#EF4444` | Destructive actions, field errors                       |

Opacity modifiers are the way to tint: `bg-brand/15`, `bg-income/10`,
`bg-danger/15` — never a new hex for a tint.

Expense amounts in lists are `fg`, not red: a finance list where every
other row is red reads as alarm. Red is for the expense _accent_ (type
toggle, chart, negative balance).

**Chart palette** — `mobile/src/lib/categories.ts` uses the dark variant of
the frontend's CVD-safe categorical palette (fixed order, never cycled
inside one chart). It is the only place hex values may live outside the
theme.

### Typography — `tailwind.config.js` → `fontSize`

System font (SF / Roboto). Sizes mirror the platform text-style ramp:

| Class           | Size / line height | Weight | Use                                          |
| --------------- | ------------------ | ------ | -------------------------------------------- |
| `text-display`  | 34 / 40            | 700    | Balance, auth screen titles, plan prices     |
| `text-title`    | 22 / 28            | 600    | Greeting, success screens                    |
| `text-headline` | 17 / 22            | 600    | Button labels, section headings, stat values |
| `text-body`     | 16 / 22            | 400    | Inputs, row titles                           |
| `text-subhead`  | 15 / 20            | 400    | Secondary copy, chips                        |
| `text-footnote` | 13 / 18            | 400    | Field labels, row subtitles, hints           |
| `text-caption`  | 12 / 16            | 400    | Section titles (uppercase), nav labels       |

Never set `fontSize` inline; never disable font scaling.

### Radius — `tailwind.config.js` → `borderRadius`

| Class             | Value | Use                                 |
| ----------------- | ----- | ----------------------------------- |
| `rounded-control` | 12    | Buttons, inputs, notices, segmented |
| `rounded-card`    | 16    | Sections, tiles, cards              |
| `rounded-full`    | —     | Chips, avatars, icon badges, FAB    |

### Spacing

Tailwind's 4-pt scale. Rhythm used across screens:

| Gap                          | Value                                       |
| ---------------------------- | ------------------------------------------- |
| Screen horizontal padding    | `px-5` (20)                                 |
| Between sections on a screen | `gap-6` / `gap-7`                           |
| Between fields in a form     | `gap-4` / `gap-5`                           |
| Label → input                | `gap-2` (8)                                 |
| Row minimum height           | 52 (settings), 64 (transactions)            |
| Control height               | 52 (`h-[52px]`), 44 for `size="md"` buttons |

Row gap < group gap < section gap — proximity must mean something.

## Components — `mobile/src/components/`

Screens compose these; they never restyle them. If a screen needs a variant
that doesn't exist, add the variant here (and to this document) instead of
overriding colors at the call site.

| Component                         | File                        | Contract                                                                                                                                                                          |
| --------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Screen`                          | `ui/screen.tsx`             | Canvas background + safe area; `scroll` adds a keyboard-aware ScrollView. Screens with a native header pass `edges={["left","right"]}`                                            |
| `Button`                          | `ui/button.tsx`             | `variant`: `primary` (white CTA) · `secondary` · `ghost` · `danger`; `size`: `lg` (52) · `md` (44); `loading`, `disabled`, optional `icon`. Sets role, label, disabled/busy state |
| `TextField`                       | `ui/text-field.tsx`         | Label above, `raised` field, brand border on focus, `danger` border + message on `error`, `hint`, show/hide toggle for `secureTextEntry`. **testID defaults to `field-<label>`**  |
| `Chip`                            | `ui/chip.tsx`               | Filter/option pill; selected = `primary`. Uses `aria-selected`                                                                                                                    |
| `SegmentedControl`                | `ui/segmented-control.tsx`  | 2–3 mutually exclusive options (`tablist`/`tab`, `aria-selected`); optional `activeClassName` per option (e.g. `text-income`)                                                     |
| `DateField`                       | `ui/date-field.tsx`         | Opens the platform date picker (`themeVariant="dark"`, brand accent); optional clear                                                                                              |
| `Section` / `Row` / `SectionBody` | `ui/section.tsx`            | Grouped list: optional uppercase title and footer; `Row` has icon, value, chevron when tappable, `destructive`; `last` drops the hairline                                         |
| `TransactionRow`                  | `ui/transaction-row.tsx`    | Category icon on a 15% tint of the category color, description, category · date, signed amount (income in `income`)                                                               |
| `CategoryPieChart`                | `ui/category-pie-chart.tsx` | react-native-svg donut + legend; empty label when there is no data                                                                                                                |
| `Notice`                          | `ui/notice.tsx`             | Inline feedback: `error` (announced as alert) · `success` · `warning` · `info`. Renders nothing without a message                                                                 |
| `EmptyState` / `LoadingState`     | `ui/empty-state.tsx`        | Icon + title + description; loading is its own state                                                                                                                              |
| `BottomNav`                       | `ui/bottom-nav.tsx`         | Flat bar: Início · Buscar · **+** · Importar · Conta. `nav-*` testIDs are Maestro/Playwright selectors                                                                            |
| `GoogleButton`                    | `ui/google-button.tsx`      | Secondary button with the Google mark                                                                                                                                             |
| `AuthShell` / `Divider`           | `auth-shell.tsx`            | Frame for every unauthenticated screen: brand mark, `display` title, subtitle, form, footer link                                                                                  |
| `PasswordChecklist`               | `password-checklist.tsx`    | Live ✓/✗ per rule from `lib/password-rules.ts`                                                                                                                                    |

Icons: `@expo/vector-icons` **Feather** only, 14–22 px, colored from
`colors.*`. No emoji as UI glyphs.

## Patterns

- **Every data screen has four states** — loading (`LoadingState`), error
  (`EmptyState` with a retry hint + pull-to-refresh), empty (`EmptyState`),
  content. Never flash "no items" while the first request is in flight.
- **Feedback stays inline.** Validation and success messages use `Notice`
  in the layout. `Alert.alert` is reserved for irreversible, rare actions:
  delete transaction, log out, delete account.
- **Pressed feedback.** Buttons/chips: `active:opacity-70`. List rows:
  `active:bg-raised`. Icon buttons: `active:opacity-60`.
- **Navigation.** Stack headers are configured in `src/app/(app)/_layout.tsx`
  (canvas background, no shadow, minimal back button). Screens set dynamic
  titles with `<Stack.Screen options={{ title }} />`. Modals
  (`transaction/[id]`, `import-nubank`) provide a "Cancelar" `headerLeft`.
- **Amounts.** `formatBRL` everywhere; income prefixed `+` in `income`,
  expense prefixed `−` (U+2212, not a hyphen).
- **Accessibility.** Every custom touchable sets `accessibilityRole` and a
  label; selection uses `aria-selected`; errors use `accessibilityRole="alert"`.
  Touch targets are ≥ 44 pt (use `hitSlop` on small icons).

## Testing hooks (don't break these)

The E2E suites select elements by these, so renaming them is a breaking
change for `mobile/maestro/*.yaml` and `mobile/e2e-web/*.spec.ts`:

- `field-<label>` on every `TextField`, plus `field-Valor` on the amount input
- `search-input`
- `nav-home`, `nav-search`, `nav-new-transaction`, `nav-import`, `nav-profile`
- Visible texts: "Olá, <name>", "Minha Conta" (header), "Nova transação" /
  "Editar transação" (headers), "Sair da conta", "Excluir transação"

## Checklist for a new screen

- [ ] Uses `Screen` (or a native header + `edges={["left","right"]}`)
- [ ] Only token classes — no hex, no inline `fontSize`, no new radius
- [ ] Composes existing components; any new variant is added to the
      component and to this file
- [ ] Loading / error / empty / content states
- [ ] Inline `Notice` for feedback; `Alert` only for irreversible actions
- [ ] Roles, labels and testIDs on interactive elements
- [ ] Screenshot reviewed (see "Visual review" in `docs/workflows.md`)
