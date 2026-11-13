/**
 * The data layer's public API. Screens and components import ONLY from
 * '@/data' — never from db/ or repositories/ directly, and never write SQL.
 *
 * Today everything is local SQLite. A future backend plugs in behind these
 * same functions (see src/data/sync/), so screens won't need to change.
 */
export { initDb } from './db/database';

export {
  listCaterings,
  listCateringsOverview,
  getCatering,
  saveCatering,
  deleteCatering,
} from './repositories/caterings';

export { listPeople, savePerson, deletePerson } from './repositories/people';

export {
  listWorks,
  listAllWorks,
  getWork,
  saveWork,
  deleteWork,
  setCollected,
  setCollectedMany,
} from './repositories/works';

export {
  addPayment,
  addPayments,
  collectAndPayWorks,
  deletePayment,
} from './repositories/payments';

export { getReportData, getReportWorks } from './repositories/reports';
export { getEarningsData } from './repositories/earnings';

export { getMeta, setMeta } from './repositories/meta';

export {
  getMoneyData,
  saveMoneyAccount,
  deleteMoneyAccount,
  saveSavingsType,
  deleteSavingsType,
  saveMoneyEntry,
  deleteMoneyEntry,
  saveSalary,
  saveChecks,
  saveFixedItem,
  deleteFixedItem,
  addFixedItems,
} from './repositories/money';

export {
  createBackupData,
  restoreBackupData,
  currentSchemaVersion,
} from './repositories/backup';

export { getChangesSince, getDeviceId } from './sync/changes';
