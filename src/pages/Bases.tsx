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
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatQuantidade, toNumber } from "@/lib/format";
import { Plus, X, FileText, Package, Scale, Calculator } from "lucide-react";
import ItemActions from "@/components/ItemActions";
import { useAutoSaveDraft } from "@/hooks/use-auto-save-draft";
import { DraftStatusIndicator } from "@/components/DraftStatusIndicator";

const UNIDADES_REND = ["Unidade", "g", "Kg", "ml", "L"];

type InsumoBase = { insumo_id: string; quantidade_usada: string; unidade_receita: string };

type BaseDraft = {
  form: { nome: string; rendimento_quantidade: string; rendimento_unidade: string };
  insumosBase: InsumoBase[];
  editingId: string | null;
};

const getUnidadesCompativeis = (unidadeInsumo: string): string[] => {
  const u = unidadeInsumo.toLowerCase();
  if (u === "kg" || u === "g") return ["g", "Kg"];
  if (u === "l" || u === "ml") return ["ml", "L"];
  return [unidadeInsumo];
};

const getUnidadePadrao = (unidadeInsumo: string): string => {
  const u = unidadeInsumo.toLowerCase();
  if (u === "kg" || u === "g") return "g";
  if (u === "l" || u === "ml") return "ml";
  return unidadeInsumo;
};

const converterParaUnidadeInsumo = (qtd: number, unidadeReceita: string, unidadeInsumo: string): number => {
  const ur = unidadeReceita.toLowerCase();
  const ui = unidadeInsumo.toLowerCase();
  if (ur === ui) return qtd;
  if (ur === "g" && ui === "kg") return qtd / 1000;
  if (ur === "kg" && ui === "g") return qtd * 1000;
  if (ur === "ml" && ui === "l") return qtd / 1000;
  if (ur === "l" && ui === "ml") return qtd * 1000;
  return qtd;
};

const Bases = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [bases, setBases] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [detailInsumos, setDetailInsumos] = useState<any[]>([]);
  const [form, setForm] = useState({ nome: "", rendimento_quantidade: "", rendimento_unidade: "g" });
  const [insumosBase, setInsumosBase] = useState<InsumoBase[]>([]);
  const [showRecovery, setShowRecovery] = useState(false);

  const draftData = useMemo<BaseDraft>(() => ({ form, insumosBase, editingId }), [form, insumosBase, editingId]);

  const { status: draftStatus, loadDraft, hasDraft, clearDraft, saveDraft } = useAutoSaveDraft<BaseDraft>({
    key: "bases_editor",
    data: draftData,
    enabled: dialogOpen,
  });

  const fetchData = async () => {
    if (!empresaId) return;
    const { data: basesData } = await supabase.from("bases").select("*").eq("empresa_id", empresaId).order("nome");
    setBases(basesData || []);
    const { data: insumosData } = await supabase.from("insumos").select("*").eq("empresa_id", empresaId).order("nome");
    setInsumos(insumosData || []);
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
      setInsumosBase(draft.insumosBase);
      setEditingId(draft.editingId);
      setDialogOpen(true);
    }
    setShowRecovery(false);
  };

  const discardDraft = () => {
    clearDraft();
    setShowRecovery(false);
  };

  const calcCustoTotal = () => {
    return insumosBase.reduce((sum, ib) => {
      const insumo = insumos.find((i) => i.id === ib.insumo_id);
      if (!insumo) return sum;
      const qtdConvertida = converterParaUnidadeInsumo(toNumber(ib.quantidade_usada), ib.unidade_receita, insumo.unidade);
      return sum + qtdConvertida * toNumber(insumo.custo_por_unidade);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    const custoTotal = calcCustoTotal();
    const rendQtd = toNumber(form.rendimento_quantidade);
    const custoPorRendimento = rendQtd > 0 ? custoTotal / rendQtd : 0;

    const payload = {
      empresa_id: empresaId, nome: form.nome,
      rendimento_quantidade: rendQtd || null, rendimento_unidade: form.rendimento_unidade,
      custo_total: custoTotal, custo_por_rendimento: custoPorRendimento,
    };

    let baseId: string;
    if (editingId) {
      await supabase.from("bases").update(payload).eq("id", editingId);
      baseId = editingId;
      await supabase.from("base_insumos").delete().eq("base_id", editingId);
    } else {
      const { data } = await supabase.from("bases").insert(payload).select().single();
      if (!data) return;
      baseId = data.id;
    }

    if (insumosBase.length > 0) {
      await supabase.from("base_insumos").insert(
        insumosBase.map((ib) => {
          const insumo = insumos.find((i) => i.id === ib.insumo_id);
          const qtdConvertida = insumo
            ? converterParaUnidadeInsumo(toNumber(ib.quantidade_usada), ib.unidade_receita, insumo.unidade)
            : toNumber(ib.quantidade_usada);
          return { base_id: baseId, insumo_id: ib.insumo_id, quantidade_usada: qtdConvertida };
        })
      );
    }

    toast({ title: editingId ? "Receita atualizada!" : "Receita cadastrada!" });
    clearDraft();
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => { setForm({ nome: "", rendimento_quantidade: "", rendimento_unidade: "g" }); setInsumosBase([]); setEditingId(null); };

  const handleInsumoChange = (idx: number, insumoId: string) => {
    const n = [...insumosBase];
    const insumo = insumos.find((i) => i.id === insumoId);
    n[idx].insumo_id = insumoId;
    n[idx].unidade_receita = insumo ? getUnidadePadrao(insumo.unidade) : "";
    setInsumosBase(n);
  };

  const openEdit = async (b: any) => {
    setForm({ nome: b.nome, rendimento_quantidade: String(toNumber(b.rendimento_quantidade)), rendimento_unidade: b.rendimento_unidade || "g" });
    const { data } = await supabase.from("base_insumos").select("*").eq("base_id", b.id);
    setInsumosBase((data || []).map((bi: any) => {
      const insumo = insumos.find((i) => i.id === bi.insumo_id);
      return { insumo_id: bi.insumo_id, quantidade_usada: String(toNumber(bi.quantidade_usada)), unidade_receita: insumo?.unidade || "" };
    }));
    setEditingId(b.id);
    setDetailItem(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("bases").delete().eq("id", id);
    toast({ title: "Removida" });
    setDetailItem(null);
    fetchData();
  };

  const openDetail = async (b: any) => {
    const { data } = await supabase.from("base_insumos").select("*").eq("base_id", b.id);
    setDetailInsumos(data || []);
    setDetailItem(b);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      clearDraft();
      resetForm();
    }
    setDialogOpen(open);
  };

  const getInsumoNome = (id: string) => insumos.find((i) => i.id === id)?.nome || "—";
  const getInsumoUnidade = (id: string) => insumos.find((i) => i.id === id)?.unidade || "";

  return (
    <div className="space-y-6">
      {/* Recovery Dialog */}
      <AlertDialog open={showRecovery} onOpenChange={setShowRecovery}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edição não finalizada</AlertDialogTitle>
            <AlertDialogDescription>
              Encontramos uma edição não finalizada de uma receita. Deseja continuar de onde parou?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardDraft}>Descartar rascunho</AlertDialogCancel>
            <AlertDialogAction onClick={recoverDraft}>Continuar edição</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div />
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Receita</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{editingId ? "Editar" : "Nova"} Receita</DialogTitle>
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
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Massa de Bolo" />
                </div>
              </div>

              {/* Seção: Insumos */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Insumos da Receita</h3>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setInsumosBase([...insumosBase, { insumo_id: "", quantidade_usada: "", unidade_receita: "" }])}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {insumosBase.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">Nenhum insumo adicionado</p>
                  )}
                  {insumosBase.map((ib, idx) => {
                    const insumo = insumos.find((i) => i.id === ib.insumo_id);
                    const unidadesCompativeis = insumo ? getUnidadesCompativeis(insumo.unidade) : [];
                    const custoItem = insumo
                      ? converterParaUnidadeInsumo(toNumber(ib.quantidade_usada), ib.unidade_receita, insumo.unidade) * toNumber(insumo.custo_por_unidade)
                      : 0;
                    return (
                      <div key={idx} className="rounded-md border border-border/40 bg-card p-3 space-y-2">
                        <div className="flex gap-2 items-center">
                          <div className="flex-1 min-w-0">
                            <Select value={ib.insumo_id} onValueChange={(v) => handleInsumoChange(idx, v)}>
                              <SelectTrigger><SelectValue placeholder="Selecione o insumo" /></SelectTrigger>
                              <SelectContent>{insumos.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome} ({i.unidade})</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setInsumosBase(insumosBase.filter((_, i) => i !== idx))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Quantidade</Label>
                            <Input type="number" step="0.0001" placeholder="0" value={ib.quantidade_usada}
                              onChange={(e) => { const n = [...insumosBase]; n[idx].quantidade_usada = e.target.value; setInsumosBase(n); }} />
                          </div>
                          <div className="w-20 space-y-1">
                            <Label className="text-xs">Unidade</Label>
                            {unidadesCompativeis.length > 1 ? (
                              <Select value={ib.unidade_receita} onValueChange={(v) => { const n = [...insumosBase]; n[idx].unidade_receita = v; setInsumosBase(n); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{unidadesCompativeis.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <div className="flex h-10 items-center justify-center text-sm text-muted-foreground">{ib.unidade_receita || "—"}</div>
                            )}
                          </div>
                        </div>
                        {insumo && custoItem > 0 && (
                          <p className="text-[11px] text-muted-foreground text-right">Custo: {formatCurrency(custoItem)}</p>
                        )}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input type="number" step="0.0001" placeholder="0" value={form.rendimento_quantidade} onChange={(e) => setForm({ ...form, rendimento_quantidade: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select value={form.rendimento_unidade} onValueChange={(v) => setForm({ ...form, rendimento_unidade: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{UNIDADES_REND.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção: Resumo */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Resumo</h3>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Custo Total da Receita</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(calcCustoTotal())}</span>
                </div>
                {toNumber(form.rendimento_quantidade) > 0 && (
                  <div className="flex justify-between items-center border-t border-primary/10 pt-2">
                    <span className="text-sm text-muted-foreground">Custo por {form.rendimento_unidade}</span>
                    <span className="text-base font-semibold text-primary">
                      {formatCurrency(calcCustoTotal() / toNumber(form.rendimento_quantidade))}/{form.rendimento_unidade}
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full mt-2">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {bases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma receita cadastrada</p>
          ) : (
            <div className="divide-y divide-border">
              {bases.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDetail(b)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Custo: {formatCurrency(toNumber(b.custo_total))}
                      {b.rendimento_quantidade && ` · Rend: ${formatQuantidade(toNumber(b.rendimento_quantidade), b.rendimento_unidade || "g")} ${b.rendimento_unidade}`}
                      {b.custo_por_rendimento && ` · ${formatCurrency(toNumber(b.custo_por_rendimento))}/${b.rendimento_unidade}`}
                    </p>
                  </div>
                  <ItemActions onEdit={() => openEdit(b)} onDelete={() => handleDelete(b.id)} deleteLabel="esta receita" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes da Receita</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Nome</p><p className="text-sm font-medium">{detailItem.nome}</p></div>
                <div><p className="text-xs text-muted-foreground">Custo Total</p><p className="text-sm font-medium">{formatCurrency(toNumber(detailItem.custo_total))}</p></div>
                {detailItem.rendimento_quantidade && (
                  <>
                    <div><p className="text-xs text-muted-foreground">Rendimento</p><p className="text-sm font-medium">{formatQuantidade(toNumber(detailItem.rendimento_quantidade), detailItem.rendimento_unidade || "g")} {detailItem.rendimento_unidade}</p></div>
                    <div><p className="text-xs text-muted-foreground">Custo/Rend.</p><p className="text-sm font-medium">{formatCurrency(toNumber(detailItem.custo_por_rendimento))}/{detailItem.rendimento_unidade}</p></div>
                  </>
                )}
              </div>
              {detailInsumos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Insumos</p>
                  <div className="space-y-1">
                    {detailInsumos.map((bi: any) => (
                      <div key={bi.id} className="flex justify-between p-2 rounded bg-muted/50 text-sm">
                        <span>{getInsumoNome(bi.insumo_id)}</span>
                        <span className="text-muted-foreground">{formatQuantidade(toNumber(bi.quantidade_usada), getInsumoUnidade(bi.insumo_id))} {getInsumoUnidade(bi.insumo_id)}</span>
                      </div>
                    ))}
                  </div>
                </div>
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

export default Bases;
