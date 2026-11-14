# Work & Wallet — Documentation

*(Formerly "Work Tracker". Android package `com.fresherfindings.workandwallet` — final. In production since version 1.0.)*

An offline Android app for keeping catering work records and making the payment
report you send to each catering company.

---

## 1. How the app thinks about your work

| Thing | What it is | Example |
|---|---|---|
| **Catering** | A company you work for. It pays you. | NANMA |
| **Work** | One job for a catering: date, place, session, people. | 17/10/26 · Lunch |
| **Person** | Someone who works (you too), or a group. | Aswin, Adwaith, Boys |
| **Amount** | What a person gets for the work, typed each time. | ₹700 |
| **Fixed amount** | Optional amount saved on a person, filled in automatically. | Aswin: ₹700 |
| **People called** | Extra workers that person brought (not counting themselves), with their own amount. | Aswin + 3 people × ₹600 |
| **Extra** | Money added to one work (name + amount). | Petrol ₹500 on that work |

Money for one person on a work = **own amount + people called × their amount**.
Example: Aswin ₹700 + 3 people × ₹600 = ₹2,500.
Work total = people + that work's extras.
Catering total = all work totals.

---

## 2. Using the app

### First time
**Settings → People**: add the people you usually call. If someone always
gets the same amount, give them a *fixed amount* (e.g. ₹700).
It is filled in automatically when you add them to a work.

### Light / dark
Settings → **Appearance**: **System** (follows the phone), **Light** or
**Dark**. The app starts in Light; your choice is remembered.

### My earnings on Home
In **Settings → People**, add or edit your person and tick **This is me**.
Only one person can be yourself; choosing another replaces the previous choice.
The choice is saved on this device. Your person shows a **Myself** label.

The top Home card starts on **Myself / All time**:
- **Myself:** payments recorded to you, including your assigned extras such as petrol.
- **All:** payments recorded to everyone, including you.
- **Only people:** payments to everyone except you, including their called workers.

Tap the small filter icon at the top of the card to open the bottom sheet.
Choose **Myself / All / Only people** and **All time / This month / Last month /
Custom dates**, then **Apply**. Cancel or dismiss keeps the previous filters.
Dates filter the payment date, not the work date. Only recorded payments count:
unpaid work and collected money do not count as your earnings. Unassigned expenses
are excluded. The top card no longer shows To collect; catering and work cards
keep their existing totals and statuses. Without a person marked as yourself,
the card prompts you to choose one; All still shows all payments.

**People called is unavailable under your own entry.** Add those workers as
separate entries. A person with called workers in saved works cannot be marked
as yourself until those entries are corrected. Existing records are never
silently changed. Deleting the marked person leaves payments intact and requires
choosing yourself again for the personal dashboard.

### Add a catering
Home → **+ New** → a card opens: name, phone, notes → **Save**. The new
catering opens. To change or delete it later: open the catering → tap the
**pencil icon** at the top right.

### Add a work
Open the catering → **+ Work**
1. Pick the **date**. It defaults to today.
2. **Session**: pick Breakfast, Lunch, Dinner or Setting from the dropdown, or type your own.
3. Type the **place** (optional).
4. **+ Add person**:
   - In **Person name**, pick one or more people from the dropdown (✓ = picked),
     or type a new name and tap **+ Add "name"**. New names are saved to People.
   - **Amount (fills everyone)** sets the same amount for all picked people.
     People with a fixed amount get theirs automatically.
   - For each person you can change their **own amount**, and use **People
     called** (− / +) for how many extra workers they brought. When it is above
     0, set **Their amount** (what each called worker gets; starts equal to the
     person's own amount).
   - Tap **Add**. Each person becomes one line on the work.
5. Tap any person line to change or remove it.
6. **+ Add extra** if this work had extras (Petrol, Reimbursement…): type the
   name and amount. Tap ✕ to remove one. Works with no extras need nothing.
7. **Save** (the button at the bottom).

The People count includes both named workers and the people they called.
The count appears in the form, work-list cards, and work details.
Leaving a new or edited work with unsaved changes asks **Discard & leave**;
Cancel keeps the form open. An untouched form or successfully saved work
does not ask. Newly created People directory entries remain in People.

### Money: collecting and paying
Tap a work on the catering screen to open it.

- **Collected from owner:** switch it on when the owner has paid this work. It's
  all or nothing per work and records today's date. Switch it off to undo.
- **Pay people:** each person shows what they are owed for this work (their work +
  their share of extras), what's paid and what's pending.
  - **Pay** records a payment. The amount starts at the full pending amount;
    lower it to pay part. You can change the date.
  - **Pay all** pays everyone's pending amount, dated today.
  - Each payment is listed under the person. Tap ✕ to undo it.
  - Paying a person covers the people they called (they pay them).
- **Edit** (top right) opens the work form.

**Extras paid to people:** in the work form, each extra has an optional
**Pay to** list. Each person picked gets the extra's amount (Loading ₹100 to
Aswin, Akhil and Alan = ₹300 to collect, ₹100 each to pay). With no one picked,
the extra is only collected from the owner (your own cost, like petrol).
The dropdown offers people already added to this work and recipients already
selected for that extra. You can still type and add a name; unrelated saved
people are not listed automatically.

**Catering screen:**
- The top card shows **Total, Collected, To collect** and **To pay people**.
- **Works** tab: Pending / Paid in one shared bar (starts on Pending), with
  the selected filter highlighted. Pending includes works still to collect
  or still to pay people; Paid means collected and no worker balance left. Each card shows
  its collected and paid status.
  Works are ordered oldest date first (same-date works by creation order).
- **Many works at once:** tap **Select** (or long-press a work), tick works or
  use **Select all**, then:
  - **Collected (n)** marks the ticked works collected today (ones already
    collected are skipped).
  - **Pay ₹X** pays everyone's pending amount in the ticked works, dated today.
  - **Collected & paid** does both with one confirmation: collects uncollected
    works and pays remaining worker balances today. Existing collection dates
    and payments are preserved. Both changes save together or neither saves.
  All actions ask before doing anything. **Done** or the back button leaves select mode.
  Tip: use **Pending**, then **Select all** to settle outstanding works.
- **People** tab: Pending / Paid switch (starts on Pending). Pending shows
  people with any remaining payment balance; Paid shows people with no balance
  left, regardless of collection from the catering. Each person shows what they're owed, paid and
  pending. Tap a person (e.g. when Akhil calls asking for money) to see each
  work they're owed for. Tick works and use **Pay selected**, or tap **Pay** on
  one work to pay part of it.

If you remove a person who already got paid from a work, the app asks first;
saving deletes those payment records.

### Payment report

Open the catering → **Report**. It opens on **Both** (summary + work details),
**To collect** works, **All time**, Table view, with every field shown. Tap the
options icon in the header to change:
- **Payment summary:** named people grouped across works, and called workers
  combined as **Boys**, with quantities and rate breakdowns.
- **Work details:** a separate section for every work, oldest first, with date,
  place, session, people, **Boys (caller name)**, extras and the work total.
- **Both:** summary followed by details, with one grand total (no double counting).

Choose **All / Pending / To collect / To pay** and **All time / This month /
Last month / Custom** work dates. Separate jobs on the same date stay separate.
All report controls are selection-only dropdowns: tap anywhere in the field
to open it, without typing or a keyboard. **View** chooses **Table view** (default)
or the existing **List view**. Tables scroll sideways for wide reports on a
phone held upright; turn the phone sideways (landscape) and the table columns
widen to fill the screen.
**Show in report** is a multi-select dropdown with all fields selected by default
and a Select all option.
Toggle date, place, session, people/Boys, individual rates and amounts, extras
and recipients, and work/grand totals. Date/place/session affect Work details.
Hidden fields do not remove amounts from the bill. **Apply** saves the current
view choices; **Cancel** or dismiss discards edits. Choices reset to the
defaults above when reopening the report screen. Invalid custom date ranges cannot be applied.

Extras show names, amounts, quantities, and assigned recipients; unassigned
expenses are included too. Setting work stays separate in the summary. All
amounts are full bill amounts for matching works, not outstanding balances.
Shared and saved reports start with a dark header band: the Work & Wallet
logo, "WORK PAYMENT REPORT", the catering name and the chosen options, and
when it was made.

**Share or save the report:** tap the share icon in the report header, pick
**PDF** (best for printing and long reports) or **Image (PNG)** (quick to view
on WhatsApp), then:
- **Share** — opens the phone's share menu (WhatsApp, Drive, email…).
- **Save** — PDFs go to **Downloads/WorkAndWallet**, images to
  **Pictures/WorkAndWallet**. (Phones on Android 9 or older ask for storage
  permission once.)

The file shows exactly what the report screen shows (type, status, dates,
fields), always in light colours: catering name, report type · dates · status,
the date it was made, the tables, and the grand total. PDFs use A4 — upright
for a summary, sideways when work details are included — and continue on more
pages (the table headings appear once, at the start of each table). With
**Both**, the work details always start on a new page after the summary. Files are named like
`NANMA-report-12-Nov-26.pdf`. A very long report can't be made into one image;
use PDF for those.

### Edit / delete
- Tap any work to open it, then **Edit** to change it (including its extras).
  To delete the work, tap the **trash icon** at the top right of the edit
  screen.
- Catering → **pencil icon** → *Delete catering* removes the catering **and
  all its works and extras**.
- Deleting a person or changing their fixed amount does **not** change old
  records. They keep the name and amount they were saved with.

### App icon
The phone's app icon, the logo in the top bar of both tabs (with "Work &
Wallet" and a round ⚙ Settings button) and the logo at the top of every
report (PDF and image) are the Work & Wallet images (chef hat + W +
wallet). The originals are in `assets/branding/`.

### Moving from the old "Work Tracker" app
The new name came with a new Android package, so Work & Wallet installs as a
separate app next to the old one. Move your data once: in **Work Tracker**
→ Settings → Back up data → **Save**; in **Work & Wallet** → Settings →
**Restore from backup** → pick that file (old backups are accepted). When
everything is there, uninstall Work Tracker.

### Backup and restore
- **Settings → Back up data** → **Save** (to `Downloads/WorkAndWallet/`) or
  **Share** (Drive, WhatsApp, email, another phone). The file is called like
  `WorkAndWallet-backup-12-Nov-26-1035.json` and holds all caterings, works,
  people, extras, collections, payments and "This is me". The light/dark
  choice is not in it.
- **Settings → Restore from backup** → choose the file → the app shows what
  is in it (date, number of caterings, works, people) → **Replace**.
  Everything on this phone is **replaced** by the backup (not merged).
- A wrong, damaged or newer-version file is refused and nothing changes. A
  restore is all-or-nothing: if anything goes wrong, your data stays as it was.
- Keep backups somewhere other than the phone (Drive, computer) — a backup in
  Downloads is lost with the phone.

---

### Money (bank accounts) — the Money tab
The app has two tabs at the bottom: **Work** (caterings, as above) and
**Money** (your bank accounts). Amount boxes everywhere add commas while you
type (47,455.54 · 1,00,000) and open the number keyboard.

**Start (once):** Money tab → **Add accounts** (or Settings → **Money**) →
add each bank with its balance on a start date. Tick **This is my salary
account** for the account your salary comes into (only one). In the same
place add your **Savings** (Post office, Mutual fund … with what's already
saved) and **Fixed monthly items** (Bike EMI, Sruthi EMI …).

**Salary month:** a month runs from one salary day to the day before the
next salary, whatever the dates are. It's named after the month it mostly
covers (salary on 30-Oct or 2-Nov → "November"). Spending on salary day
belongs to the new month.

**Every day — + Add:** choose the kind, amount, what for, account, date:
- **Expense** — spending. **Income** — interest, cashback, work money …
- **Savings** — money moved to a savings (Post office …); **Savings
  withdrawal** — taken back out (not income).
- **Will get back** — money given to someone who will repay (amma, Sruthi
  EMI). The person box suggests earlier names; you can type any name.

**Got salary:** tap it when the salary comes. Type the amount (it can
change every month), the date and, if you like, each bank's **real
balance before this salary**. The app shows what your entries add up to;
the difference is saved as **Missing** (bank has less — an entry was
forgotten) or **Extra** (bank has more). The new month starts.

**Money home** shows this month: **salary remaining** (salary + income −
expenses − savings − money given that hasn't come back; red when you spent
older money), Spent, Saved, Given and Repaid, the fixed items not added yet
(**Add** / **Add all**), each account's balance, Will get back and Savings.

**Will get back:** money given lowers the month it was given in. When the
person repays (part or all, back into the same account), tap **Repaid** in
Will get back — that month's salary remaining goes back up, even if the
repayment comes in a later month. What isn't repaid stays in the list.

**Months:** every salary month like your monthly total notes — initial
balance (with salary), income, expenses, savings, given, repaid, Missing /
Extra, monthly salary remaining and total remaining. Open one to see all its
entries (tap to edit or delete) and the real balances (bank icon). Two
round buttons right of **ENTRIES**: **sort** (Newest — the default each
time, Oldest, In first, Out first, Biggest in, Biggest out) and **filter**
(All, Money in, Money out); tap a choice and it applies. A button turns
orange while it's not the default, and a small line under the heading says
what's on. Money in = salary, income, repaid, savings withdrawal; money out
= expenses, savings, will get back. Date sorts group the entries under
dates; the others show the date on each row.

**Money report:** Money home → **Report**. Options: Month summary / Entries /
Both, from–to month, accounts, kinds of entries, savings totals. Share or
save it as **PDF** or **image**, like the catering report.

**Backup** includes all money data.

## 3. Is my data safe?

- All data is stored **only on your phone**, in a SQLite database inside the
  app's private storage. No internet is used.
- It survives closing the app, restarting the phone, and sudden power-off.
  Every save is written to disk before the app continues (SQLite WAL mode with
  `synchronous = FULL`). Multi-step saves (a work with its people) are done
  in a single transaction, so they are all saved or none are.
- **Uninstalling the app or "Clear storage" in Android settings deletes the
  data.** Make a backup regularly (Settings → Back up data, see "Backup and
  restore") and keep it off the phone. Sharing a report as PDF or image is
  not a backup.

---

## 4. Developer setup

Requirements (already on this PC): Node ≥ 22, JDK 17, Android SDK + platform-tools.

```bash
npm install
npm start                # terminal 1: Metro bundler
npm run android          # terminal 2: build and install on phone/emulator
```

Phone: enable **Developer options → USB debugging**, connect by USB, check
with `adb devices`.

Other scripts:

| Script | Purpose |
|---|---|
| `npm run start:reset` | Metro with a clean cache. Run this after editing any `.scss` partial, `babel.config.js` or `scss-transformer.js`. |
| `npm test` | Tests: report, formatting, and every database query on real SQLite |
| `npm run lint` | ESLint |
| `npm run build:apk` | Release APK → `android/app/build/outputs/apk/release/app-release.apk` |

> **Release signing:** the release APK is signed with Work & Wallet's own key,
> `android/app/worktracker-release.keystore`, whose passwords are in
> `android/keystore.properties` (both git-ignored; a copy is in
> `Desktop/WorkTracker-release`). Without `keystore.properties` the release
> APK comes out unsigned. **Keep both files safe and always use this same
> key**: Android refuses an update signed with a different key, and the only
> way out is uninstalling, which deletes the data.
>
> **Moving from the debug build to the release build** (different key): make
> a backup first (Settings → Back up data → Share/Save), uninstall the debug
> app, install `app-release.apk`, then Settings → Restore from backup.

### Install the APK on the phone without a cable
Copy `app-release.apk` to the phone (WhatsApp/Drive/USB), open it, and allow
"install unknown apps".

---

## 5. Technical overview

### Stack
- React Native 0.88 (CLI, New Architecture, Hermes), **JavaScript only**
- `@op-engineering/op-sqlite`: SQLite
- `@react-navigation/native` + `native-stack`: screens;
  `@react-navigation/bottom-tabs` (plain JS): the Work | Money tabs
- `@react-native-community/datetimepicker`: date picker
- `react-native-svg`, `lucide-react-native`, `@mdi/js`: graphics and icons
- `react-native-html-to-pdf`, `react-native-view-shot`, `react-native-share`,
  `react-native-blob-util`: report export (PDF / image, share, save)
- `@react-native-documents/picker`: choosing a backup file to restore
- `sass` + `css-to-react-native-transform`: SCSS styling (see below)

### Folder layout
```
App.js                     re-exports src/app/AppRoot
scss-transformer.js        .scss/.css → React Native style objects (Metro)
babel.config.js            "@/…" import alias for src/
src/
  app/AppRoot.js           providers, database start-up, alert host
  navigation/              routes.js (ROUTES), AppNavigator.js, MainTabs.js
  screens/                 caterings/, works/, people/, report/, settings/,
                           money/ (+ money/report/)
  components/              ui/, form/, sheets/, kit/ (redesign), graphics/, alert/
  data/                    SQLite: db/ (connection, migrations),
                           repositories/, sync/, index.js (public API)
  domain/                  pure logic: lines.js, dues.js, report.js,
                           reportViews.js, earnings.js, workForm.js,
                           backup.js (backup file format + checks),
                           money.js (salary months, balances, will get back,
                           savings), moneyReport.js (money report tables)
  theme/                   ThemeProvider, themes registry, scss/, themes/
  export/                  report PDF templates (catering, money) +
                           export/share/save service
  backup/                  backup file: create / save / share / pick / restore
  utils/format.js          ₹ formatting, dates
__tests__/                 domain, report, form, alert (queue + dialog),
                           dropdown, backup, money and database tests
docs/                      DOCUMENTATION.md, PENDING.md
```
CLAUDE.md has the full rules for each layer.

### Database schema

```
caterings   (id, name, phone, notes, created_at)
people      (id, name, phone, default_rate_amount)   -- default_rate_name unused
works       (id, catering_id → caterings CASCADE, date, place, session, notes)
work_lines  (id, work_id → works CASCADE, person_id → people SET NULL, person_name,
             rate_name, rate_amount, quantity, called_count, called_amount)
extras      (id, work_id → works CASCADE, name, amount)
extra_people(id, extra_id → extras CASCADE, person_id → people SET NULL, person_name)
payments    (id, work_id → works CASCADE, person_id → people SET NULL, person_name,
             amount, paid_at, created_at)
works.collected_at  date the owner paid the work (NULL = to collect)

-- v6, sync-ready (for a future backend)
every table above: uid (permanent random id), updated_at (UTC, set by triggers)
sync_deletions (id, table_name, uid, deleted_at)   -- filled by delete triggers
app_meta       (key, value)                        -- device_id, theme_id,
                                                      theme_mode, myself_uid

-- v7, money (ALL amounts in INTEGER PAISE, ₹1 = 100; sync-ready too)
money_accounts   (id, name, is_salary, opening_balance, opening_date, sort_order)
savings_types    (id, name, opening_amount)
money_fixed_items(id, name, type expense|savings|lend, amount,
                  account_id → money_accounts CASCADE,
                  savings_type_id → savings_types CASCADE, person, active)
money_entries    (id, account_id → money_accounts CASCADE, type salary|income|
                  expense|savings|withdrawal|lend|repayment, amount, date, name,
                  note, for_month YYYY-MM (salary), savings_type_id → RESTRICT,
                  lend_id → money_entries CASCADE (repayment),
                  fixed_item_id → money_fixed_items SET NULL)
money_checks     (id, salary_id → money_entries CASCADE, account_id, actual_balance)
                  -- real bank balance before that salary; Missing / Extra
```

`work_lines` copies the person's name and amounts when saved.
That way old reports never change when you edit your people.

Migration v2 removed the old `rates` and `extra_types` tables (and moved a
person's fixed rate onto the `people` row). Migration v3 added
`called_count` / `called_amount` for people called. Migration v4 moved
extras onto works (old catering-level extras were deleted, at the owner's
choice). Migration v5 added `works.collected_at`, `extra_people` and
`payments`. Payments are matched to people by name within a work, so editing
a work keeps them. Migration v6 made the data sync-ready: permanent `uid`s,
`updated_at` times and a log of deletions, so a future backend can upload
everything already recorded and keep phones in step. Migration v7 added the
money tables (sync-ready from the start). Salary months are not stored:
they are worked out from the salary entries, so editing a date moves entries
to the right month by itself.

Schema changes: append a migration to `MIGRATIONS` in `src/data/db/migrations.js`.
Never edit an old one. The version is stored in `PRAGMA user_version`.

### Styling, themes and alerts
Components get styles from the active theme:

```js
import { useStyles } from '@/theme';
function MyThing() {
  const s = useStyles();
  return <View style={s.card}><Text style={s.btnTextGhost}>Hi</Text></View>;
}
```

- SCSS is compiled at bundle time (`scss-transformer.js`). Each theme × mode
  is one file in `src/theme/themes/` that only changes token values from
  `src/theme/scss/_tokens.scss`. Adding dark mode or a new colour theme =
  one small file + one line in `themes.js` (see `src/theme/README.md`).
- Flat class selectors only; `kebab-case` classes become `camelCase` keys;
  longhand borders.
- All pop-ups use the common alert system (`@/components/alert`): confirm,
  message, error, success, pick-from-list (single or multiple), and optional
  auto-close. Every alert uses the redesigned dialog (`KitAlertCard`): a
  big icon (orange info / question, green success, red error / delete,
  cash for pay / collected), centred title and text, Cancel and the action
  side by side; Export report shows option cards.

---

## 6. Future ideas
See [PENDING.md](PENDING.md) for everything planned for later.
