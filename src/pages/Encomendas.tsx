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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Plus, X, Calendar, List } from "lucide-react";
import ItemActions from "@/components/ItemActions";

const STATUS_OPTIONS = ["Cancelada", "Em Produção", "Entregue", "Pendente", "Pronta"];

const Encomendas = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [encomendas, setEncomendas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    cliente_nome: "", cliente_telefone: "", data_retirada: "", hora_retirada: "",
    observacao: "", valor_total: "", valor_entrada: "", status: "Pendente",
  });
  const [produtosEnc, setProdutosEnc] = useState<{ produto_id: string; nome_produto: string; quantidade: string }[]>([]);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [detailEnc, setDetailEnc] = useState<any | null>(null);
  const [detailProdutos, setDetailProdutos] = useState<any[]>([]);

  const fetchData = async () => {
    if (!empresaId) return;
    const { data: encData } = await supabase.from("encomendas").select("*").eq("empresa_id", empresaId).order("data_retirada");
    setEncomendas(encData || []);
    const { data: prodData } = await supabase.from("produtos").select("id, nome").eq("empresa_id", empresaId).order("nome");
    setProdutos(prodData || []);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    let foto_url = null;
    if (fotoFile) {
      const fileName = `${empresaId}/${Date.now()}_${fotoFile.name}`;
      const { error } = await supabase.storage.from("encomendas_fotos").upload(fileName, fotoFile);
      if (!error) foto_url = supabase.storage.from("encomendas_fotos").getPublicUrl(fileName).data.publicUrl;
    }

    const valorTotal = parseCurrency(form.valor_total);
    const valorEntrada = parseCurrency(form.valor_entrada);
    const payload: any = {
      empresa_id: empresaId,
      cliente_nome: form.cliente_nome,
      cliente_telefone: form.cliente_telefone || null,
      data_retirada: form.data_retirada,
      hora_retirada: form.hora_retirada || null,
      observacao: form.observacao || null,
      valor_total: valorTotal,
      valor_entrada: valorEntrada,
      valor_restante: valorTotal - valorEntrada,
      status: form.status,
    };
    if (foto_url) payload.foto_url = foto_url;

    let encId: string;
    if (editingId) {
      await supabase.from("encomendas").update(payload).eq("id", editingId);
      encId = editingId;
      await supabase.from("encomenda_produtos").delete().eq("encomenda_id", editingId);
    } else {
      const { data } = await supabase.from("encomendas").insert(payload).select().single();
      if (!data) return;
      encId = data.id;
    }

    if (produtosEnc.length > 0) {
      await supabase.from("encomenda_produtos").insert(
        produtosEnc.map((p) => ({ encomenda_id: encId, produto_id: p.produto_id || null, nome_produto: p.nome_produto, quantidade: toNumber(p.quantidade) }))
      );
    }

    toast({ title: editingId ? "Encomenda atualizada!" : "Encomenda cadastrada!" });
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setForm({ cliente_nome: "", cliente_telefone: "", data_retirada: "", hora_retirada: "", observacao: "", valor_total: "", valor_entrada: "", status: "Pendente" });
    setProdutosEnc([]);
    setFotoFile(null);
    setEditingId(null);
  };

  const openEdit = async (enc: any) => {
    setForm({
      cliente_nome: enc.cliente_nome, cliente_telefone: enc.cliente_telefone || "",
      data_retirada: enc.data_retirada, hora_retirada: enc.hora_retirada?.slice(0, 5) || "",
      observacao: enc.observacao || "", valor_total: numberToMask(toNumber(enc.valor_total)),
      valor_entrada: numberToMask(toNumber(enc.valor_entrada)), status: enc.status,
    });
    const { data } = await supabase.from("encomenda_produtos").select("*").eq("encomenda_id", enc.id);
    setProdutosEnc((data || []).map((p: any) => ({ produto_id: p.produto_id || "", nome_produto: p.nome_produto, quantidade: String(toNumber(p.quantidade)) })));
    setEditingId(enc.id);
    setDetailEnc(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("encomendas").delete().eq("id", id);
    toast({ title: "Removida" });
    setDetailEnc(null);
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("encomendas").update({ status }).eq("id", id);
    fetchData();
  };

  const openDetail = async (enc: any) => {
    const { data } = await supabase.from("encomenda_produtos").select("*").eq("encomenda_id", enc.id);
    setDetailProdutos(data || []);
    setDetailEnc(enc);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Pendente": return "secondary";
      case "Em Produção": return "default";
      case "Pronta": return "default";
      case "Entregue": return "default";
      case "Cancelada": return "destructive";
      default: return "secondary";
    }
  };

  const grouped = encomendas.reduce((acc, enc) => {
    const d = enc.data_retirada;
    if (!acc[d]) acc[d] = [];
    acc[d].push(enc);
    return acc;
  }, {} as Record<string, any[]>);

  const totalMes = encomendas.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div />
          <p className="text-sm text-muted-foreground">{totalMes} encomendas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Encomenda</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Encomenda</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cliente</Label><Input value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.cliente_telefone} onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data Retirada</Label><Input type="date" value={form.data_retirada} onChange={(e) => setForm({ ...form, data_retirada: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Hora</Label><Input type="time" value={form.hora_retirada} onChange={(e) => setForm({ ...form, hora_retirada: e.target.value })} /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Produtos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setProdutosEnc([...produtosEnc, { produto_id: "", nome_produto: "", quantidade: "1" }])}>
                    <Plus className="h-3 w-3 mr-1" />Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {produtosEnc.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select value={p.produto_id} onValueChange={(v) => {
                          const prod = produtos.find((pr) => pr.id === v);
                          const n = [...produtosEnc];
                          n[idx].produto_id = v;
                          n[idx].nome_produto = prod?.nome || "";
                          setProdutosEnc(n);
                        }}>
                          <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                          <SelectContent>{produtos.map((pr) => <SelectItem key={pr.id} value={pr.id}>{pr.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Input className="w-20" type="number" min="1" value={p.quantidade}
                        onChange={(e) => { const n = [...produtosEnc]; n[idx].quantidade = e.target.value; setProdutosEnc(n); }} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setProdutosEnc(produtosEnc.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor Total (R$)</Label><CurrencyInput placeholder="0" value={form.valor_total} onChange={(v) => setForm({ ...form, valor_total: v })} required /></div>
                <div className="space-y-2"><Label>Valor Entrada (R$)</Label><CurrencyInput placeholder="0" value={form.valor_entrada} onChange={(v) => setForm({ ...form, valor_entrada: v })} /></div>
              </div>

              {toNumber(form.valor_total) > 0 && (
                <p className="text-sm text-muted-foreground">Restante: {formatCurrency(toNumber(form.valor_total) - toNumber(form.valor_entrada))}</p>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Foto</Label>
                <Input type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files?.[0] || null)} />
              </div>

              <Button type="submit" className="w-full">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button variant={view === "lista" ? "default" : "outline"} size="sm" onClick={() => setView("lista")}><List className="h-4 w-4 mr-1" />Lista</Button>
        <Button variant={view === "calendario" ? "default" : "outline"} size="sm" onClick={() => setView("calendario")}><Calendar className="h-4 w-4 mr-1" />Calendário</Button>
      </div>

      {view === "lista" ? (
        <Card>
          <CardContent className="p-0">
            {encomendas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma encomenda</p>
            ) : (
              <div className="divide-y divide-border">
                {encomendas.map((enc) => (
                  <div key={enc.id} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openDetail(enc)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{enc.cliente_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(enc.data_retirada)} {enc.hora_retirada?.slice(0, 5) || ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(toNumber(enc.valor_total))}</p>
                        {toNumber(enc.valor_restante) > 0 && <p className="text-xs text-destructive">Resta: {formatCurrency(toNumber(enc.valor_restante))}</p>}
                      </div>
                      <Badge variant={statusColor(enc.status) as any} className="text-xs">{enc.status}</Badge>
                      <ItemActions onEdit={() => openEdit(enc)} onDelete={() => handleDelete(enc.id)} deleteLabel="esta encomenda" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, encs]) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{formatDate(date)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(encs as any[]).map((enc) => (
                    <div key={enc.id} className="flex items-center gap-3 p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => openDetail(enc)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{enc.cliente_nome}</p>
                        <p className="text-xs text-muted-foreground">{enc.hora_retirada?.slice(0, 5) || "Sem horário"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-sm font-medium">{formatCurrency(toNumber(enc.valor_total))}</p>
                        <Badge variant={statusColor(enc.status) as any}>{enc.status}</Badge>
                        <ItemActions onEdit={() => openEdit(enc)} onDelete={() => handleDelete(enc.id)} deleteLabel="esta encomenda" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma encomenda</p>}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailEnc} onOpenChange={(o) => { if (!o) setDetailEnc(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader><DialogTitle>Detalhes da Encomenda</DialogTitle></DialogHeader>
          {detailEnc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{detailEnc.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">{detailEnc.cliente_telefone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Retirada</p>
                  <p className="text-sm font-medium">{formatDate(detailEnc.data_retirada)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hora</p>
                  <p className="text-sm font-medium">{detailEnc.hora_retirada?.slice(0, 5) || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Select value={detailEnc.status} onValueChange={(v) => { updateStatus(detailEnc.id, v); setDetailEnc({ ...detailEnc, status: v }); }}>
                  <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {detailProdutos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Produtos</p>
                  <div className="space-y-1">
                    {detailProdutos.map((p: any) => (
                      <div key={p.id} className="flex justify-between p-2 rounded bg-muted/50 text-sm">
                        <span>{p.nome_produto}</span>
                        <span className="text-muted-foreground">x{toNumber(p.quantidade)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-sm font-bold">{formatCurrency(toNumber(detailEnc.valor_total))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="text-sm font-medium">{formatCurrency(toNumber(detailEnc.valor_entrada))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Restante</p>
                  <p className="text-sm font-medium text-destructive">{formatCurrency(toNumber(detailEnc.valor_restante))}</p>
                </div>
              </div>

              {detailEnc.observacao && (
                <div>
                  <p className="text-xs text-muted-foreground">Observação</p>
                  <p className="text-sm">{detailEnc.observacao}</p>
                </div>
              )}

              {detailEnc.foto_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Foto</p>
                  <img src={detailEnc.foto_url} alt="Foto da encomenda" className="rounded-lg max-h-48 object-cover w-full" />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => openEdit(detailEnc)}>Editar</Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleDelete(detailEnc.id)}>Excluir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Encomendas;
