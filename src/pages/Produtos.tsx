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
import { formatCurrency, formatPercent, toNumber } from "@/lib/format";
import { Plus, Trash2, Edit2, X } from "lucide-react";

const Produtos = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "", tipo_venda: "Unidade",
    perc_custo_fixo: "0", perc_lucro: "0", perc_taxa_cartao: "0", perc_taxa_delivery: "0",
  });
  const [componentes, setComponentes] = useState<{ tipo_componente: string; componente_id: string; quantidade: string }[]>([]);

  const fetchData = async () => {
    if (!empresaId) return;
    const [{ data: p }, { data: b }, { data: i }] = await Promise.all([
      supabase.from("produtos").select("*").eq("empresa_id", empresaId).order("nome"),
      supabase.from("bases").select("*").eq("empresa_id", empresaId).order("nome"),
      supabase.from("insumos").select("*").eq("empresa_id", empresaId).order("nome"),
    ]);
    setProdutos(p || []);
    setBases(b || []);
    setInsumos(i || []);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const calcCustoTotal = () => {
    return componentes.reduce((sum, comp) => {
      const qtd = toNumber(comp.quantidade);
      if (comp.tipo_componente === "Base") {
        const base = bases.find((b) => b.id === comp.componente_id);
        return sum + (base ? toNumber(base.custo_por_rendimento || base.custo_total) * qtd : 0);
      } else {
        const insumo = insumos.find((i) => i.id === comp.componente_id);
        return sum + (insumo ? toNumber(insumo.custo_por_unidade) * qtd : 0);
      }
    }, 0);
  };

  const calcPrecoIdeal = () => {
    const custo = calcCustoTotal();
    const totalPerc = toNumber(form.perc_custo_fixo) + toNumber(form.perc_lucro) + toNumber(form.perc_taxa_cartao) + toNumber(form.perc_taxa_delivery);
    if (totalPerc >= 100) return custo * 2;
    return custo / (1 - totalPerc / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    const custoTotal = calcCustoTotal();
    const precoIdeal = calcPrecoIdeal();

    const payload = {
      empresa_id: empresaId,
      nome: form.nome,
      tipo_venda: form.tipo_venda,
      custo_total: custoTotal,
      perc_custo_fixo: toNumber(form.perc_custo_fixo),
      perc_lucro: toNumber(form.perc_lucro),
      perc_taxa_cartao: toNumber(form.perc_taxa_cartao),
      perc_taxa_delivery: toNumber(form.perc_taxa_delivery),
      preco_ideal: precoIdeal,
    };

    let produtoId: string;
    if (editingId) {
      await supabase.from("produtos").update(payload).eq("id", editingId);
      produtoId = editingId;
      await supabase.from("produto_componentes").delete().eq("produto_id", editingId);
    } else {
      const { data } = await supabase.from("produtos").insert(payload).select().single();
      if (!data) return;
      produtoId = data.id;
    }

    if (componentes.length > 0) {
      await supabase.from("produto_componentes").insert(
        componentes.map((c) => ({ produto_id: produtoId, tipo_componente: c.tipo_componente, componente_id: c.componente_id, quantidade: toNumber(c.quantidade) }))
      );
    }

    toast({ title: editingId ? "Produto atualizado!" : "Produto cadastrado!" });
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setForm({ nome: "", tipo_venda: "Unidade", perc_custo_fixo: "0", perc_lucro: "0", perc_taxa_cartao: "0", perc_taxa_delivery: "0" });
    setComponentes([]);
    setEditingId(null);
  };

  const openEdit = async (p: any) => {
    setForm({
      nome: p.nome, tipo_venda: p.tipo_venda,
      perc_custo_fixo: String(toNumber(p.perc_custo_fixo)), perc_lucro: String(toNumber(p.perc_lucro)),
      perc_taxa_cartao: String(toNumber(p.perc_taxa_cartao)), perc_taxa_delivery: String(toNumber(p.perc_taxa_delivery)),
    });
    const { data } = await supabase.from("produto_componentes").select("*").eq("produto_id", p.id);
    setComponentes((data || []).map((c: any) => ({ tipo_componente: c.tipo_componente, componente_id: c.componente_id, quantidade: String(toNumber(c.quantidade)) })));
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => { await supabase.from("produtos").delete().eq("id", id); toast({ title: "Removido" }); fetchData(); };

  const getComponenteOptions = (tipo: string) => {
    if (tipo === "Base") return bases.map((b) => ({ id: b.id, nome: b.nome }));
    return insumos.filter((i) => tipo === "Embalagem" ? i.tipo === "Embalagem" : i.tipo === "Insumo").map((i) => ({ id: i.id, nome: i.nome }));
  };

  const custoTotal = calcCustoTotal();
  const precoIdeal = calcPrecoIdeal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Produtos (Ficha Técnica)</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
                <div className="space-y-2">
                  <Label>Tipo de Venda</Label>
                  <Select value={form.tipo_venda} onValueChange={(v) => setForm({ ...form, tipo_venda: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unidade">Por Unidade</SelectItem>
                      <SelectItem value="Quilo">Por Quilo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Componentes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Componentes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setComponentes([...componentes, { tipo_componente: "Insumo", componente_id: "", quantidade: "" }])}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {componentes.map((comp, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <Select value={comp.tipo_componente} onValueChange={(v) => { const n = [...componentes]; n[idx].tipo_componente = v; n[idx].componente_id = ""; setComponentes(n); }}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Base">Base</SelectItem>
                          <SelectItem value="Insumo">Insumo</SelectItem>
                          <SelectItem value="Embalagem">Embalagem</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex-1">
                        <Select value={comp.componente_id} onValueChange={(v) => { const n = [...componentes]; n[idx].componente_id = v; setComponentes(n); }}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{getComponenteOptions(comp.tipo_componente).map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input className="w-20" type="number" step="0.0001" placeholder="Qtd" value={comp.quantidade}
                        onChange={(e) => { const n = [...componentes]; n[idx].quantidade = e.target.value; setComponentes(n); }} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setComponentes(componentes.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Margens */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>% Custo Fixo</Label><Input type="number" step="0.1" value={form.perc_custo_fixo} onChange={(e) => setForm({ ...form, perc_custo_fixo: e.target.value })} /></div>
                <div className="space-y-2"><Label>% Lucro</Label><Input type="number" step="0.1" value={form.perc_lucro} onChange={(e) => setForm({ ...form, perc_lucro: e.target.value })} /></div>
                <div className="space-y-2"><Label>% Taxa Cartão</Label><Input type="number" step="0.1" value={form.perc_taxa_cartao} onChange={(e) => setForm({ ...form, perc_taxa_cartao: e.target.value })} /></div>
                <div className="space-y-2"><Label>% Taxa Delivery</Label><Input type="number" step="0.1" value={form.perc_taxa_delivery} onChange={(e) => setForm({ ...form, perc_taxa_delivery: e.target.value })} /></div>
              </div>

              {/* Breakdown */}
              <div className="p-4 rounded-lg bg-primary/10 space-y-2">
                <div className="flex justify-between text-sm"><span>Custo Total:</span><span className="font-medium">{formatCurrency(custoTotal)}</span></div>
                <div className="flex justify-between text-sm"><span>+ Custo Fixo ({form.perc_custo_fixo}%):</span><span>{formatCurrency(custoTotal * toNumber(form.perc_custo_fixo) / 100)}</span></div>
                <div className="flex justify-between text-sm"><span>+ Lucro ({form.perc_lucro}%):</span><span>{formatCurrency(custoTotal * toNumber(form.perc_lucro) / 100)}</span></div>
                <div className="flex justify-between text-sm"><span>+ Taxa Cartão ({form.perc_taxa_cartao}%):</span><span>{formatCurrency(custoTotal * toNumber(form.perc_taxa_cartao) / 100)}</span></div>
                <div className="flex justify-between text-sm"><span>+ Taxa Delivery ({form.perc_taxa_delivery}%):</span><span>{formatCurrency(custoTotal * toNumber(form.perc_taxa_delivery) / 100)}</span></div>
                <div className="border-t border-primary/20 pt-2 flex justify-between text-lg font-bold text-primary">
                  <span>Preço Ideal:</span><span>{formatCurrency(precoIdeal)}/{form.tipo_venda === "Quilo" ? "Kg" : "un"}</span>
                </div>
              </div>

              <Button type="submit" className="w-full">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {produtos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto cadastrado</p>
          ) : (
            <div className="divide-y divide-border">
              {produtos.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.tipo_venda} · Custo: {formatCurrency(toNumber(p.custo_total))} · Preço: {formatCurrency(toNumber(p.preco_ideal))}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
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

export default Produtos;
