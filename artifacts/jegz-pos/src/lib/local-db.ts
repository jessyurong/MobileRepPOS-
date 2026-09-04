import Dexie, { type EntityTable } from 'dexie';

export type LocalRecord = { id?: number; createdAt?: string; updatedAt?: string; [key: string]: unknown };

class JegzLocalDB extends Dexie {
  products!: EntityTable<LocalRecord, 'id'>;
  services!: EntityTable<LocalRecord, 'id'>;
  technicians!: EntityTable<LocalRecord, 'id'>;
  transactions!: EntityTable<LocalRecord, 'id'>;
  transactionItems!: EntityTable<LocalRecord, 'id'>;
  cashDrawerEntries!: EntityTable<LocalRecord, 'id'>;
  gcashDrawerEntries!: EntityTable<LocalRecord, 'id'>;
  defectiveItems!: EntityTable<LocalRecord, 'id'>;
  backjobs!: EntityTable<LocalRecord, 'id'>;
  users!: EntityTable<LocalRecord, 'id'>;
  settings!: EntityTable<LocalRecord, 'id'>;
  meta!: EntityTable<LocalRecord & { key: string; value: unknown }, 'key'>;

  constructor() {
    super('JEGZ_POS_OFFLINE_DB');
    this.version(1).stores({
      products: '++id,name,category,deviceType,stock,createdAt',
      services: '++id,name,type',
      technicians: '++id,name',
      transactions: '++id,customer,unit,technicianId,paymentMethod,status,createdAt',
      transactionItems: '++id,transactionId,type,refId',
      cashDrawerEntries: '++id,type,createdAt',
      gcashDrawerEntries: '++id,type,createdAt',
      defectiveItems: '++id,productId,createdAt',
      backjobs: '++id,customer,technicianId,status,createdAt',
      users: '++id,username,role,isActive,createdAt',
      settings: '++id',
      meta: 'key'
    });
  }
}

export const localDb = new JegzLocalDB();
export const LOCAL_TABLES = [
  'products','services','technicians','transactions','transactionItems',
  'cashDrawerEntries','gcashDrawerEntries','defectiveItems','backjobs','users','settings','meta'
] as const;
