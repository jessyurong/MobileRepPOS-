import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  downloadBackup,
  importBackup,
  validateBackup,
  useGetLastBackupTime,
  LAST_BACKUP_QUERY_KEY,
  type PosBackup,
} from "@/lib/offline-api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DatabaseBackup, Download, Upload, AlertTriangle, ShieldCheck } from "lucide-react";

export default function BackupPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: lastBackup } = useGetLastBackupTime();

  const [backingUp, setBackingUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    backup: PosBackup;
    fileName: string;
  } | null>(null);

  const handleDownloadBackup = async () => {
    setBackingUp(true);
    try {
      await downloadBackup();
      toast({ title: "Backup downloaded", description: "Your POS data backup was created on this device." });
      queryClient.invalidateQueries({ queryKey: LAST_BACKUP_QUERY_KEY });
    } catch (error) {
      toast({
        title: "Failed to download backup",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBackingUp(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const validation = validateBackup(data);
      if (!validation.valid) {
        toast({
          title: "Invalid backup file",
          description: validation.error || "This file is not a valid JEGZ POS backup.",
          variant: "destructive",
        });
        return;
      }
      setPendingRestore({ backup: data as PosBackup, fileName: file.name });
    } catch (error) {
      toast({
        title: "Invalid backup file",
        description:
          error instanceof Error && error.name === "SyntaxError"
            ? "This file is not valid JSON."
            : "This file could not be read.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setRestoring(true);
    try {
      const result = await importBackup(pendingRestore.backup, false);
      if (result.success) {
        setPendingRestore(null);
        toast({
          title: "Backup restored",
          description: `Successfully imported ${result.itemsImported} items.`,
        });
        // Reload so every screen reflects the restored data immediately.
        window.location.reload();
      } else {
        toast({ title: "Restore failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Restore failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      setRestoring(false);
    }
  };

  const restoreMetadata = pendingRestore?.backup.metadata;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary">
          <DatabaseBackup className="h-6 w-6" />
          Backup &amp; Restore
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Protect your JEGZ POS data by creating local backups. Everything stays on this device — no cloud, no servers.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* BACKUP */}
        <Card className="flex flex-col bg-card">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-primary" />
              Backup
            </CardTitle>
            <CardDescription>Create a local, offline copy of your POS data at any time.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 p-5">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Backup Status</p>
              <p className="mt-1 text-sm">
                {lastBackup ? (
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" />
                    Last backup: <strong>{formatDate(lastBackup)}</strong>
                  </span>
                ) : (
                  "No backup created yet."
                )}
              </p>
            </div>
            <Button size="lg" className="w-full gap-2" onClick={handleDownloadBackup} disabled={backingUp}>
              <Download className="h-4 w-4" />
              {backingUp ? "Generating backup..." : "Download Backup"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Backups include all products, services, technicians, transactions, jobs, inventory, drawer records, users,
              and shop settings — including your shop profile and logo.
            </p>
          </CardContent>
        </Card>

        {/* RESTORE */}
        <Card className="flex flex-col bg-card">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-primary" />
              Restore
            </CardTitle>
            <CardDescription>Restore your JEGZ POS data from a backup file.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 p-5">
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <p className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Warning:</strong> Restoring a backup may replace the current local POS data. Only restore a
                  backup you trust, and make sure you have a recent backup before proceeding.
                </span>
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelected}
              style={{ display: "none" }}
              id="backup-restore-input"
            />
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              <Upload className="h-4 w-4" />
              {busy ? "Reading file..." : "Import Backup"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Restore confirmation dialog */}
      <Dialog open={Boolean(pendingRestore)} onOpenChange={(open) => !open && !restoring && setPendingRestore(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Restore this backup?
            </DialogTitle>
            <DialogDescription>
              Restoring will replace the current local JEGZ POS data with the data contained in this backup.
            </DialogDescription>
          </DialogHeader>
          {pendingRestore && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="truncate font-medium">{pendingRestore.fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Backup version {pendingRestore.backup.version} · Exported {formatDate(pendingRestore.backup.exportDate)}
                </p>
                {restoreMetadata && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {restoreMetadata.transactionCount} transactions · {restoreMetadata.productCount} products ·{" "}
                    {restoreMetadata.serviceCount} services · {restoreMetadata.transactionItemCount} job items
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Make sure you have a recent backup of your current data before proceeding. This cannot be undone.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingRestore(null)} disabled={restoring}>
              Cancel
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmRestore}
              disabled={restoring}
            >
              {restoring ? "Restoring..." : "Restore Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}