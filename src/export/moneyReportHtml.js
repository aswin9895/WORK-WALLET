/**
 * Money report PDF template (pure, unit-tested). Same look as the catering
 * report: reuses its CSS and table renderer (export/reportHtml). A4
 * portrait. All user text is HTML-escaped (tableHtml / escapeHtml).
 *
 *   report = buildMoneyReport(...) (domain/moneyReport)
 *   info   = { typeLabel, periodLabel, accountsLabel, generatedLabel }
 *   colors = exportColors() (light theme .pal-export-*)
 */
import {
  escapeHtml,
  reportCss,
  reportHeaderHtml,
  tableHtml,
} from './reportHtml';
import { periodDates } from '@/domain/money';

export function buildMoneyReportHtml(report, info, colors) {
  const c = colors;
  const meta = [info.typeLabel, info.periodLabel, info.accountsLabel]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' &nbsp;·&nbsp; ');
  const sections = report.months.map(m => {
    const parts = [
      `<h2>${escapeHtml(m.label)}</h2>`,
      `<div class="muted month-dates">${escapeHtml(periodDates(m.period))}</div>`,
    ];
    if (m.summary) {
      parts.push(`<div class="sub-title">Summary</div>${tableHtml(m.summary)}`);
    }
    if (m.entries) {
      parts.push(
        `<div class="sub-title">Entries (${m.entries.rows.length})</div>${
          m.entries.rows.length
            ? tableHtml(m.entries)
            : '<p class="muted">No entries.</p>'
        }`,
      );
    }
    return parts.join('\n');
  });
  if (report.savings) {
    sections.push(
      `<h2>Savings totals</h2>${tableHtml(report.savings)}`,
    );
  }
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>${reportCss(c, 'portrait')}
  .sub-title { color: ${c.accentDark}; font-weight: 600; font-size: 10pt;
    text-transform: uppercase; letter-spacing: 0.6px; margin: 12px 0 6px; }
  .month-dates { margin-top: -4px; }
</style></head>
<body>
  ${reportHeaderHtml({
    eyebrow: 'Money report',
    title: 'Work & Wallet',
    metaHtml: meta,
    generatedLabel: info.generatedLabel,
  })}
  ${sections.length ? sections.join('\n') : '<p class="muted">Nothing to show for these options.</p>'}
  <div class="footer">Created with Work &amp; Wallet</div>
</body></html>`;
}
