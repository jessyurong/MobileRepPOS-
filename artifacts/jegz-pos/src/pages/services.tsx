import { useState } from "react";
import {
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  getListServicesQueryKey
} from "@/lib/offline-api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Smartphone, Apple } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ServicesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: services = [], isLoading } = useListServices();

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "android" as "android" | "iphone",
    price: 0
  });

  const androidServices = services.filter(s => s.type === 'android');
  const iphoneServices = services.filter(s => s.type === 'iphone');

  const openAdd = (type: "android" | "iphone" = "android") => {
    setEditingId(null);
    setFormData({ name: "", type, price: 0 });
    setModalOpen(true);
  };

  const openEdit = (service: any) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      type: service.type,
      price: service.price
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return toast({ title: "Name is required", variant: "destructive" });

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
      setModalOpen(false);
      toast({ title: "Saved successfully" });
    };

    if (editingId) {
      updateService.mutate({ id: editingId, data: formData }, { onSuccess });
    } else {
      createService.mutate({ data: formData }, { onSuccess });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteService.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          toast({ title: "Deleted successfully" });
        }
      });
    }
  };

  const ServiceTable = ({ data, type }: { data: any[], type: string }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service Name</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No {type} services found</TableCell></TableRow>
        ) : (
          data.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell className="text-right font-semibold text-primary">{formatCurrency(service.price)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(service)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/20" onClick={() => handleDelete(service.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Labor Services</h1>
        <Button onClick={() => openAdd("android")} className="gap-2">
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Android Services
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => openAdd("android")}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="p-4 text-center">Loading...</div> : <ServiceTable data={androidServices} type="Android" />}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-slate-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5 text-slate-400" />
              iPhone Services
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => openAdd("iphone")}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="p-4 text-center">Loading...</div> : <ServiceTable data={iphoneServices} type="iPhone" />}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Add New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Screen Replacement" />
            </div>
            <div className="space-y-2">
              <Label>Device Type</Label>
              <Select value={formData.type} onValueChange={(v: "android" | "iphone") => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="iphone">iPhone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Labor Price (₱)</Label>
              <Input type="number" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createService.isPending || updateService.isPending}>
              Save Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}