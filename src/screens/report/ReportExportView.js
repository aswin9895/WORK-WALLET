/**
 * The report drawn for "Export as image": same content and layout idea as
 * the PDF template, always LIGHT colours (own ThemeProvider), full width
 * with no scrolling, so react-native-view-shot can capture all of it.
 * ReportScreen renders it off-screen only while an image is being made.
 */
import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { ThemeProvider, useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { detailsTable, summaryTable } from '@/domain/reportTableModel';
import { DetailsTable, SIZE_STYLE, SummaryTable } from './ReportTables';
import ExportHeader from './ExportHeader';

/** Never narrower than this (dp); grows to fit the widest table. */
const MIN_CONTENT_WIDTH = 760;

function naturalWidth(s, model) {
  return model
    ? model.columns.reduce(
        (sum, c) => sum + (s[SIZE_STYLE[c.size]]?.width || 0),
        0,
      )
    : 0;
}

const Content = forwardRef(function Content(
  { report, options, info, model, onLayout },
  ref,
) {
  const s = useStyles();
  const { fields } = options;
  const contentWidth = Math.max(
    MIN_CONTENT_WIDTH,
    naturalWidth(s, model.summary && summaryTable(report, fields)),
    naturalWidth(s, model.details && detailsTable(report, fields)),
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
        eyebrow="Work Payment Report"
        title={info.cateringName || 'Catering'}
        meta={[info.typeLabel, info.periodLabel, info.statusLabel].join(
          '  ·  ',
        )}
        generated={info.generatedLabel}
      />

      {model.summary ? (
        <>
          <FixedText style={s.exportSection}>Payment summary</FixedText>
          <SummaryTable
            report={report}
            fields={fields}
            fitWidth={contentWidth}
          />
        </>
      ) : null}
      {model.details ? (
        <>
          <FixedText style={s.exportSection}>Work details</FixedText>
          <DetailsTable
            report={report}
            fields={fields}
            fitWidth={contentWidth}
          />
        </>
      ) : null}
      {model.showTotal ? (
        <View style={s.exportTotal}>
          <View>
            <FixedText style={s.exportTotalLabel}>Grand total</FixedText>
            <FixedText style={s.exportTotalSub}>
              {model.worksCount} work{model.worksCount === 1 ? '' : 's'} · full
              bill amounts
            </FixedText>
          </View>
          <FixedText style={s.exportTotalAmount}>{model.grandTotal}</FixedText>
        </View>
      ) : null}
      <FixedText style={s.exportFooter}>Created with Work & Wallet</FixedText>
    </View>
  );
});

/** Always light, whatever the app's appearance setting. */
const ReportExportView = forwardRef(function ReportExportView(props, ref) {
  return (
    <ThemeProvider initialMode="light">
      <Content {...props} ref={ref} />
    </ThemeProvider>
  );
});

export default ReportExportView;
