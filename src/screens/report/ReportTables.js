/**
 * Report tables (screen + image export). Rows/columns come from
 * src/domain/reportTableModel.js — the same model the PDF uses.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { FixedText } from '@/components/ui';
import { useStyles } from '@/theme';
import { detailsTable, summaryTable } from '@/domain/reportTableModel';

/** model column size → theme class with its width (_report.scss) */
export const SIZE_STYLE = {
  name: 'reportTableName',
  qty: 'reportTableQty',
  wide: 'reportTableWide',
  date: 'reportTableDate',
  money: 'reportTableMoney',
};

/**
 * Column widths come from the theme. When the table is narrower than the
 * space it has (landscape, tablets) the columns stretch proportionally to
 * fill it; when it's wider (portrait phones) it keeps the theme widths and
 * scrolls sideways.
 */
export function stretchedWidths(columnWidths, available) {
  const natural = columnWidths.reduce((sum, w) => sum + w, 0);
  if (!natural || !available || available <= natural) {
    return columnWidths;
  }
  const scale = available / natural;
  return columnWidths.map(w => Math.floor(w * scale));
}

/**
 * fitWidth (export): draw the whole table at this width, no scrolling,
 * columns stretched to fill it (used by the image export).
 */
function Table({ model, fitWidth }) {
  const s = useStyles();
  const [available, setAvailable] = useState(0);
  const { columns, rows } = model;
  if (!rows.length) {
    return (
      <FixedText style={s.reportCaption}>
        No visible rows. Choose fields in Report options.
      </FixedText>
    );
  }
  const styleOf = c => s[SIZE_STYLE[c.size]];
  const widths = stretchedWidths(
    columns.map(c => styleOf(c)?.width || 0),
    fitWidth || available,
  );
  // only set a width when it differs from the theme width (i.e. stretched)
  const cellWidth = i =>
    widths[i] !== (styleOf(columns[i])?.width || 0)
      ? { width: widths[i] }
      : null;
  const body = (
    <View>
      <View style={s.reportTableHead}>
        {columns.map((c, i) => (
          <FixedText
            key={c.key}
            style={[
              s.reportTableCell,
              styleOf(c),
              cellWidth(i),
              s.reportTableHeadText,
            ]}
          >
            {c.label}
          </FixedText>
        ))}
      </View>
      {rows.map(row => (
        <View key={row.key} style={s.reportTableRow}>
          {columns.map((c, i) => (
            <FixedText
              key={c.key}
              style={[s.reportTableCell, styleOf(c), cellWidth(i)]}
            >
              {row.cells[c.key] || '—'}
            </FixedText>
          ))}
        </View>
      ))}
    </View>
  );
  if (fitWidth) {
    return <View style={s.reportTableScroll}>{body}</View>;
  }
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      style={s.reportTableScroll}
      onLayout={e => setAvailable(Math.floor(e.nativeEvent.layout.width))}
    >
      {body}
    </ScrollView>
  );
}

export function SummaryTable({ report, fields, fitWidth }) {
  return <Table model={summaryTable(report, fields)} fitWidth={fitWidth} />;
}

export function DetailsTable({ report, fields, fitWidth }) {
  return <Table model={detailsTable(report, fields)} fitWidth={fitWidth} />;
}

/** The table component itself (also used by the money report). */
export { Table as ReportTable };
