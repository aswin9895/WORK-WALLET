/**
 * Settings (redesign v1 — owner's light + dark mockups).
 * Gradient header, People row, Appearance pills, Your data (backup /
 * restore + note), bottom wave.
 * The stack header is hidden for this route (ScreenHeader draws its own).
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Download, Monitor, Moon, Share, Sun } from 'lucide-react-native';
import {
  mdiAccountGroup,
  mdiCloudDownload,
  mdiCloudUpload,
  mdiDatabaseExport,
  mdiDatabaseImport,
  mdiInformationVariant,
  mdiWallet,
} from '@mdi/js';
import { useStyles, useTheme } from '@/theme';
import {
  BusyOverlay,
  ChoicePills,
  IconRow,
  KitSectionTitle,
  ScreenHeader,
} from '@/components/kit';
import { BottomWave } from '@/components/graphics/Waves';
import {
  showAlert,
  showError,
  showSuccess,
} from '@/components/alert';
import {
  createBackupFile,
  pickBackupFile,
  restoreFromBackup,
  saveBackupFile,
  shareBackupFile,
} from '@/backup/backupFile';
import { dayMonthYear, toIso } from '@/utils/format';
import { ROUTES } from '@/navigation/routes';

/** Light / dark choice ('system' follows the phone). */
const MODE_OPTIONS = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** ISO time → "12-Nov-26, 10:35" (phone's time zone). */
function backupDateLabel(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) {
    return 'unknown date';
  }
  const pad = n => String(n).padStart(2, '0');
  return `${dayMonthYear(toIso(d))}, ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export default function SettingsScreen({ navigation }) {
  const s = useStyles();
  const { mode, setMode } = useTheme();
  const [busy, setBusy] = useState(null);

  const backup = async () => {
    const { value } = await showAlert({
      layout: 'hero',
      iconPath: mdiCloudUpload,
      title: 'Back up data',
      message: 'Makes one file with all your data.',
      buttons: [
        { text: 'Share', value: 'share', style: 'primary', Icon: Share },
        { text: 'Save', value: 'save', style: 'default', Icon: Download },
        { text: 'Cancel', value: null, style: 'cancel' },
      ],
    });
    if (!value) {
      return;
    }
    try {
      setBusy('Preparing backup…');
      const file = await createBackupFile();
      setBusy(null);
      if (value === 'share') {
        await shareBackupFile(file);
      } else {
        const where = await saveBackupFile(file);
        await showSuccess(`Saved to ${where}`, { title: 'Backup saved' });
      }
    } catch (e) {
      setBusy(null);
      showError(e);
    }
  };

  const restore = async () => {
    let picked;
    try {
      picked = await pickBackupFile();
    } catch (e) {
      showError(e);
      return;
    }
    if (!picked) {
      return;
    }
    const sum = picked.summary;
    const { value: ok } = await showAlert({
      layout: 'hero',
      tone: 'danger',
      iconPath: mdiCloudDownload,
      title: 'Replace all data?',
      message: `Backup from ${backupDateLabel(sum.createdAt)}\n${plural(
        sum.caterings,
        'catering',
      )} · ${plural(sum.works, 'work')} · ${sum.people} ${
        sum.people === 1 ? 'person' : 'people'
      }${
        sum.accounts
          ? `\n${plural(sum.accounts, 'bank account')} · ${
              sum.moneyEntries
            } money ${sum.moneyEntries === 1 ? 'entry' : 'entries'}`
          : ''
      }\n\nEverything on this phone will be replaced by this backup. This cannot be undone.`,
      buttons: [
        { text: 'Cancel', value: false, style: 'cancel' },
        { text: 'Replace', value: true, style: 'destructive' },
      ],
    });
    if (ok !== true) {
      return;
    }
    try {
      setBusy('Restoring…');
      await restoreFromBackup(picked.backup);
      setBusy(null);
      await showSuccess('Your data was restored from the backup.', {
        title: 'Restored',
      });
    } catch (e) {
      setBusy(null);
      showError(e);
    }
  };

  return (
    <View style={s.kitScreen}>
      <BottomWave color={s.palBottomWave.color} style={s.kitBottomWave} />
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.kitContent}>
        <KitSectionTitle>Manage</KitSectionTitle>
        <IconRow
          iconPath={mdiAccountGroup}
          title="People"
          text="Workers you call"
          onPress={() => navigation.navigate(ROUTES.PEOPLE)}
        />
        <IconRow
          iconPath={mdiWallet}
          title="Money"
          text="Bank accounts, savings and fixed monthly items"
          onPress={() => navigation.navigate(ROUTES.MONEY_SETTINGS)}
        />

        <KitSectionTitle>Appearance</KitSectionTitle>
        <ChoicePills options={MODE_OPTIONS} value={mode} onChange={setMode} />

        <KitSectionTitle>Your data</KitSectionTitle>
        <IconRow
          iconPath={mdiDatabaseExport}
          title="Back up data"
          text="Save or share a file with all your data"
          onPress={backup}
        />
        <IconRow
          iconPath={mdiDatabaseImport}
          title="Restore from backup"
          text="Replace the data on this phone with a backup file"
          onPress={restore}
        />
        <IconRow
          iconPath={mdiInformationVariant}
          round
          divider="always"
          text="All data is stored on your phone. Uninstalling the app will delete it, so keep a backup."
        />
      </ScrollView>
      <BusyOverlay label={busy} />
    </View>
  );
}
