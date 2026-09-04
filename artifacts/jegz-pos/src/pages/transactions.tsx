import { useState } from "react";
import {
  useListTransactions,
  useGetTransactionStats,
  useDeleteTransaction,
  useUpdateTransactionStatus,
  getListTransactionsQueryKey,
  getGetTransactionStatsQueryKey,
  getGetDashboardQueryKey,
  getGetCashDrawerQueryKey,
  getGetGcashDrawerQueryKey,
} from "@/lib/offline-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Trash2, CreditCard, Clock, Smartphone, Wrench, CheckCircle2, Clock3, Bell, Printer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type Period = "today" | "week" | "month" | "all";
type StatusFilter = "all" | "pending" | "ready" | "complete";

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge className="bg-amber-500 text-white gap-1"><Clock3 className="h-3 w-3" />Pending</Badge>;
  if (status === "ready") return <Badge className="bg-blue-500 text-white gap-1"><Bell className="h-3 w-3" />Ready</Badge>;
  if (status === "complete") return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Complete</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

type TxFromList = {
  id: number;
  customer: string;
  unit: string;
  technicianName: string;
  paymentMethod?: string | null;
  total: number;
  profit: number;
  status: string;
  hasPreOrder: boolean;
  createdAt: string;
  items: { type: string; refId?: number | null; name: string; qty: number; price: number; isPreOrder: boolean }[];
};

export default function TransactionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState<Period>("today");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: transactions = [], isLoading: isLoadingTx } = useListTransactions({
    period,
    search,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const { data: stats } = useGetTransactionStats({ period });

  const deleteTransaction = useDeleteTransaction();
  const updateStatus = useUpdateTransactionStatus();

  // Complete dialog state
  const [completeDialogTx, setCompleteDialogTx] = useState<TxFromList | null>(null);
  const [completePayMethod, setCompletePayMethod] = useState<"cash" | "gcash">("cash");
  const [completeCashReceived, setCompleteCashReceived] = useState<number>(0);

  // Receipt state
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTransactionStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCashDrawerQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetGcashDrawerQueryKey() });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this transaction? THIS CANNOT BE UNDONE.")) {
      deleteTransaction.mutate({ id }, {
        onSuccess: () => { toast({ title: "Transaction deleted" }); invalidateAll(); },
      });
    }
  };

  const handleMarkReady = (id: number) => {
    updateStatus.mutate({ id, data: { status: "ready" } }, {
      onSuccess: () => { toast({ title: "Marked as Ready for pickup!" }); invalidateAll(); },
    });
  };

  const openCompleteDialog = (tx: TxFromList) => {
    setCompleteDialogTx(tx);
    setCompletePayMethod("cash");
    setCompleteCashReceived(0);
  };

  const handleConfirmComplete = () => {
    if (!completeDialogTx) return;
    const tx = completeDialogTx;

    updateStatus.mutate(
      {
        id: tx.id,
        data: {
          status: "complete",
          paymentMethod: completePayMethod,
          cashReceived: completePayMethod === "cash" ? completeCashReceived : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Job complete — payment recorded in drawer!" });
          invalidateAll();
          setCompleteDialogTx(null);

          // Show receipt
          setReceiptData({
            id: tx.id,
            customer: tx.customer,
            unit: tx.unit,
            technicianName: tx.technicianName,
            items: tx.items,
            total: tx.total,
            profit: tx.profit,
            paymentMethod: completePayMethod,
            cashReceived: completePayMethod === "cash" ? completeCashReceived : 0,
            change: completePayMethod === "cash" ? Math.max(0, completeCashReceived - tx.total) : 0,
            createdAt: tx.createdAt,
          });
          setReceiptOpen(true);
        },
      }
    );
  };

  const changeAmount = completePayMethod === "cash" ? Math.max(0, completeCashReceived - (completeDialogTx?.total ?? 0)) : 0;

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Transaction History</h1>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
          {[
            { label: "Total Sales", value: formatCurrency(stats.totalSales), color: "text-primary" },
            { label: "Total Profit", value: formatCurrency(stats.totalProfit), color: "text-green-500" },
            { label: "Jobs Done", value: String(stats.count), color: "" },
            { label: "Cash Txns", value: String(stats.cashCount), color: "" },
            { label: "GCash Txns", value: String(stats.gcashCount), color: "text-blue-500" },
            { label: "Avg/Job", value: formatCurrency(stats.avgPerTransaction), color: "text-amber-600" },
          ].map((s) => (
            <Card key={s.label} className="bg-card">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-6 flex-1 min-h-0">
        <Card className="flex-1 flex flex-col bg-card overflow-hidden">
          <CardHeader className="py-3 px-4 border-b flex flex-row flex-wrap items-center gap-3 space-y-0 shrink-0">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer or unit..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="ready">Ready</TabsTrigger>
                <TabsTrigger value="complete">Complete</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {isLoadingTx ? (
                  <div className="text-center py-8">Loading...</div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No transactions found</div>
                ) : (
                  (transactions as TxFromList[]).map((tx) => (
                    <Card key={tx.id} className={`overflow-hidden border-l-4 transition-colors ${
                      tx.status === "pending" ? "border-l-amber-500" :
                      tx.status === "ready" ? "border-l-blue-500" :
                      "border-l-green-600"
                    }`}>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-wrap gap-2 items-center">
                            <div className="font-bold text-lg">{tx.customer}</div>
                            <Badge variant="outline" className="bg-muted text-xs">
                              <Smartphone className="h-3 w-3 mr-1" />{tx.unit}
                            </Badge>
                            <StatusBadge status={tx.status} />
                            {tx.hasPreOrder && <Badge className="bg-amber-500 text-white text-xs">Pre-order</Badge>}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-xl text-primary">{formatCurrency(tx.total)}</div>
                            {tx.status === "complete" && (
                              <div className="text-xs text-green-500 font-medium mt-1">Profit: {formatCurrency(tx.profit)}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center"><Clock className="h-3 w-3 mr-1" />{formatDate(tx.createdAt)}</span>
                          <span className="flex items-center"><Wrench className="h-3 w-3 mr-1" />Tech: {tx.technicianName}</span>
                          {tx.paymentMethod ? (
                            <span className="flex items-center">
                              <CreditCard className="h-3 w-3 mr-1" />
                              <span className={`uppercase font-bold ${tx.paymentMethod === "gcash" ? "text-blue-500" : "text-emerald-500"}`}>
                                {tx.paymentMethod}
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center text-muted-foreground italic text-xs">
                              <CreditCard className="h-3 w-3 mr-1" />Payment on pickup
                            </span>
                          )}
                          <span className="text-xs bg-muted/50 px-2 py-0.5 rounded-full ml-auto">
                            Txn #{tx.id.toString().padStart(6, "0")}
                          </span>
                        </div>

                        <div className="bg-muted/30 rounded p-2 text-sm flex justify-between items-center gap-2">
                          <div className="truncate flex-1">
                            <span className="font-semibold mr-2">Items:</span>
                            {tx.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {tx.status === "pending" && (
                              <Button
                                size="sm"
                                className="h-7 bg-blue-500 hover:bg-blue-600 text-white text-xs"
                                onClick={() => handleMarkReady(tx.id)}
                                disabled={updateStatus.isPending}
                              >
                                Mark Ready
                              </Button>
                            )}
                            {tx.status === "ready" && (
                              <Button
                                size="sm"
                                className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                                onClick={() => openCompleteDialog(tx)}
                                disabled={updateStatus.isPending}
                              >
                                Complete
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/20"
                              onClick={() => handleDelete(tx.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {stats && (
          <div className="w-72 shrink-0 hidden xl:flex flex-col gap-4 overflow-y-auto">
            {[
              { title: "Top Models", data: stats.topModels },
              { title: "Top Services", data: stats.topServices },
              { title: "Top Products", data: stats.topProducts },
            ].map((section) => (
              <Card key={section.title}>
                <CardHeader className="py-3 px-4 border-b">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {section.data.map((m, i) => (
                      <li key={i} className="flex justify-between px-4 py-2 text-sm">
                        <span className="truncate mr-2 font-medium">{m.name}</span>
                        <span className="font-bold text-primary">{m.count}</span>
                      </li>
                    ))}
                    {section.data.length === 0 && (
                      <li className="px-4 py-4 text-center text-muted-foreground text-sm">No data</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Complete Dialog — collect payment method */}
      <Dialog open={!!completeDialogTx} onOpenChange={(open) => !open && setCompleteDialogTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Complete Job — Collect Payment
            </DialogTitle>
          </DialogHeader>
          {completeDialogTx && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="font-bold text-base">{completeDialogTx.customer}</div>
                <div className="text-muted-foreground">{completeDialogTx.unit} · Tech: {completeDialogTx.technicianName}</div>
                <div className="font-bold text-primary text-lg pt-1">Total: {formatCurrency(completeDialogTx.total)}</div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="flex gap-2">
                  <Button
                    variant={completePayMethod === "cash" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCompletePayMethod("cash")}
                  >CASH</Button>
                  <Button
                    variant={completePayMethod === "gcash" ? "default" : "outline"}
                    className={completePayMethod === "gcash" ? "bg-blue-600 hover:bg-blue-700 text-white flex-1" : "flex-1"}
                    onClick={() => setCompletePayMethod("gcash")}
                  >GCASH</Button>
                </div>
              </div>

              {completePayMethod === "cash" && (
                <div className="space-y-2">
                  <Label>Cash Received (₱)</Label>
                  <Input
                    type="number"
                    value={completeCashReceived || ""}
                    onChange={(e) => setCompleteCashReceived(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="text-lg font-bold"
                    autoFocus
                  />
                  {completeCashReceived > 0 && (
                    <div className={`text-sm font-semibold ${changeAmount >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {changeAmount >= 0
                        ? `Change: ${formatCurrency(changeAmount)}`
                        : `Short by: ${formatCurrency(Math.abs(changeAmount))}`}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Payment will be recorded in the <strong>{completePayMethod === "gcash" ? "GCash" : "Cash"} Drawer</strong>.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogTx(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={handleConfirmComplete}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {updateStatus.isPending ? "Saving..." : "Confirm Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Job Slip / Receipt</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="p-4 bg-white text-black rounded">
              <div className="text-center mb-4 border-b pb-3 border-dashed border-gray-400">
                <h2 className="text-lg font-bold uppercase">JEGZ MOBILE REPAIR</h2>
                <p className="text-xs text-gray-500">Job Order — COMPLETE</p>
              </div>
              <div className="text-sm space-y-1 mb-4">
                <div className="flex justify-between"><span className="text-gray-500">Date:</span><span>{new Date().toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Job #:</span><span>#{receiptData.id?.toString().padStart(6, "0")}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-semibold">{receiptData.customer}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Unit:</span><span>{receiptData.unit}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Technician:</span><span>{receiptData.technicianName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment:</span><span className="font-bold uppercase">{receiptData.paymentMethod}</span></div>
              </div>
              <div className="border-t border-b border-dashed border-gray-400 py-2 mb-4">
                {receiptData.items?.map((item: any, i: number) => (
                  <div key={i} className="text-sm flex justify-between mb-1">
                    <span>{item.qty}x {item.name}{item.isPreOrder ? " [PRE]" : ""}</span>
                    <span>{formatCurrency(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                  <span>TOTAL</span><span>{formatCurrency(receiptData.total)}</span>
                </div>
                {receiptData.paymentMethod === "cash" && receiptData.cashReceived > 0 && (
                  <>
                    <div className="flex justify-between text-gray-600"><span>Cash Received</span><span>{formatCurrency(receiptData.cashReceived)}</span></div>
                    <div className="flex justify-between text-gray-600"><span>Change</span><span>{formatCurrency(receiptData.change)}</span></div>
                  </>
                )}
              </div>
              <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded text-center text-xs text-green-800 font-medium">
                ✅ COMPLETE — Recorded in {receiptData.paymentMethod === "gcash" ? "GCash" : "Cash"} Drawer
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button onClick={() => setReceiptOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
