import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, toNumber } from "@/lib/format";
import { Plus, Trash2, Edit2, X } from "lucide-react";

const UNIDADES_REND = ["Unidade", "g", "Kg", "ml", "L"];

const Bases = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [bases, setBases] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", rendimento_quantidade: "", rendimento_unidade: "g" });
  const [insumosBase, setInsumosBase] = useState<{ insumo_id: string; quantidade_usada: string }[]>([]);

  const fetchData = async () => {
    if (!empresaId) return;
    const { data: basesData } = await supabase.from("bases").select("*").eq("empresa_id", empresaId).order("nome");
    setBases(basesData || []);
    const { data: insumosData } = await supabase.from("insumos").select("*").eq("empresa_id", empresaId).order("nome");
    setInsumos(insumosData || []);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const calcCustoTotal = () => {
    return insumosBase.reduce((sum, ib) => {
      const insumo = insumos.find((i) => i.id === ib.insumo_id);
      if (!insumo) return sum;
      return sum + toNumber(ib.quantidade_usada) * toNumber(insumo.custo_por_unidade);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    const custoTotal = calcCustoTotal();
    const rendQtd = toNumber(form.rendimento_quantidade);
    const custoPorRendimento = rendQtd > 0 ? custoTotal / rendQtd : 0;

    const payload = {
      empresa_id: empresaId,
      nome: form.nome,
      rendimento_quantidade: rendQtd || null,
      rendimento_unidade: form.rendimento_unidade,
      custo_total: custoTotal,
      custo_por_rendimento: custoPorRendimento,
    };

    let baseId: string;
    if (editingId) {
      await supabase.from("bases").update(payload).eq("id", editingId);
      baseId = editingId;
      // Remove old insumos
      await supabase.from("base_insumos").delete().eq("base_id", editingId);
    } else {
      const { data } = await supabase.from("bases").insert(payload).select().single();
      if (!data) return;
      baseId = data.id;
    }

    // Insert insumos
    if (insumosBase.length > 0) {
      await supabase.from("base_insumos").insert(
        insumosBase.map((ib) => ({ base_id: baseId, insumo_id: ib.insumo_id, quantidade_usada: toNumber(ib.quantidade_usada) }))
      );
    }

    toast({ title: editingId ? "Base atualizada!" : "Base cadastrada!" });
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => { setForm({ nome: "", rendimento_quantidade: "", rendimento_unidade: "g" }); setInsumosBase([]); setEditingId(null); };

  const openEdit = async (b: any) => {
    setForm({ nome: b.nome, rendimento_quantidade: String(toNumber(b.rendimento_quantidade)), rendimento_unidade: b.rendimento_unidade || "g" });
    const { data } = await supabase.from("base_insumos").select("*").eq("base_id", b.id);
    setInsumosBase((data || []).map((bi: any) => ({ insumo_id: bi.insumo_id, quantidade_usada: String(toNumber(bi.quantidade_usada)) })));
    setEditingId(b.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => { await supabase.from("bases").delete().eq("id", id); toast({ title: "Removida" }); fetchData(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Bases</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Base</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Base</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Massa de Bolo" /></div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Insumos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setInsumosBase([...insumosBase, { insumo_id: "", quantidade_usada: "" }])}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {insumosBase.map((ib, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select value={ib.insumo_id} onValueChange={(v) => { const n = [...insumosBase]; n[idx].insumo_id = v; setInsumosBase(n); }}>
                          <SelectTrigger><SelectValue placeholder="Insumo" /></SelectTrigger>
                          <SelectContent>{insumos.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome} ({i.unidade})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input className="w-24" type="number" step="0.0001" placeholder="Qtd" value={ib.quantidade_usada}
                        onChange={(e) => { const n = [...insumosBase]; n[idx].quantidade_usada = e.target.value; setInsumosBase(n); }} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setInsumosBase(insumosBase.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-sm text-muted-foreground">Custo Total da Base</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(calcCustoTotal())}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Rendimento (Qtd)</Label><Input type="number" step="0.0001" value={form.rendimento_quantidade} onChange={(e) => setForm({ ...form, rendimento_quantidade: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={form.rendimento_unidade} onValueChange={(v) => setForm({ ...form, rendimento_unidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES_REND.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {bases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma base cadastrada</p>
          ) : (
            <div className="divide-y divide-border">
              {bases.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{b.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Custo: {formatCurrency(toNumber(b.custo_total))}
                      {b.rendimento_quantidade && ` · Rend: ${toNumber(b.rendimento_quantidade)} ${b.rendimento_unidade}`}
                      {b.custo_por_rendimento && ` · ${formatCurrency(toNumber(b.custo_por_rendimento))}/${b.rendimento_unidade}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Bases;
