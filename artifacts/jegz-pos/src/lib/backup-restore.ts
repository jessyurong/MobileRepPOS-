/**
 * Backup and Restore System
 * Allows users to export and import their POS data.
 *
 * Version 2.0.0 preserves all job data (customer/phone/device details, job
 * numbers, statuses, pre-orders, markups, payment/deposit tracking, repair
 * notes). Import is backward compatible: 1.0.0 backups are migrated safely.
 *
 * Version 2.1.0 explicitly tracks the settings table (which holds the shop
 * profile and the base64 shop logo) in the backup so the shop identity,
 * logo, receipt footer, payment options, and all preferences are preserved
 * through export and restore.
 */

import { localDb, LOCAL_TABLES } from './local-db';
import { normalizeStatus, paymentStatusFor, ensureJobNumbers, normalizeServiceCatalog } from './offline-data-services';

export const BACKUP_VERSION = '2.1.0';

/** meta table key that stores the ISO timestamp of the last successful backup. */
export const LAST_BACKUP_KEY = 'lastBackupTime';

/**
 * Read the timestamp of the last successful backup (if any).
 * Stored only locally in the existing meta table — this is not a cloud backup.
 */
export async function getLastBackupTime(): Promise<string | null> {
  try {
    const row = await localDb.meta.get(LAST_BACKUP_KEY);
    const value = row?.value;
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

/** Record the timestamp of a successful local backup. */
export async function markLastBackup(time?: string): Promise<void> {
  const at = time || new Date().toISOString();
  await localDb.meta.put({
    key: LAST_BACKUP_KEY,
    value: at,
    createdAt: new Date().toISOString(),
    updatedAt: at,
  } as any);
}

export interface PosBackup {
  version: string;
  exportDate: string;
  data: Record<string, any[]>;
  metadata: {
    productCount: number;
    serviceCount: number;
    transactionCount: number;
    transactionItemCount: number;
    settingsCount: number;
  };
}

/**
 * Export all POS data to a JSON backup file
 */
export async function exportBackup(): Promise<Blob> {
  try {
    const backup: PosBackup = {
      version: BACKUP_VERSION,
      exportDate: new Date().toISOString(),
      data: {},
      metadata: {
        productCount: 0,
        serviceCount: 0,
        transactionCount: 0,
        transactionItemCount: 0,
        settingsCount: 0,
      },
    };

    // Export each table
    for (const table of LOCAL_TABLES) {
      const tableData = await (localDb as any)[table].toArray();
      backup.data[table] = tableData;

      // Update metadata
      if (table === 'products') backup.metadata.productCount = tableData.length;
      if (table === 'services') backup.metadata.serviceCount = tableData.length;
      if (table === 'transactions') backup.metadata.transactionCount = tableData.length;
      if (table === 'transactionItems') backup.metadata.transactionItemCount = tableData.length;
      if (table === 'settings') backup.metadata.settingsCount = tableData.length;
    }

    // Create blob and return
    const jsonString = JSON.stringify(backup, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  } catch (error) {
    console.error('Error creating backup:', error);
    throw new Error('Failed to create backup');
  }
}

/**
 * Download backup file to user's device
 */
export async function downloadBackup(): Promise<void> {
  try {
    const backup = await exportBackup();
    // Only record a timestamp once the backup data was generated successfully.
    await markLastBackup();
    const url = URL.createObjectURL(backup);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jegz-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading backup:', error);
    throw error;
  }
}

/**
 * Validate a backup file
 */
export function validateBackup(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid backup format' };
  }

  if (!data.version || typeof data.version !== 'string') {
    return { valid: false, error: 'Missing or invalid version' };
  }

  if (!data.exportDate || typeof data.exportDate !== 'string') {
    return { valid: false, error: 'Missing or invalid export date' };
  }

  if (!data.data || typeof data.data !== 'object') {
    return { valid: false, error: 'Missing data in backup' };
  }

  if (!data.metadata || typeof data.metadata !== 'object') {
    return { valid: false, error: 'Missing metadata in backup' };
  }

  // Validate that core tables exist
  const requiredTables = ['products', 'services', 'transactions', 'transactionItems'];
  for (const table of requiredTables) {
    if (!Array.isArray(data.data[table])) {
      return { valid: false, error: `Missing or invalid table: ${table}` };
    }
  }

  return { valid: true };
}

const isPhoneString = (value: unknown): boolean =>
  typeof value === 'string' && /^[0-9+\-\s()]{7,}$/.test(value.trim());

/**
 * Migrate legacy backup rows into the current schema with safe defaults.
 * Mutates rows in place.
 */
function migrateRow(table: string, row: any) {
  if (!row || typeof row !== 'object') return;

  if (table === 'transactions') {
    const customerName = row.customerName || row.customer || 'Walk-in';
    let customerPhone = row.customerPhone;
    if (!customerPhone && isPhoneString(row.unit)) customerPhone = row.unit;
    const phoneBrand = row.phoneBrand;
    const phoneModel = row.phoneModel;
    const status = normalizeStatus(row.status || 'pending');
    const total = Number.isFinite(row.totalAmount) ? row.totalAmount : Number.isFinite(row.total) ? row.total : 0;
    const amountPaid = row.amountPaid || 0;
    const paymentStatus = row.paymentStatus || paymentStatusFor(total, amountPaid);
    const remainingBalance = Number.isFinite(row.remainingBalance)
      ? row.remainingBalance
      : Math.max(0, total - amountPaid);

    row.customerName = customerName;
    row.customer = customerName;
    row.customerPhone = customerPhone;
    if (customerPhone !== undefined && customerPhone !== null) row.unit = customerPhone;
    row.phoneBrand = phoneBrand;
    row.phoneModel = phoneModel;
    row.status = status;
    row.total = total;
    row.totalAmount = total;
    row.amountPaid = amountPaid;
    row.remainingBalance = remainingBalance;
    row.paymentStatus = paymentStatus;
    row.isPreOrder = Boolean(row.isPreOrder);
    // job numbers are backfilled after import so they never collide
    if (!row.jobNumber) row.jobNumber = undefined;
  }

  if (table === 'transactionItems') {
    row.isPreOrder = row.isPreOrder === true;
    row.isCustom = row.isCustom === true;
    row.savedToList = row.savedToList === true;
    if (typeof row.cost !== 'number') row.cost = undefined;
  }

  if (table === 'products') {
    if (typeof row.reservedStock !== 'number' || !Number.isFinite(row.reservedStock)) {
      row.reservedStock = 0;
    }
  }
}

/**
 * Import backup data
 * @param backup The backup data to import
 * @param mergeMode If true, merge with existing data. If false, replace all data.
 */
export async function importBackup(
  backup: PosBackup,
  mergeMode: boolean = false,
): Promise<{
  success: boolean;
  message: string;
  itemsImported: number;
}> {
  try {
    // Validate backup
    const validation = validateBackup(backup);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    let totalImported = 0;

    // If not merging, clear existing data first
    if (!mergeMode) {
      for (const table of LOCAL_TABLES) {
        await (localDb as any)[table].clear();
      }
    }

    // Import data
    for (const [table, data] of Object.entries(backup.data)) {
      if (!Array.isArray(data)) continue;
      if (data.length === 0) continue;

      const dbTable = (localDb as any)[table];
      if (!dbTable) continue;

      // Migrate legacy rows into the current schema
      const migrated = data.map(row => {
        migrateRow(table, row);
        return { ...row };
      });

      if (mergeMode) {
        for (const item of migrated) {
          try {
            // Drop primary keys in merge mode so rows never clash
            const { id: _dropped, ...rest } = item;
            await dbTable.add({ ...rest, id: undefined });
            totalImported++;
          } catch (error) {
            console.warn(`Skipped item in table ${table}:`, error);
          }
        }
      } else {
        try {
          await dbTable.bulkAdd(migrated);
          totalImported += migrated.length;
        } catch (error) {
          console.error(`Error importing table ${table}:`, error);
          throw error;
        }
      }
    }

    // Ensure every transaction has a unique job number (backfills safe values).
    await ensureJobNumbers();

    // Ensure service catalog rows match the current shape (category/active/cost).
    await normalizeServiceCatalog();

    // Ensure the pre-order markup default exists.
    const existingMarkup = await localDb.settings.where('key').equals('preOrderMarkup').first();
    if (!existingMarkup) {
      await localDb.settings.add({
        key: 'preOrderMarkup',
        value: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    }

    // Mark database as seeded to prevent re-seeding
    await localDb.meta.put({
      key: 'db_seeded_v1',
      value: true,
    } as any);

    return {
      success: true,
      message: mergeMode
        ? `Successfully merged ${totalImported} items from backup`
        : `Successfully imported ${totalImported} items from backup`,
      itemsImported: totalImported,
    };
  } catch (error) {
    console.error('Error importing backup:', error);
    return {
      success: false,
      message: `Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      itemsImported: 0,
    };
  }
}

/**
 * Get backup summary without loading full data
 */
export async function getBackupSummary(): Promise<{
  exportDate: string;
  items: {
    products: number;
    services: number;
    technicians: number;
    transactions: number;
    transactionItems: number;
  };
}> {
  return {
    exportDate: new Date().toISOString(),
    items: {
      products: await localDb.products.count(),
      services: await localDb.services.count(),
      technicians: await localDb.technicians.count(),
      transactions: await localDb.transactions.count(),
      transactionItems: await localDb.transactionItems.count(),
    },
  };
}