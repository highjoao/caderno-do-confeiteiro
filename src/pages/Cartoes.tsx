import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, toNumber } from "@/lib/format";
import { Plus, CreditCard, Check } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ItemActions from "@/components/ItemActions";

const Cartoes = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [cartoes, setCartoes] = useState<any[]>([]);
  const [selectedCartao, setSelectedCartao] = useState<string | null>(null);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [itensFatura, setItensFatura] = useState<any[]>([]);
  const [selectedFatura, setSelectedFatura] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", dia_fechamento: "", dia_vencimento: "" });

  const fetchCartoes = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("cartoes").select("*").eq("empresa_id", empresaId).order("nome");
    setCartoes(data || []);
  };

  const fetchFaturas = async (cartaoId: string) => {
    const { data } = await supabase.from("faturas").select("*").eq("cartao_id", cartaoId).order("mes_referencia", { ascending: false });
    setFaturas(data || []);
  };

  const fetchItens = async (faturaId: string) => {
    const { data } = await supabase.from("itens_fatura").select("*").eq("fatura_id", faturaId).order("criado_em");
    setItensFatura(data || []);
  };

  useEffect(() => { fetchCartoes(); }, [empresaId]);
  useEffect(() => { if (selectedCartao) fetchFaturas(selectedCartao); }, [selectedCartao]);
  useEffect(() => { if (selectedFatura) fetchItens(selectedFatura); }, [selectedFatura]);

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

  const handleDelete = async (id: string) => {
    await supabase.from("cartoes").delete().eq("id", id);
    if (selectedCartao === id) { setSelectedCartao(null); setFaturas([]); }
    toast({ title: "Cartão removido" });
    fetchCartoes();
  };

  const togglePaga = async (faturaId: string, paga: boolean) => {
    await supabase.from("faturas").update({ paga: !paga }).eq("id", faturaId);
    if (selectedCartao) fetchFaturas(selectedCartao);
  };

  const openEdit = (c: any) => {
    setForm({ nome: c.nome, dia_fechamento: String(c.dia_fechamento), dia_vencimento: String(c.dia_vencimento) });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const chartData = faturas.map((f) => ({
    mes: new Date(f.mes_referencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    valor: toNumber(f.valor_total),
  })).reverse();

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cartoes.map((c) => (
          <Card key={c.id} className={`cursor-pointer transition-all ${selectedCartao === c.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedCartao(c.id)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CreditCard className="h-5 w-5 text-primary shrink-0" />
                  <p className="font-medium truncate">{c.nome}</p>
                </div>
                <ItemActions onEdit={() => openEdit(c)} onDelete={() => handleDelete(c.id)} deleteLabel="este cartão" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Fecha dia {c.dia_fechamento} · Vence dia {c.dia_vencimento}</p>
            </CardContent>
          </Card>
        ))}
        {cartoes.length === 0 && <p className="text-sm text-muted-foreground col-span-3 text-center py-8">Nenhum cartão cadastrado</p>}
      </div>

      {selectedCartao && (
        <>
          {chartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Evolução das Faturas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(340,25%,90%)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="valor" fill="hsl(340,60%,65%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Faturas</CardTitle></CardHeader>
            <CardContent>
              {faturas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma fatura</p>
              ) : (
                <div className="space-y-2">
                  {faturas.map((f) => (
                    <div key={f.id}>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer" onClick={() => setSelectedFatura(selectedFatura === f.id ? null : f.id)}>
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(f.mes_referencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold">{formatCurrency(toNumber(f.valor_total))}</p>
                          <Badge variant={f.paga ? "default" : "secondary"} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); togglePaga(f.id, f.paga); }}>
                            {f.paga ? <><Check className="h-3 w-3 mr-1" />Paga</> : "Em aberto"}
                          </Badge>
                        </div>
                      </div>
                      {selectedFatura === f.id && itensFatura.length > 0 && (
                        <div className="ml-4 mt-2 space-y-1">
                          {itensFatura.map((item) => (
                            <div key={item.id} className="flex justify-between p-2 text-sm bg-card rounded">
                              <span>{item.descricao} {item.total_parcelas > 1 && `(${item.parcela_atual}/${item.total_parcelas})`}</span>
                              <span className="font-medium">{formatCurrency(toNumber(item.valor))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Cartoes;
