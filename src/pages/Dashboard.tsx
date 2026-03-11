import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatCurrency, formatPercent, toNumber } from "@/lib/format";
import { DollarSign, TrendingDown, Building2, TrendingUp, Target, BarChart3, CalendarDays, CreditCard, Wallet } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(340,60%,65%)", "hsl(200,60%,60%)", "hsl(160,50%,55%)", "hsl(30,70%,60%)"];

const Dashboard = () => {
  const { empresaId } = useAuth();
  const [periodo, setPeriodo] = useState("mes_atual");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
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
    let end = new Date(now);

    if (periodo === "personalizado" && customStart && customEnd) {
      return {
        start: format(customStart, "yyyy-MM-dd"),
        end: format(customEnd, "yyyy-MM-dd"),
      };
    }

    switch (periodo) {
      case "hoje":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "7dias":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case "30dias":
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
  };

  const getDaysInPeriod = () => {
    const { start, end } = getDateRange();
    const diff = differenceInDays(new Date(end + "T00:00:00"), new Date(start + "T00:00:00"));
    return Math.max(diff, 1);
  };

  useEffect(() => {
    if (!empresaId) return;
    if (periodo === "personalizado" && (!customStart || !customEnd)) return;

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

      // Despesas pagas (gastos NÃO cartão no período)
      const { data: gastosNaoCartao } = await supabase
        .from("gastos")
        .select("valor")
        .eq("empresa_id", empresaId)
        .neq("forma_pagamento", "Cartão")
        .gte("data", start)
        .lte("data", end);

      const totalGastosNaoCartao = (gastosNaoCartao || []).reduce((s, g) => s + toNumber(g.valor), 0);

      // Faturas pagas no período (mes_referencia dentro do range)
      const { data: faturasPagas } = await supabase
        .from("faturas")
        .select("valor_total, mes_referencia, paga")
        .eq("paga", true)
        .gte("mes_referencia", start)
        .lte("mes_referencia", end);

      const totalFaturasPagas = (faturasPagas || []).reduce((s, f) => s + toNumber(f.valor_total), 0);

      setDespesasPagas(totalGastosNaoCartao + totalFaturasPagas);

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
  }, [empresaId, periodo, customStart, customEnd]);

  const lucro = faturamentoTotal - despesasPagas - custosFixosTotal;
  const diasPeriodo = getDaysInPeriod();
  const mediaDiaria = faturamentoTotal / diasPeriodo;
  const percMeta = metaValor > 0 ? (faturamentoTotal / metaValor) * 100 : 0;
  const percCustoFixo = metaValor > 0 ? (custosFixosTotal / metaValor) * 100 : 0;

  const chartData = fechamentos.map((f) => {
    const [y, m, d] = (f.data as string).split("-");
    return { data: `${d}/${m}`, total: toNumber(f.total) };
  });

  const pagamentoData = [
    { name: "Cartão", value: fechamentos.reduce((s, f) => s + toNumber(f.cartao), 0) },
    { name: "Pix", value: fechamentos.reduce((s, f) => s + toNumber(f.pix), 0) },
    { name: "Dinheiro", value: fechamentos.reduce((s, f) => s + toNumber(f.dinheiro), 0) },
    { name: "Delivery", value: fechamentos.reduce((s, f) => s + toNumber(f.delivery), 0) },
  ].filter((d) => d.value > 0);

  const cards = [
    { title: "Faturamento", value: formatCurrency(faturamentoTotal), icon: DollarSign, color: "text-primary" },
    { title: "Despesas Pagas", value: formatCurrency(despesasPagas), icon: Wallet, color: "text-destructive", tooltip: "Soma de gastos pagos em dinheiro, Pix, débito, boleto + faturas de cartão já quitadas no período." },
    { title: "Faturas em Aberto", value: formatCurrency(faturasAbertas), icon: CreditCard, color: "text-warning", tooltip: "Total de faturas de cartão ainda não pagas. Inclui todas as faturas pendentes, independente do período." },
    { title: "Custos Fixos", value: formatCurrency(custosFixosTotal), icon: Building2, color: "text-warning" },
    { title: "Lucro Estimado", value: formatCurrency(lucro), icon: TrendingUp, color: lucro >= 0 ? "text-success" : "text-destructive", tooltip: "Faturamento − Despesas Pagas − Custos Fixos. Não inclui faturas em aberto (compromissos futuros)." },
    { title: "Meta", value: formatCurrency(metaValor), icon: Target, color: "text-primary" },
    { title: "% Meta Atingida", value: formatPercent(percMeta), icon: BarChart3, color: "text-primary" },
    { title: "Média Diária", value: formatCurrency(mediaDiaria), icon: TrendingUp, color: "text-muted-foreground", tooltip: `Faturamento total ÷ ${diasPeriodo} dias do período selecionado.` },
    { title: "Encomendas", value: String(totalEncomendas), icon: CalendarDays, color: "text-primary" },
  ];

  const formatCustomLabel = () => {
    if (customStart && customEnd) {
      return `${format(customStart, "dd/MM", { locale: ptBR })} → ${format(customEnd, "dd/MM", { locale: ptBR })}`;
    }
    return "Selecionar datas";
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-semibold text-foreground">Visão Geral</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={periodo} onValueChange={(v) => { setPeriodo(v); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7dias">7 dias</SelectItem>
                <SelectItem value="30dias">30 dias</SelectItem>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {periodo === "personalizado" && (
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      {customStart ? format(customStart, "dd/MM/yyyy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-xs">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      {customEnd ? format(customEnd, "dd/MM/yyyy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
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
                  {c.tooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs font-semibold text-muted-foreground cursor-help">{c.title}</p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">{c.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <p className="text-xs font-semibold text-muted-foreground">{c.title}</p>
                  )}
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
                    <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
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
                    <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
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
                        {(() => { const [y,m,d] = (enc.data_retirada as string).split("-"); return `${d}/${m}/${y}`; })()}
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
