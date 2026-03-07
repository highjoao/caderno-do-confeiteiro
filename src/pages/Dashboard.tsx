import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatPercent, toNumber } from "@/lib/format";
import { DollarSign, TrendingDown, Building2, TrendingUp, Target, BarChart3, CalendarDays, CreditCard, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(340,60%,65%)", "hsl(200,60%,60%)", "hsl(160,50%,55%)", "hsl(30,70%,60%)"];

const Dashboard = () => {
  const { empresaId } = useAuth();
  const [periodo, setPeriodo] = useState("mes_atual");
  const [faturamentoTotal, setFaturamentoTotal] = useState(0);
  const [despesasPagas, setDespesasPagas] = useState(0);
  const [faturasAbertas, setFaturasAbertas] = useState(0);
  const [custosFixosTotal, setCustosFixosTotal] = useState(0);
  const [metaValor, setMetaValor] = useState(0);
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [encomendas, setEncomendas] = useState<any[]>([]);
  const [totalEncomendas, setTotalEncomendas] = useState(0);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    const end = new Date(now);
    switch (periodo) {
      case "hoje": start = new Date(now); start.setHours(0,0,0,0); break;
      case "7dias": start = new Date(now); start.setDate(start.getDate() - 7); break;
      case "30dias": start = new Date(now); start.setDate(start.getDate() - 30); break;
      default: start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
  };

  useEffect(() => {
    if (!empresaId) return;
    const { start, end } = getDateRange();

    const fetchData = async () => {
      // Fechamentos
      const { data: fechData } = await supabase
        .from("fechamentos_diarios")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("data", start)
        .lte("data", end)
        .order("data");
      
      const fechList = fechData || [];
      setFechamentos(fechList);
      setFaturamentoTotal(fechList.reduce((s, f) => s + toNumber(f.total), 0));

      // Despesas pagas: gastos onde forma_pagamento != 'Cartão'
      const { data: gastosNaoCartao } = await supabase
        .from("gastos")
        .select("valor")
        .eq("empresa_id", empresaId)
        .neq("forma_pagamento", "Cartão")
        .gte("data", start)
        .lte("data", end);
      const totalNaoCartao = (gastosNaoCartao || []).reduce((s, g) => s + toNumber(g.valor), 0);

      // Faturas pagas no período (compras no cartão já quitadas)
      const { data: faturasPagas } = await supabase
        .from("faturas")
        .select("valor_total")
        .eq("paga", true)
        .gte("mes_referencia", start)
        .lte("mes_referencia", end);
      const totalFaturasPagas = (faturasPagas || []).reduce((s, f) => s + toNumber(f.valor_total), 0);

      setDespesasPagas(totalNaoCartao + totalFaturasPagas);

      // Faturas em aberto (todas, sem filtro de período)
      const { data: faturasAbertasData } = await supabase
        .from("faturas")
        .select("valor_total")
        .eq("paga", false);
      setFaturasAbertas((faturasAbertasData || []).reduce((s, f) => s + toNumber(f.valor_total), 0));

      // Custos fixos
      const { data: cfData } = await supabase
        .from("custos_fixos")
        .select("valor")
        .eq("empresa_id", empresaId);
      setCustosFixosTotal((cfData || []).reduce((s, c) => s + toNumber(c.valor), 0));

      // Meta
      const mesAtual = new Date().toISOString().slice(0, 7) + "-01";
      const { data: metaData } = await supabase
        .from("metas_faturamento")
        .select("valor_meta")
        .eq("empresa_id", empresaId)
        .eq("mes_referencia", mesAtual)
        .single();
      setMetaValor(metaData ? toNumber(metaData.valor_meta) : 0);

      // Encomendas
      const { data: encData } = await supabase
        .from("encomendas")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("data_retirada", start)
        .lte("data_retirada", end)
        .order("data_retirada")
        .limit(5);
      setEncomendas(encData || []);

      const { count } = await supabase
        .from("encomendas")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId)
        .gte("data_retirada", start)
        .lte("data_retirada", end);
      setTotalEncomendas(count || 0);
    };
    fetchData();
  }, [empresaId, periodo]);

  const lucro = faturamentoTotal - despesasPagas - custosFixosTotal;
  const diasLancados = fechamentos.length || 1;
  const mediaDiaria = faturamentoTotal / diasLancados;
  const percMeta = metaValor > 0 ? (faturamentoTotal / metaValor) * 100 : 0;
  const percCustoFixo = metaValor > 0 ? (custosFixosTotal / metaValor) * 100 : 0;

  const chartData = fechamentos.map((f) => ({
    data: new Date(f.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    total: toNumber(f.total),
  }));

  const pagamentoData = [
    { name: "Cartão", value: fechamentos.reduce((s, f) => s + toNumber(f.cartao), 0) },
    { name: "Pix", value: fechamentos.reduce((s, f) => s + toNumber(f.pix), 0) },
    { name: "Dinheiro", value: fechamentos.reduce((s, f) => s + toNumber(f.dinheiro), 0) },
    { name: "Delivery", value: fechamentos.reduce((s, f) => s + toNumber(f.delivery), 0) },
  ].filter((d) => d.value > 0);

  const cards = [
    { title: "Faturamento", value: formatCurrency(faturamentoTotal), icon: DollarSign, color: "text-primary" },
    { title: "Despesas Pagas", value: formatCurrency(despesasPagas), icon: TrendingDown, color: "text-destructive", tooltip: "Soma de gastos pagos (Pix, Dinheiro, Débito, Boleto) + faturas de cartão já quitadas no período." },
    { title: "Custos Fixos", value: formatCurrency(custosFixosTotal), icon: Building2, color: "text-warning" },
    { title: "Faturas em Aberto", value: formatCurrency(faturasAbertas), icon: CreditCard, color: "text-orange-500", tooltip: "Total de faturas de cartão ainda não pagas (todas as faturas em aberto)." },
    { title: "Lucro Estimado", value: formatCurrency(lucro), icon: TrendingUp, color: lucro >= 0 ? "text-success" : "text-destructive", tooltip: "Faturamento − Despesas Pagas − Custos Fixos. Não inclui faturas em aberto." },
    { title: "Meta", value: formatCurrency(metaValor), icon: Target, color: "text-primary" },
    { title: "% Meta Atingida", value: formatPercent(percMeta), icon: BarChart3, color: "text-primary" },
    { title: "Média Diária", value: formatCurrency(mediaDiaria), icon: TrendingUp, color: "text-muted-foreground", tooltip: `Faturamento total ÷ ${fechamentos.length} dia(s) com lançamento.` },
    { title: "Encomendas", value: String(totalEncomendas), icon: CalendarDays, color: "text-primary" },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Visão Geral</h2>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7dias">7 dias</SelectItem>
              <SelectItem value="30dias">30 dias</SelectItem>
              <SelectItem value="mes_atual">Mês Atual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Percentual custos fixos */}
        {metaValor > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm text-foreground">
                Seus custos fixos consomem <strong>{formatPercent(percCustoFixo)}</strong> da sua meta mensal.
                {faturamentoTotal > 0 && (
                  <> O faturamento atual cobre <strong>{formatPercent((faturamentoTotal / custosFixosTotal) * 100)}</strong> dos custos fixos.</>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Card key={c.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground">{c.title}</p>
                    {c.tooltip && (
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[220px]">
                          <p className="text-xs">{c.tooltip}</p>
                        </TooltipContent>
                      </UITooltip>
                    )}
                  </div>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
                <p className="text-lg font-bold mt-1">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do Faturamento</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(340,25%,90%)" />
                    <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="total" stroke="hsl(340,60%,65%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">Sem dados para o período</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {pagamentoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pagamentoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pagamentoData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">Sem dados para o período</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Próximas encomendas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas Encomendas</CardTitle>
          </CardHeader>
          <CardContent>
            {encomendas.length > 0 ? (
              <div className="space-y-2">
                {encomendas.map((enc) => (
                  <div key={enc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{enc.cliente_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(enc.data_retirada + "T00:00:00").toLocaleDateString("pt-BR")}
                        {enc.hora_retirada && ` às ${enc.hora_retirada.slice(0, 5)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(toNumber(enc.valor_total))}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{enc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma encomenda no período</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
