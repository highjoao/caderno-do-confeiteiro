import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDecimal, formatQuantidade, convertAndCalcCost, toNumber } from "@/lib/format";
import { Plus, X, FileText, Package, Scale, Percent, Calculator } from "lucide-react";
import ItemActions from "@/components/ItemActions";
import { useAutoSaveDraft } from "@/hooks/use-auto-save-draft";
import { DraftStatusIndicator } from "@/components/DraftStatusIndicator";

const UNIDADES_RECEITA = ["g", "Kg", "ml", "L", "Unidade"];

interface Toggles {
  custoFixo: boolean;
  lucro: boolean;
  taxaCartao: boolean;
  taxaDelivery: boolean;
}

type ProdutoDraft = {
  form: { nome: string; tipo_venda: string; perc_custo_fixo: string; perc_lucro: string; perc_taxa_cartao: string; perc_taxa_delivery: string; rendimento_quantidade: string };
  componentes: { tipo_componente: string; componente_id: string; quantidade: string; unidade_medida: string }[];
  toggles: Toggles;
  editingId: string | null;
};

const calcPrecoLoja = (custoBase: number, percCustoFixo: number, percLucro: number, percTaxaCartao: number, toggles: Toggles) => {
  let preco = custoBase;
  if (toggles.custoFixo && percCustoFixo > 0) preco = preco / (1 - percCustoFixo / 100);
  if (toggles.lucro && percLucro > 0) preco = preco / (1 - percLucro / 100);
  if (toggles.taxaCartao && percTaxaCartao > 0) preco = preco / (1 - percTaxaCartao / 100);
  return preco;
};

const calcPrecoDelivery = (precoLoja: number, percTaxaDelivery: number, toggles: Toggles) => {
  let preco = precoLoja;
  if (toggles.taxaDelivery && percTaxaDelivery > 0) preco = preco / (1 - percTaxaDelivery / 100);
  return preco;
};

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
  const [toggles, setToggles] = useState<Toggles>({ custoFixo: true, lucro: true, taxaCartao: true, taxaDelivery: true });
  const [form, setForm] = useState({
    nome: "", tipo_venda: "Unidade",
    perc_custo_fixo: "", perc_lucro: "", perc_taxa_cartao: "", perc_taxa_delivery: "",
    rendimento_quantidade: "1",
  });
  const [componentes, setComponentes] = useState<{ tipo_componente: string; componente_id: string; quantidade: string; unidade_medida: string }[]>([]);
  const [showRecovery, setShowRecovery] = useState(false);

  const draftData = useMemo<ProdutoDraft>(() => ({ form, componentes, toggles, editingId }), [form, componentes, toggles, editingId]);

  const { status: draftStatus, loadDraft, hasDraft, clearDraft } = useAutoSaveDraft<ProdutoDraft>({
    key: "produtos_editor",
    data: draftData,
    enabled: dialogOpen,
  });

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

  // Check for recovery draft on mount
  useEffect(() => {
    if (hasDraft()) {
      setShowRecovery(true);
    }
  }, []);

  const recoverDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setForm(draft.form);
      setComponentes(draft.componentes);
      setToggles(draft.toggles);
      setEditingId(draft.editingId);
      setDialogOpen(true);
    }
    setShowRecovery(false);
  };

  const discardDraft = () => {
    clearDraft();
    setShowRecovery(false);
  };

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

  const custoInsumos = calcCustoTotal();
  const rendimento = Math.max(toNumber(form.rendimento_quantidade), 1);
  const custoBase = custoInsumos / rendimento;
  const percCustoFixo = toNumber(form.perc_custo_fixo);
  const percLucro = toNumber(form.perc_lucro);
  const percTaxaCartao = toNumber(form.perc_taxa_cartao);
  const percTaxaDelivery = toNumber(form.perc_taxa_delivery);
  const precoLoja = calcPrecoLoja(custoBase, percCustoFixo, percLucro, percTaxaCartao, toggles);
  const precoDelivery = calcPrecoDelivery(precoLoja, percTaxaDelivery, toggles);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    const payload = {
      empresa_id: empresaId,
      nome: form.nome,
      tipo_venda: form.tipo_venda,
      custo_total: custoInsumos,
      perc_custo_fixo: percCustoFixo,
      perc_lucro: percLucro,
      perc_taxa_cartao: percTaxaCartao,
      perc_taxa_delivery: percTaxaDelivery,
      preco_ideal: precoDelivery,
      rendimento_quantidade: rendimento,
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
    clearDraft();
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setForm({ nome: "", tipo_venda: "Unidade", perc_custo_fixo: "", perc_lucro: "", perc_taxa_cartao: "", perc_taxa_delivery: "", rendimento_quantidade: "1" });
    setComponentes([]);
    setEditingId(null);
    setToggles({ custoFixo: true, lucro: true, taxaCartao: true, taxaDelivery: true });
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      clearDraft();
      resetForm();
    }
    setDialogOpen(open);
  };

  const openEdit = async (p: any) => {
    setForm({
      nome: p.nome, tipo_venda: p.tipo_venda,
      perc_custo_fixo: String(toNumber(p.perc_custo_fixo)), perc_lucro: String(toNumber(p.perc_lucro)),
      perc_taxa_cartao: String(toNumber(p.perc_taxa_cartao)), perc_taxa_delivery: String(toNumber(p.perc_taxa_delivery)),
      rendimento_quantidade: String(toNumber(p.rendimento_quantidade) || 1),
    });
    setToggles({
      custoFixo: toNumber(p.perc_custo_fixo) > 0,
      lucro: toNumber(p.perc_lucro) > 0,
      taxaCartao: toNumber(p.perc_taxa_cartao) > 0,
      taxaDelivery: toNumber(p.perc_taxa_delivery) > 0,
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

  const unitLabel = form.tipo_venda === "Quilo" ? "Kg" : "un";

  // Helper to calc cascade prices for detail view
  const calcDetailPrices = (item: any) => {
    const rend = Math.max(toNumber(item.rendimento_quantidade), 1);
    const base = toNumber(item.custo_total) / rend;
    const pf = toNumber(item.perc_custo_fixo);
    const pl = toNumber(item.perc_lucro);
    const pc = toNumber(item.perc_taxa_cartao);
    const pd = toNumber(item.perc_taxa_delivery);
    const allOn: Toggles = { custoFixo: pf > 0, lucro: pl > 0, taxaCartao: pc > 0, taxaDelivery: pd > 0 };
    const loja = calcPrecoLoja(base, pf, pl, pc, allOn);
    const delivery = calcPrecoDelivery(loja, pd, allOn);
    return { base, loja, delivery, pf, pl, pc, pd, rend };
  };

  return (
    <div className="space-y-6">
      {/* Recovery Dialog */}
      <AlertDialog open={showRecovery} onOpenChange={setShowRecovery}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edição não finalizada</AlertDialogTitle>
            <AlertDialogDescription>
              Encontramos uma edição não finalizada de um produto. Deseja continuar de onde parou?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardDraft}>Descartar rascunho</AlertDialogCancel>
            <AlertDialogAction onClick={recoverDraft}>Continuar edição</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Ficha Técnica</h2>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{editingId ? "Editar" : "Novo"} Produto</DialogTitle>
                <DraftStatusIndicator status={draftStatus} />
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto pr-1 space-y-5">
              {/* Seção: Dados Principais */}
              <div className="rounded-lg border border-border/60 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Dados Principais</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                  </div>
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
              </div>

              {/* Seção: Componentes */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Componentes</h3>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setComponentes([...componentes, { tipo_componente: "Insumo", componente_id: "", quantidade: "", unidade_medida: "g" }])}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {componentes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">Nenhum componente adicionado</p>
                  )}
                  {componentes.map((comp, idx) => {
                    const bgByType = comp.tipo_componente === "Base"
                      ? "bg-[hsl(340,60%,97%)]"
                      : comp.tipo_componente === "Embalagem"
                        ? "bg-[hsl(270,40%,97%)]"
                        : "bg-card";
                    return (
                      <div key={idx} className={`rounded-md border border-border/40 p-3 space-y-2 ${bgByType}`}>
                        <div className="flex gap-2 items-center">
                          <Select value={comp.tipo_componente} onValueChange={(v) => { const n = [...componentes]; n[idx].tipo_componente = v; n[idx].componente_id = ""; setComponentes(n); }}>
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Base">Receita</SelectItem>
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
                          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setComponentes(componentes.filter((_, i) => i !== idx))}>
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
                    );
                  })}
                </div>
              </div>

              {/* Seção: Rendimento */}
              <div className="rounded-lg border border-border/60 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Rendimento</h3>
                </div>
                <div className="space-y-2">
                  <Label>Quantas unidades a receita rende?</Label>
                  <Input type="number" step="1" min="1" placeholder="1" value={form.rendimento_quantidade} onChange={(e) => setForm({ ...form, rendimento_quantidade: e.target.value })} />
                </div>
              </div>

              {/* Seção: Percentuais */}
              <div className="rounded-lg border border-border/60 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Formação de Preço</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border/40 bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={toggles.custoFixo} onCheckedChange={(v) => setToggles({ ...toggles, custoFixo: v })} />
                      <Label className="text-xs font-medium">% Custo Fixo</Label>
                    </div>
                    <Input type="number" step="0.1" placeholder="0" value={form.perc_custo_fixo} onChange={(e) => setForm({ ...form, perc_custo_fixo: e.target.value })} disabled={!toggles.custoFixo} />
                  </div>
                  <div className="rounded-md border border-border/40 bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={toggles.lucro} onCheckedChange={(v) => setToggles({ ...toggles, lucro: v })} />
                      <Label className="text-xs font-medium">% Lucro</Label>
                    </div>
                    <Input type="number" step="0.1" placeholder="0" value={form.perc_lucro} onChange={(e) => setForm({ ...form, perc_lucro: e.target.value })} disabled={!toggles.lucro} />
                  </div>
                  <div className="rounded-md border border-border/40 bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={toggles.taxaCartao} onCheckedChange={(v) => setToggles({ ...toggles, taxaCartao: v })} />
                      <Label className="text-xs font-medium">% Taxa Cartão</Label>
                    </div>
                    <Input type="number" step="0.1" placeholder="0" value={form.perc_taxa_cartao} onChange={(e) => setForm({ ...form, perc_taxa_cartao: e.target.value })} disabled={!toggles.taxaCartao} />
                  </div>
                  <div className="rounded-md border border-border/40 bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={toggles.taxaDelivery} onCheckedChange={(v) => setToggles({ ...toggles, taxaDelivery: v })} />
                      <Label className="text-xs font-medium">% Taxa Delivery</Label>
                    </div>
                    <Input type="number" step="0.1" placeholder="0" value={form.perc_taxa_delivery} onChange={(e) => setForm({ ...form, perc_taxa_delivery: e.target.value })} disabled={!toggles.taxaDelivery} />
                  </div>
                </div>
              </div>

              {/* Seção: Resumo de Precificação */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Resumo de Precificação</h3>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Custo de Insumos</span>
                  <span className="font-medium">{formatCurrency(custoInsumos)}</span>
                </div>
                {rendimento > 1 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>÷ Rendimento ({rendimento} un)</span>
                    <span>{formatCurrency(custoBase)}/{unitLabel}</span>
                  </div>
                )}

                {/* Preço Loja */}
                <div className="border-t border-primary/15 pt-3 space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Preço Loja</p>
                  {toggles.custoFixo && percCustoFixo > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Custo fixo: {formatDecimal(percCustoFixo, 1)}%</span></div>
                  )}
                  {toggles.lucro && percLucro > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Lucro: {formatDecimal(percLucro, 1)}%</span></div>
                  )}
                  {toggles.taxaCartao && percTaxaCartao > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Taxa cartão: {formatDecimal(percTaxaCartao, 1)}%</span></div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-medium">Preço Ideal Loja</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(precoLoja)}/{unitLabel}</span>
                  </div>
                </div>

                {/* Preço Delivery */}
                <div className="border-t border-primary/15 pt-3 space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Preço Delivery</p>
                  {toggles.taxaDelivery && percTaxaDelivery > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Taxa delivery: {formatDecimal(percTaxaDelivery, 1)}%</span></div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-medium">Preço Ideal Delivery</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(precoDelivery)}/{unitLabel}</span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground/70 italic pt-1">
                  Cálculo em cascata: cada percentual é aplicado em sequência sobre o valor já ajustado.
                </p>
              </div>

              <Button type="submit" className="w-full mt-2">{editingId ? "Atualizar" : "Salvar"}</Button>
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
              {produtos.map((p) => {
                const d = calcDetailPrices(p);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDetail(p)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.tipo_venda} · Custo: {formatCurrency(toNumber(p.custo_total))} · Loja: {formatCurrency(d.loja)} · Delivery: {formatCurrency(d.delivery)}
                      </p>
                    </div>
                    <ItemActions onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} deleteLabel="este produto" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Produto</DialogTitle></DialogHeader>
          {detailItem && (() => {
            const d = calcDetailPrices(detailItem);
            const dUnitLabel = detailItem.tipo_venda === "Quilo" ? "Kg" : "un";
            return (
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

                <div className="p-4 rounded-lg bg-primary/10 space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Custo de Insumos:</span>
                    <span>{formatCurrency(toNumber(detailItem.custo_total))}</span>
                  </div>
                  {d.rend > 1 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>÷ Rendimento ({d.rend} un):</span>
                      <span>{formatCurrency(d.base)}/{dUnitLabel}</span>
                    </div>
                  )}

                  <div className="border-t border-primary/20 pt-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formação Preço Loja</p>
                    {d.pf > 0 && <div className="flex justify-between text-sm"><span>Custo fixo: {formatDecimal(d.pf, 1)}%</span></div>}
                    {d.pl > 0 && <div className="flex justify-between text-sm"><span>Lucro: {formatDecimal(d.pl, 1)}%</span></div>}
                    {d.pc > 0 && <div className="flex justify-between text-sm"><span>Taxa cartão: {formatDecimal(d.pc, 1)}%</span></div>}
                    <div className="flex justify-between text-base font-bold text-primary">
                      <span>Preço Ideal Loja:</span>
                      <span>{formatCurrency(d.loja)}/{dUnitLabel}</span>
                    </div>
                  </div>

                  <div className="border-t border-primary/20 pt-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Formação Preço Delivery</p>
                    {d.pf > 0 && <div className="flex justify-between text-sm"><span>Custo fixo: {formatDecimal(d.pf, 1)}%</span></div>}
                    {d.pl > 0 && <div className="flex justify-between text-sm"><span>Lucro: {formatDecimal(d.pl, 1)}%</span></div>}
                    {d.pc > 0 && <div className="flex justify-between text-sm"><span>Taxa cartão: {formatDecimal(d.pc, 1)}%</span></div>}
                    {d.pd > 0 && <div className="flex justify-between text-sm"><span>Taxa delivery: {formatDecimal(d.pd, 1)}%</span></div>}
                    <div className="flex justify-between text-base font-bold text-primary">
                      <span>Preço Ideal Delivery:</span>
                      <span>{formatCurrency(d.delivery)}/{dUnitLabel}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    O cálculo é feito em cascata, incorporando cada percentual em sequência sobre o valor já ajustado.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => openEdit(detailItem)}>Editar</Button>
                  <Button variant="destructive" className="flex-1" onClick={() => handleDelete(detailItem.id)}>Excluir</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
