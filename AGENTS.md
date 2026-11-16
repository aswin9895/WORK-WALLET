# AGENTS.md

Guidance for Codex (and any developer) working in this repo.

## What this is

- Top Money dashboard Spent = expenses + savings + outstanding loans given
  in its salary period, scoped by account. Repayments follow the loan period;
  savings withdrawals are excluded. Account-card spending stays expense-only.

- Money home top dashboard has an account filter beside the month, default salary account;
  `domain/money.moneyDashboard` scopes totals. Other accounts show current
  balance, All combined balance; period rows retain salary-period dates.

**Work & Wallet** (formerly Work Tracker; package `com.fresherfindings.workandwallet`;
see CLAUDE.md, which is the up-to-date guide) — an offline Android app
(React Native CLI, **not Expo**) for
recording catering work. The owner supplies workers to catering companies and
the catering company pays him. The app records works (people + extras) per
catering, tracks what the owner has paid (collected) and what each worker has
been paid, and produces a "Work Payment Report" (the bill to that catering).

- User + technical docs: [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)
- Planned-for-later work: [docs/PENDING.md](docs/PENDING.md). Keep it
  updated: tick or move items when done, add new "later" requests.
- **Release status: NOT released yet** (no real users). At the first
  production release, follow the reminder at the top of PENDING.md and add
  the "no data loss" production rules here.
- Theming guide: [src/theme/README.md](src/theme/README.md)

## Hard rules (owner's decisions — do not change without asking)

- **JavaScript only.** No TypeScript files, no `tsconfig.json`, no `@types/*`.
- **Styling = SCSS/CSS only.** No Tailwind, NativeWind, styled-components or
  `StyleSheet.create`. Styles come from the theme: `const s = useStyles();`.
- **Offline today, backend later.** No network calls yet. Data must stay
  sync-ready (see "Data layer"), so a backend can be added without data loss.
- **Storage = SQLite** via `@op-engineering/op-sqlite`. Data must survive app
  restarts, phone reboots and power loss.
- **Themes and modes will come later.** Everything visual must go through the
  theme system so new themes / dark mode are just new token files.
- **Alerts:** always the common alert system (`@/components/alert`). Never
  React Native's `Alert.alert`.
- React Native CLI project (bare). Android is the target platform.
- Ask the owner before making product decisions (new fields, flows, money logic).

## Commands

```bash
npm install
npm start               # Metro
npm run start:reset     # Metro, cache cleared — needed after editing any .scss partial,
                        # babel.config.js or scss-transformer.js
npm run android         # build + install debug app on device/emulator
npm test                # jest: domain logic, alert queue, every data function on real SQLite
npm run lint
```

## Code structure

Imports use the `@/` alias for `src/` (babel-plugin-module-resolver), e.g.
`import { listWorks } from '@/data'`. No long `../../` paths.

```
App.js                       re-exports src/app/AppRoot
src/
  app/AppRoot.js             providers (SafeArea, Keyboard, Theme), DB start-up, AlertHost
  navigation/
    routes.js                ROUTES constants — always navigate with these
    AppNavigator.js          stack + header colours from the theme
  screens/<feature>/         caterings/, works/, people/, report/, settings/
  components/
    ui/                      Button, Card, CheckBox, Chip, Empty, Field,
                             HeaderButton, SectionTitle, Tabs (one per file)
    form/                    Combo (dropdown + typing), DateField, Stepper
    sheets/                  Sheet (bottom sheet), LineSheet (Add person), PaySheet
    alert/                   common alert system (see below)
  data/                      THE ONLY place that touches SQLite
    index.js                 public API — screens import from '@/data' only
    db/database.js           connection, PRAGMAs, migration runner
    db/migrations.js         MIGRATIONS (append-only), SYNCED_TABLES, syncSql
    repositories/            caterings, people, works, payments, reports, meta, sql
    sync/changes.js          read side for a future backend (getChangesSince)
  domain/                    pure business logic, no React, no SQL — unit-tested
    lines.js                 lineTotal()
    dues.js                  workTotals, workDues, personDues, peopleSummary,
                             pendingPayments, extraTotal, personKey
    report.js                buildReport()
  theme/                     ThemeProvider, useStyles, themes registry, SCSS
  utils/format.js            ₹ money (Indian grouping), dates, number parsing
__tests__/                   jest (db.test uses node:sqlite in place of op-sqlite)
```

**Layering:** screens → components / `@/data` / `@/domain` / `@/theme`.
`domain/` imports nothing app-specific except `utils/`. `data/` may use
`domain/` for totals. Screens never write SQL; components never import `data/`
except LineSheet / WorkForm creating a person.

## Theme system (multi-theme, multi-mode ready)

Full guide: [src/theme/README.md](src/theme/README.md).

- `src/theme/scss/_tokens.scss`: every colour/size, all `!default`. **No colour
  literals anywhere else.**
- `src/theme/scss/_styles.scss` (+ `_report.scss`, classes prefixed `report-`):
  all classes, built from tokens.
- `src/theme/themes/<theme>-<mode>.scss`: overrides tokens only
  (`@use '../scss/styles' with (...)`). Today: `default-light.scss` (token
  defaults) and `default-dark.scss`.
- `src/theme/themes.js`: registry `THEMES[id].modes[light|dark] = { styles, statusBar }`.
- `ThemeProvider` (`useTheme()`: themeId, mode 'system'|'light'|'dark',
  scheme, setThemeId, setMode). It falls back to light/default if a stylesheet
  is missing. **Components call `const s = useStyles()` inside the component**
  and never import `.scss` directly (it wouldn't switch).
- Mode choice: Settings → Appearance (System / Light / Dark). Saved in
  `app_meta` (`theme_id`, `theme_mode`) by AppRoot and restored at start-up
  with `restore()`. Navigation colours (`NavigationContainer theme`) follow it.
- **Colours for SVG / icons** (which can't take a style class): read them from
  palette classes `.pal-*` in `_home.scss`, e.g. `s.palCtaFrom.color`. Add a
  token + a `.pal-…` class instead of a colour literal in JS.
- **Fonts:** Poppins (Regular/Medium/SemiBold/Bold) in `assets/fonts` (SIL OFL)
  and copied to `android/app/src/main/assets/fonts`. Use tokens
  `$font-regular … $font-bold` (`font-family`) and do NOT also set
  `font-weight` (Android then ignores the custom font). Only the redesigned
  Home uses Poppins so far.
- Only inline style allowed: values known at runtime (safe-area insets), e.g.
  `{ height: insets.top }`.
- **Glow / box-shadow:** the CSS converter can't parse `box-shadow`; write
  `rn-box-shadow: $token;` (scss-transformer passes `rn-*` through as the raw
  RN prop, here `boxShadow`). Put the glow on an outer View WITHOUT
  `overflow: hidden`; clip gradients in an inner View (see HeroCard).
- **Redesigned screens use `<FixedText>`** (ignores the phone font-size
  setting — owner's choice) and solid icons via `<MdiIcon path={mdi…} />`
  (@mdi/js); outline icons via lucide-react-native.
- **SVG sizing on Android:** never give an `<Svg>` `height="100%"` inside an
  absolutely positioned or flexible box — it renders full-screen or partly.
  Wrap it in a sized View (Waves) or measure with onLayout (GradientView).
- **Metro cache + SCSS partials:** Metro only re-compiles a theme file when
  that file changes. After editing a partial (`_tokens`, `_styles`, `_home` …)
  either run `npm run start:reset` or bump the `// build: …` line at the top
  of every `themes/*.scss`. Changing `scss-transformer.js` always needs
  `npm run start:reset`.

### Redesign status (owner shares designs screen by screen)
- **Home: done** (redesign v1). `src/screens/caterings/home/*`, styles in
  `src/theme/scss/_home.scss` (`home-` prefix). Stack header hidden for Home;
  it draws its own app bar under the status bar (edge-to-edge, uses insets).
  Status avatar = `domain/dues cateringStatus` via `listCateringsOverview()`.
- **Settings: done** (redesign v1). Built from the shared **kit**
  (`src/components/kit`: ScreenHeader, KitSectionTitle, IconRow, ChoicePills;
  styles `src/theme/scss/_kit.scss`, `kit-` classes, tokens `$subheader-*`,
  `$tile-*`, `$choice-*`, `$row-*`). Use the kit for every next redesigned
  screen; hide its stack header (`headerShown: false`) since ScreenHeader
  draws under the status bar.
- **People + Add/Edit person sheet: done** (redesign v1). Light-mockup
  layout for both themes (owner's choice): ScreenHeader + IntroBlock, person
  cards, "+ Add person" under the list — pinned to the bottom only when the
  list scrolls (footer keeps the same height in both cases to avoid loops).
  Floating FormSheet (centred title), fields IconField, buttons KitButton.
  No ⋮ menu (owner's choice); Delete is a link in the Edit sheet.
- Kit parts so far: ScreenHeader, IntroBlock, KitSectionTitle, IconRow,
  ChoicePills, IconField, KitButton (primary/soft, rounded/pill), FormSheet.
- **New / Edit Catering: done** — a floating FormSheet (`CateringSheet`), no
  separate screen (owner's choice). Opened from Home (+ New Catering → opens
  the new catering after saving) and from the catering screen's Edit (delete →
  back to Home). IconField also has `variant="tile"` + `multiline` for later forms.
- **Catering detail: done** (redesign v1). ScreenHeader with "Edit" action,
  SummaryCard (Collected / To collect / To pay bars), SegmentedTabs for both
  Works / People and Pending / Paid (default Pending; shared background with an active segment), WorkCard (status strip: green = collected, orange =
  to collect; right = pay status), PersonDueCard, kit bottom bar (+ Work /
  Report; select mode: Collected / Pay / Collected & paid). Pieces in
  `src/screens/caterings/detail/`, styles `_catering.scss` (`cat-`).
- Catering People tab also has an independent Pending / Paid segmented filter,
  default Pending: remaining worker balance > 0 vs zero, regardless of collection.
- **New / Edit Work: done** (redesign v1, owner's 2nd mockup). Info card
  (Date / Session / Place rows: tile + label + input), People + Extras
  sections, Total card, Notes, narrow "Save" pill; edit mode has a trash icon
  in the header. `Combo` and `DateField` have a `kit` prop for the new look
  (DateField kit shows 11-Nov-26 + calendar icon). A TextInput that is itself
  the box uses `[s.kitInput, s.kitTextInput]` (keeps side padding);
  `kitInputField` is only for inputs INSIDE a box. Styles `_work_form.scss`.
  The Add person sheet for a work (LineSheet) is still the old style.
- WorkForm uses `usePreventRemove` + common confirmAction for dirty new/edit
  forms. `domain/workForm.workFormSnapshot` excludes UI-only state; successful
  save/delete disables the guard before navigation. Extras options use work
  line snapshots plus selected recipients, keyed by normalized name (null IDs safe).
- `domain/lines.workPeopleCount` = sum(quantity + called_count); shown in form,
  work cards and work detail. CateringScreen sorts works oldest first, then id.
- **Dropdowns (Combo) close on a tap outside** via
  `src/components/form/dropdownDismiss.js`: open Combos register; a
  `<DropdownDismissArea>` sees every touch (onTouchStart, never blocks it).
  It wraps the navigator in AppRoot and the content of every Modal (Sheet,
  FormSheet) — a NEW popup/Modal that contains a Combo must wrap its content
  in `DropdownDismissArea` too.
- First launch is **Light** (`DEFAULT_MODE = 'light'`); a saved choice wins.
- Home's top HeroCard shows actual paid earnings (not bill totals): Myself
  (default) / All / Only people, with payment-date ranges (default All time).
  Source: `getEarningsData`; pure helpers in `domain/earnings.js`. Catering and
  work cards retain their original totals. Assigned extras count via payments.
- HeroCard has a small filter icon opening `EarningsFilterSheet` (FormSheet).
  Scope and date controls live there; Apply commits, Cancel/dismiss discards drafts.
  PersonSheet's This is me checkbox is label-only, without description.
- PersonSheet has **This is me**; `app_meta.myself_uid` stores the one local
  identity by permanent uid. `listPeople` exposes `is_myself`; `savePerson`
  atomically updates the person and choice. No schema change required.
  Payment identity uses person_id first, name fallback only when the link is null.
  LineSheet hides People called for myself; saveWork also rejects it.
  Marking a person with existing called-worker lines as myself is rejected.
- **Other screens:** old layout, new light/dark colours. Restyle each when the
  owner sends its design. Put its classes in a new partial (`_<screen>.scss`)
  and `@use` it from `_styles.scss`.
- Graphics: `src/components/graphics` (GradientView, Cloche, Waves) use
  react-native-svg; icons: lucide-react-native.

## Alerts — `@/components/alert`

- `showAlert(config)` → Promise `{ value, selected, cancelled, auto }`.
  Config: `title, message, buttons[{text, value, style: cancel|primary|destructive}],
  options[{value, label, description}], multiple, selected, requireSelection,
  autoCloseMs, autoCloseValue, cancelable, tone: danger|success`.
- Helpers: `showMessage, showSuccess, showError, confirmAction, confirmDelete,
  selectOption`. Use them for everything.
- Alerts are queued (one at a time). `<AlertHost/>` is mounted once in AppRoot.
- Auto-close is built but not used anywhere yet (owner's choice).

## Data layer (sync-ready for a future backend)

- Screens call only functions exported from `src/data/index.js`.
- Every synced table (`SYNCED_TABLES`: caterings, people, works, work_lines,
  extras, extra_people, payments) has:
  - `uid` — permanent random 32-hex id, unique. A backend identifies rows by
    uid, never by the local integer `id`.
  - `updated_at` — UTC ISO time, set by triggers on insert/update.
  - delete trigger → row in `sync_deletions (table_name, uid, deleted_at)`,
    cascade deletes included.
  - Inserting with an explicit uid/updated_at (from a server) keeps them.
- `app_meta (key, value)`: `device_id`, and later last sync time, theme choice.
  Use `getMeta` / `setMeta`.
- **New table that should sync:** add it to `SYNCED_TABLES` usage in a NEW
  migration, `...syncSql('new_table')`. Don't edit v6.
- `saveWork` replaces a work's lines/extras on every save, so those rows get
  new uids (old ones are logged as deleted). That's fine for sync. Payments
  are matched by work + person name, so they survive edits.

## Data model (SQLite)

`caterings` 1─* `works`; `works` 1─* `work_lines`, 1─* `extras`, 1─* `payments`;
`extras` 1─* `extra_people`. Lookup table: `people` (optional fixed amount
`default_rate_amount`; `default_rate_name` unused). No rate or extra-type
masters (removed in v2): amounts and extra names are typed per entry.

- `work_lines` **snapshot** `person_name`, `rate_name`, `rate_amount` at save
  time. Editing/deleting a person never changes past records. `person_id` is a
  soft link (ON DELETE SET NULL).
- One line = one person. **People called** (v3) = extra workers that person
  brought (not counting themselves). Line total =
  `rate_amount * quantity + called_count * called_amount`
  (`domain/lines.js` `lineTotal` = `LINE_TOTAL_SQL` in `repositories/sql.js`, keep in sync).
- Session is free text; the dropdown offers Breakfast, Lunch, Dinner, Setting.
- Dates are `TEXT 'YYYY-MM-DD'`.
- Deleting a catering cascades to everything under it.

### Money (v5) — `src/domain/dues.js`
- `works.collected_at`: owner paid this whole work (all-or-nothing). NULL = to collect.
- `extra_people`: each person gets the extra's `amount`; the owner pays
  `amount × max(1, people)` (`extraTotal` = `WORK_TOTAL_SQL`, keep in sync).
  No people = owner's own cost, collected but not payable.
- `payments`: part payments allowed, never more than pending. Matched to people
  **by name** (`personKey`). saveWork deletes payments of people no longer on
  the work (WorkForm confirms first).
- A person's due on a work = their line total (+ people they called; the caller
  pays their own people) + their extra shares.
- Bulk on the catering works list: select mode → `setCollectedMany`,
  `addPayments(pendingPayments(works, today))`.
- `collectAndPayWorks(ids, date)` combines collection and payment in one
  transaction, reading current balances, preserving prior collection dates,
  and skipping already paid balances. One confirmation in the works list.

### Changing the schema
Append to `MIGRATIONS` in `src/data/db/migrations.js`. **Never edit a shipped
migration.** Migrations run with `foreign_keys = OFF`, then
`PRAGMA foreign_key_check`. Never drop a referenced table; rebuild the
referencing table instead (see v2). Add a test in `__tests__/db.test.js`
(the "upgrade from v1" test runs every migration on old data).

## Native dependencies

- `react-native-svg` (gradients, illustrations) + `lucide-react-native` (icons).

- Keyboard: `react-native-keyboard-controller` (`KeyboardProvider` in AppRoot,
  `KeyboardAwareScrollView` in forms, `KeyboardAvoidingView` in Sheet). The app
  is edge-to-edge, so Android `adjustResize` alone does not work.
- It needs `react-native-reanimated` + `react-native-worklets` as **direct**
  dependencies and `react-native-worklets/plugin` as the LAST Babel plugin.
- After adding a native library: `npm run android` (rebuild) and
  `npm run start:reset`.

## SCSS gotchas

- Only **flat class selectors** (`.card {}`); no nesting output, no descendant
  selectors, no `:hover`. Use tokens and `@mixin`s.
- `.btn-text-ghost` → `s.btnTextGhost`.
- Longhand borders only (`border-bottom-width` + `border-bottom-color`).
- `px` units (become numbers); `%` works for sizes.
- Navigation colours come from `.nav-header`.

## Report rules (`src/domain/reportViews.js`, `src/domain/report.js`)

- Work status uses `matchesWorkFilter` in `domain/dues.js`: Pending = uncollected
  or any worker balance; Paid = collected and no worker balance.
- Report status filters: All / Pending / To collect / To pay, combined with
  date range by `getReportData`'s optional fourth argument. Filters select
  whole works; report amounts remain full bill amounts, not unpaid balances.

- Report screen redesigned: kit ScreenHeader (native header hidden), FixedText,
  token-based `_report.scss`, ReportOptionsSheet with Apply/Cancel drafts.
- Choose Payment summary / Work details / Both. Toggle date, place, session,
  people/Boys, individual amounts, extras/recipients, and totals. Visibility
  never changes calculations. Defaults: summary, all dates/statuses, all fields.
- ReportOptionsSheet uses Combo dropdowns, including multi-select fields (all
  selected initially). Layout is Table (default) or List. ReportTables renders
  horizontal-scrolling summary/work tables; List keeps the existing cards.
- Report Combos use `searchable={false}`: whole-field press target, no TextInput.
  Other Combo instances retain their typing behavior by default.
- `getReportWorks` returns full works oldest first, filtered by work dates and
  status. `buildReportViews` produces both views; legacy `buildReport` remains
  the base for named-person summary rows and the existing raw-data report API.
- Summary: named people plus combined Boys (called workers) with quantity/rate
  breakdowns. Work details: own pay separately from Boys (caller name).
- Extras include quantities/rates, assigned recipient names, and unassigned
  expenses. One grand total in Both; each detail has its work total.
- Work from a "Setting" session gets separate rows (`Aswin – Setting`); if a
  person has both, the normal row is `Aswin – Work`.
- Different own amounts in one row → `₹400 + ₹650` (more than 3 → `Mixed`).
- Boys and extras display exact count × rate breakdowns, including mixed rates.
- Extras grouped by name; amount × people. Date ranges filter by work date.

## Quality checklist before finishing a change

- `npm test` and `npm run lint` (0 errors; the 3 "nested component" warnings
  are the React Navigation `headerRight` pattern).
- JS bundle builds: `npx react-native bundle --platform android --dev false
  --entry-file index.js --bundle-output <tmp>/index.bundle`.
- New colours → tokens. New alerts → alert helpers. New screens → ROUTES +
  AppNavigator. New queries → a repository + `data/index.js` + a test.
- Update docs/DOCUMENTATION.md, docs/PENDING.md and this file when behaviour or
  structure changes.
