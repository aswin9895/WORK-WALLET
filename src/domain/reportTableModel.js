/**
 * Report tables as plain data — ONE source for every output:
 * the on-screen tables (ReportTables), the PDF (export/reportHtml) and the
 * image export (ReportExportView). Change rows/columns here only.
 *
 * column: { key, label, size, align }
 *   size  — 'name' | 'qty' | 'wide' | 'date' | 'money' (widths live in the
 *           theme / PDF CSS)
 *   align — 'left' | 'right'
 * row:    { key, cells: { [columnKey]: string } }
 */
import { money, shortDate } from '@/utils/format';

/** "Aswin, Akhil · Unassigned expense" */
export function recipientsText(row) {
  return [
    (row.recipients || []).join(', '),
    row.unassigned ? 'Unassigned expense' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Payment summary: people (+ Boys) then extras. */
export function summaryTable(report, fields) {
  const columns = [
    { key: 'label', label: 'Category', size: 'name', align: 'left' },
    { key: 'quantity', label: 'Qty', size: 'qty', align: 'left' },
  ];
  if (fields.amounts) {
    columns.push(
      { key: 'rate', label: 'Rate / breakdown', size: 'wide', align: 'left' },
      { key: 'amount', label: 'Total', size: 'money', align: 'right' },
    );
  }
  if (fields.extras) {
    columns.push({
      key: 'recipients',
      label: 'Extra recipients',
      size: 'wide',
      align: 'left',
    });
  }
  const source = [
    ...(fields.people ? report.peopleRows : []),
    ...(fields.extras ? report.extraRows : []),
  ];
  const rows = source.map(row => ({
    key: row.key,
    isExtra: !!row.recipients,
    cells: {
      label: row.label,
      quantity: row.quantity,
      rate: row.rate,
      amount: money(row.total),
      recipients: row.recipients ? recipientsText(row) : '',
    },
  }));
  return { columns, rows };
}

/** Work details: one row per work (oldest first, as in the report). */
export function detailsTable(report, fields) {
  const columns = [
    { key: 'number', label: 'Work', size: 'qty', align: 'left' },
  ];
  for (const [key, label, size, align] of [
    ['date', 'Date', 'date', 'left'],
    ['place', 'Place', 'name', 'left'],
    ['session', 'Session', 'date', 'left'],
    ['people', 'People & Boys', 'wide', 'left'],
    ['extras', 'Extras & recipients', 'wide', 'left'],
    ['total', 'Work total', 'money', 'right'],
  ]) {
    if (fields[key]) {
      columns.push({ key, label, size, align });
    }
  }
  const rows = report.details.map((work, index) => ({
    key: String(work.id),
    cells: {
      number: String(index + 1),
      date: shortDate(work.date),
      place: work.place || '',
      session: work.session || '',
      people: work.peopleRows
        .map(
          row =>
            `${row.label} × ${row.quantity}${
              fields.amounts ? ` · ${row.rate} = ${money(row.total)}` : ''
            }`,
        )
        .join('\n\n'),
      extras: work.extraRows
        .map(row => {
          const who = recipientsText(row);
          return `${row.label} × ${row.quantity}${
            fields.amounts ? ` · ${row.rate} = ${money(row.total)}` : ''
          }${who ? `\n${who}` : ''}`;
        })
        .join('\n\n'),
      total: money(work.total),
    },
  }));
  return { columns, rows };
}

/**
 * Everything an export needs, following the screen's report options.
 * type: 'summary' | 'details' | 'both'.
 */
export function reportExportModel(report, options) {
  const { type, fields } = options;
  return {
    summary: type !== 'details' ? summaryTable(report, fields) : null,
    details: type !== 'summary' ? detailsTable(report, fields) : null,
    showTotal: !!fields.total,
    grandTotal: money(report.grandTotal),
    worksCount: report.details.length,
  };
}
