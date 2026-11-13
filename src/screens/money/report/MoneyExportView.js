/**
 * The money report drawn for "Export as image": same content as the PDF,
 * always LIGHT colours (own ThemeProvider), full width, no scrolling, so
 * react-native-view-shot can capture it. Rendered off-screen only while an
 * image is being made (MoneyReportScreen).
 */
import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { ThemeProvider, useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { periodDates } from '@/domain/money';
import { ReportTable, SIZE_STYLE } from '@/screens/report/ReportTables';
import ExportHeader from '@/screens/report/ExportHeader';

/** Never narrower than this (dp); grows to fit the widest table. */
const MIN_CONTENT_WIDTH = 720;

function naturalWidth(s, model) {
  return model
    ? model.columns.reduce(
        (sum, c) => sum + (s[SIZE_STYLE[c.size]]?.width || 0),
        0,
      )
    : 0;
}

const Content = forwardRef(function Content({ report, info, onLayout }, ref) {
  const s = useStyles();
  const contentWidth = Math.max(
    MIN_CONTENT_WIDTH,
    ...report.months.map(m =>
      Math.max(naturalWidth(s, m.summary), naturalWidth(s, m.entries)),
    ),
    naturalWidth(s, report.savings),
  );
  const pad = s.exportView?.paddingLeft || 0;
  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={e => onLayout?.(e.nativeEvent.layout)}
      style={[s.exportView, { width: contentWidth + pad * 2 }]}
    >
      <ExportHeader
        eyebrow="Money report"
        title="Work & Wallet"
        meta={[info.typeLabel, info.periodLabel, info.accountsLabel]
          .filter(Boolean)
          .join('  ·  ')}
        generated={info.generatedLabel}
      />
      {report.months.map(m => (
        <View key={m.key}>
          <FixedText style={s.exportSection}>{m.label}</FixedText>
          <FixedText style={s.exportMeta}>{periodDates(m.period)}</FixedText>
          {m.summary ? (
            <ReportTable model={m.summary} fitWidth={contentWidth} />
          ) : null}
          {m.entries ? (
            m.entries.rows.length ? (
              <ReportTable model={m.entries} fitWidth={contentWidth} />
            ) : (
              <FixedText style={s.exportMeta}>No entries.</FixedText>
            )
          ) : null}
        </View>
      ))}
      {report.savings ? (
        <>
          <FixedText style={s.exportSection}>Savings totals</FixedText>
          <ReportTable model={report.savings} fitWidth={contentWidth} />
        </>
      ) : null}
      <FixedText style={s.exportFooter}>Created with Work & Wallet</FixedText>
    </View>
  );
});

/** Always light, whatever the app's appearance setting. */
const MoneyExportView = forwardRef(function MoneyExportView(props, ref) {
  return (
    <ThemeProvider initialMode="light">
      <Content {...props} ref={ref} />
    </ThemeProvider>
  );
});

export default MoneyExportView;
