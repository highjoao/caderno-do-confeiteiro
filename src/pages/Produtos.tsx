import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDecimal, formatQuantidade, convertAndCalcCost, toNumber } from "@/lib/format";
import { Plus, X } from "lucide-react";
import ItemActions from "@/components/ItemActions";

const UNIDADES_RECEITA = ["g", "Kg", "ml", "L", "Unidade"];

const Produtos = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [detailComponentes, setDetailComponentes] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "", tipo_venda: "Unidade",
    perc_custo_fixo: "", perc_lucro: "", perc_taxa_cartao: "", perc_taxa_delivery: "",
    rendimento_quantidade: "1",
  });
  const [componentes, setComponentes] = useState<{ tipo_componente: string; componente_id: string; quantidade: string; unidade_medida: string }[]>([]);

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

  const getDefaultUnit = (tipo: string, id: string): string => {
    if (tipo === "Base") {
      const base = bases.find((b) => b.id === id);
      return base?.rendimento_unidade || "g";
    }
    const insumo = insumos.find((i) => i.id === id);
    return insumo?.unidade || "g";
  };

  const calcCustoTotal = () => {
    return componentes.reduce((sum, comp) => {
      const qtd = toNumber(comp.quantidade);
      if (comp.tipo_componente === "Base") {
        const base = bases.find((b) => b.id === comp.componente_id);
        return sum + (base ? toNumber(base.custo_por_rendimento || base.custo_total) * qtd : 0);
      } else {
        const insumo = insumos.find((i) => i.id === comp.componente_id);
        if (!insumo) return sum;
        return sum + convertAndCalcCost(
          qtd,
          comp.unidade_medida,
          toNumber(insumo.custo_por_grama),
          toNumber(insumo.custo_por_unidade),
          insumo.unidade
        );
      }
    }, 0);
  };

  const calcPrecoIdeal = () => {
    const custo = calcCustoTotal();
    const totalPerc = toNumber(form.perc_custo_fixo) + toNumber(form.perc_lucro) + toNumber(form.perc_taxa_cartao) + toNumber(form.perc_taxa_delivery);
    const rendimento = Math.max(toNumber(form.rendimento_quantidade), 1);
    return (custo * (1 + totalPerc / 100)) / rendimento;
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
      rendimento_quantidade: Math.max(toNumber(form.rendimento_quantidade), 1),
    } as any;

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
        componentes.map((c) => ({
          produto_id: produtoId,
          tipo_componente: c.tipo_componente,
          componente_id: c.componente_id,
          quantidade: toNumber(c.quantidade),
          unidade_medida: c.unidade_medida || null,
        }))
      );
    }

    toast({ title: editingId ? "Produto atualizado!" : "Produto cadastrado!" });
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setForm({ nome: "", tipo_venda: "Unidade", perc_custo_fixo: "", perc_lucro: "", perc_taxa_cartao: "", perc_taxa_delivery: "", rendimento_quantidade: "1" });
    setComponentes([]);
    setEditingId(null);
  };

  const openEdit = async (p: any) => {
    setForm({
      nome: p.nome, tipo_venda: p.tipo_venda,
      perc_custo_fixo: String(toNumber(p.perc_custo_fixo)), perc_lucro: String(toNumber(p.perc_lucro)),
      perc_taxa_cartao: String(toNumber(p.perc_taxa_cartao)), perc_taxa_delivery: String(toNumber(p.perc_taxa_delivery)),
      rendimento_quantidade: String(toNumber(p.rendimento_quantidade) || 1),
    });
    const { data } = await supabase.from("produto_componentes").select("*").eq("produto_id", p.id);
    setComponentes((data || []).map((c: any) => ({
      tipo_componente: c.tipo_componente,
      componente_id: c.componente_id,
      quantidade: String(toNumber(c.quantidade)),
      unidade_medida: c.unidade_medida || getDefaultUnit(c.tipo_componente, c.componente_id),
    })));
    setEditingId(p.id);
    setDetailItem(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("produtos").delete().eq("id", id);
    toast({ title: "Removido" });
    setDetailItem(null);
    fetchData();
  };

  const openDetail = async (p: any) => {
    const { data } = await supabase.from("produto_componentes").select("*").eq("produto_id", p.id);
    setDetailComponentes(data || []);
    setDetailItem(p);
  };

  const getComponenteName = (comp: any) => {
    if (comp.tipo_componente === "Base") {
      return bases.find((b) => b.id === comp.componente_id)?.nome || "—";
    }
    return insumos.find((i) => i.id === comp.componente_id)?.nome || "—";
  };

  const getComponenteOptions = (tipo: string) => {
    if (tipo === "Base") return bases.map((b) => ({ id: b.id, nome: b.nome }));
    return insumos.filter((i) => tipo === "Embalagem" ? i.tipo === "Embalagem" : i.tipo === "Insumo").map((i) => ({ id: i.id, nome: i.nome }));
  };

  const custoTotal = calcCustoTotal();
  const precoIdeal = calcPrecoIdeal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Produtos (Ficha Técnica)</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button></DialogTrigger>
          <DialogContent>
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Componentes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setComponentes([...componentes, { tipo_componente: "Insumo", componente_id: "", quantidade: "", unidade_medida: "g" }])}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar
                  </Button>
                </div>
                <div className="space-y-3">
                  {componentes.map((comp, idx) => (
                    <div key={idx} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex gap-2 items-end">
                        <Select value={comp.tipo_componente} onValueChange={(v) => { const n = [...componentes]; n[idx].tipo_componente = v; n[idx].componente_id = ""; setComponentes(n); }}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Base">Base</SelectItem>
                            <SelectItem value="Insumo">Insumo</SelectItem>
                            <SelectItem value="Embalagem">Embalagem</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex-1 min-w-0">
                          <Select value={comp.componente_id} onValueChange={(v) => {
                            const n = [...componentes];
                            n[idx].componente_id = v;
                            n[idx].unidade_medida = getDefaultUnit(n[idx].tipo_componente, v);
                            setComponentes(n);
                          }}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{getComponenteOptions(comp.tipo_componente).map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setComponentes(componentes.filter((_, i) => i !== idx))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Quantidade</Label>
                          <Input type="number" step="0.0001" placeholder="0" value={comp.quantidade}
                            onChange={(e) => { const n = [...componentes]; n[idx].quantidade = e.target.value; setComponentes(n); }} />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Unidade</Label>
                          <Select value={comp.unidade_medida} onValueChange={(v) => { const n = [...componentes]; n[idx].unidade_medida = v; setComponentes(n); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{UNIDADES_RECEITA.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantas unidades a receita rende?</Label>
                <Input type="number" step="1" min="1" placeholder="1" value={form.rendimento_quantidade} onChange={(e) => setForm({ ...form, rendimento_quantidade: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>% Custo Fixo</Label><Input type="number" step="0.1" placeholder="0" value={form.perc_custo_fixo} onChange={(e) => setForm({ ...form, perc_custo_fixo: e.target.value })} /></div>
                <div className="space-y-2"><Label>% Lucro</Label><Input type="number" step="0.1" placeholder="0" value={form.perc_lucro} onChange={(e) => setForm({ ...form, perc_lucro: e.target.value })} /></div>
                <div className="space-y-2"><Label>% Taxa Cartão</Label><Input type="number" step="0.1" placeholder="0" value={form.perc_taxa_cartao} onChange={(e) => setForm({ ...form, perc_taxa_cartao: e.target.value })} /></div>
                <div className="space-y-2"><Label>% Taxa Delivery</Label><Input type="number" step="0.1" placeholder="0" value={form.perc_taxa_delivery} onChange={(e) => setForm({ ...form, perc_taxa_delivery: e.target.value })} /></div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 space-y-2">
                <div className="flex justify-between text-sm"><span>Custo Total da Receita:</span><span className="font-medium">{formatCurrency(custoTotal)}</span></div>
                <div className="flex justify-between text-sm"><span>+ Custo Fixo ({formatDecimal(toNumber(form.perc_custo_fixo), 1)}%):</span><span>{formatCurrency(custoTotal * toNumber(form.perc_custo_fixo) / 100)}</span></div>
                <div className="flex justify-between text-sm"><span>+ Lucro ({formatDecimal(toNumber(form.perc_lucro), 1)}%):</span><span>{formatCurrency(custoTotal * toNumber(form.perc_lucro) / 100)}</span></div>
                <div className="flex justify-between text-sm"><span>+ Taxa Cartão ({formatDecimal(toNumber(form.perc_taxa_cartao), 1)}%):</span><span>{formatCurrency(custoTotal * toNumber(form.perc_taxa_cartao) / 100)}</span></div>
                <div className="flex justify-between text-sm"><span>+ Taxa Delivery ({formatDecimal(toNumber(form.perc_taxa_delivery), 1)}%):</span><span>{formatCurrency(custoTotal * toNumber(form.perc_taxa_delivery) / 100)}</span></div>
                {Math.max(toNumber(form.rendimento_quantidade), 1) > 1 && (
                  <div className="flex justify-between text-sm text-muted-foreground"><span>÷ Rendimento:</span><span>{Math.max(toNumber(form.rendimento_quantidade), 1)} unidades</span></div>
                )}
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
                <div key={p.id} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDetail(p)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.tipo_venda} · Custo: {formatCurrency(toNumber(p.custo_total))} · Preço: {formatCurrency(toNumber(p.preco_ideal))}
                    </p>
                  </div>
                  <ItemActions onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} deleteLabel="este produto" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Produto</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="text-sm font-medium">{detailItem.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Venda</p>
                  <p className="text-sm font-medium">{detailItem.tipo_venda}</p>
                </div>
              </div>

              {detailComponentes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Componentes</p>
                  <div className="space-y-1">
                    {detailComponentes.map((c: any) => {
                      const unit = c.unidade_medida || getDefaultUnit(c.tipo_componente, c.componente_id);
                      return (
                        <div key={c.id} className="flex justify-between p-2 rounded bg-muted/50 text-sm">
                          <span>{c.tipo_componente}: {getComponenteName(c)}</span>
                          <span className="text-muted-foreground">{formatQuantidade(toNumber(c.quantidade), unit)} {unit}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-lg bg-primary/10 space-y-2">
                <div className="flex justify-between text-sm"><span>Custo Total:</span><span className="font-bold">{formatCurrency(toNumber(detailItem.custo_total))}</span></div>
                <div className="flex justify-between text-sm"><span>% Custo Fixo:</span><span>{formatDecimal(toNumber(detailItem.perc_custo_fixo), 1)}%</span></div>
                <div className="flex justify-between text-sm"><span>% Lucro:</span><span>{formatDecimal(toNumber(detailItem.perc_lucro), 1)}%</span></div>
                <div className="flex justify-between text-sm"><span>% Taxa Cartão:</span><span>{formatDecimal(toNumber(detailItem.perc_taxa_cartao), 1)}%</span></div>
                <div className="flex justify-between text-sm"><span>% Taxa Delivery:</span><span>{formatDecimal(toNumber(detailItem.perc_taxa_delivery), 1)}%</span></div>
                <div className="border-t border-primary/20 pt-2 flex justify-between text-lg font-bold text-primary">
                  <span>Preço Ideal:</span><span>{formatCurrency(toNumber(detailItem.preco_ideal))}/{detailItem.tipo_venda === "Quilo" ? "Kg" : "un"}</span>
                </div>
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

export default Produtos;
