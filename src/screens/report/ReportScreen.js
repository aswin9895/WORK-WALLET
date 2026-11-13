import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Share2, SlidersHorizontal } from 'lucide-react-native';
import { mdiFilePdfBox, mdiImage, mdiTrayArrowDown } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { ScreenHeader } from '@/components/kit';
import { getCatering, getReportWorks } from '@/data';
import { buildReportViews } from '@/domain/reportViews';
import { earningsDateRange } from '@/domain/earnings';
import { dayMonthYear, money, shortDate, todayIso } from '@/utils/format';
import { reportExportModel } from '@/domain/reportTableModel';
import {
  createReportImage,
  createReportPdf,
  exportFileBase,
  saveExport,
  shareExport,
} from '@/export/reportExport';
import {
  showAlert,
  showError,
  showMessage,
  showSuccess,
} from '@/components/alert';
import { SummaryTable, DetailsTable } from './ReportTables';
import ReportExportView from './ReportExportView';
import ReportOptionsSheet, {
  DEFAULT_REPORT_OPTIONS,
  REPORT_TYPES,
  REPORT_STATUSES,
} from './ReportOptionsSheet';

/** "12-Nov-26, 10:35" */
function generatedLabel(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${dayMonthYear(todayIso())}, ${pad(now.getHours())}:${pad(
    now.getMinutes(),
  )}`;
}

/** Waits this long for the off-screen image view to lay out. */
const IMAGE_LAYOUT_TIMEOUT_MS = 6000;

function Rows({ rows, amounts, extras = false }) {
  const s = useStyles();
  return rows.map(row => (
    <View key={row.key} style={s.reportEntry}>
      <View style={s.reportEntryTop}>
        <FixedText style={s.reportEntryName}>{row.label}</FixedText>
        {amounts ? (
          <FixedText style={s.reportEntryAmount}>{money(row.total)}</FixedText>
        ) : null}
      </View>
      <FixedText style={s.reportEntryMeta}>
        Qty {row.quantity}
        {amounts ? ` · ${row.rate}` : ''}
      </FixedText>
      {extras ? (
        <FixedText style={s.reportEntryMeta}>
          {row.recipients.length
            ? `Pay to: ${row.recipients.join(', ')}`
            : 'No assigned person'}
          {row.unassigned && row.recipients.length
            ? ' · Includes unassigned expenses'
            : ''}
        </FixedText>
      ) : null}
    </View>
  ));
}

export default function ReportScreen({ route, navigation }) {
  const s = useStyles();
  const { cateringId } = route.params;
  const insets = useSafeAreaInsets();
  const [options, setOptions] = useState(() => ({
    ...DEFAULT_REPORT_OPTIONS,
    fields: { ...DEFAULT_REPORT_OPTIONS.fields },
    from: todayIso(),
    to: todayIso(),
  }));
  const [optionsOpen, setOptionsOpen] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  // export (PDF / image): busy label, and the off-screen image view
  const [busy, setBusy] = useState(null);
  const [imageView, setImageView] = useState(false);
  const exportViewRef = useRef(null);
  const layoutWaiter = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [from, to] = earningsDateRange(options.range, options.from, options.to);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setData(null);
      setError(null);
      Promise.all([
        getCatering(cateringId),
        getReportWorks(cateringId, from, to, options.status),
      ])
        .then(([catering, works]) => {
          if (active) {
            setData({ catering, works });
          }
        })
        .catch(e => {
          if (active) {
            setError(e.message || 'Could not load report');
          }
        });
      return () => {
        active = false;
      };
    }, [cateringId, from, to, options.status]),
  );
  const report = useMemo(
    () => (data ? buildReportViews(data.works) : null),
    [data],
  );
  const { fields } = options;
  const period =
    from && to ? `${shortDate(from)} – ${shortDate(to)}` : 'All time';
  const typeLabel = REPORT_TYPES.find(t => t.value === options.type).label;
  const statusLabel = REPORT_STATUSES.find(
    t => t.value === options.status,
  ).label;

  /** Render the image view off-screen and resolve with its measured size. */
  const waitForImageLayout = () =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        layoutWaiter.current = null;
        reject(new Error('The report image could not be prepared.'));
      }, IMAGE_LAYOUT_TIMEOUT_MS);
      layoutWaiter.current = layout => {
        clearTimeout(timer);
        layoutWaiter.current = null;
        // two frames so fonts and borders are drawn before capturing
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(layout)),
        );
      };
      setImageView(true);
    });

  const startExport = async () => {
    if (busy) {
      return;
    }
    if (!report || !report.details.length) {
      return showMessage('There is nothing to export for these options.', {
        title: 'Nothing to export',
      });
    }
    const choice = await showAlert({
      layout: 'header',
      iconPath: mdiTrayArrowDown,
      title: 'Export report',
      subtitle: `${typeLabel} · ${period} · ${statusLabel}`,
      optionsTitle: 'Export format',
      options: [
        {
          value: 'pdf',
          label: 'PDF',
          description: 'Best for printing and long reports',
          iconPath: mdiFilePdfBox,
          tone: 'red',
        },
        {
          value: 'image',
          label: 'Image (PNG)',
          description: 'Quick to view',
          iconPath: mdiImage,
          tone: 'blue',
        },
      ],
      selected: ['pdf'],
      requireSelection: true,
      buttons: [
        { text: 'Cancel', value: null, style: 'cancel' },
        { text: 'Save', value: 'save', style: 'default' },
        {
          text: 'Share',
          value: 'share',
          style: 'primary',
          Icon: Share2,
          wide: true,
        },
      ],
    });
    const action = choice.value;
    const format = choice.selected?.[0];
    if (!action || !format) {
      return;
    }
    const model = reportExportModel(report, options);
    const info = {
      cateringName: data?.catering?.name,
      type: options.type,
      typeLabel,
      periodLabel: period,
      statusLabel,
      generatedLabel: generatedLabel(),
    };
    const fileBase = exportFileBase(
      data?.catering?.name,
      dayMonthYear(todayIso()),
    );
    try {
      let file;
      if (format === 'pdf') {
        setBusy('Preparing PDF…');
        file = await createReportPdf(model, info, fileBase);
      } else {
        setBusy('Preparing image…');
        const layout = await waitForImageLayout();
        file = await createReportImage(exportViewRef, layout, fileBase);
      }
      setImageView(false);
      setBusy(null);
      if (action === 'share') {
        await shareExport(file);
      } else {
        const where = await saveExport(file);
        await showSuccess(`Saved to ${where}`, { title: 'Saved' });
      }
    } catch (e) {
      showError(e);
    } finally {
      setImageView(false);
      setBusy(null);
    }
  };
  return (
    <SafeAreaView style={s.kitScreen} edges={['bottom']}>
      <ScreenHeader
        title="Reports"
        onBack={() => navigation.goBack()}
        actions={[
          { Icon: Share2, label: 'Share or save report', onPress: startExport },
        ]}
        ActionIcon={SlidersHorizontal}
        actionLabel="Report options"
        onAction={() => setOptionsOpen(true)}
      />
      {/* in landscape keep content clear of the camera cutout / nav bar */}
      <ScrollView
        contentContainerStyle={[
          s.reportContent,
          {
            paddingLeft: (s.reportContent?.paddingLeft || 0) + insets.left,
            paddingRight: (s.reportContent?.paddingRight || 0) + insets.right,
          },
        ]}
      >
        <FixedText style={s.reportTitle}>
          {data?.catering?.name || 'Work report'}
        </FixedText>
        {/* one line: "Both · All time · To collect" */}
        <FixedText style={s.reportCaption}>
          {[typeLabel, period, statusLabel].join(' · ')}
        </FixedText>
        {error ? (
          <FixedText style={s.errorText}>{error}</FixedText>
        ) : !report ? (
          <ActivityIndicator />
        ) : !report.details.length ? (
          <FixedText style={s.reportEmpty}>
            No works match this status and period.
          </FixedText>
        ) : (
          <>
            {options.type !== 'details' ? (
              <View style={s.reportPanel}>
                <FixedText style={s.reportSectionTitle}>
                  Payment summary
                </FixedText>
                {options.layout === 'table' ? (
                  <SummaryTable report={report} fields={fields} />
                ) : (
                  <>
                    {fields.people ? (
                      <Rows rows={report.peopleRows} amounts={fields.amounts} />
                    ) : null}
                    {fields.extras && report.extraRows.length ? (
                      <>
                        <FixedText style={s.reportSectionLabel}>
                          Extras
                        </FixedText>
                        <Rows
                          rows={report.extraRows}
                          amounts={fields.amounts}
                          extras
                        />
                      </>
                    ) : null}
                  </>
                )}
              </View>
            ) : null}
            {options.type !== 'summary' ? (
              <>
                <FixedText style={s.reportSectionLabel}>Work details</FixedText>
                {options.layout === 'table' ? (
                  <View style={s.reportPanel}>
                    <DetailsTable report={report} fields={fields} />
                  </View>
                ) : (
                  report.details.map((work, index) => (
                    <View key={work.id} style={s.reportPanel}>
                      <FixedText style={s.reportSectionTitle}>
                        {fields.date
                          ? shortDate(work.date)
                          : `Work ${index + 1}`}
                      </FixedText>
                      {fields.place ? (
                        <FixedText style={s.reportCaption}>
                          Place: {work.place || '—'}
                        </FixedText>
                      ) : null}
                      {fields.session ? (
                        <FixedText style={s.reportCaption}>
                          Session: {work.session || '—'}
                        </FixedText>
                      ) : null}
                      {fields.people ? (
                        <>
                          <Rows
                            rows={work.peopleRows}
                            amounts={fields.amounts}
                          />
                          {!work.peopleRows.length ? (
                            <FixedText style={s.reportCaption}>
                              No people recorded
                            </FixedText>
                          ) : null}
                        </>
                      ) : null}
                      {fields.extras && work.extraRows.length ? (
                        <>
                          <FixedText style={s.reportSectionLabel}>
                            Extras
                          </FixedText>
                          <Rows
                            rows={work.extraRows}
                            amounts={fields.amounts}
                            extras
                          />
                        </>
                      ) : null}
                      {fields.total ? (
                        <View style={s.reportTotalRow}>
                          <FixedText style={s.reportTotalLabel}>
                            Work total
                          </FixedText>
                          <FixedText style={s.reportTotalAmount}>
                            {money(work.total)}
                          </FixedText>
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </>
            ) : null}
            {fields.total ? (
              <View style={s.reportPanel}>
                <View style={s.reportEntryTop}>
                  <FixedText style={s.reportTotalLabel}>Grand total</FixedText>
                  <FixedText style={s.reportTotalAmount}>
                    {money(report.grandTotal)}
                  </FixedText>
                </View>
                <FixedText style={s.reportCaption}>
                  {report.details.length} works · Full bill amounts
                </FixedText>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      {/* image export: drawn just off the right edge, then captured */}
      {imageView && report ? (
        <View
          pointerEvents="none"
          style={[s.exportHost, { left: windowWidth + 40 }]}
        >
          <ReportExportView
            ref={exportViewRef}
            report={report}
            options={options}
            model={reportExportModel(report, options)}
            info={{
              cateringName: data?.catering?.name,
              typeLabel,
              periodLabel: period,
              statusLabel,
              generatedLabel: generatedLabel(),
            }}
            onLayout={layout => layoutWaiter.current?.(layout)}
          />
        </View>
      ) : null}
      {busy ? (
        <View style={s.reportBusy}>
          <View style={s.reportBusyCard}>
            <ActivityIndicator />
            <FixedText style={s.reportBusyText}>{busy}</FixedText>
          </View>
        </View>
      ) : null}
      {optionsOpen ? (
        <ReportOptionsSheet
          value={options}
          onClose={() => setOptionsOpen(false)}
          onApply={value => {
            setOptions(value);
            setOptionsOpen(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
