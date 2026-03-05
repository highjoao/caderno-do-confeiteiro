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
import { formatCurrency, toNumber } from "@/lib/format";
import { Plus } from "lucide-react";
import ItemActions from "@/components/ItemActions";

const TIPOS = ["Embalagem", "Insumo"];
const UNIDADES = ["g", "Kg", "L", "ml", "Unidade"];

const Insumos = () => {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [insumos, setInsumos] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [form, setForm] = useState({ nome: "", tipo: "Insumo", valor_pago: "", quantidade_comprada: "", unidade: "g" });

  const fetchData = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("insumos").select("*").eq("empresa_id", empresaId).order("nome");
    setInsumos(data || []);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const calcCustos = (valor: number, qtd: number, unidade: string) => {
    if (qtd === 0) return { porGrama: 0, porUnidade: 0 };
    const custoUnitario = valor / qtd;
    if (unidade === "Kg") return { porGrama: custoUnitario / 1000, porUnidade: custoUnitario };
    if (unidade === "g") return { porGrama: custoUnitario, porUnidade: custoUnitario };
    if (unidade === "L") return { porGrama: custoUnitario / 1000, porUnidade: custoUnitario };
    if (unidade === "ml") return { porGrama: custoUnitario, porUnidade: custoUnitario };
    return { porGrama: 0, porUnidade: custoUnitario };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;
    const valor = toNumber(form.valor_pago);
    const qtd = toNumber(form.quantidade_comprada);
    const { porGrama, porUnidade } = calcCustos(valor, qtd, form.unidade);

    const payload = {
      empresa_id: empresaId, nome: form.nome, tipo: form.tipo,
      valor_pago: valor, quantidade_comprada: qtd, unidade: form.unidade,
      custo_por_grama: porGrama, custo_por_unidade: porUnidade,
    };

    if (editingId) {
      await supabase.from("insumos").update(payload).eq("id", editingId);
      toast({ title: "Insumo atualizado!" });
    } else {
      await supabase.from("insumos").insert(payload);
      toast({ title: "Insumo cadastrado!" });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => { setForm({ nome: "", tipo: "Insumo", valor_pago: "", quantidade_comprada: "", unidade: "g" }); setEditingId(null); };

  const handleDelete = async (id: string) => {
    await supabase.from("insumos").delete().eq("id", id);
    toast({ title: "Removido" });
    setDetailItem(null);
    fetchData();
  };

  const openEdit = (i: any) => {
    setForm({ nome: i.nome, tipo: i.tipo, valor_pago: String(toNumber(i.valor_pago)), quantidade_comprada: String(toNumber(i.quantidade_comprada)), unidade: i.unidade });
    setEditingId(i.id);
    setDetailItem(null);
    setDialogOpen(true);
  };

  const filtered = filtroTipo === "todos" ? insumos : insumos.filter((i) => i.tipo === filtroTipo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Insumos</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Insumo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo"} Insumo</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor Pago (R$)</Label><Input type="number" step="0.01" value={form.valor_pago} onChange={(e) => setForm({ ...form, valor_pago: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Qtd Comprada</Label><Input type="number" step="0.0001" value={form.quantidade_comprada} onChange={(e) => setForm({ ...form, quantidade_comprada: e.target.value })} required /></div>
              </div>
              <Button type="submit" className="w-full">{editingId ? "Atualizar" : "Salvar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {["todos", "Insumo", "Embalagem"].map((t) => (
          <Button key={t} variant={filtroTipo === t ? "default" : "outline"} size="sm" onClick={() => setFiltroTipo(t)}>
            {t === "todos" ? "Todos" : t}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum insumo cadastrado</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((i) => (
                <div key={i.id} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailItem(i)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{i.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.tipo} · {toNumber(i.quantidade_comprada)} {i.unidade} por {formatCurrency(toNumber(i.valor_pago))}
                    </p>
                    <p className="text-xs text-primary mt-0.5">
                      {i.unidade !== "Unidade" && `R$ ${toNumber(i.custo_por_grama).toFixed(4)}/g · `}
                      R$ {toNumber(i.custo_por_unidade).toFixed(4)}/{i.unidade}
                    </p>
                  </div>
                  <ItemActions onEdit={() => openEdit(i)} onDelete={() => handleDelete(i.id)} deleteLabel="este insumo" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => { if (!o) setDetailItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Insumo</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Nome</p><p className="text-sm font-medium">{detailItem.nome}</p></div>
                <div><p className="text-xs text-muted-foreground">Tipo</p><p className="text-sm font-medium">{detailItem.tipo}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Pago</p><p className="text-sm font-medium">{formatCurrency(toNumber(detailItem.valor_pago))}</p></div>
                <div><p className="text-xs text-muted-foreground">Qtd Comprada</p><p className="text-sm font-medium">{toNumber(detailItem.quantidade_comprada)} {detailItem.unidade}</p></div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 space-y-1">
                {detailItem.unidade !== "Unidade" && (
                  <div className="flex justify-between text-sm"><span>Custo por grama:</span><span className="font-medium">R$ {toNumber(detailItem.custo_por_grama).toFixed(4)}</span></div>
                )}
                <div className="flex justify-between text-sm"><span>Custo por {detailItem.unidade}:</span><span className="font-medium">R$ {toNumber(detailItem.custo_por_unidade).toFixed(4)}</span></div>
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

export default Insumos;
