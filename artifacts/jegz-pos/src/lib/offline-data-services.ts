/**
 * Offline-First Data Services
 * These services handle all CRUD operations using IndexedDB
 */

import { localDb } from './local-db';
import type { LocalRecord } from './local-db';

// Types
export interface Product extends LocalRecord {
  id?: number;
  name: string;
  category: string;
  price: number;
  sellingPrice?: number;
  cost?: number;
  stock: number;
  reorderPoint?: number;
  sku?: string;
  deviceType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Service extends LocalRecord {
  id?: number;
  name: string;
  type: string;
  price: number;
  cost?: number;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Technician extends LocalRecord {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  specialization?: string;
  jobsDone?: number;
  totalSales?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionItem extends LocalRecord {
  id?: number;
  transactionId: number;
  type: 'product' | 'service';
  refId: number;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  createdAt?: string;
}

export interface Transaction extends LocalRecord {
  id?: number;
  customer?: string;
  unit?: string;
  technicianId?: number;
  paymentMethod: 'cash' | 'gcash';
  status: 'completed' | 'pending' | 'cancelled';
  total: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DefectiveItem extends LocalRecord {
  id?: number;
  productId: number;
  productName?: string;
  reason: string;
  quantity: number;
  costPerUnit?: number;
  totalLoss?: number;
  createdAt?: string;
}

export interface Backjob extends LocalRecord {
  id?: number;
  customer: string;
  phone?: string;
  unit?: string;
  technicianId?: number;
  technicianName?: string;
  description?: string;
  issue?: string;
  originalRepairDate?: string;
  cause?: string;
  status: 'pending' | 'in_progress' | 'done' | 'in-progress' | 'completed';
  withinWarranty?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashDrawerEntry extends LocalRecord {
  id?: number;
  type: 'opening' | 'closing' | 'transaction' | 'adjustment' | 'deposit' | 'withdraw' | 'sale';
  amount: number;
  notes?: string;
  createdAt?: string;
}

export interface GcashDrawerEntry extends LocalRecord {
  id?: number;
  type: 'opening' | 'closing' | 'transaction' | 'adjustment' | 'deposit' | 'withdraw' | 'sale';
  amount: number;
  notes?: string;
  createdAt?: string;
}

export interface Settings extends LocalRecord {
  id?: number;
  key: string;
  value: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface Dashboard {
  periodLabel: string;
  periodSales: number;
  periodProfit: number;
  periodTransactions: number;
  cashCount: number;
  gcashCount: number;
  lowStockCount: number;
  pendingCount: number;
  salesTrend: Array<{ date: string; sales: number; profit: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topProducts: Array<{ name: string; count: number; revenue: number }>;
  recentTransactions: Transaction[];
  lowStockProducts: Product[];
}

// Product Services
export const productService = {
  async list(): Promise<Product[]> {
    return localDb.products.toArray();
  },

  async get(id: number): Promise<Product | undefined> {
    return localDb.products.get(id);
  },

  async create(product: Omit<Product, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return localDb.products.add({
      ...product,
      createdAt: now,
      updatedAt: now,
    } as any);
  },

  async update(id: number, product: Partial<Product>): Promise<void> {
    const now = new Date().toISOString();
    return localDb.products.update(id, {
      ...product,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    return localDb.products.delete(id);
  },

  async getLowStock(reorderPoint?: number): Promise<Product[]> {
    const all = await localDb.products.toArray();
    return all.filter(p => (p.stock ?? 0) <= (reorderPoint ?? p.reorderPoint ?? 10));
  },
};

// Service Services
export const serviceService = {
  async list(): Promise<Service[]> {
    return localDb.services.toArray();
  },

  async get(id: number): Promise<Service | undefined> {
    return localDb.services.get(id);
  },

  async create(service: Omit<Service, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return localDb.services.add({
      ...service,
      createdAt: now,
      updatedAt: now,
    } as any);
  },

  async update(id: number, service: Partial<Service>): Promise<void> {
    const now = new Date().toISOString();
    return localDb.services.update(id, {
      ...service,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    return localDb.services.delete(id);
  },
};

// Technician Services
export const technicianService = {
  async list(): Promise<Technician[]> {
    const list = await localDb.technicians.toArray();
    const txs = await localDb.transactions.toArray();
    const completed = txs.filter(tx => tx.status === 'completed' || (tx.status as string) === 'complete');
    return list.map(t => {
      const techTxs = completed.filter(tx => tx.technicianId === t.id);
      const jobsDone = techTxs.length;
      const totalSales = techTxs.reduce((sum, tx) => sum + (tx.total || 0), 0);
      return {
        ...t,
        role: t.role || t.specialization || 'Senior Technician',
        jobsDone: t.jobsDone ?? jobsDone,
        totalSales: t.totalSales ?? totalSales,
      };
    }) as Technician[];
  },

  async get(id: number): Promise<Technician | undefined> {
    return localDb.technicians.get(id);
  },

  async create(technician: Omit<Technician, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return localDb.technicians.add({
      ...technician,
      createdAt: now,
      updatedAt: now,
    } as any);
  },

  async update(id: number, technician: Partial<Technician>): Promise<void> {
    const now = new Date().toISOString();
    return localDb.technicians.update(id, {
      ...technician,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    return localDb.technicians.delete(id);
  },
};

// Transaction Services
export const transactionService = {
  async list(): Promise<Transaction[]> {
    return localDb.transactions.toArray();
  },

  async get(id: number): Promise<Transaction | undefined> {
    return localDb.transactions.get(id);
  },

  async create(transaction: Omit<Transaction, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return localDb.transactions.add({
      ...transaction,
      createdAt: now,
      updatedAt: now,
    } as any);
  },

  async createWithItems(
    transaction: Omit<Transaction, 'id'>,
    items: Array<Omit<TransactionItem, 'id' | 'transactionId'>>,
  ): Promise<number> {
    const now = new Date().toISOString();

    // Create the transaction
    const txId = await localDb.transactions.add({
      ...transaction,
      createdAt: now,
      updatedAt: now,
    } as any);

    // Create transaction items
    for (const item of items) {
      await localDb.transactionItems.add({
        ...item,
        transactionId: txId,
        createdAt: now,
      } as any);

      // Update product stock if it's a product
      if (item.type === 'product') {
        const product = await productService.get(item.refId);
        if (product) {
          await productService.update(item.refId, {
            stock: (product.stock ?? 0) - (item.quantity ?? 0),
          });
        }
      }
    }

    return txId;
  },

  async update(id: number, transaction: Partial<Transaction>): Promise<void> {
    const now = new Date().toISOString();
    return localDb.transactions.update(id, {
      ...transaction,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    return localDb.transactions.delete(id);
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    const all = await localDb.transactions.toArray();
    return all.filter(tx => {
      const txDate = new Date(tx.createdAt || 0);
      return txDate >= startDate && txDate <= endDate;
    });
  },

  async getByStatus(status: string): Promise<Transaction[]> {
    return localDb.transactions.where('status').equals(status).toArray();
  },

  async getStats(period: 'today' | 'week' | 'month' | 'year'): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const txs = await this.getByDateRange(startDate, now);
    const completed = txs.filter(tx => tx.status === 'completed' || (tx.status as string) === 'complete');
    const pending = txs.filter(tx => tx.status === 'pending');

    const totalSales = completed.reduce((sum, tx) => sum + (tx.total || 0), 0);
    const totalProfit = totalSales * 0.2;
    const count = completed.length;
    const cashCount = completed.filter(tx => tx.paymentMethod === 'cash').length;
    const gcashCount = completed.filter(tx => tx.paymentMethod === 'gcash').length;
    const avgPerTransaction = count > 0 ? totalSales / count : 0;

    const allItems = await transactionItemService.list();
    const txItems = completed
      .flatMap(tx => tx.id ? allItems.filter(item => item.transactionId === tx.id) : [])
      .filter(item => item);

    const topServicesMap = new Map<string, number>();
    txItems
      .filter(item => item.type === 'service')
      .forEach(item => {
        topServicesMap.set(item.name, (topServicesMap.get(item.name) || 0) + (item.quantity || 1));
      });
    const topServices = Array.from(topServicesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topProductsMap = new Map<string, number>();
    txItems
      .filter(item => item.type === 'product')
      .forEach(item => {
        topProductsMap.set(item.name, (topProductsMap.get(item.name) || 0) + (item.quantity || 1));
      });
    const topProducts = Array.from(topProductsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topModelsMap = new Map<string, number>();
    completed.forEach(tx => {
      const unit = (tx.unit || '').trim();
      if (unit) {
        topModelsMap.set(unit, (topModelsMap.get(unit) || 0) + 1);
      }
    });
    const topModels = Array.from(topModelsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: totalSales,
      totalSales,
      totalProfit,
      count,
      pending: pending.length,
      cashCount,
      gcashCount,
      avgPerTransaction,
      topModels,
      topServices,
      topProducts,
      paymentMethods: {
        cash: completed.filter(tx => tx.paymentMethod === 'cash').reduce((sum, tx) => sum + (tx.total || 0), 0),
        gcash: completed.filter(tx => tx.paymentMethod === 'gcash').reduce((sum, tx) => sum + (tx.total || 0), 0),
      },
    };
  },
};

// Transaction Item Services
export const transactionItemService = {
  async list(): Promise<TransactionItem[]> {
    return localDb.transactionItems.toArray();
  },

  async getByTransactionId(transactionId: number): Promise<TransactionItem[]> {
    return localDb.transactionItems.where('transactionId').equals(transactionId).toArray();
  },

  async create(item: Omit<TransactionItem, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return localDb.transactionItems.add({
      ...item,
      createdAt: now,
    } as any);
  },

  async delete(id: number): Promise<void> {
    return localDb.transactionItems.delete(id);
  },
};

// Defective Item Services
export const defectiveItemService = {
  async list(): Promise<DefectiveItem[]> {
    const items = await localDb.defectiveItems.toArray();
    const products = await localDb.products.toArray();
    const prodMap = new Map(products.map(p => [p.id, p]));
    return items.map(item => {
      const prod = prodMap.get(item.productId);
      const costPerUnit = (item.costPerUnit as number) || (prod?.cost as number) || 0;
      const totalLoss = (item.totalLoss as number) || (costPerUnit * (item.quantity || 1));
      return {
        ...item,
        productName: item.productName || prod?.name || 'Unknown Product',
        costPerUnit,
        totalLoss,
      };
    }) as DefectiveItem[];
  },

  async create(item: Omit<DefectiveItem, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    const product = await productService.get(item.productId);
    const costPerUnit = (item.costPerUnit as number) || product?.cost || 0;
    const totalLoss = (item.totalLoss as number) || (costPerUnit * (item.quantity || 1));
    const id = await localDb.defectiveItems.add({
      ...item,
      costPerUnit,
      totalLoss,
      productName: item.productName || product?.name || 'Unknown Product',
      createdAt: now,
    } as any);
    if (product) {
      await productService.update(item.productId, {
        stock: Math.max(0, (product.stock || 0) - (item.quantity || 1)),
      });
    }
    return id as number;
  },

  async delete(id: number): Promise<void> {
    return localDb.defectiveItems.delete(id);
  },
};

// Backjob Services
export const backjobService = {
  async list(): Promise<Backjob[]> {
    const list = await localDb.backjobs.toArray();
    const techs = await localDb.technicians.toArray();
    const techMap = new Map(techs.map(t => [t.id, t.name]));
    return list.map(b => ({
      ...b,
      technicianName: b.technicianName || (b.technicianId ? techMap.get(b.technicianId) : undefined) || 'Unknown',
      withinWarranty: b.withinWarranty !== undefined ? b.withinWarranty : (b.cause === 'warranty' || !b.cause),
    })) as Backjob[];
  },

  async get(id: number): Promise<Backjob | undefined> {
    const b = await localDb.backjobs.get(id);
    if (!b) return undefined;
    if (!b.technicianName && b.technicianId) {
      const tech = await localDb.technicians.get(b.technicianId);
      if (tech) (b as any).technicianName = tech.name;
    }
    return b as Backjob;
  },

  async create(backjob: Omit<Backjob, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return localDb.backjobs.add({
      ...backjob,
      createdAt: now,
      updatedAt: now,
    } as any);
  },

  async update(id: number, backjob: Partial<Backjob>): Promise<void> {
    const now = new Date().toISOString();
    return localDb.backjobs.update(id, {
      ...backjob,
      updatedAt: now,
    });
  },

  async delete(id: number): Promise<void> {
    return localDb.backjobs.delete(id);
  },

  async getByStatus(status: string): Promise<Backjob[]> {
    return localDb.backjobs.where('status').equals(status).toArray() as Promise<Backjob[]>;
  },
};

// Cash Drawer Services
function computeEntryBalance(
  entries: Array<{ type: string; amount: number; createdAt?: string }>,
) {
  const signForType = (type: string, delta: number): number => {
    switch (type) {
      case 'opening':
      case 'transaction':
      case 'deposit':
      case 'sale':
        return 1;
      case 'closing':
      case 'withdraw':
        return -1;
      case 'adjustment':
        return delta < 0 ? -1 : 1;
      default:
        return 1;
    }
  };

  let running = 0;
  const sorted = [...entries]
    .filter(e => e && typeof e.amount === 'number')
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });

  return sorted.map(e => {
    const delta = e.amount || 0;
    const sign = signForType(e.type, delta);
    running += sign * Math.abs(delta);
    return { ...e, runningBalance: running };
  });
}

export const cashDrawerService = {
  async get(): Promise<{ balance: number; entries: (CashDrawerEntry & { runningBalance: number })[] }> {
    const entries = await localDb.cashDrawerEntries.toArray();
    const withBalance = computeEntryBalance(entries as any) as (CashDrawerEntry & { runningBalance: number })[];
    const balance = withBalance.length > 0 ? withBalance[withBalance.length - 1].runningBalance : 0;
    return { balance, entries: withBalance as any };
  },

  async addEntry(entry: Omit<CashDrawerEntry, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return localDb.cashDrawerEntries.add({
      ...entry,
      createdAt: now,
    } as any);
  },
};

// Gcash Drawer Services
export const gcashDrawerService = {
  async get(): Promise<{ balance: number; entries: (GcashDrawerEntry & { runningBalance: number })[] }> {
    const entries = await localDb.gcashDrawerEntries.toArray();
    const withBalance = computeEntryBalance(entries as any) as (GcashDrawerEntry & { runningBalance: number })[];
    const balance = withBalance.length > 0 ? withBalance[withBalance.length - 1].runningBalance : 0;
    return { balance, entries: withBalance as any };
  },

  async addEntry(entry: Omit<GcashDrawerEntry, 'id'>): Promise<number> {
    const now = new Date().toISOString();
    return localDb.gcashDrawerEntries.add({
      ...entry,
      createdAt: now,
    } as any);
  },
};

// Settings Services
export const settingsService = {
  async get(): Promise<Record<string, any>> {
    const all = await localDb.settings.toArray();
    const result: Record<string, any> = {};
    all.forEach(s => {
      result[s.key || ''] = s.value;
    });
    return result;
  },

  async set(key: string, value: any): Promise<void> {
    const existing = await localDb.settings
      .where('key').equals(key).first();

    const now = new Date().toISOString();
    if (existing) {
      await localDb.settings.update(existing.id as number, {
        value,
        updatedAt: now,
      });
    } else {
      await localDb.settings.add({
        key,
        value,
        createdAt: now,
        updatedAt: now,
      } as any);
    }
  },
};

// Dashboard Service
export const dashboardService = {
  async getDashboard(period: 'today' | 'week' | 'month' | 'year'): Promise<Dashboard> {
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodLabel = 'Today';
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'This Week';
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'This Month';
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = 'This Year';
        break;
    }

    // Get transactions for period
    const txs = await transactionService.getByDateRange(startDate, now);
    const completed = txs.filter(tx => tx.status === 'completed' || (tx.status as string) === 'complete');
    const pending = txs.filter(tx => tx.status === 'pending');

    // Calculate totals
    const periodSales = completed.reduce((sum, tx) => sum + (tx.total || 0), 0);
    const periodProfit = periodSales * 0.2; // Simplified: assume 20% profit margin
    const periodTransactions = completed.length;

    // Get drawer balances
    const { balance: cashCount } = await cashDrawerService.get();
    const { balance: gcashCount } = await gcashDrawerService.get();

    // Get low stock products
    const allProducts = await productService.list();
    const lowStockProducts = allProducts.filter(p => (p.stock ?? 0) <= (p.reorderPoint ?? 10));
    const lowStockCount = lowStockProducts.length;

    // Get pending backjobs
    const backjobs = await backjobService.getByStatus('pending');
    const pendingCount = backjobs.length;

    // Get transaction items for top products/services
    const allItems = await transactionItemService.list();
    const txItems = completed
      .flatMap(tx => tx.id ? allItems.filter(item => item.transactionId === tx.id) : [])
      .filter(item => item);

    const topServices = getTopServices(txItems);
    const topProducts = getTopProducts(txItems);

    // Get recent transactions
    const recentTransactions = completed.slice(-10).reverse();

    // Sales trend
    const salesTrend = getSalesTrend(txs, period, startDate);

    return {
      periodLabel,
      periodSales,
      periodProfit,
      periodTransactions,
      cashCount,
      gcashCount,
      lowStockCount,
      pendingCount,
      salesTrend,
      topServices,
      topProducts,
      recentTransactions,
      lowStockProducts: lowStockProducts.slice(0, 5),
    };
  },

  async getMonthlyReport(month?: string): Promise<any> {
    const selectedMonth = month || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const mIndex = parseInt(monthStr) - 1;

    const startDate = new Date(year, mIndex, 1);
    const endDate = new Date(year, mIndex + 1, 0, 23, 59, 59, 999);
    const daysInMonth = endDate.getDate();

    const monthLabel = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const allTxs = await transactionService.getByDateRange(startDate, endDate);
    const completed = allTxs.filter(tx => tx.status === 'completed' || (tx.status as string) === 'complete');

    const totalSales = completed.reduce((sum, tx) => sum + (tx.total || 0), 0);
    const totalProfit = totalSales * 0.2;
    const totalTransactions = completed.length;
    const cashTotal = completed.filter(tx => tx.paymentMethod === 'cash').reduce((sum, tx) => sum + (tx.total || 0), 0);
    const gcashTotal = completed.filter(tx => tx.paymentMethod === 'gcash').reduce((sum, tx) => sum + (tx.total || 0), 0);
    const avgPerDay = daysInMonth > 0 ? totalSales / daysInMonth : 0;

    const daysMap = new Map<number, { transactions: number; sales: number; cashSales: number; gcashSales: number; profit: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      daysMap.set(d, { transactions: 0, sales: 0, cashSales: 0, gcashSales: 0, profit: 0 });
    }

    completed.forEach(tx => {
      const d = new Date(tx.createdAt || startDate).getDate();
      const existing = daysMap.get(d) || { transactions: 0, sales: 0, cashSales: 0, gcashSales: 0, profit: 0 };
      existing.transactions += 1;
      existing.sales += tx.total || 0;
      if (tx.paymentMethod === 'cash') existing.cashSales += tx.total || 0;
      if (tx.paymentMethod === 'gcash') existing.gcashSales += tx.total || 0;
      existing.profit += (tx.total || 0) * 0.2;
      daysMap.set(d, existing);
    });

    const days = Array.from(daysMap.entries()).map(([dayNum, stats]) => {
      const dayDate = new Date(year, mIndex, dayNum);
      return {
        date: dayDate.toISOString().slice(0, 10),
        ...stats,
      };
    });

    const techs = await localDb.technicians.toArray();
    const techBreakdown = techs.map(t => {
      const techTxs = completed.filter(tx => tx.technicianId === t.id);
      const jobs = techTxs.length;
      const sales = techTxs.reduce((sum, tx) => sum + (tx.total || 0), 0);
      const profit = sales * 0.2;
      const cashJobs = techTxs.filter(tx => tx.paymentMethod === 'cash').length;
      const gcashJobs = techTxs.filter(tx => tx.paymentMethod === 'gcash').length;
      return {
        technicianId: t.id as number,
        name: t.name as string,
        jobs,
        sales,
        profit,
        cashJobs,
        gcashJobs,
      };
    }).sort((a, b) => b.jobs - a.jobs);

    const allItems = await transactionItemService.list();
    const txItems = completed
      .flatMap(tx => tx.id ? allItems.filter(item => item.transactionId === tx.id) : [])
      .filter(item => item);

    const topServices = getTopServices(txItems);
    const topProducts = getTopProducts(txItems);

    return {
      monthLabel,
      totalSales,
      totalProfit,
      totalTransactions,
      cashTotal,
      gcashTotal,
      avgPerDay,
      days,
      technicianBreakdown: techBreakdown,
      topProducts,
      topServices,
    };
  },

  async getTechnicianReport(period: string = 'month'): Promise<any[]> {
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const txs = await transactionService.getByDateRange(startDate, now);
    const completed = txs.filter(tx => tx.status === 'completed' || (tx.status as string) === 'complete');
    const techs = await localDb.technicians.toArray();

    return techs.map(t => {
      const techTxs = completed.filter(tx => tx.technicianId === t.id);
      const jobs = techTxs.length;
      const sales = techTxs.reduce((sum, tx) => sum + (tx.total || 0), 0);
      const profit = sales * 0.2;
      const cashJobs = techTxs.filter(tx => tx.paymentMethod === 'cash').length;
      const gcashJobs = techTxs.filter(tx => tx.paymentMethod === 'gcash').length;
      return {
        technicianId: t.id as number,
        name: t.name as string,
        role: (t.role as string) || (t.specialization as string) || 'Senior Technician',
        jobs,
        sales,
        profit,
        cashJobs,
        gcashJobs,
      };
    }).sort((a, b) => b.jobs - a.jobs);
  },
};

// Dashboard Helper Functions
function getTopServices(items: TransactionItem[]): Array<{ name: string; count: number; revenue: number }> {
  const grouped = new Map<string, { count: number; revenue: number }>();
  items
    .filter(item => item.type === 'service')
    .forEach(item => {
      const current = grouped.get(item.name) || { count: 0, revenue: 0 };
      current.count += item.quantity || 0;
      current.revenue += item.subtotal || 0;
      grouped.set(item.name, current);
    });

  return Array.from(grouped.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function getTopProducts(items: TransactionItem[]): Array<{ name: string; count: number; revenue: number }> {
  const grouped = new Map<string, { count: number; revenue: number }>();
  items
    .filter(item => item.type === 'product')
    .forEach(item => {
      const current = grouped.get(item.name) || { count: 0, revenue: 0 };
      current.count += item.quantity || 0;
      current.revenue += item.subtotal || 0;
      grouped.set(item.name, current);
    });

  return Array.from(grouped.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function getSalesTrend(
  txs: Transaction[],
  period: 'today' | 'week' | 'month' | 'year',
  startDate: Date,
): Array<{ date: string; sales: number; profit: number }> {
  const grouped = new Map<string, { sales: number; profit: number }>();

  const completed = txs.filter(tx => tx.status === 'completed');
  completed.forEach(tx => {
    const txDate = new Date(tx.createdAt || new Date());
    let dateKey: string;

    if (period === 'today') {
      dateKey = `${txDate.getHours()}:00`;
    } else if (period === 'week') {
      dateKey = txDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (period === 'month') {
      dateKey = txDate.getDate().toString();
    } else {
      dateKey = txDate.toLocaleDateString('en-US', { month: 'short' });
    }

    const current = grouped.get(dateKey) || { sales: 0, profit: 0 };
    current.sales += tx.total || 0;
    current.profit += (tx.total || 0) * 0.2; // Simplified: 20% profit
    grouped.set(dateKey, current);
  });

  return Array.from(grouped.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .slice(0, 30);
}
