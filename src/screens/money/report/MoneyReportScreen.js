/**
 * Money report: month summaries (like the owner's monthly total notes)
 * and / or every entry, for chosen salary months, accounts and kinds;
 * optional savings totals. Header: share (PDF / image → Share / Save) and
 * options. Options start as: this salary month, Both, everything.
 */
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, SlidersHorizontal } from 'lucide-react-native';
import { mdiFilePdfBox, mdiImage, mdiTrayArrowDown } from '@mdi/js';
import { useStyles } from '@/theme';
import { FixedText } from '@/components/ui';
import { BusyOverlay, ScreenHeader } from '@/components/kit';
import { showAlert, showError, showMessage, showSuccess } from '@/components/alert';
import { periodDates } from '@/domain/money';
import {
  buildMoneyReport,
  defaultMoneyReportOptions,
  MONEY_REPORT_TYPES,
  moneyReportPeriodLabel,
} from '@/domain/moneyReport';
import { buildMoneyReportHtml } from '@/export/moneyReportHtml';
import {
  createHtmlPdf,
  createReportImage,
  exportColors,
  exportFileBase,
  saveExport,
  shareExport,
} from '@/export/reportExport';
import { dayMonthYear, todayIso } from '@/utils/format';
import { ReportTable } from '@/screens/report/ReportTables';
import useMoneyData from '../useMoneyData';
import MoneyReportOptionsSheet from './MoneyReportOptionsSheet';
import MoneyExportView from './MoneyExportView';

/** A4 portrait in PDF points. */
const A4_PORTRAIT = { width: 595, height: 842 };
/** Waits this long for the off-screen image view to lay out. */
const IMAGE_LAYOUT_TIMEOUT_MS = 6000;

/** "12-Nov-26, 10:35" */
function generatedLabel(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${dayMonthYear(todayIso())}, ${pad(now.getHours())}:${pad(
    now.getMinutes(),
  )}`;
}

export default function MoneyReportScreen({ navigation }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { data, derived, error } = useMoneyData();
  const [chosen, setChosen] = useState(null); // null = defaults
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [imageView, setImageView] = useState(false);
  const exportViewRef = useRef(null);
  const layoutWaiter = useRef(null);

  const options = useMemo(
    () =>
      chosen ||
      (derived
        ? defaultMoneyReportOptions(derived.current.key, derived.accounts)
        : null),
    [chosen, derived],
  );
  const report = useMemo(
    () => (data && options ? buildMoneyReport(data, options) : null),
    [data, options],
  );

  const info = report
    ? {
        typeLabel: MONEY_REPORT_TYPES.find(t => t.value === options.type)
          .label,
        periodLabel: moneyReportPeriodLabel(report),
        accountsLabel:
          options.accounts.length === derived.accounts.length
            ? 'All accounts'
            : derived.accounts
                .filter(a => options.accounts.includes(a.id))
                .map(a => a.name)
                .join(', '),
      }
    : null;

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
    if (busy || !report) {
      return;
    }
    if (report.empty) {
      return showMessage('There is nothing to export for these options.', {
        title: 'Nothing to export',
      });
    }
    const choice = await showAlert({
      layout: 'header',
      iconPath: mdiTrayArrowDown,
      title: 'Export report',
      subtitle: `${info.typeLabel} · ${info.periodLabel}`,
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
          description: 'Quick to view, e.g. on WhatsApp',
          iconPath: mdiImage,
          tone: 'blue',
        },
      ],
      selected: ['pdf'],
      requireSelection: true,
      buttons: [
        { text: 'Cancel', value: null, style: 'cancel' },
        { text: 'Save', value: 'save', style: 'default' },
        { text: 'Share', value: 'share', style: 'primary', Icon: Share2, wide: true },
      ],
    });
    const action = choice.value;
    const format = choice.selected?.[0];
    if (!action || !format) {
      return;
    }
    const fileBase = exportFileBase('Money', dayMonthYear(todayIso()));
    try {
      let file;
      if (format === 'pdf') {
        setBusy('Preparing PDF…');
        const html = buildMoneyReportHtml(
          report,
          { ...info, generatedLabel: generatedLabel() },
          exportColors(),
        );
        file = await createHtmlPdf(html, A4_PORTRAIT, fileBase);
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
        title="Money report"
        onBack={() => navigation.goBack()}
        actions={[
          { Icon: Share2, label: 'Share or save report', onPress: startExport },
        ]}
        ActionIcon={SlidersHorizontal}
        actionLabel="Report options"
        onAction={() => derived && setOptionsOpen(true)}
      />
      <ScrollView
        contentContainerStyle={[
          s.reportContent,
          {
            paddingLeft: (s.reportContent?.paddingLeft || 0) + insets.left,
            paddingRight: (s.reportContent?.paddingRight || 0) + insets.right,
          },
        ]}
      >
        {error ? <FixedText style={s.errorText}>{error}</FixedText> : null}
        {!report ? (
          <FixedText style={s.moneyEmpty}>{error ? '' : 'Loading…'}</FixedText>
        ) : (
          <>
            <FixedText style={s.reportTitle}>My Money</FixedText>
            <FixedText style={s.reportCaption}>
              {[info.typeLabel, info.periodLabel, info.accountsLabel].join(
                ' · ',
              )}
            </FixedText>
            {report.empty ? (
              <FixedText style={s.reportEmpty}>
                Nothing to show. Add accounts and entries, or change the
                options.
              </FixedText>
            ) : null}
            {report.months.map(m => (
              <View key={m.key}>
                <FixedText style={s.reportSectionLabel}>{m.label}</FixedText>
                <FixedText style={s.reportCaption}>
                  {periodDates(m.period)}
                </FixedText>
                {m.summary ? (
                  <View style={s.reportPanel}>
                    <FixedText style={s.reportSectionTitle}>Summary</FixedText>
                    <ReportTable model={m.summary} />
                  </View>
                ) : null}
                {m.entries ? (
                  <View style={s.reportPanel}>
                    <FixedText style={s.reportSectionTitle}>
                      {`Entries (${m.entries.rows.length})`}
                    </FixedText>
                    {m.entries.rows.length ? (
                      <ReportTable model={m.entries} />
                    ) : (
                      <FixedText style={s.reportCaption}>No entries.</FixedText>
                    )}
                  </View>
                ) : null}
              </View>
            ))}
            {report.savings ? (
              <View style={s.reportPanel}>
                <FixedText style={s.reportSectionTitle}>Savings totals</FixedText>
                <ReportTable model={report.savings} />
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
          <MoneyExportView
            ref={exportViewRef}
            report={report}
            info={{ ...info, generatedLabel: generatedLabel() }}
            onLayout={layout => layoutWaiter.current?.(layout)}
          />
        </View>
      ) : null}
      <BusyOverlay label={busy} />
      {optionsOpen && derived ? (
        <MoneyReportOptionsSheet
          value={options}
          periods={derived.periods}
          accounts={derived.accounts}
          onClose={() => setOptionsOpen(false)}
          onApply={value => {
            setChosen(value);
            setOptionsOpen(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
