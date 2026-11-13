/**
 * PDF template: turns the report export model (domain/reportTableModel)
 * into a self-contained HTML page for react-native-html-to-pdf.
 *
 * Pure function (no React / native) — unit-tested.
 * - All user text is HTML-escaped.
 * - Colours come from the theme (`colors`, read from the light theme's
 *   .pal-export-* classes) — no literals here.
 * - Poppins is loaded from the app's Android assets (baseURL
 *   file:///android_asset/), falling back to sans-serif.
 * - With both sections, Work details start on a new page.
 * - Table headings appear once, at the start of each table — NOT repeated
 *   on following pages (owner's choice). Rows never split across pages.
 */

import { APP_LOGO_DATA_URI } from './logoData';

/** Escape text for HTML. Newlines become <br>. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

/** Relative column widths (sizes from the table model). */
const SIZE_WEIGHT = { name: 17, qty: 6, wide: 24, date: 11, money: 12 };

/** Page orientation: work details tables are wide → landscape. */
export function pageOrientation(type) {
  return type === 'summary' ? 'portrait' : 'landscape';
}

/** A4 in PDF points (1/72 inch). */
export function pageSize(type) {
  return pageOrientation(type) === 'portrait'
    ? { width: 595, height: 842 }
    : { width: 842, height: 595 };
}

/** One table as HTML (also used by the money report). */
export function tableHtml(model, { extrasHeading = false } = {}) {
  if (!model.rows.length) {
    return '<p class="muted">No visible rows for the chosen fields.</p>';
  }
  const total = model.columns.reduce(
    (sum, c) => sum + (SIZE_WEIGHT[c.size] || 10),
    0,
  );
  const cols = model.columns
    .map(
      c =>
        `<col style="width:${(
          ((SIZE_WEIGHT[c.size] || 10) * 100) /
          total
        ).toFixed(2)}%">`,
    )
    .join('');
  const head = model.columns
    .map(c => `<th class="${c.align}">${escapeHtml(c.label)}</th>`)
    .join('');
  let extrasStarted = false;
  const body = model.rows
    .map(row => {
      let sub = '';
      if (extrasHeading && row.isExtra && !extrasStarted) {
        extrasStarted = true;
        sub = `<tr class="sub"><td colspan="${model.columns.length}">Extras</td></tr>`;
      }
      const cells = model.columns
        .map(
          c =>
            `<td class="${c.align}">${escapeHtml(
              row.cells[c.key] || '—',
            )}</td>`,
        )
        .join('');
      return `${sub}<tr>${cells}</tr>`;
    })
    .join('');
  return `<table><colgroup>${cols}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/**
 * The report CSS (A4 page, fonts, tables, total box). `c` = colors as in
 * buildReportHtml. Shared with the money report (export/moneyReportHtml).
 */
export function reportCss(c, orientation) {
  return `
  @font-face { font-family: 'Poppins'; font-weight: 400;
    src: url('fonts/Poppins-Regular.ttf'); }
  @font-face { font-family: 'Poppins'; font-weight: 500;
    src: url('fonts/Poppins-Medium.ttf'); }
  @font-face { font-family: 'Poppins'; font-weight: 600;
    src: url('fonts/Poppins-SemiBold.ttf'); }
  @font-face { font-family: 'Poppins'; font-weight: 700;
    src: url('fonts/Poppins-Bold.ttf'); }
  @page { size: A4 ${orientation}; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${c.page}; }
  body { font-family: 'Poppins', sans-serif; color: ${c.text};
    font-size: 10.5pt; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* header band: dark like the app icon so the white logo reads */
  .head { display: flex; align-items: center; gap: 16px;
    padding: 14px 20px 14px 16px; border-radius: 14px;
    background: ${c.bannerBg}; border-bottom: 4px solid ${c.accent};
    page-break-inside: avoid; }
  .logo { height: 54px; width: auto; flex: none; display: block; }
  .head-text { flex: 1; min-width: 0; }
  .eyebrow { color: ${c.bannerAccent}; font-weight: 600; font-size: 9.5pt;
    letter-spacing: 1.5px; text-transform: uppercase; }
  h1 { margin: 2px 0 0; font-size: 22pt; font-weight: 700; line-height: 1.2;
    color: ${c.bannerText}; }
  .meta { color: ${c.bannerMuted}; margin-top: 2px; }
  .generated { color: ${c.bannerMuted}; font-size: 9pt; text-align: right;
    white-space: nowrap; }
  h2 { font-size: 13pt; font-weight: 700; margin: 22px 0 8px;
    padding-left: 9px; border-left: 4px solid ${c.accent};
    page-break-after: avoid; }
  h2.new-page { page-break-before: always; break-before: page;
    margin-top: 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed;
    border: 1px solid ${c.border}; }
  /* print repeats <thead> on every page by default; owner wants it once */
  thead { display: table-row-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th { background: ${c.headBg}; color: ${c.accentDark}; font-weight: 600;
    font-size: 9pt; text-transform: uppercase; letter-spacing: 0.4px;
    text-align: left; padding: 8px; border-bottom: 1px solid ${c.border}; }
  td { padding: 8px; vertical-align: top; border-bottom: 1px solid ${c.border};
    word-wrap: break-word; overflow-wrap: anywhere; }
  tbody tr:nth-child(even) td { background: ${c.zebra}; }
  tr.sub td { background: ${c.page}; color: ${c.accentDark};
    font-weight: 600; font-size: 9pt; text-transform: uppercase;
    letter-spacing: 0.8px; padding-top: 12px; }
  .right { text-align: right; font-weight: 600; white-space: nowrap; }
  .muted { color: ${c.muted}; font-size: 9pt; }
  .total { display: flex; justify-content: space-between; align-items: center;
    margin-top: 20px; padding: 14px 18px; border: 1.5px solid ${c.accent};
    border-radius: 12px; background: ${c.totalBg};
    page-break-inside: avoid; }
  .total-label { font-size: 13pt; font-weight: 700; }
  .total-amount { font-size: 20pt; font-weight: 700; color: ${c.accentDark}; }
  .footer { margin-top: 18px; text-align: center; color: ${c.muted};
    font-size: 8.5pt; }
`;
}

/**
 * The report header band (catering and money reports): logo (embedded as a
 * data URI — logoData.js — so it needs no file and is there before the page
 * is printed) + label + title + meta,
 * "Generated …" on the right. All text is escaped here, except `metaHtml`
 * which the caller builds from escaped parts.
 */
export function reportHeaderHtml({ eyebrow, title, metaHtml, generatedLabel }) {
  return `<div class="head">
    <img class="logo" src="${APP_LOGO_DATA_URI}" alt="">
    <div class="head-text">
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">${metaHtml}</div>
    </div>
    <div class="generated">Generated<br>${escapeHtml(generatedLabel)}</div>
  </div>`;
}

/**
 * @param model   reportExportModel(...) result
 * @param info    { cateringName, typeLabel, periodLabel, statusLabel,
 *                  generatedLabel, type }
 * @param colors  { page, text, muted, accent, accentDark, headBg, zebra,
 *                  border, totalBg, bannerBg, bannerText, bannerMuted,
 *                  bannerAccent } (exportColors())
 */
export function buildReportHtml(model, info, colors) {
  const c = colors;
  const orientation = pageOrientation(info.type);
  const meta = [info.typeLabel, info.periodLabel, info.statusLabel]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' &nbsp;·&nbsp; ');

  const sections = [];
  if (model.summary) {
    sections.push(
      `<h2>Payment summary</h2>${tableHtml(model.summary, {
        extrasHeading: true,
      })}`,
    );
  }
  if (model.details) {
    // Both: Work details always start on a fresh page (owner's choice)
    const heading = model.summary
      ? '<h2 class="new-page">Work details</h2>'
      : '<h2>Work details</h2>';
    sections.push(`${heading}${tableHtml(model.details)}`);
  }
  const total = model.showTotal
    ? `<div class="total">
        <div>
          <div class="total-label">Grand total</div>
          <div class="muted">${model.worksCount} work${
        model.worksCount === 1 ? '' : 's'
      } · full bill amounts</div>
        </div>
        <div class="total-amount">${escapeHtml(model.grandTotal)}</div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>${reportCss(c, orientation)}</style></head>
<body>
  ${reportHeaderHtml({
    eyebrow: 'Work Payment Report',
    title: info.cateringName || 'Catering',
    metaHtml: meta,
    generatedLabel: info.generatedLabel,
  })}
  ${sections.join('\n')}
  ${total}
  <div class="footer">Created with Work &amp; Wallet</div>
</body></html>`;
}
