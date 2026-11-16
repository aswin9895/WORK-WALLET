# Pending / Planned for later

Things the owner wants later. Not built yet. Ask the owner before starting
one; details may have changed.

## Planned features

- [ ] **Backend sync (build LAST, owner's choice):** (update
      `docs/privacy-policy.html` before releasing it) data is sync-ready (uid,
      updated_at, sync_deletions, device_id). Still to build: the server,
      login, upload/download using `getChangesSince`, and translating local
      ids ↔ uids.

## Every new release (production)

- [ ] For each new APK: raise `versionCode` (+ `versionName`) in
      `android/app/build.gradle`, build with `npm run build:apk` (same
      signing key), and follow "Production rules (no data loss)" in
      CLAUDE.md.
- [ ] Before each release: update any Play Console parts listed here by the
      changes in it (Data safety, content rating, permissions, privacy policy,
      store listing). None needed so far.

## Open setup tasks

- [ ] **Move to the final app:** the package is now
      `com.fresherfindings.workandwallet` (`com.workandwallet.app` was taken on the Play Store), so
      it installs as a NEW app next to the old ones (Work Tracker
      `com.worktracker`, Work & Wallet `com.workandwallet.app`). Back up in
      the app that has your data, restore in the new one, then uninstall the
      old apps.

## Done (moved out of this list)

- Top Money card Spent includes expenses, savings and unpaid loans from the
  selected salary period; repayments reduce their original loan period.
  Savings withdrawals and repayments of older loans do not reduce it.

- Money home top card: account filter beside the month, salary account by default;
  scoped period totals and account balances, with matching month navigation.

- Privacy policy page `docs/privacy-policy.html` for the Play Store
  (developer Aswin Saseendran, contact Gmail). Owner hosts it on GitHub Pages.

- **Production:** CLAUDE.md switched to production mode — migrations v1–v7
  frozen, no-data-loss rules, same key + higher versionCode for every APK.
  Package name `com.fresherfindings.workandwallet` is final.
- Version control: git repo github.com/aswin9895/WORK-WALLET (first commit
  done; signing key and its passwords stay git-ignored).

- Settings in the top bar is a round gear button only; the Money tab's top
  bar shows "Work & Wallet" + logo; reports (PDF + image) have a dark header
  band with the logo (PDF logo embedded in the page; checked on the phone).

- App icon (launcher, adaptive) and the in-app logo in the Work tab's top
  bar, from the owner's Icon.png / InApp.png (originals in assets/branding).

- Renamed to **Work & Wallet**: app name, package `com.fresherfindings.workandwallet` (first tried
  `com.workandwallet.app` — taken on the Play Store),
  file / folder names (Downloads/WorkAndWallet, WorkAndWallet-backup-…json),
  PDF / image footer. Old "WorkTracker" backups still restore. The signing
  key file keeps its name.

- Month statement: sort (Newest default, Oldest, In / Out first, Biggest in /
  out) and filter (All / Money in / Money out) as two icon buttons right of
  ENTRIES; pick-and-go popups (alert `closeOnSelect`).

- Money tab (owner's bank notes in the app): accounts (one salary account),
  salary months from salary day to salary day, expenses / income / savings /
  withdrawals / will get back with part repayments, Got salary with real bank
  balances (Missing / Extra), fixed monthly items (one-tap add), months list,
  money report (summary / entries / both, PDF / image), backup includes it.
  Will get back lowers its month's salary remaining until repaid.
- Bottom tabs Work | Money (owner's mockup); amount boxes add commas while
  typing and use the number keyboard (money and catering).
- Owner tested the whole Money part on the phone.

- Release signing key created with the owner's details (alias
  `personalTracker`, Fresher Findings, Kerala, valid until 2054):
  `android/app/worktracker-release.keystore` + `android/keystore.properties`,
  git-ignored, copy in `Desktop/WorkTracker-release`. No release APK built
  yet (owner builds with `npm run build:apk` when wanted).

- Owner tested all features up to here.
- Dropped by the owner (not wanted now): redesign of the remaining old
  screens (current look is fine), PDF page numbers / page subtotals, logo,
  splitting long images, using auto-close alerts, search / filters.

- All alerts redesigned (owner's mockups): icon on a blob, centred text,
  Cancel | action side by side; colours/icons by type (info orange, success
  green, error / delete red, pay / collected cash icon). Export report uses
  option cards.

- Backup / restore in Settings: one JSON file (Save to Downloads or Share);
  restore replaces everything in one transaction, after a confirm with the
  backup's counts. Work data + "This is me", no theme. No reminders and no
  automatic backups (owner's choice).

- Report export: PDF or image, Share or Save (Downloads / Pictures), following
  the report options; light template, catering details only.
- Report opens on Both + To collect by default; report tables fill the screen
  in landscape (portrait keeps sideways scrolling).
- Report dropdowns open by tapping anywhere in the field; no typing/keyboard.
- Report options use dropdowns and a multi-select field picker (default all).
  Table view is the default; the existing List view is also available.
- Catering Works list oldest first; people counts include called workers.
- Extras recipient dropdown limited to work participants and existing selections,
  with typed names still supported. New/edit work warns before discarding changes.
- Configurable report screen: Payment summary / Work details / Both, work-date
  and status filters, optional fields, Boys combined in summary and by caller
  in details, extras with recipients. PDF/share remains planned for later.
- Home earnings filters moved into a bottom sheet opened by the card's filter icon;
  This is me option has no description.
- Personal Home earnings: This is me in People; Myself / All / Only people and
  payment-date filters, default Myself + All time. Top card uses actual payments
  including assigned extras; other cards unchanged. Called workers blocked for myself.
- Bulk actions: Collected, Pay, and Collected & paid (atomic combined settlement).
- Catering People tab has its own Pending / Paid switch based on worker balances.
- Works list uses Pending / Paid in a shared background with a selected background.
  Paid requires collection and all worker payments settled; Pending is the default.
- Report filters: All / Pending / To collect / To pay combined with date ranges.
  Reports include full bill amounts for the matching works.
- Bulk "mark collected" / "pay" for several works from the catering works list.
- Home screen redesign (light + dark), dark mode, System/Light/Dark setting.
- Settings screen redesign (light + dark) + shared redesign kit.
- People screen + Add/Edit person sheet redesign; light is the default mode.
- New / Edit Catering as a floating form card (old screen removed).
- Catering detail screen redesign.
- New / Edit Work redesign (second mockup).
