# CLAUDE.md

Guidance for Claude (and any developer) working in this repo.

## What this is

**Work & Wallet** (renamed from "Work Tracker"; package `com.workandwallet.app`,
JS component `WorkAndWallet`, database file `workandwallet.sqlite`) — an
offline Android app (React Native CLI, **not Expo**) for
recording catering work, and (Money tab) the owner's bank money. The owner supplies workers to catering companies and
the catering company pays him. The app records works (people + extras) per
catering, tracks what the owner has paid (collected) and what each worker has
been paid, and produces a "Work Payment Report" (the bill to that catering).

- User + technical docs: [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)
- Planned-for-later work: [docs/PENDING.md](docs/PENDING.md). Keep it
  updated: tick or move items when done, add new "later" requests.
- **Release status: NOT released yet** (no real users). The package name
  `com.workandwallet.app` is final once published — never change it then. At the first
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
npm test                # jest: domain logic, alerts, backup/restore, every data function on real SQLite
npm run lint
npm run build:apk       # signed release APK → android/app/build/outputs/apk/release/
```

**Release signing:** own key `android/app/worktracker-release.keystore`
(alias `personalTracker`, owner's details), passwords in `android/keystore.properties` (read by `android/app/build.gradle`;
both git-ignored; owner keeps a copy on the Desktop). NEVER replace or
regenerate it — every update must be signed with this same key. Without the
properties file the release APK is unsigned (never debug-signed). For each
new APK given to the phone, raise `versionCode` (and `versionName`) in
`android/app/build.gradle`.

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
    MainTabs.js              HOME = bottom tabs Work (catering Home) | Money
  screens/<feature>/         caterings/, works/, people/, report/, settings/,
                             money/ (+ money/report/)
  components/
    ui/                      Button, Card, CheckBox, Chip, Empty, Field,
                             HeaderButton, SectionTitle, Tabs (one per file)
    form/                    Combo (dropdown; `searchable`, `kit` props), DateField,
                             Stepper, dropdownDismiss (tap outside closes dropdowns)
    sheets/                  Sheet (old bottom sheet), LineSheet (Add person), PaySheet
    kit/                     redesign kit (ScreenHeader, FormSheet, IconField, …)
    graphics/                GradientView, Cloche, Waves, MdiIcon (react-native-svg)
    alert/                   common alert system (see below)
  data/                      THE ONLY place that touches SQLite
    index.js                 public API — screens import from '@/data' only
    db/database.js           connection, PRAGMAs, migration runner
    db/migrations.js         MIGRATIONS (append-only), SYNCED_TABLES, syncSql
    repositories/            caterings, people, works, payments, reports, earnings,
                             meta, backup, money, sql
    sync/changes.js          read side for a future backend (getChangesSince)
  domain/                    pure business logic, no React, no SQL — unit-tested
    lines.js                 lineTotal()
    dues.js                  workTotals, workDues, personDues, peopleSummary,
                             pendingPayments, extraTotal, personKey,
                             cateringStatus, matchesWorkFilter
    report.js                buildReport() (summary grouping)
    reportViews.js           buildReportViews() — summary, Boys, extras, details
    reportTableModel.js      table columns/rows — ONE source for screen, PDF, image
    earnings.js              isMyselfEntry, earningsDateRange, paidEarnings
    workForm.js              extraPersonOptions, workFormSnapshot (unsaved changes)
    backup.js                backup format: makeBackup, parseBackup, backupSummary
    money.js                 money: salary months, balances, checks, will get
                             back, savings, fixed items, deriveMoney (paise)
    moneyReport.js           money report tables — ONE source for screen, PDF, image
  theme/                     ThemeProvider, useStyles, themes registry, SCSS
  export/                    report export: reportHtml.js (PDF template, pure),
                             reportExport.js (PDF / image, share, save;
                             createHtmlPdf), moneyReportHtml.js (money PDF)
  backup/backupFile.js       backup file: create, save/share, pick, restore
  utils/format.js            ₹ money (Indian grouping), dates, number parsing,
                             formatAmountInput / amountText (commas while typing)
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
  palette classes `.pal-*` (in `_home`, `_kit`, `_catering`, `_work_form`,
  `_export`), e.g. `s.palCtaFrom.color`. Add a token + a `.pal-…` class
  instead of a colour literal in JS.
- **Fonts:** Poppins (Regular/Medium/SemiBold/Bold) in `assets/fonts` (SIL OFL)
  and copied to `android/app/src/main/assets/fonts`. Use tokens
  `$font-regular … $font-bold` (`font-family`) and do NOT also set
  `font-weight` (Android then ignores the custom font). Redesigned screens
  (and the kit) use Poppins; not-yet-redesigned screens still use the system font.
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
  GradientView draws its SVG 1px larger than measured (rounded up) because
  Android rounds the SVG down (~2px short), which cut the tips off round
  buttons; the box must keep `overflow: hidden` + its border radius to trim it.
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
  `$tile-*`, `$choice-*`, `$row-*`). "Your data" has Back up data, Restore
  from backup and an info note (see "Backup / restore"). Use the kit for every next redesigned
  screen; hide its stack header (`headerShown: false`) since ScreenHeader
  draws under the status bar.
- **People + Add/Edit person sheet: done** (redesign v1). Light-mockup
  layout for both themes (owner's choice): ScreenHeader + IntroBlock, person
  cards, "+ Add person" under the list — pinned to the bottom only when the
  list scrolls (footer keeps the same height in both cases to avoid loops).
  Floating FormSheet (centred title), fields IconField, buttons KitButton.
  No ⋮ menu (owner's choice); Delete is a link in the Edit sheet.
- Kit parts so far: ScreenHeader (back, title, right `actions` / one
  `ActionIcon`), IntroBlock, KitSectionTitle, IconRow, ChoicePills,
  SegmentedTabs, IconField, KitButton (primary/soft/outline/tonal/danger,
  rounded/pill), FormSheet,
  BusyOverlay (dims the screen with a "working…" card), BottomTabBar (the
  Work | Money tabs, owner's mockup: rounded-top card, active = orange +
  line), AmountField (₹ input, commas while typing, number keyboard).
- **Amount inputs (everywhere, owner's choice):** number keyboard
  (`keyboardType="numeric"`) and Indian commas while typing via
  `formatAmountInput` (prefill stored values with `amountText`, which
  rounds to paise). Read them with `parseNum` / `toPaise` (commas ignored).
  The work form's unsaved-changes check compares amounts as numbers.
- **App icon / logo (owner's images, originals in `assets/branding/`):**
  - Launcher: adaptive icon `res/mipmap-anydpi-v26/ic_launcher(_round).xml`
    = `ic_launcher_foreground.png` (Icon.png with its rounded corners filled
    → `assets/branding/icon-fullbleed.png`, drawn at 70dp of the 108dp
    layer) on `ic_launcher_background.png` (smooth dark → orange blend).
    Older phones: `ic_launcher.png` / `ic_launcher_round.png` per density.
  - In app: `src/assets/images/app-logo.png` (InApp.png trimmed, 263×192)
    in the top bar of BOTH tabs — "Work & Wallet" + logo (HomeAppBar with no
    `iconPath`; class `home-logo`). Settings there is a round gear button
    only (no text, owner's choice).
  - Reports (PDF + image): logo in a dark header band (see "Report export").
    The PDF embeds it as a data URI from `src/export/logoData.js`
    (GENERATED — after changing app-logo.png run
    `node scripts/make-logo-data.js`). Not a file path: a file in the
    Android assets needs a rebuild and may load after the page is printed.
  - The bottom tab buttons keep their briefcase / wallet icons; the opening
    screen already shows the logo. Change other places only with the
    owner's OK.
- **Bottom tabs:** `@react-navigation/bottom-tabs` (plain JS) with our own
  `BottomTabBar`. ROUTES.HOME is the tabs; screens inside navigate to stack
  routes as before. Home's "+ New" sits 30px above the tabs so its glow isn't
  cut.
- **New / Edit Catering: done** — a floating FormSheet (`CateringSheet`), no
  separate screen (owner's choice). Opened from Home (+ New Catering → opens
  the new catering after saving) and from the catering screen's Edit (delete →
  back to Home). IconField also has `variant="tile"` + `multiline` for later forms.
- **Catering detail: done** (redesign v1). ScreenHeader with a pencil
  (edit) icon, SummaryCard (aligned label/value rows), SegmentedTabs Works /
  People, each with its own **Pending / Paid** switch (Pending default; see
  `matchesWorkFilter`), WorkCard (status strip: green = collected, orange =
  to collect; right = pay status), PersonDueCard, kit bottom bar (+ Work /
  Report; select mode: Collected / Pay / Collected & paid). Works are listed
  oldest first. Pieces in `src/screens/caterings/detail/`, styles
  `_catering.scss` (`cat-`).
- **New / Edit Work: done** (redesign v1, owner's 2nd mockup). Info card
  (Date / Session / Place rows: tile + label + input), People + Extras
  sections, Total card, Notes, narrow "Save" pill; edit mode has a trash icon
  in the header. `Combo` and `DateField` have a `kit` prop for the new look
  (DateField kit shows 11-Nov-26 + calendar icon). A TextInput that is itself
  the box uses `[s.kitInput, s.kitTextInput]` (keeps side padding);
  `kitInputField` is only for inputs INSIDE a box. Styles `_work_form.scss`.
  The Add person sheet for a work (LineSheet) is still the old style.
- **Dropdowns (Combo) close on a tap outside** via
  `src/components/form/dropdownDismiss.js`: open Combos register; a
  `<DropdownDismissArea>` sees every touch (onTouchStart, never blocks it).
  It wraps the navigator in AppRoot and the content of every Modal (Sheet,
  FormSheet) — a NEW popup/Modal that contains a Combo must wrap its content
  in `DropdownDismissArea` too.
- **Report: done** (kit-based, no separate mockup): ScreenHeader "Reports" with
  share + options icons, one-line caption, tables / list (see "Reports" and
  "Report export" below). Styles `_report.scss`, `_export.scss`.
- **Bottom tabs: done** (owner's mockup) — see "Bottom tabs" above.
- **Money screens: done** (kit-based, no separate mockup): Money home (reuses
  HomeAppBar: "Work & Wallet" + logo, like the Work tab), Month, Months, Will get back, Money
  settings + forms, Money report. See "Money tracking (v7)". Styles
  `_money.scss`.
- First launch is **Light** (`DEFAULT_MODE = 'light'`); a saved choice wins.
- **Other screens** (not redesigned yet: Work detail, Person to-pay, the
  work's Add person sheet / LineSheet, Pay sheet): old layout, new
  light/dark colours (all alerts ARE redesigned — see "Alerts"). The owner
  is happy with their current look — no redesign planned. Only if the owner
  later sends a design: put its classes in a new partial (`_<screen>.scss`)
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
- `closeOnSelect: true` (single choice): tapping an option closes the alert
  with `{ value: option, selected: [option] }` (sort / filter popups).
- Alerts are queued (one at a time). `<AlertHost/>` is mounted once in AppRoot.
- **Look (redesigned, owner's mockups) — every alert** is drawn by
  `KitAlertCard.js` (styles `kit-dialog-*` in `_kit.scss`, tokens
  `$dialog-*`). `layout` defaults to `'header'` when there are options,
  else `'hero'`:
  - `'hero'`: big icon on a soft blob, centred title + message (long
    messages scroll). 1–2 buttons side by side (Cancel | action), 3+ stacked
    full width (Back up data). `tone: danger|success` → red / green icon +
    blob (default orange); no `iconPath` → info / warning / check by tone.
  - `'header'`: icon tile + title + `subtitle`, `optionsTitle`, option
    cards (`iconPath`, `tone: red|blue`, description, radio/check);
    buttons share a row unless `wide` (Export report).
  - Buttons → KitButton: primary → gradient, default → tonal, cancel →
    outline, destructive → danger; `buttons[].Icon` (lucide). Close (X)
    when cancelable.
  - Helpers pick the icon by type (owner's choice): showMessage orange info,
    showSuccess green check, showError red warning, confirmDelete red trash,
    confirmAction orange question (`{ iconPath }` to override — pay /
    collected use `mdiCashMultiple`; `{ destructive: true }` → red
    warning + red button). selectOption → header layout.
  - Don't import lucide inside `src/components/alert` (jest can't load it
    there) — use MdiIcon (@mdi/js).
- Auto-close is built but not used anywhere, and none is planned (owner's
  choice).

## Data layer (sync-ready for a future backend)

- Screens call only functions exported from `src/data/index.js`.
- Every synced table (`SYNCED_TABLES`: caterings, people, works, work_lines,
  extras, extra_people, payments + money_accounts, savings_types,
  money_fixed_items, money_entries, money_checks) has:
  - `uid` — permanent random 32-hex id, unique. A backend identifies rows by
    uid, never by the local integer `id`.
  - `updated_at` — UTC ISO time, set by triggers on insert/update.
  - delete trigger → row in `sync_deletions (table_name, uid, deleted_at)`,
    cascade deletes included.
  - Inserting with an explicit uid/updated_at (from a server) keeps them.
- `app_meta (key, value)`: `device_id`, `theme_id`, `theme_mode`,
  `myself_uid` (and later the last sync time). Use `getMeta` / `setMeta`.
- **New table that should sync:** add it in a NEW migration with
  `...syncSql('new_table')` and to `SYNCED_TABLES` (= v6 catering tables +
  `MONEY_TABLES` from v7). Don't edit v6 (it uses its own fixed list).
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
- Bulk on the catering works list (select mode): **Collected** →
  `setCollectedMany`; **Pay** → `addPayments(pendingPayments(works, today))`;
  **Collected & paid** → `collectAndPayWorks(ids, today)`, one transaction that
  re-reads balances inside it (keeps existing collection dates/payments).
- Work filters (`matchesWorkFilter`): `all`, `pending` (to collect OR to
  pay), `paid` (collected AND nothing to pay), `to_collect`, `to_pay`.

### Myself + Home earnings (`src/domain/earnings.js`)
- People → a person can be marked **This is me**; stored as
  `app_meta.myself_uid` = that person's uid (`getMyself`, `listPeople().is_myself`).
  A person with people-called lines can't be marked as myself (blocked in
  `savePerson`).
- `isMyselfEntry` matches by person_id, falling back to the name snapshot.
- Home's top card = `paidEarnings`: actual **payments** (incl. assigned
  extras), never work totals or collections. Scope Myself / All / Only people,
  payment-date range (`earningsDateRange`: all / this / last / custom),
  default Myself + All time. Filters live in `EarningsFilterSheet`
  (opened from the card's filter icon). Data: `getEarningsData()`.

### Money tracking (v7) — `src/domain/money.js`, Money tab
Owner's decisions (from their bank notes): HDFC = salary account, SBI =
normal account; starts fresh next year.
- **Amounts are INTEGER PAISE** in every money table and in domain/money
  (`toPaise`, `moneyP`, `paiseText`). Never store rupees there.
- **Salary month** = from a salary entry's date to the day before the next
  salary (`buildPeriods`; not stored). Named by `for_month` (default
  `salaryMonthOf`: day ≥ 15 → next month). One salary per date, only on
  the salary account (one per app). All accounts share these months.
- Entry types: salary, income, expense, savings, withdrawal (back from a
  savings type, not income), lend ("Will get back"), repayment (`lend_id`,
  same account, never more than given, not before the lend).
- **Monthly salary remaining** (salary account) = salary + income −
  expenses − savings − `lendOpen` (money given THIS month not repaid yet;
  a repayment counts for the month the money was given in, whenever it
  comes — owner's choice). Can be negative. Total remaining = balance.
- **Checks** (`money_checks`): the real bank balance BEFORE a salary's date,
  typed in "Got salary" or later (month screen). Missing / Extra = real −
  what entries add up to; later balances continue from the real one
  (`balanceBefore`). Deleting a salary deletes its checks.
- Fixed monthly items: `fixedItemsDue` = active items without an entry
  (`fixed_item_id`) in the current month; `addFixedItems` adds them.
  Editing an entry keeps its fixed-item link.
- Repository `repositories/money.js` checks every rule inside one
  transaction (`checkEntry`, `checkTotals`); screens use `getMoneyData()`
  + `deriveMoney()` (`useMoneyData` hook).
- Screens: `screens/money/` (MoneyHome, Month, Months, Lends, MoneySettings
  + sheets, report/). Styles `_money.scss` (`money-`), tab bar `kit-tab*`.
- Money report: `domain/moneyReport.js` → screen tables (`ReportTable`),
  PDF (`export/moneyReportHtml.js`, reuses `reportCss` / `tableHtml` from
  reportHtml — the catering PDF output must stay identical), image
  (`MoneyExportView`). Hiding kinds never changes balances.
- Month screen entries: sort + filter icon buttons right of the ENTRIES
  heading (owner's choice), each opening a pick-and-go popup
  (`showAlert({ closeOnSelect: true })`). Sort `ENTRY_SORTS` /
  `sortEntries`: Newest (default, resets each visit) / Oldest / In first /
  Out first / Biggest in / Biggest out. Filter `ENTRY_FILTERS` /
  `filterEntries`: All / Money in / Money out (in = "+" kinds, out = "−"
  kinds). Date sorts group under date headings; others are a flat list with
  the date on each row. Filter/sort never change the summary.
- Catering money and bank money are NOT linked (owner's choice).

### Changing the schema
Append to `MIGRATIONS` in `src/data/db/migrations.js`. **Never edit a shipped
migration.** Migrations run with `foreign_keys = OFF`, then
`PRAGMA foreign_key_check`. Never drop a referenced table; rebuild the
referencing table instead (see v2). Add a test in `__tests__/db.test.js`
(the "upgrade from v1" test runs every migration on old data).

## Backup / restore (Settings → Your data)

- **Back up data** → Save (Downloads/WorkAndWallet) or Share. One JSON file
  (`domain/backup.js`): `app: 'WorkAndWallet'` (files from before the rename
  say `'WorkTracker'` — `OLD_BACKUP_APPS`, still accepted), `kind: 'backup'`,
  `format` (file layout, now 1), `schemaVersion` (= MIGRATIONS.length when
  made), `createdAt`, `tables` (every column of the synced tables, incl.
  id + uid), `meta.myself_uid`. NOT included (owner's choice): theme/mode;
  never: device_id, sync_deletions.
- **Restore** = pick file (`@react-native-documents/picker`, copied to the
  cache) → `parseBackup` (refuses other files, damaged ones, and newer
  format / schemaVersion than this app; oldest accepted is v6; a table that
  didn't exist yet (`TABLE_SINCE`, e.g. money tables in a v6 backup) restores
  as empty) → confirm with counts (incl. money) → `restoreBackupData`. It **replaces everything** (owner's
  choice, no merge) in ONE transaction: delete children → parents, insert
  parents → children with the backup's ids and uids (foreign keys stay ON,
  so a bad file throws and nothing changes), drop the restored uids from
  `sync_deletions`, set `myself_uid` only if that person exists.
- Only columns that exist in this database are inserted, so an older
  backup still restores after an additive migration. **A new migration that
  renames/moves columns must also convert old backups** in `parseBackup`
  (and add a test in `__tests__/backup.test.js`).
- Safety copy (owner's choice): before restoring, the current data is
  written to `<DocumentDir>/safety-backup.json`; deleted when the restore
  succeeds, kept (overwritten next time) if it fails.
- The native libraries are `require`d lazily (old build → "rebuild" message).

## Report export (PDF / image)

- Report header **share icon** → choose **PDF** or **Image (PNG)**, then
  **Share** (Android share menu) or **Save** (Downloads/WorkAndWallet for PDF,
  Pictures/WorkAndWallet for images). Follows the current report options.
  No personal details in the header — catering only (owner's choice).
- **Header (PDF + image), owner's choice:** a dark band (`$export-banner-*`,
  the app icon's dark) with rounded corners and an orange bottom line: app
  logo left, orange label ("WORK PAYMENT REPORT" / "MONEY REPORT"), white
  title (catering name / "Work & Wallet"), light-grey filters, "Generated …"
  right. PDF: `reportHeaderHtml` in reportHtml.js (shared with the money
  PDF; logo embedded as a data URI, `logoData.js`). Image: `screens/report/ExportHeader.js` (shared).
  `exportColors()` includes `bannerBg/Text/Muted/Accent`.
- Rows/columns: `domain/reportTableModel.js` (`summaryTable`, `detailsTable`,
  `reportExportModel`) — used by the on-screen tables, the PDF and the image.
  Change table content there only.
- **PDF:** `export/reportHtml.js` `buildReportHtml(model, info, colors)` →
  `react-native-html-to-pdf`. A4 portrait for summary only, landscape when
  work details are included (`pageSize`). Table headings print once (not
  repeated on later pages — owner's choice); with Both, Work details start on
  a new page (`h2.new-page`), rows never split, Poppins from `file:///android_asset/fonts`. ALL user text through
  `escapeHtml`. Colours from `.pal-export-*` (light theme, `_export.scss`).
  The library keeps the last page size, so always pass width/height.
- **Image:** `screens/report/ReportExportView.js` (own light ThemeProvider,
  tables with `fitWidth`, no scrolling) rendered just off-screen, measured,
  captured with `react-native-view-shot` at 1600 px wide; refuses images
  taller than 16000 px (use PDF).
- Files are copied to `<cache>/exports/<clean name>` (react-native-share can
  read the cache) — e.g. `NANMA-report-12-Nov-26.pdf` (`exportFileBase`).
  Saving uses `react-native-blob-util` MediaStore; Android ≤ 9 asks for the
  storage permission first.
- The native export libraries are `require`d lazily inside reportExport.js,
  so an old app build fails only the export (with a "rebuild" message), not
  the whole app.

## Native dependencies

- `react-native-svg` (gradients, illustrations) + `lucide-react-native` (icons).
- Export: `react-native-html-to-pdf`, `react-native-view-shot`,
  `react-native-share`, `react-native-blob-util` (all New Architecture).
- Backup restore: `@react-native-documents/picker` (file picker).
- Navigation: `@react-navigation/bottom-tabs` (plain JS, no rebuild).

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

## Reports (`src/screens/report/`, `src/domain/reportViews.js`)

- Data: `getReportWorks(cateringId, from, to, status)` (full works, oldest
  first, filtered with `matchesWorkFilter`) → `buildReportViews(works)`.
  Amounts are always the **full bill**, never outstanding balances; hiding
  fields never changes totals.
- Options (`ReportOptionsSheet`, header sliders icon), all selection-only
  dropdowns (`Combo searchable={false}`): Report type Payment summary / Work
  details / Both; View Table / List; Work status All / Pending / To collect /
  To pay; Work dates All time / This month / Last month / Custom; Show in
  report = multi-select fields. **Defaults: `DEFAULT_REPORT_OPTIONS` = Both,
  Table, To collect, All time, all fields** (owner's choice). Options reset
  when the screen reopens; Apply/Cancel on a draft.
- Summary: named people grouped (via `buildReport`, Setting session separate),
  called workers combined as **Boys** (`Boys – Setting` separate); extras
  grouped by name with recipients. Details: one section per work with
  **Boys (caller)** rows.
- **Tables (`ReportTables`) work in portrait and landscape:** column widths
  come from `_report.scss`; `stretchedWidths` stretches them to fill the
  available width when there is room (landscape/tablet), otherwise the table
  keeps the theme widths and scrolls sideways. Report content and
  `ScreenHeader` add the left/right safe-area insets (camera cutout / nav
  bar in landscape; 0 in portrait). The app is not locked to portrait.

## Quality checklist before finishing a change

- `npm test` and `npm run lint` (0 errors; the remaining "nested component"
  warning is the React Navigation `headerRight` pattern on a not-yet-redesigned
  screen — WorkDetailScreen).
- JS bundle builds: `npx react-native bundle --platform android --dev false
  --entry-file index.js --bundle-output <tmp>/index.bundle`.
- New colours → tokens. New alerts → alert helpers. New screens → ROUTES +
  AppNavigator. New queries → a repository + `data/index.js` + a test.
- Update docs/DOCUMENTATION.md, docs/PENDING.md and this file when behaviour or
  structure changes.
