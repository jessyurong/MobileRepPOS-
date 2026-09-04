/**
 * Offline-First API Compatibility Layer
 * Re-exports offline hooks with API-compatible names
 * Replaces @workspace/api-client-react imports
 */

export {
  useListProducts,
  useListProducts as useGetProducts,
  useGetProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useListServices,
  useListServices as useGetServices,
  useGetService,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useListTechnicians,
  useGetTechnician,
  useCreateTechnician,
  useUpdateTechnician,
  useDeleteTechnician,
  useListTransactions,
  useListTransactions as useGetTransactions,
  useGetTransaction,
  useCreateTransaction,
  useUpdateTransaction,
  useUpdateTransactionStatus,
  useDeleteTransaction,
  useGetTransactionStats,
  useListDefectiveItems,
  useCreateDefectiveItem,
  useListBackjobs,
  useGetBackjob,
  useCreateBackjob,
  useUpdateBackjobStatus,
  useDeleteBackjob,
  useGetCashDrawer,
  useAddCashDrawerEntry,
  useCashDeposit,
  useCashWithdraw,
  getGetCashDrawerQueryKey,
  useGetGcashDrawer,
  useAddGcashDrawerEntry,
  useGcashDeposit,
  useGcashWithdraw,
  getGetGcashDrawerQueryKey,
  useGetSettings,
  useUpdateSettings,
  useChangePassword,
  useGetDashboard,
  useGetMonthlyReport,
  useGetTechnicianReport,
  useLookupCustomer,
  getListProductsQueryKey,
  getListServicesQueryKey,
  getListTechniciansQueryKey,
  getListTransactionsQueryKey,
  getListDefectiveItemsQueryKey,
  getListBackjobsQueryKey,
  getGetTransactionStatsQueryKey,
  getGetDashboardQueryKey,
} from './offline-hooks';

// Export backup/restore functions
export {
  exportBackup,
  importBackup,
  downloadBackup,
  getBackupSummary,
  validateBackup,
  type PosBackup,
} from './backup-restore';

// Also export data services for direct use
export {
  productService,
  serviceService,
  technicianService,
  transactionService,
  transactionItemService,
  defectiveItemService,
  backjobService,
  cashDrawerService,
  gcashDrawerService,
  settingsService,
  dashboardService,
  type Product,
  type Service,
  type Technician,
  type Transaction,
  type TransactionItem,
  type DefectiveItem,
  type Backjob,
  type Dashboard,
  type Settings,
} from './offline-data-services';

// Type aliases for compatibility
export type SettingsInput = Record<string, any>;
export type BackjobStatus = 'pending' | 'in_progress' | 'done' | 'in-progress' | 'completed';
