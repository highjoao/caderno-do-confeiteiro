import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ItemActions from "@/components/ItemActions";

const Faturamento = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [form, setForm] = useState({ data: "", cartao: "", pix: "", dinheiro: "", delivery: "", observacao: "" });

  const fetchData = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("fechamentos_diarios").select("*").eq("empresa_id", empresaId).order("data", { ascending: false });
    setFechamentos(data || []);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const total = (toNumber(form.cartao) + toNumber(form.pix) + toNumber(form.dinheiro) + toNumber(form.delivery));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    const payload = {
      empresa_id: empresaId, data: form.data,
      cartao: toNumber(form.cartao), pix: toNumber(form.pix),
      dinheiro: toNumber(form.dinheiro), delivery: toNumber(form.delivery),
      total, observacao: form.observacao || null,
    };

    if (editingId) {
      const { error } = await supabase.from("fechamentos_diarios").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Fechamento atualizado!" });
    } else {
      const { data: existing } = await supabase.from("fechamentos_diarios").select("id").eq("empresa_id", empresaId).eq("data", form.data).single();
      if (existing) {
        const { error } = await supabase.from("fechamentos_diarios").update(payload).eq("id", existing.id);
        if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Fechamento atualizado (data já existia)!" });
      } else {
        const { error } = await supabase.from("fechamentos_diarios").insert(payload);
        if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Fechamento registrado!" });
      }
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setForm({ data: "", cartao: "", pix: "", dinheiro: "", delivery: "", observacao: "" });
    setEditingId(null);
  };

  const openEdit = (f: any) => {
    setForm({
      data: f.data, cartao: String(toNumber(f.cartao)), pix: String(toNumber(f.pix)),
      dinheiro: String(toNumber(f.dinheiro)), delivery: String(toNumber(f.delivery)),
      observacao: f.observacao || "",
    });
    setEditingId(f.id);
    setDetailItem(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("fechamentos_diarios").delete().eq("id", id);
    toast({ title: "Fechamento removido" });
    setDetailItem(null);
    fetchData();
  };

  const chartData = [...fechamentos].reverse().map((f) => ({
    data: new Date(f.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    total: toNumber(f.total),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Fechamento Diário</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Fechamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar Fechamento" : "Novo Fechamento"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cartão (R$)</Label><Input type="number" step="0.01" value={form.cartao} onChange={(e) => setForm({ ...form, cartao: e.target.value })} placeholder="0" /></div>
                <div className="space-y-2"><Label>Pix (R$)</Label><Input type="number" step="0.01" value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} placeholder="0" /></div>
                <div className="space-y-2"><Label>Dinheiro (R$)</Label><Input type="number" step="0.01" value={form.dinheiro} onChange={(e) => setForm({ ...form, dinheiro: e.target.value })} placeholder="0" /></div>
                <div className="space-y-2"><Label>Delivery (R$)</Label><Input type="number" step="0.01" value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value })} placeholder="0" /></div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-sm text-muted-foreground">Total do Dia</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
              </div>
              <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Opcional..." /></div>
              <Button type="submit" className="w-full">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(340,25%,90%)" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="total" stroke="hsl(340,60%,65%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Extrato</CardTitle></CardHeader>
        <CardContent>
          {fechamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum fechamento registrado</p>
          ) : (
            <div className="space-y-2">
              {fechamentos.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => setDetailItem(f)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatDate(f.data)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Cartão: {formatCurrency(toNumber(f.cartao))} · Pix: {formatCurrency(toNumber(f.pix))} · Din: {formatCurrency(toNumber(f.dinheiro))} · Del: {formatCurrency(toNumber(f.delivery))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-bold">{formatCurrency(toNumber(f.total))}</p>
                    <ItemActions onEdit={() => openEdit(f)} onDelete={() => handleDelete(f.id)} deleteLabel="este fechamento" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Fechamento</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div><p className="text-xs text-muted-foreground">Data</p><p className="text-sm font-medium">{formatDate(detailItem.data)}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Cartão</p><p className="text-sm font-medium">{formatCurrency(toNumber(detailItem.cartao))}</p></div>
                <div><p className="text-xs text-muted-foreground">Pix</p><p className="text-sm font-medium">{formatCurrency(toNumber(detailItem.pix))}</p></div>
                <div><p className="text-xs text-muted-foreground">Dinheiro</p><p className="text-sm font-medium">{formatCurrency(toNumber(detailItem.dinheiro))}</p></div>
                <div><p className="text-xs text-muted-foreground">Delivery</p><p className="text-sm font-medium">{formatCurrency(toNumber(detailItem.delivery))}</p></div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(toNumber(detailItem.total))}</p>
              </div>
              {detailItem.observacao && (
                <div><p className="text-xs text-muted-foreground">Observação</p><p className="text-sm">{detailItem.observacao}</p></div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => openEdit(detailItem)}>Editar</Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleDelete(detailItem.id)}>Excluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Faturamento;
