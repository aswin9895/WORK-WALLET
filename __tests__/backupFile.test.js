/**
 * Backup file service (src/backup/backupFile.js) with the native libraries
 * and the data layer mocked.
 */
const files = {};
jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: { CacheDir: '/cache', DocumentDir: '/docs' },
    exists: jest.fn(async p => p in files),
    mkdir: jest.fn(async () => {}),
    unlink: jest.fn(async p => {
      delete files[p];
    }),
    writeFile: jest.fn(async (p, text) => {
      files[p] = text;
    }),
    readFile: jest.fn(async p => files[p]),
  },
  media: { copyToMediaStore: jest.fn(async () => 'content://x') },
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({ success: true })) },
}));
jest.mock('../src/theme/themes', () => ({
  DEFAULT_THEME_ID: 'default',
  THEMES: { default: { modes: { light: { styles: {} } } } },
}));
jest.mock('@react-native-documents/picker', () => ({
  types: { allFiles: '*/*' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: e => Boolean(e && e.code),
  pick: jest.fn(),
  keepLocalCopy: jest.fn(async () => [
    {
      status: 'success',
      sourceUri: 'content://picked',
      localUri: 'file:///cache/restore-backup.json',
    },
  ]),
}));
jest.mock('../src/data', () => {
  const { makeBackup } = require('../src/domain/backup');
  return {
    currentSchemaVersion: () => 6,
    createBackupData: jest.fn(async () =>
      makeBackup({
        schemaVersion: 6,
        tables: { caterings: [{ id: 1, name: 'NANMA' }] },
        meta: { myself_uid: null },
      }),
    ),
    restoreBackupData: jest.fn(async () => {}),
  };
});

const picker = require('@react-native-documents/picker');
const data = require('../src/data');
const svc = require('../src/backup/backupFile');

test('create: JSON file in the cache, saved to Downloads', async () => {
  const file = await svc.createBackupFile(new Date(2026, 10, 12, 10, 35));
  expect(file).toMatchObject({
    path: '/cache/exports/WorkAndWallet-backup-12-Nov-26-1035.json',
    fileName: 'WorkAndWallet-backup-12-Nov-26-1035.json',
    mime: 'application/json',
    summary: { caterings: 1 },
  });
  expect(JSON.parse(files[file.path]).app).toBe('WorkAndWallet');
  expect(await svc.saveBackupFile(file)).toBe(
    'Downloads/WorkAndWallet/WorkAndWallet-backup-12-Nov-26-1035.json',
  );
});

test('pick: cancel → null; good file → checked backup; temp copy removed', async () => {
  picker.pick.mockRejectedValueOnce({ code: 'OPERATION_CANCELED' });
  expect(await svc.pickBackupFile()).toBeNull();

  const file = await svc.createBackupFile();
  files['/cache/restore-backup.json'] = files[file.path];
  picker.pick.mockResolvedValueOnce([{ uri: 'content://picked', size: 100 }]);
  const picked = await svc.pickBackupFile();
  expect(picked.summary.caterings).toBe(1);
  expect(files['/cache/restore-backup.json']).toBeUndefined();

  files['/cache/restore-backup.json'] = '{"app":"Other"}';
  picker.pick.mockResolvedValueOnce([{ uri: 'content://picked' }]);
  await expect(svc.pickBackupFile()).rejects.toThrow(/not a Work & Wallet/);
});

test('restore: safety copy deleted on success, kept on failure', async () => {
  const backup = await data.createBackupData();
  await svc.restoreFromBackup(backup);
  expect(data.restoreBackupData).toHaveBeenCalledWith(backup);
  expect(files['/docs/safety-backup.json']).toBeUndefined();

  data.restoreBackupData.mockRejectedValueOnce(new Error('FOREIGN KEY'));
  await expect(svc.restoreFromBackup(backup)).rejects.toThrow(
    /Your data was not changed/,
  );
  expect(JSON.parse(files['/docs/safety-backup.json']).app).toBe(
    'WorkAndWallet',
  );
});
