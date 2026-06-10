import { SubscriptionDiscountCode, DiscountUsage } from '@/api/entities';
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Ticket, Edit2, Trash2 } from "lucide-react";
import { useToast } from "../components/ui/use-toast";
import AddDiscountCodeDialog from "../components/subscriptions/AddDiscountCodeDialog";
import EditDiscountCodeDialog from "../components/subscriptions/EditDiscountCodeDialog";
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

const tipoScontoLabels = {
  percentuale: "Percentuale",
  fisso: "Fisso",
  mesi_gratis: "Mesi Gratis",
  gratis_completo: "Abbonamento Gratuito"
};

const durataScontoLabels = {
  singolo: "Singolo uso",
  ricorrente: "Ricorrente",
  permanente: "Permanente"
};

export default function DiscountCodes() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [codeToDelete, setCodeToDelete] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const normalizeCode = (c) => ({
    ...c,
    attivo: c?.attivo ?? c?.is_active,
    created_date: c?.created_date ?? c?.created_at,
  });

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['discount-codes'],
    queryFn: async () => {
      const rows = await SubscriptionDiscountCode.list("-created_at");
      return (rows || []).map(normalizeCode);
    },
    initialData: [],
  });

  const { data: usages = [] } = useQuery({
    queryKey: ['discount-usages'],
    queryFn: () => DiscountUsage.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SubscriptionDiscountCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast({
        title: "Codice eliminato",
        type: "success"
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, attivo }) => SubscriptionDiscountCode.update(id, { attivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast({
        title: "Stato aggiornato",
        type: "success"
      });
    },
  });

  const getCodeUsages = (codeId) => {
    return usages.filter(u => u.discount_code_id === codeId).length;
  };

  const getCurrentUsages = (code) => {
    if (Number.isFinite(code?.utilizzi_attuali)) return code.utilizzi_attuali;
    return getCodeUsages(code.id);
  };

  const isCodeExpired = (code) => {
    if (!code.data_scadenza) return false;
    const d = new Date(code.data_scadenza);
    if (Number.isNaN(d.getTime())) return false;
    return d < new Date();
  };

  const isCodeLimitReached = (code) => {
    if (!code.max_utilizzi_totali || code.max_utilizzi_totali === 0) return false;
    return getCurrentUsages(code) >= code.max_utilizzi_totali;
  };

  return (
    <div className="p-4 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Codici Sconto Abbonamenti</h1>
          <p className="text-muted-foreground mt-1">Gestisci i codici sconto per gli abbonamenti dei ristoratori</p>
        </div>

        <div className="mb-6 flex justify-end">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Codice Sconto
          </Button>
        </div>

        <div className="grid gap-4">
          {codes.map(code => {
            const expired = isCodeExpired(code);
            const limitReached = isCodeLimitReached(code);
            const isInactive = !code.attivo || expired || limitReached;
            const currentUsages = getCurrentUsages(code);
            
            return (
              <Card key={code.id} className={`${isInactive ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Ticket className="w-6 h-6 text-red-600" />
                        <div>
                          <h3 className="text-xl font-bold">{code.codice}</h3>
                          {code.descrizione && (
                            <p className="text-sm text-muted-foreground">{code.descrizione}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Tipo Sconto</div>
                          <div className="font-semibold">
                            {tipoScontoLabels[code.tipo_sconto]}
                            {code.valore_sconto && (
                              <span className="ml-2 text-red-600">
                                {code.tipo_sconto === "percentuale" ? `${code.valore_sconto}%` :
                                 code.tipo_sconto === "fisso" ? `€${code.valore_sconto}` :
                                 code.tipo_sconto === "mesi_gratis" ? `${code.valore_sconto} mesi` : 
                                 "100%"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Durata</div>
                          <div className="font-semibold">{durataScontoLabels[code.durata_sconto]}</div>
                        </div>

                        {code.data_scadenza && (
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Scadenza</div>
                            <div className="font-semibold">
                              {new Date(code.data_scadenza).toLocaleDateString('it-IT')}
                              {expired && <Badge className="ml-2 bg-red-600">Scaduto</Badge>}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Utilizzi</div>
                          <div className="font-semibold">
                            {currentUsages || 0}
                            {code.max_utilizzi_totali > 0 && ` / ${code.max_utilizzi_totali}`}
                            {limitReached && <Badge className="ml-2 bg-orange-600">Limite raggiunto</Badge>}
                          </div>
                        </div>
                      </div>

                      {code.piani_applicabili && code.piani_applicabili.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Piani:</span> {code.piani_applicabili.join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 md:min-w-[200px]">
                      <Badge className={code.attivo && !expired && !limitReached ? "bg-green-500 text-white dark:bg-green-950/30 dark:text-green-100" : "bg-muted text-muted-foreground"}>
                        {code.attivo && !expired && !limitReached ? "Attivo" : "Disattivato"}
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCode(code)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Modifica
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ id: code.id, attivo: !code.attivo })}
                      >
                        {code.attivo ? "Disattiva" : "Attiva"}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCodeToDelete(code)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Elimina
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {codes.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Ticket className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Nessun codice sconto</h2>
                <p className="text-muted-foreground mb-6">Crea il primo codice sconto per gli abbonamenti</p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Primo Codice
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <AddDiscountCodeDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
        />

        {editingCode && (
          <EditDiscountCodeDialog
            open={!!editingCode}
            onClose={() => setEditingCode(null)}
            code={editingCode}
          />
        )}
        <AlertDialog open={!!codeToDelete} onOpenChange={(open) => !open && setCodeToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare codice sconto?</AlertDialogTitle>
              <AlertDialogDescription>
                Vuoi eliminare il codice "{codeToDelete?.codice ?? ''}"? L'operazione è definitiva.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  const id = codeToDelete?.id;
                  setCodeToDelete(null);
                  if (!id) return;
                  deleteMutation.mutate(id);
                }}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}