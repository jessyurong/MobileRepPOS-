/**
 * Backup and Restore System
 * Allows users to export and import their POS data
 */

import { localDb, LOCAL_TABLES } from './local-db';

export interface PosBackup {
  version: string;
  exportDate: string;
  data: Record<string, any[]>;
  metadata: {
    productCount: number;
    serviceCount: number;
    transactionCount: number;
    transactionItemCount: number;
  };
}

/**
 * Export all POS data to a JSON backup file
 */
export async function exportBackup(): Promise<Blob> {
  try {
    const backup: PosBackup = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: {},
      metadata: {
        productCount: 0,
        serviceCount: 0,
        transactionCount: 0,
        transactionItemCount: 0,
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

      if (mergeMode) {
        // In merge mode, add items (potential duplicates depending on IDs)
        for (const item of data) {
          try {
            await dbTable.add(item);
            totalImported++;
          } catch (error) {
            // Skip items that fail to add (e.g., duplicate keys)
            console.warn(`Skipped item in table ${table}:`, error);
          }
        }
      } else {
        // In replace mode, use bulkAdd for better performance
        try {
          await dbTable.bulkAdd(data);
          totalImported += data.length;
        } catch (error) {
          console.error(`Error importing table ${table}:`, error);
          throw error;
        }
      }
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
