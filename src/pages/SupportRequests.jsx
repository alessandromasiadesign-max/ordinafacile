import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Headphones, Mail, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "../components/ui/toast";

const statusColors = {
  aperta: "bg-blue-100 text-blue-800 border-blue-300",
  in_lavorazione: "bg-yellow-100 text-yellow-800 border-yellow-300",
  completata: "bg-green-100 text-green-800 border-green-300"
};

const statusLabels = {
  aperta: "📋 Aperta",
  in_lavorazione: "🔧 In Lavorazione",
  completata: "✅ Completata"
};

export default function SupportRequests() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [emailSettings, setEmailSettings] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['support-requests'],
    queryFn: () => base44.entities.TechnicalSupport.list("-created_date"),
    initialData: [],
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: ['all-restaurants'],
    queryFn: () => base44.entities.Restaurant.list(),
    initialData: [],
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => base44.entities.PlatformSettings.list(),
    initialData: [],
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TechnicalSupport.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      toast({
        title: "✅ Richiesta aggiornata",
        type: "success"
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (email) => {
      if (settings.length > 0) {
        return base44.entities.PlatformSettings.update(settings[0].id, {
          email_assistenza: email
        });
      } else {
        return base44.entities.PlatformSettings.create({
          email_assistenza: email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({
        title: "✅ Email salvata",
        description: "L'indirizzo email è stato aggiornato",
        type: "success"
      });
    },
  });

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant?.nome || "N/A";
  };

  const openRequests = requests.filter(r => r.stato === "aperta");
  const inProgressRequests = requests.filter(r => r.stato === "in_lavorazione");
  const completedRequests = requests.filter(r => r.stato === "completata");

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Richieste Assistenza</h1>
          <p className="text-gray-500 mt-1">Gestisci le richieste di supporto dei ristoratori</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Configurazione Email Assistenza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="supporto@tuodominio.it"
                  value={emailSettings || settings[0]?.email_assistenza || ""}
                  onChange={(e) => setEmailSettings(e.target.value)}
                />
              </div>
              <Button
                onClick={() => updateSettingsMutation.mutate(emailSettings || settings[0]?.email_assistenza)}
                className="bg-red-600 hover:bg-red-700"
              >
                Salva Email
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Le richieste di assistenza verranno inviate a questo indirizzo
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Aperte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{openRequests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">In Lavorazione</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{inProgressRequests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Completate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedRequests.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {requests.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Headphones className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-lg">{getRestaurantName(request.restaurant_id)}</h3>
                      <Badge className={`${statusColors[request.stato]} border`}>
                        {statusLabels[request.stato]}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="font-medium">{request.nome_contatto}</span>
                        <span>•</span>
                        <a href={`mailto:${request.email_contatto}`} className="text-blue-600 hover:underline">
                          {request.email_contatto}
                        </a>
                      </div>
                      {request.telefono_contatto && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${request.telefono_contatto}`} className="text-blue-600 hover:underline">
                            {request.telefono_contatto}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(request.created_date), "d MMM yyyy, HH:mm", { locale: it })}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-3">
                      <p className="text-sm whitespace-pre-wrap">{request.descrizione}</p>
                    </div>

                    {request.disponibilita_oraria && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Disponibilità:</span> {request.disponibilita_oraria}
                      </p>
                    )}

                    {request.screenshot_urls && request.screenshot_urls.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">Screenshot allegati:</p>
                        <div className="flex gap-2">
                          {request.screenshot_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Screenshot ${i + 1}`} className="w-20 h-20 object-cover rounded border hover:opacity-80" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 md:min-w-[200px]">
                    <Select
                      value={request.stato}
                      onValueChange={(value) => updateRequestMutation.mutate({
                        id: request.id,
                        data: { stato: value }
                      })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aperta">Aperta</SelectItem>
                        <SelectItem value="in_lavorazione">In Lavorazione</SelectItem>
                        <SelectItem value="completata">Completata</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      Aggiungi Note
                    </Button>
                  </div>
                </div>

                {request.note_admin && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-1">Note interne:</p>
                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                      {request.note_admin}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {requests.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Headphones className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Nessuna richiesta</h2>
                <p className="text-gray-500">Le richieste di assistenza appariranno qui</p>
              </CardContent>
            </Card>
          )}
        </div>

        {selectedRequest && (
          <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Note Interne</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label>Aggiungi note per questa richiesta</Label>
                <Textarea
                  defaultValue={selectedRequest.note_admin || ""}
                  placeholder="Note interne visibili solo agli admin..."
                  rows={4}
                  id="note-admin"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Annulla
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    const note = document.getElementById('note-admin').value;
                    updateRequestMutation.mutate({
                      id: selectedRequest.id,
                      data: { note_admin: note }
                    });
                    setSelectedRequest(null);
                  }}
                >
                  Salva Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}