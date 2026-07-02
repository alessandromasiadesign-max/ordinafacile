import { Restaurant, Table, Event } from '@/api/entities';
import React, { useState, useEffect, useRef } from "react";
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Edit2,
  QrCode,
  Download,
  Printer,
  ExternalLink,
  Table as TableIcon,
  Utensils,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Tables() {
  const [restaurant, setRestaurant] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [qrTable, setQrTable] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", is_active: true, event_id: "", pay_at_counter: false });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const printRef = useRef(null);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return Table.filter({ restaurant_id: restaurant.id }, 'name');
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', restaurant?.id],
    queryFn: async () => {
      if (!restaurant) return [];
      return Event.filter({ restaurant_id: restaurant.id }, '-created_at');
    },
    enabled: !!restaurant,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (payload) => Table.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Tavolo creato", type: "success" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => Table.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setShowDialog(false);
      setEditingTable(null);
      resetForm();
      toast({ title: "Tavolo aggiornato", type: "success" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Table.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setTableToDelete(null);
      toast({ title: "Tavolo eliminato", type: "success" });
    },
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const isAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin';
      const storedId = localStorage.getItem('selected_restaurant_id');

      const restaurants = isAdmin
        ? await Restaurant.list('-created_at')
        : await Restaurant.filter({ user_id: user.id });

      if (restaurants.length > 0) {
        const selected = restaurants.find((r) => r.id === storedId) || restaurants[0];
        if (selected?.id) {
          localStorage.setItem('selected_restaurant_id', selected.id);
        }
        setRestaurant(selected);
      }
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", is_active: true, event_id: "", pay_at_counter: false });
    setEditingTable(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (table) => {
    setEditingTable(table);
    setFormData({
      name: table.name || "",
      description: table.description || "",
      is_active: table.is_active !== false,
      event_id: table.event_id || "",
      pay_at_counter: table.pay_at_counter === true,
    });
    setShowDialog(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const payload = {
      restaurant_id: restaurant.id,
      name: formData.name.trim(),
      description: formData.description.trim(),
      is_active: formData.is_active,
      event_id: formData.event_id || null,
      pay_at_counter: formData.pay_at_counter,
    };
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getTableUrl = (table) => {
    const params = new URLSearchParams();
    params.set('table', table.id);
    if (table.event_id) params.set('event', table.event_id);
    return `${window.location.origin}/r/${restaurant.id}?${params.toString()}`;
  };

  const eventNameById = (id) => {
    if (!id) return null;
    const ev = events.find((e) => e.id === id);
    return ev?.nome || ev?.name || 'Menu evento';
  };

  const generateQr = async (table) => {
    setQrTable(table);
    setIsGeneratingQr(true);
    try {
      const QRCode = (await import('qrcode')).default;
      const url = getTableUrl(table);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Errore generazione QR:", error);
      toast({ title: "Errore QR", description: "Impossibile generare il QR code", variant: "destructive" });
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !qrTable) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-tavolo-${qrTable.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQr = () => {
    if (!qrDataUrl || !qrTable) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = `
      <html>
        <head>
          <title>QR Tavolo ${qrTable.name}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
            .container { text-align: center; padding: 40px; }
            img { width: 300px; height: 300px; }
            h1 { margin: 24px 0 8px; font-size: 28px; }
            p { color: #666; margin: 0; font-size: 16px; }
            .hint { margin-top: 16px; font-size: 13px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${qrDataUrl}" alt="QR Code Tavolo ${qrTable.name}" />
            <h1>${restaurant?.nome || 'Ristorante'}</h1>
            <p>Tavolo ${qrTable.name}</p>
            <p class="hint">Scansiona per ordinare dal tuo tavolo</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gestione <span className="gradient-text">Tavoli</span></h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Crea i QR code per ogni tavolo e ricevi ordini direttamente dai clienti
            </p>
          </div>
          <Button onClick={openAddDialog} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Tavolo
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground mt-4 text-sm">Caricamento tavoli...</p>
          </div>
        ) : tables.length === 0 ? (
          <Card>
            <CardContent className="p-8 md:p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
                <TableIcon className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nessun tavolo</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                Crea il primo tavolo per generare il QR code. I clienti potranno scansionarlo e ordinare direttamente dal loro posto.
              </p>
              <Button onClick={openAddDialog} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Crea il primo tavolo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className={`overflow-hidden ${table.is_active === false ? 'opacity-70' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{table.name}</h3>
                      {table.description && (
                        <p className="text-xs text-muted-foreground truncate">{table.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant={table.is_active === false ? "secondary" : "default"} className={table.is_active === false ? "" : "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"}>
                        {table.is_active === false ? "Disattivato" : "Attivo"}
                      </Badge>
                      {table.pay_at_counter === true && (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900/40">
                          Paga alla cassa
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-2">
                    {table.event_id ? (
                      <span className="inline-flex items-center gap-1">
                        <Utensils className="w-3 h-3" />
                        Menu: {eventNameById(table.event_id)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Utensils className="w-3 h-3" />
                        Menu: standard
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mb-4 break-all">
                    {getTableUrl(table)}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => generateQr(table)}
                      disabled={isGeneratingQr}
                    >
                      <QrCode className="w-4 h-4 mr-1.5" />
                      QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(table)}
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" />
                      Modifica
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setTableToDelete(table)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog aggiunta/modifica */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingTable ? "Modifica tavolo" : "Nuovo tavolo"}</DialogTitle>
              <DialogDescription>
                {editingTable
                  ? "Aggiorna nome e descrizione del tavolo."
                  : "Inserisci il nome del tavolo. I clienti scannerizzeranno il QR code per ordinare."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="table-name">Nome tavolo *</Label>
                <Input
                  id="table-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Es. Tavolo 1, Terrazza 3, Bancone..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-desc">Descrizione / Ubicazione</Label>
                <Input
                  id="table-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Es. Vicino alla finestra, Sala interna..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-menu">Menu associato</Label>
                <Select
                  value={formData.event_id || "__standard__"}
                  onValueChange={(value) => setFormData({ ...formData, event_id: value === "__standard__" ? "" : value })}
                >
                  <SelectTrigger id="table-menu">
                    <SelectValue placeholder="Seleziona menu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__standard__">Menu Ristorante (standard)</SelectItem>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>{ev.nome || ev.name || 'Evento'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="table-active" className="cursor-pointer">Tavolo attivo</Label>
                <Switch
                  id="table-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <button
                type="button"
                className={`flex w-full items-center gap-3 p-3 border-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  formData.pay_at_counter
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-border hover:bg-accent/60'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, pay_at_counter: !prev.pay_at_counter }))}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  formData.pay_at_counter
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-border'
                }`}>
                  {formData.pay_at_counter && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Paga alla cassa</div>
                  <div className="text-xs text-muted-foreground">Il cliente ordina senza pagare online e paga alla cassa</div>
                </div>
              </button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Annulla
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={!formData.name.trim()}>
                {editingTable ? "Salva" : "Crea tavolo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog eliminazione */}
      <AlertDialog open={!!tableToDelete} onOpenChange={() => setTableToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {tableToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Il QR code associato non sarà più valido. L'azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTableToDelete(null)}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tableToDelete && deleteMutation.mutate(tableToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog QR code */}
      <Dialog open={!!qrTable} onOpenChange={() => { setQrTable(null); setQrDataUrl(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR code - {qrTable?.name}</DialogTitle>
            <DialogDescription>
              Stampa o scarica il QR code e posizionalo sul tavolo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4" ref={printRef}>
            {isGeneratingQr ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code ${qrTable?.name}`}
                className="w-48 h-48 rounded-lg border border-border"
              />
            ) : (
              <div className="w-48 h-48 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground text-sm">
                QR non disponibile
              </div>
            )}
            <p className="mt-4 text-center font-medium text-foreground">{restaurant?.nome}</p>
            <p className="text-center text-sm text-muted-foreground">Tavolo {qrTable?.name}</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={downloadQr} disabled={!qrDataUrl} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Scarica
            </Button>
            <Button variant="outline" onClick={printQr} disabled={!qrDataUrl} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Stampa
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const url = getTableUrl(qrTable);
                if (url) window.open(url, "_blank");
              }}
              disabled={!qrTable}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Apri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
