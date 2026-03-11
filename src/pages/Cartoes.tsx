import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { parseCurrency, numberToMask } from "@/lib/currency-mask";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Plus, CreditCard, Check, ChevronDown, ChevronRight, Pencil, Trash2, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ItemActions from "@/components/ItemActions";

const CATEGORIAS = ["Ingredientes", "Embalagens", "Equipamentos", "Manutenção", "Marketing", "Transporte", "Outros"].sort();

const MESES = [
  { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" }, { value: "03", label: "Março" },
  { value: "04", label: "Abril" }, { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
  { value: "07", label: "Julho" }, { value: "08", label: "Agosto" }, { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" }, { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

const Cartoes = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();

  // Cartões state
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [selectedCartao, setSelectedCartao] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", dia_fechamento: "", dia_vencimento: "" });

  // Faturas state
  const [faturas, setFaturas] = useState<any[]>([]);
  const [selectedFatura, setSelectedFatura] = useState<string | null>(null);
  const [itensFatura, setItensFatura] = useState<Record<string, any[]>>({});
  const [faturaDialogOpen, setFaturaDialogOpen] = useState(false);
  const [faturaForm, setFaturaForm] = useState({ mes: "", ano: String(currentYear) });

  // Item fatura state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFaturaId, setItemFaturaId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    descricao: "", valor: "", data_compra: "", categoria: "",
    parcelas: "1", parcela_atual: "1",
  });

  // ─── Fetch functions ───
  const fetchCartoes = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("cartoes").select("*").eq("empresa_id", empresaId).order("nome");
    setCartoes(data || []);
  }, [empresaId]);

  const fetchFaturas = useCallback(async (cartaoId: string) => {
    const { data } = await supabase.from("faturas").select("*").eq("cartao_id", cartaoId).order("mes_referencia", { ascending: false });
    setFaturas(data || []);
  }, []);

  const fetchItens = useCallback(async (faturaId: string) => {
    const { data } = await supabase.from("itens_fatura").select("*").eq("fatura_id", faturaId).order("criado_em");
    setItensFatura((prev) => ({ ...prev, [faturaId]: data || [] }));
  }, []);

  useEffect(() => { fetchCartoes(); }, [fetchCartoes]);
  useEffect(() => { if (selectedCartao) fetchFaturas(selectedCartao); }, [selectedCartao, fetchFaturas]);

  // ─── Cartão CRUD ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    const payload = {
      empresa_id: empresaId, nome: form.nome,
      dia_fechamento: parseInt(form.dia_fechamento), dia_vencimento: parseInt(form.dia_vencimento),
    };
    if (editingId) {
      await supabase.from("cartoes").update(payload).eq("id", editingId);
      toast({ title: "Cartão atualizado!" });
    } else {
      await supabase.from("cartoes").insert(payload);
      toast({ title: "Cartão cadastrado!" });
    }
    setDialogOpen(false);
    resetForm();
    fetchCartoes();
  };

  const resetForm = () => { setForm({ nome: "", dia_fechamento: "", dia_vencimento: "" }); setEditingId(null); };

  const handleDeleteCartao = async (id: string) => {
    await supabase.from("cartoes").delete().eq("id", id);
    if (selectedCartao === id) { setSelectedCartao(null); setFaturas([]); }
    toast({ title: "Cartão removido" });
    fetchCartoes();
  };

  const openEdit = (c: any) => {
    setForm({ nome: c.nome, dia_fechamento: String(c.dia_fechamento), dia_vencimento: String(c.dia_vencimento) });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const togglePaga = async (faturaId: string, paga: boolean) => {
    await supabase.from("faturas").update({ paga: !paga }).eq("id", faturaId);
    if (selectedCartao) fetchFaturas(selectedCartao);
  };

  // ─── Criar Fatura Manual ───
  const handleCreateFatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCartao) return;
    const mesRef = `${faturaForm.ano}-${faturaForm.mes}-01`;

    // Check if fatura already exists
    const { data: existing } = await supabase.from("faturas").select("id").eq("cartao_id", selectedCartao).eq("mes_referencia", mesRef).single();
    if (existing) {
      toast({ title: "Fatura já existe", description: "Já existe uma fatura para este mês.", variant: "destructive" });
      return;
    }

    await supabase.from("faturas").insert({ cartao_id: selectedCartao, mes_referencia: mesRef, valor_total: 0 });
    toast({ title: "Fatura criada!" });
    setFaturaDialogOpen(false);
    setFaturaForm({ mes: "", ano: String(currentYear) });
    fetchFaturas(selectedCartao);
  };

  const handleDeleteFatura = async (faturaId: string) => {
    await supabase.from("faturas").delete().eq("id", faturaId);
    if (selectedFatura === faturaId) setSelectedFatura(null);
    toast({ title: "Fatura removida" });
    if (selectedCartao) fetchFaturas(selectedCartao);
  };

  // ─── Helper: get or create fatura for a given month ───
  const getOrCreateFatura = async (cartaoId: string, mesRef: string): Promise<string | null> => {
    const { data: existing } = await supabase.from("faturas").select("id").eq("cartao_id", cartaoId).eq("mes_referencia", mesRef).single();
    if (existing) return existing.id;
    const { data: created } = await supabase.from("faturas").insert({ cartao_id: cartaoId, mes_referencia: mesRef, valor_total: 0 }).select("id").single();
    return created?.id || null;
  };

  const recalcFatura = async (faturaId: string) => {
    const { data } = await supabase.from("itens_fatura").select("valor").eq("fatura_id", faturaId);
    const total = (data || []).reduce((sum, item) => sum + toNumber(item.valor), 0);
    await supabase.from("faturas").update({ valor_total: total }).eq("id", faturaId);
  };

  // ─── Compute offset month reference ───
  const offsetMesRef = (baseMesRef: string, offset: number): string => {
    const d = new Date(baseMesRef + "T00:00:00");
    d.setMonth(d.getMonth() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  };

  // ─── Item CRUD ───
  const openAddItem = (faturaId: string) => {
    setItemFaturaId(faturaId);
    setEditingItemId(null);
    setItemForm({ descricao: "", valor: "", data_compra: "", categoria: "", parcelas: "1", parcela_atual: "1" });
    setItemDialogOpen(true);
  };

  const openEditItem = (item: any) => {
    setItemFaturaId(item.fatura_id);
    setEditingItemId(item.id);
    setItemForm({
      descricao: item.descricao,
      valor: numberToMask(toNumber(item.valor)),
      data_compra: item.data_compra || "",
      categoria: item.categoria || "",
      parcelas: String(item.total_parcelas || 1),
      parcela_atual: String(item.parcela_atual || 1),
    });
    setItemDialogOpen(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFaturaId || !selectedCartao) return;

    const totalParcelas = Math.max(1, parseInt(itemForm.parcelas) || 1);
    const parcelaAtual = Math.max(1, Math.min(totalParcelas, parseInt(itemForm.parcela_atual) || 1));
    const valorTotal = toNumber(itemForm.valor);
    const valorParcela = totalParcelas > 1 ? valorTotal / totalParcelas : valorTotal;

    if (editingItemId) {
      // Simple edit — update single item
      await supabase.from("itens_fatura").update({
        descricao: itemForm.descricao,
        valor: valorParcela,
        data_compra: itemForm.data_compra || null,
        categoria: itemForm.categoria || null,
        parcela_atual: parcelaAtual,
        total_parcelas: totalParcelas,
      }).eq("id", editingItemId);
      await recalcFatura(itemFaturaId);
      toast({ title: "Item atualizado!" });
    } else {
      // New item — handle installments
      const currentFatura = faturas.find((f) => f.id === itemFaturaId);
      if (!currentFatura) return;

      const baseMesRef = currentFatura.mes_referencia;
      const affectedFaturaIds: string[] = [];

      if (totalParcelas === 1) {
        // Single purchase
        await supabase.from("itens_fatura").insert({
          fatura_id: itemFaturaId,
          descricao: itemForm.descricao,
          valor: valorParcela,
          data_compra: itemForm.data_compra || null,
          categoria: itemForm.categoria || null,
          parcela_atual: 1,
          total_parcelas: 1,
        });
        affectedFaturaIds.push(itemFaturaId);
      } else {
        // Multi-installment — distribute across months
        for (let i = 1; i <= totalParcelas; i++) {
          const offset = i - parcelaAtual; // relative to current fatura
          const mesRef = offsetMesRef(baseMesRef, offset);
          const faturaId = await getOrCreateFatura(selectedCartao, mesRef);
          if (!faturaId) continue;

          await supabase.from("itens_fatura").insert({
            fatura_id: faturaId,
            descricao: itemForm.descricao,
            valor: valorParcela,
            data_compra: itemForm.data_compra || null,
            categoria: itemForm.categoria || null,
            parcela_atual: i,
            total_parcelas: totalParcelas,
          });
          affectedFaturaIds.push(faturaId);
        }
      }

      // Recalculate all affected faturas
      const uniqueIds = [...new Set(affectedFaturaIds)];
      for (const fid of uniqueIds) {
        await recalcFatura(fid);
      }
      toast({ title: totalParcelas > 1 ? `Compra parcelada em ${totalParcelas}x distribuída!` : "Compra adicionada!" });
    }

    setItemDialogOpen(false);
    // Refresh faturas and items
    if (selectedCartao) await fetchFaturas(selectedCartao);
    if (itemFaturaId) await fetchItens(itemFaturaId);
  };

  const handleDeleteItem = async (item: any) => {
    // If linked to a gasto, delete the gasto too (trigger will clean other items)
    if (item.gasto_id) {
      await supabase.from("gastos").delete().eq("id", item.gasto_id);
    } else {
      await supabase.from("itens_fatura").delete().eq("id", item.id);
    }
    await recalcFatura(item.fatura_id);
    toast({ title: "Item removido" });
    if (selectedCartao) fetchFaturas(selectedCartao);
    fetchItens(item.fatura_id);
  };

  const toggleFaturaExpand = (faturaId: string) => {
    if (selectedFatura === faturaId) {
      setSelectedFatura(null);
    } else {
      setSelectedFatura(faturaId);
      if (!itensFatura[faturaId]) fetchItens(faturaId);
    }
  };

  // ─── Chart ───
  const chartData = faturas.map((f) => ({
    mes: new Date(f.mes_referencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    valor: toNumber(f.valor_total),
  })).reverse();

  return (
    <div className="space-y-6">
      {/* Header: Novo Cartão */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div />
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Cartão</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar Cartão" : "Novo Cartão"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome do Cartão</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Nubank" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Dia de Fechamento</Label><Input type="number" min="1" max="31" value={form.dia_fechamento} onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Dia de Vencimento</Label><Input type="number" min="1" max="31" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} required /></div>
              </div>
              <Button type="submit" className="w-full">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de cartões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cartoes.map((c) => (
          <Card key={c.id} className={`cursor-pointer transition-all ${selectedCartao === c.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedCartao(c.id)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CreditCard className="h-5 w-5 text-primary shrink-0" />
                  <p className="font-medium truncate">{c.nome}</p>
                </div>
                <ItemActions onEdit={() => openEdit(c)} onDelete={() => handleDeleteCartao(c.id)} deleteLabel="este cartão" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Fecha dia {c.dia_fechamento} · Vence dia {c.dia_vencimento}</p>
            </CardContent>
          </Card>
        ))}
        {cartoes.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-8">Nenhum cartão cadastrado</p>}
      </div>

      {/* Faturas do cartão selecionado */}
      {selectedCartao && (
        <>
          {chartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Evolução das Faturas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Faturas</CardTitle>
                <Dialog open={faturaDialogOpen} onOpenChange={setFaturaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Nova Fatura</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar Fatura</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateFatura} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Mês</Label>
                          <Select value={faturaForm.mes} onValueChange={(v) => setFaturaForm({ ...faturaForm, mes: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{MESES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Ano</Label>
                          <Select value={faturaForm.ano} onValueChange={(v) => setFaturaForm({ ...faturaForm, ano: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{ANOS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={!faturaForm.mes}>Criar Fatura</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {faturas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma fatura</p>
              ) : (
                <div className="space-y-2">
                  {faturas.map((f) => {
                    const isExpanded = selectedFatura === f.id;
                    const items = itensFatura[f.id] || [];
                    return (
                      <div key={f.id} className="border rounded-lg overflow-hidden">
                        {/* Fatura header */}
                        <div
                          className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => toggleFaturaExpand(f.id)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <p className="text-sm font-medium">
                              {new Date(f.mes_referencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold">{formatCurrency(toNumber(f.valor_total))}</p>
                            <Badge
                              variant={f.paga ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); togglePaga(f.id, f.paga); }}
                            >
                              {f.paga ? <><Check className="h-3 w-3 mr-1" />Paga</> : "Em aberto"}
                            </Badge>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handleDeleteFatura(f.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* Fatura items */}
                        {isExpanded && (
                          <div className="p-3 space-y-2 bg-card">
                            {items.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma compra nesta fatura</p>
                            )}
                            {items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-2 text-sm rounded bg-muted/30">
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium">
                                    {item.descricao}
                                    {item.total_parcelas > 1 && (
                                      <span className="text-muted-foreground ml-1">({item.parcela_atual}/{item.total_parcelas})</span>
                                    )}
                                  </span>
                                  {(item.data_compra || item.categoria) && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.data_compra && formatDate(item.data_compra)}
                                      {item.data_compra && item.categoria && " · "}
                                      {item.categoria}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-medium">{formatCurrency(toNumber(item.valor))}</span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item)}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="outline" size="sm" className="w-full mt-2"
                              onClick={() => openAddItem(f.id)}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />Adicionar Compra
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog: Adicionar/Editar Item da Fatura */}
      <Dialog open={itemDialogOpen} onOpenChange={(o) => { setItemDialogOpen(o); if (!o) setEditingItemId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Editar Compra" : "Adicionar Compra na Fatura"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={itemForm.descricao} onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })} required placeholder="Ex: Supermercado" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input type="number" step="0.01" value={itemForm.valor} onChange={(e) => setItemForm({ ...itemForm, valor: e.target.value })} required placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Data da Compra</Label>
                <Input type="date" value={itemForm.data_compra} onChange={(e) => setItemForm({ ...itemForm, data_compra: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Select value={itemForm.categoria} onValueChange={(v) => setItemForm({ ...itemForm, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!editingItemId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input type="number" min="1" max="48" value={itemForm.parcelas} onChange={(e) => setItemForm({ ...itemForm, parcelas: e.target.value })} />
                </div>
                {parseInt(itemForm.parcelas) > 1 && (
                  <div className="space-y-2">
                    <Label>Parcela Atual</Label>
                    <Input
                      type="number" min="1" max={itemForm.parcelas}
                      value={itemForm.parcela_atual}
                      onChange={(e) => setItemForm({ ...itemForm, parcela_atual: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Parcelas anteriores e futuras serão distribuídas automaticamente.
                    </p>
                  </div>
                )}
              </div>
            )}
            <Button type="submit" className="w-full">{editingItemId ? "Atualizar" : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cartoes;
