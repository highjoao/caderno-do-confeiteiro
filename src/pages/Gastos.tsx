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
import { formatCurrency, formatDateTime, toNumber, nowDateTimeString } from "@/lib/format";
import { Plus } from "lucide-react";
import ItemActions from "@/components/ItemActions";

const CATEGORIAS = ["Ingredientes", "Embalagens", "Equipamentos", "Manutenção", "Marketing", "Transporte", "Outros"].sort();
const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Boleto", "Cartão"].sort();

const Gastos = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [gastos, setGastos] = useState<any[]>([]);
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    data: nowDateTimeString(), fornecedor: "", descricao: "", categoria: "", valor: "",
    forma_pagamento: "", cartao_id: "", parcelas: "1",
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const fetchData = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("gastos").select("*").eq("empresa_id", empresaId).order("data", { ascending: false });
    setGastos(data || []);
    const { data: cartoesData } = await supabase.from("cartoes").select("*").eq("empresa_id", empresaId).order("nome");
    setCartoes(cartoesData || []);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    let foto_url = null;
    if (fotoFile) {
      const fileName = `${empresaId}/${Date.now()}_${fotoFile.name}`;
      const { error: uploadError } = await supabase.storage.from("notas_fiscais").upload(fileName, fotoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("notas_fiscais").getPublicUrl(fileName);
        foto_url = urlData.publicUrl;
      }
    }

    const payload: any = {
      empresa_id: empresaId, data: form.data, fornecedor: form.fornecedor || null,
      descricao: form.descricao, categoria: form.categoria, valor: toNumber(form.valor),
      forma_pagamento: form.forma_pagamento,
      cartao_id: form.forma_pagamento === "Cartão" ? form.cartao_id : null,
      parcelas: form.forma_pagamento === "Cartão" ? toNumber(form.parcelas) : 1,
    };
    if (foto_url) payload.foto_url = foto_url;

    if (editingId) {
      const { error } = await supabase.from("gastos").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Gasto atualizado!" });
    } else {
      const { error } = await supabase.from("gastos").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      if (form.forma_pagamento === "Cartão" && form.cartao_id) {
        await lancarNaFatura(form.cartao_id, payload);
      }
      toast({ title: "Gasto registrado!" });
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const lancarNaFatura = async (cartaoId: string, gasto: any) => {
    const cartao = cartoes.find((c) => c.id === cartaoId);
    if (!cartao) return;
    const dataCompra = new Date(gasto.data + "T00:00:00");
    const diaCompra = dataCompra.getDate();
    const parcelas = toNumber(gasto.parcelas) || 1;
    const valorParcela = toNumber(gasto.valor) / parcelas;

    for (let i = 0; i < parcelas; i++) {
      let mesRef = new Date(dataCompra);
      if (diaCompra > cartao.dia_fechamento) {
        mesRef.setMonth(mesRef.getMonth() + 1 + i);
      } else {
        mesRef.setMonth(mesRef.getMonth() + i);
      }
      const mesReferencia = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, "0")}-01`;

      let { data: fatura } = await supabase.from("faturas").select("id, valor_total").eq("cartao_id", cartaoId).eq("mes_referencia", mesReferencia).single();
      if (!fatura) {
        const { data: novaFatura } = await supabase.from("faturas").insert({ cartao_id: cartaoId, mes_referencia: mesReferencia, valor_total: 0 }).select().single();
        fatura = novaFatura;
      }
      if (fatura) {
        await supabase.from("itens_fatura").insert({ fatura_id: fatura.id, descricao: gasto.descricao, valor: valorParcela, parcela_atual: i + 1, total_parcelas: parcelas });
        await supabase.from("faturas").update({ valor_total: toNumber(fatura.valor_total) + valorParcela }).eq("id", fatura.id);
      }
    }
  };

  const resetForm = () => {
    setForm({ data: "", fornecedor: "", descricao: "", categoria: "", valor: "", forma_pagamento: "", cartao_id: "", parcelas: "1" });
    setFotoFile(null);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("gastos").delete().eq("id", id);
    toast({ title: "Gasto removido" });
    setDetailItem(null);
    fetchData();
  };

  const openEdit = (g: any) => {
    setForm({
      data: g.data, fornecedor: g.fornecedor || "", descricao: g.descricao,
      categoria: g.categoria, valor: String(toNumber(g.valor)),
      forma_pagamento: g.forma_pagamento, cartao_id: g.cartao_id || "", parcelas: String(g.parcelas || 1),
    });
    setEditingId(g.id);
    setDetailItem(null);
    setDialogOpen(true);
  };

  const getCartaoNome = (id: string) => cartoes.find((c) => c.id === id)?.nome || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div />
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Gasto</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Gasto" : "Novo Gasto"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" placeholder="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} placeholder="Opcional" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pagamento</Label>
                  <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {form.forma_pagamento === "Cartão" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cartão</Label>
                    <Select value={form.cartao_id} onValueChange={(v) => setForm({ ...form, cartao_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{cartoes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Parcelas</Label><Input type="number" min="1" value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} /></div>
                </div>
              )}
              <div className="space-y-2"><Label>Foto da Nota Fiscal</Label><Input type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files?.[0] || null)} /></div>
              <Button type="submit" className="w-full">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Extrato de Gastos</CardTitle></CardHeader>
        <CardContent>
          {gastos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum gasto registrado</p>
          ) : (
            <div className="space-y-2">
              {gastos.map((g) => (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => setDetailItem(g)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(g.data)} · {g.categoria} · {g.forma_pagamento}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-bold text-destructive">{formatCurrency(toNumber(g.valor))}</p>
                    <ItemActions onEdit={() => openEdit(g)} onDelete={() => handleDelete(g.id)} deleteLabel="este gasto" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Gasto</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Descrição</p><p className="text-sm font-medium">{detailItem.descricao}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor</p><p className="text-sm font-bold text-destructive">{formatCurrency(toNumber(detailItem.valor))}</p></div>
                <div><p className="text-xs text-muted-foreground">Data</p><p className="text-sm font-medium">{formatDate(detailItem.data)}</p></div>
                <div><p className="text-xs text-muted-foreground">Categoria</p><p className="text-sm font-medium">{detailItem.categoria}</p></div>
                <div><p className="text-xs text-muted-foreground">Pagamento</p><p className="text-sm font-medium">{detailItem.forma_pagamento}</p></div>
                {detailItem.fornecedor && <div><p className="text-xs text-muted-foreground">Fornecedor</p><p className="text-sm font-medium">{detailItem.fornecedor}</p></div>}
                {detailItem.cartao_id && <div><p className="text-xs text-muted-foreground">Cartão</p><p className="text-sm font-medium">{getCartaoNome(detailItem.cartao_id)}</p></div>}
                {detailItem.parcelas > 1 && <div><p className="text-xs text-muted-foreground">Parcelas</p><p className="text-sm font-medium">{detailItem.parcelas}x</p></div>}
              </div>
              {detailItem.foto_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nota Fiscal</p>
                  <img src={detailItem.foto_url} alt="Nota fiscal" className="rounded-lg max-h-48 object-cover w-full" />
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

export default Gastos;
