/**
 * Offline-First React Hooks
 * These replace the API-based react-query hooks with local IndexedDB queries
 */

import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import bcrypt from 'bcryptjs';
import { localDb } from './local-db';
import {
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

// Product Hooks
export function useListProducts(
  _params?: any,
): UseQueryResult<Product[], unknown> {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productService.list(),
    staleTime: Infinity,
  });
}

export function useGetProduct(id: number | undefined): UseQueryResult<Product | undefined, unknown> {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => (id ? productService.get(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useCreateProduct(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => productService.create(data?.data || data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct(): UseMutationResult<void, unknown, { id: number; data: Partial<Product> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct(): UseMutationResult<void, unknown, { id: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Service Hooks
export function useListServices(
  _params?: any,
): UseQueryResult<Service[], unknown> {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => serviceService.list(),
    staleTime: Infinity,
  });
}

export function useGetService(id: number | undefined): UseQueryResult<Service | undefined, unknown> {
  return useQuery({
    queryKey: ['service', id],
    queryFn: () => (id ? serviceService.get(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useCreateService(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => serviceService.create(data?.data || data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService(): UseMutationResult<void, unknown, { id: number; data: Partial<Service> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => serviceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteService(): UseMutationResult<void, unknown, { id: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => serviceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

// Technician Hooks
export function useListTechnicians(
  _params?: any,
): UseQueryResult<Technician[], unknown> {
  return useQuery({
    queryKey: ['technicians'],
    queryFn: () => technicianService.list(),
    staleTime: Infinity,
  });
}

export function useGetTechnician(id: number | undefined): UseQueryResult<Technician | undefined, unknown> {
  return useQuery({
    queryKey: ['technician', id],
    queryFn: () => (id ? technicianService.get(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useCreateTechnician(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => technicianService.create(data?.data || data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });
}

export function useUpdateTechnician(): UseMutationResult<void, unknown, { id: number; data: Partial<Technician> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => technicianService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });
}

export function useDeleteTechnician(): UseMutationResult<void, unknown, { id: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => technicianService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });
}

// Transaction Hooks
export function useListTransactions(
  _params?: any,
): UseQueryResult<Transaction[], unknown> {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.list(),
    staleTime: Infinity,
  });
}

export function useGetTransaction(id: number | undefined): UseQueryResult<Transaction | undefined, unknown> {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => (id ? transactionService.get(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useCreateTransaction(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      // Extract items from payload if present
      const items = data.items || [];
      const { items: _, ...transactionData } = data;

      // Map cart items to transaction items
      const txItems = items.map((item: any) => ({
        type: item.type as 'product' | 'service',
        refId: item.id,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        subtotal: (item.quantity || 1) * (item.price || 0),
      }));

      // Create transaction with items
      const txId = await transactionService.createWithItems(
        {
          customer: data.customerName || 'Walk-in',
          unit: data.customerPhone || undefined,
          paymentMethod: data.paymentMethod || 'cash',
          status: 'completed',
          total: data.total || 0,
          notes: data.notes || undefined,
        },
        txItems,
      );

      return txId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTransaction(): UseMutationResult<void, unknown, { id: number; data: Partial<Transaction> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => transactionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateTransactionStatus(): UseMutationResult<void, unknown, { id: number; status?: string; data?: { status: string; paymentMethod?: string; cashReceived?: number } }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, data }) => {
      const newStatus = (data?.status || status) as any;
      const paymentMethod = data?.paymentMethod as any;
      const updateData: any = { status: newStatus };
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      await transactionService.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction(): UseMutationResult<void, unknown, { id: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      // Get transaction items to restore product stock
      const items = await transactionItemService.getByTransactionId(id);
      for (const item of items) {
        if (item.type === 'product') {
          const product = await productService.get(item.refId);
          if (product) {
            await productService.update(item.refId, {
              stock: (product.stock ?? 0) + (item.quantity ?? 0),
            });
          }
        }
        // Delete the item
        if (item.id) {
          await transactionItemService.delete(item.id);
        }
      }
      // Delete the transaction
      return transactionService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Transaction Stats Hook
export function useGetTransactionStats(
  params?: { period?: string },
): UseQueryResult<any, unknown> {
  return useQuery({
    queryKey: ['transactionStats', params?.period],
    queryFn: () =>
      transactionService.getStats((params?.period || 'today') as any),
    staleTime: Infinity,
  });
}

// Defective Items Hooks
export function useListDefectiveItems(
  _params?: any,
): UseQueryResult<DefectiveItem[], unknown> {
  return useQuery({
    queryKey: ['defectiveItems'],
    queryFn: () => defectiveItemService.list(),
    staleTime: Infinity,
  });
}

export function useCreateDefectiveItem(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => defectiveItemService.create(data?.data || data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defectiveItems'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Backjob Hooks
export function useListBackjobs(
  _params?: any,
): UseQueryResult<Backjob[], unknown> {
  return useQuery({
    queryKey: ['backjobs'],
    queryFn: () => backjobService.list(),
    staleTime: Infinity,
  });
}

export function useGetBackjob(id: number | undefined): UseQueryResult<Backjob | undefined, unknown> {
  return useQuery({
    queryKey: ['backjob', id],
    queryFn: () => (id ? backjobService.get(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
}

export function useCreateBackjob(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => backjobService.create(data?.data || data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backjobs'] });
    },
  });
}

export function useUpdateBackjobStatus(): UseMutationResult<void, unknown, { id: number; status?: string; data?: { status: string } }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, data }) =>
      backjobService.update(id, { status: ((data?.status || status) as any) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backjobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBackjob(): UseMutationResult<void, unknown, { id: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => backjobService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backjobs'] });
    },
  });
}

// Cash Drawer Hooks
export function useGetCashDrawer(): UseQueryResult<{ balance: number; entries: any[] }, unknown> {
  return useQuery({
    queryKey: ['cashDrawer'],
    queryFn: () => cashDrawerService.get(),
    staleTime: Infinity,
  });
}

export function useAddCashDrawerEntry(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry) => cashDrawerService.addEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashDrawer'] });
    },
  });
}

// Gcash Drawer Hooks
export function useGetGcashDrawer(): UseQueryResult<{ balance: number; entries: any[] }, unknown> {
  return useQuery({
    queryKey: ['gcashDrawer'],
    queryFn: () => gcashDrawerService.get(),
    staleTime: Infinity,
  });
}

export function useAddGcashDrawerEntry(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry) => gcashDrawerService.addEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gcashDrawer'] });
    },
  });
}

// Settings Hooks
export function useGetSettings(): UseQueryResult<Record<string, any>, unknown> {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.get(),
    staleTime: Infinity,
  });
}

export function useUpdateSettings(): UseMutationResult<void, unknown, { data: Record<string, any> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }) => {
      for (const [key, value] of Object.entries(data)) {
        await settingsService.set(key, value);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

// Dashboard Hook
export function useGetDashboard(params?: { period?: string }): UseQueryResult<Dashboard, unknown> {
  return useQuery({
    queryKey: ['dashboard', params?.period],
    queryFn: () =>
      dashboardService.getDashboard((params?.period || 'today') as any),
    staleTime: Infinity,
  });
}

// Report Hooks
export function useGetMonthlyReport(params?: { month?: string }): UseQueryResult<any, unknown> {
  return useQuery({
    queryKey: ['monthlyReport', params?.month],
    queryFn: () => dashboardService.getMonthlyReport(params?.month),
    staleTime: Infinity,
  });
}

export function useGetTechnicianReport(params?: { period?: string }): UseQueryResult<any[], unknown> {
  return useQuery({
    queryKey: ['technicianReport', params?.period],
    queryFn: () => dashboardService.getTechnicianReport(params?.period),
    staleTime: Infinity,
  });
}

// Customer Lookup Hook
export function useLookupCustomer(params?: { query?: string }): UseQueryResult<any, unknown> {
  return useQuery({
    queryKey: ['customerLookup', params?.query],
    queryFn: async () => {
      return null;
    },
    staleTime: Infinity,
  });
}

// Cash Drawer Operations (Deposits/Withdrawals)
export function useCashDeposit(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => {
      const d = payload?.data || payload;
      const amount = Number(d?.amount || 0);
      const note = d?.note || d?.notes || 'Deposit';
      return cashDrawerService.addEntry({ type: 'deposit', amount, note, notes: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashDrawer'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCashWithdraw(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => {
      const d = payload?.data || payload;
      const amount = Number(d?.amount || 0);
      const note = d?.note || d?.notes || 'Withdrawal';
      return cashDrawerService.addEntry({ type: 'withdraw', amount, note, notes: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashDrawer'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Gcash Drawer Operations (Deposits/Withdrawals)
export function useGcashDeposit(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => {
      const d = payload?.data || payload;
      const amount = Number(d?.amount || 0);
      const note = d?.note || d?.notes || 'GCash Deposit';
      return gcashDrawerService.addEntry({ type: 'deposit', amount, note, notes: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gcashDrawer'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useGcashWithdraw(): UseMutationResult<number, unknown, any> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => {
      const d = payload?.data || payload;
      const amount = Number(d?.amount || 0);
      const note = d?.note || d?.notes || 'GCash Withdrawal';
      return gcashDrawerService.addEntry({ type: 'withdraw', amount, note, notes: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gcashDrawer'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Change Password Hook
export function useChangePassword(): UseMutationResult<any, unknown, { data: { currentPassword?: string; password?: string; newPassword: string } }> {
  return useMutation({
    mutationFn: async ({ data }) => {
      const stored = localStorage.getItem('jegz_session_user');
      if (!stored) throw new Error("Not logged in");
      const sessionUser = JSON.parse(stored);
      const dbUser = await localDb.users.get(sessionUser.id);
      if (!dbUser) throw new Error("User not found");

      const curr = data.currentPassword || data.password;
      if (curr && dbUser.passwordHash) {
        const valid = await bcrypt.compare(curr, dbUser.passwordHash as string);
        if (!valid) throw new Error("Incorrect current password");
      }
      const newHash = await bcrypt.hash(data.newPassword, 10);
      await localDb.users.update(dbUser.id as number, { passwordHash: newHash });
      return { success: true };
    },
  });
}

// Query Key Getters (for cache invalidation)
export function getGetCashDrawerQueryKey() {
  return ['cashDrawer'] as const;
}

export function getGetGcashDrawerQueryKey() {
  return ['gcashDrawer'] as const;
}

export function getListProductsQueryKey() {
  return ['products'] as const;
}

export function getListServicesQueryKey() {
  return ['services'] as const;
}

export function getListTechniciansQueryKey() {
  return ['technicians'] as const;
}

export function getListTransactionsQueryKey() {
  return ['transactions'] as const;
}

export function getListDefectiveItemsQueryKey() {
  return ['defectiveItems'] as const;
}

export function getListBackjobsQueryKey() {
  return ['backjobs'] as const;
}

export function getGetTransactionStatsQueryKey(params?: any) {
  return ['transactionStats', params?.period] as const;
}

export function getGetDashboardQueryKey(params?: any) {
  return ['dashboard', params?.period] as const;
}
