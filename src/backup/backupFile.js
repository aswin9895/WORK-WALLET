/**
 * Backup files: create (Save to Downloads / Share), pick a file to restore,
 * and restore with a safety copy.
 *
 * - Format + checks: domain/backup.js. Database side: data/repositories/backup.js.
 * - Save / Share reuse the report export helpers (Downloads/WorkAndWallet).
 * - Libraries: react-native-blob-util (files), @react-native-documents/picker
 *   (choose a file). Native → loaded lazily, so an old app build only fails
 *   this action with a "rebuild" message.
 * - Safety copy (owner's choice): before a restore the current data is
 *   written to the app's private folder; it is deleted when the restore
 *   succeeds. (The restore itself is one transaction: a failure changes
 *   nothing either way.)
 */
import {
  createBackupData,
  currentSchemaVersion,
  restoreBackupData,
} from '@/data';
import { backupFileName, backupSummary, parseBackup } from '@/domain/backup';
import { saveExport, shareExport } from '@/export/reportExport';
import { dayMonthYear, toIso } from '@/utils/format';

export const JSON_MIME = 'application/json';
/** Refuse files bigger than this (a backup is a few MB at most). */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const SAFETY_FILE = 'safety-backup.json';

function nativeLib(name) {
  try {
    return name === 'picker'
      ? require('@react-native-documents/picker')
      : require('react-native-blob-util');
  } catch (e) {
    throw new Error(
      'Backup needs the latest app build. Rebuild and reinstall the app (npm run android).',
    );
  }
}

const stripScheme = p => String(p).replace(/^file:\/\//, '');

async function writeText(dir, fileName, text) {
  const { fs } = nativeLib('blob');
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  const path = `${dir}/${fileName}`;
  if (await fs.exists(path)) {
    await fs.unlink(path);
  }
  await fs.writeFile(path, text, 'utf8');
  return path;
}

/** Make the backup file in the cache. Returns { path, fileName, mime, summary }. */
export async function createBackupFile(now = new Date()) {
  const backup = await createBackupData();
  const { fs } = nativeLib('blob');
  const fileName = backupFileName(dayMonthYear(toIso(now)), now);
  const path = await writeText(
    `${fs.dirs.CacheDir}/exports`,
    fileName,
    JSON.stringify(backup),
  );
  return { path, fileName, mime: JSON_MIME, summary: backupSummary(backup) };
}

/** Save to Downloads/WorkAndWallet. Returns the "where" label. */
export function saveBackupFile(file) {
  return saveExport(file);
}

/** Android share menu (Drive, WhatsApp, email …). */
export function shareBackupFile(file) {
  return shareExport(file);
}

/**
 * Let the owner choose a backup file and check it.
 * Returns null if cancelled, else { backup, summary }.
 * Throws a BackupError (clear message) for a wrong / damaged / newer file.
 */
export async function pickBackupFile() {
  const { pick, keepLocalCopy, types, errorCodes, isErrorWithCode } =
    nativeLib('picker');
  let picked;
  try {
    // any type: shared .json files often arrive as "octet-stream"
    [picked] = await pick({ type: [types.allFiles] });
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw e;
  }
  if (!picked) {
    return null;
  }
  if (picked.size && picked.size > MAX_BACKUP_BYTES) {
    throw new Error('This file is too big to be a Work & Wallet backup.');
  }
  const [copy] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName: 'restore-backup.json' }],
    destination: 'cachesDirectory',
  });
  if (!copy || copy.status !== 'success') {
    throw new Error('The file could not be opened.');
  }
  const { fs } = nativeLib('blob');
  const local = decodeURI(stripScheme(copy.localUri));
  let text;
  try {
    text = await fs.readFile(local, 'utf8');
  } finally {
    fs.unlink(local).catch(() => {});
  }
  const backup = parseBackup(text, currentSchemaVersion());
  return { backup, summary: backupSummary(backup) };
}

/**
 * Replace all data with a checked backup (from pickBackupFile).
 * A safety copy of the current data is kept until the restore succeeds.
 */
export async function restoreFromBackup(backup) {
  const { fs } = nativeLib('blob');
  const current = await createBackupData();
  const safetyPath = await writeText(
    fs.dirs.DocumentDir,
    SAFETY_FILE,
    JSON.stringify(current),
  );
  try {
    await restoreBackupData(backup);
  } catch (e) {
    throw new Error(
      `The backup could not be restored. Your data was not changed.\n\n(${
        e?.message || e
      })`,
    );
  }
  await fs.unlink(safetyPath).catch(() => {});
}
