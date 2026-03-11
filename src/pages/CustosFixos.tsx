import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { parseCurrency, numberToMask } from "@/lib/currency-mask";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPercent, toNumber } from "@/lib/format";
import { Plus, Target } from "lucide-react";
import ItemActions from "@/components/ItemActions";

const CustosFixos = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [custos, setCustos] = useState<any[]>([]);
  const [meta, setMeta] = useState<number>(0);
  const [metaId, setMetaId] = useState<string | null>(null);
  const [metaInput, setMetaInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [form, setForm] = useState({ nome: "", valor: "", dia_vencimento: "", observacao: "" });
  const [faturamentoAtual, setFaturamentoAtual] = useState(0);

  const fetchData = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("custos_fixos").select("*").eq("empresa_id", empresaId).order("nome");
    setCustos(data || []);
    const mesAtual = new Date().toISOString().slice(0, 7) + "-01";
    const { data: metaData } = await supabase.from("metas_faturamento").select("*").eq("empresa_id", empresaId).eq("mes_referencia", mesAtual).single();
    if (metaData) { setMeta(toNumber(metaData.valor_meta)); setMetaId(metaData.id); setMetaInput(String(toNumber(metaData.valor_meta))); }
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const { data: fechData } = await supabase.from("fechamentos_diarios").select("total").eq("empresa_id", empresaId).gte("data", startOfMonth).lte("data", today);
    setFaturamentoAtual((fechData || []).reduce((s, f) => s + toNumber(f.total), 0));
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const totalCustos = custos.reduce((s, c) => s + toNumber(c.valor), 0);
  const percCustoFixo = meta > 0 ? (totalCustos / meta) * 100 : 0;
  const percFaturamentoCobre = totalCustos > 0 ? (faturamentoAtual / totalCustos) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    const payload = {
      empresa_id: empresaId, nome: form.nome, valor: toNumber(form.valor),
      dia_vencimento: parseInt(form.dia_vencimento), observacao: form.observacao || null,
    };
    if (editingId) {
      await supabase.from("custos_fixos").update(payload).eq("id", editingId);
      toast({ title: "Custo fixo atualizado!" });
    } else {
      await supabase.from("custos_fixos").insert(payload);
      toast({ title: "Custo fixo cadastrado!" });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const saveMeta = async () => {
    if (!empresaId) return;
    const mesAtual = new Date().toISOString().slice(0, 7) + "-01";
    const valor = toNumber(metaInput);
    if (metaId) {
      await supabase.from("metas_faturamento").update({ valor_meta: valor }).eq("id", metaId);
    } else {
      await supabase.from("metas_faturamento").insert({ empresa_id: empresaId, mes_referencia: mesAtual, valor_meta: valor });
    }
    setMeta(valor);
    toast({ title: "Meta atualizada!" });
    fetchData();
  };

  const resetForm = () => { setForm({ nome: "", valor: "", dia_vencimento: "", observacao: "" }); setEditingId(null); };

  const handleDelete = async (id: string) => {
    await supabase.from("custos_fixos").delete().eq("id", id);
    toast({ title: "Removido" });
    setDetailItem(null);
    fetchData();
  };

  const openEdit = (c: any) => {
    setForm({ nome: c.nome, valor: String(toNumber(c.valor)), dia_vencimento: String(c.dia_vencimento), observacao: c.observacao || "" });
    setEditingId(c.id);
    setDetailItem(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div />
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Custo Fixo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo"} Custo Fixo</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" placeholder="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Dia Vencimento</Label><Input type="number" min="1" max="31" placeholder="1" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} required /></div>
              </div>
              <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
              <Button type="submit" className="w-full">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Meta de Faturamento Mensal</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label>Valor da Meta (R$)</Label>
              <Input type="number" step="0.01" value={metaInput} onChange={(e) => setMetaInput(e.target.value)} placeholder="0" />
            </div>
            <Button onClick={saveMeta}>Salvar Meta</Button>
          </div>
        </CardContent>
      </Card>

      {meta > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm">Total de custos fixos: <strong>{formatCurrency(totalCustos)}</strong></p>
            <p className="text-sm">Seus custos fixos consomem <strong>{formatPercent(percCustoFixo)}</strong> da sua meta mensal.</p>
            <p className="text-sm">O faturamento atual cobre <strong>{formatPercent(percFaturamentoCobre)}</strong> dos custos fixos.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Custos Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {custos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo fixo cadastrado</p>
          ) : (
            <div className="space-y-2">
              {custos.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => setDetailItem(c)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">Vence dia {c.dia_vencimento}{c.observacao && ` · ${c.observacao}`}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-bold">{formatCurrency(toNumber(c.valor))}</p>
                    <ItemActions onEdit={() => openEdit(c)} onDelete={() => handleDelete(c.id)} deleteLabel="este custo fixo" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Custo Fixo</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Nome</p><p className="text-sm font-medium">{detailItem.nome}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor</p><p className="text-sm font-bold">{formatCurrency(toNumber(detailItem.valor))}</p></div>
                <div><p className="text-xs text-muted-foreground">Dia Vencimento</p><p className="text-sm font-medium">{detailItem.dia_vencimento}</p></div>
                {detailItem.observacao && <div className="col-span-2"><p className="text-xs text-muted-foreground">Observação</p><p className="text-sm">{detailItem.observacao}</p></div>}
              </div>
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

export default CustosFixos;
