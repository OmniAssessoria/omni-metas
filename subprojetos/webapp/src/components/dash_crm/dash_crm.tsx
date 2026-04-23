import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CloudCog,
  Users,
  RotateCw,
  Loader2,
  BarChart2,
  LayoutGrid,
  ListIcon,
  Search,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";

interface DashCrmProps {
  loadingBolhas: boolean;
  dadosPipelineBolhas: any[];
  fetchDadosBolhas: (isManualRefresh?: boolean) => void;
  CORES: {
    renovacao: string;
    portabilidade: string;
    carteira_pipe: string;
    vazio: string;
    sucesso: string;
    declinio: string;
    [key: string]: string;
  };
  renderCenterText: (value: number, label: string) => React.ReactNode;
  dadosPerdas: any[];
  viewModePerdas: "grafico" | "tabela";
  setViewModePerdas: (mode: "grafico" | "tabela") => void;
  dataInicioPipe: string;
  setDataInicioPipe: (data: string) => void;
  dataFimPipe: string;
  setDataFimPipe: (data: string) => void;
  buscarRelatorioPerdasPeriodo: () => void;
  loadingPerdas: boolean;

  // NOVAS PROPRIEDADES DE EXPORTAÇÃO
  exportToImage: (elementId: string, fileNamePrefix: string) => void;
  setModalExportacaoAberto: (
    val: "servicos" | "historico" | "carteira" | "crm" | null,
  ) => void;
}

export default function DashCrm({
  loadingBolhas,
  dadosPipelineBolhas,
  fetchDadosBolhas,
  CORES,
  renderCenterText,
  dadosPerdas,
  viewModePerdas,
  setViewModePerdas,
  dataInicioPipe,
  setDataInicioPipe,
  dataFimPipe,
  setDataFimPipe,
  buscarRelatorioPerdasPeriodo,
  loadingPerdas,
  exportToImage,
  setModalExportacaoAberto,
}: DashCrmProps) {
  return (
    // ATUALIZAÇÃO: Container com ID para isolar o print de todo o contexto do CRM
    <div id="dash-crm-container" className="w-full space-y-8 pt-2">
      {/* CABEÇALHO UNIFICADO DO CRM COM BOTÕES DE EXPORTAÇÃO */}
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            <CloudCog className="w-7 h-7 text-red-700" /> Pipeline e Perdas
            (CRM)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visualização do volume de Oportunidades no Funil e Análise de Perdas
            por Consultor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() =>
              exportToImage("dash-crm-container", "Analise_CRM_PipeRun")
            }
            className="flex items-center gap-2 px-4 py-2 font-semibold text-slate-700 transition-all shadow-sm bg-white border border-slate-200 hover:bg-red-50 rounded-xl"
            title="Salvar Gráficos como Imagem"
          >
            <ImageIcon className="w-4 h-4 text-red-600" />
            Print Gráficos
          </Button>

          <Button
            onClick={() => setModalExportacaoAberto("crm")}
            className="flex items-center gap-2 px-4 py-2 font-semibold text-white transition-all shadow-sm bg-red-600 hover:bg-red-700 rounded-xl"
            title="Baixar Relatório de Perdas (Excel, PDF, CSV)"
          >
            <Download className="w-4 h-4" />
            Exportar Dados (Perdas)
          </Button>
        </div>
      </div>

      <section className="w-full max-w-7xl mx-auto">
        <Card className="bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Users className="w-5 h-5 text-red-700" /> Oportunidades
              Compiladas (Bolhas)
            </h2>
            <Button
              variant="outline"
              onClick={() => fetchDadosBolhas(true)}
              disabled={loadingBolhas}
              className="gap-2 shadow-sm flex items-center border-slate-200 text-white hover:bg-slate-50 cursor-pointer"
            >
              <RotateCw
                className={`h-4 w-4 ${loadingBolhas ? "animate-spin text-red-500" : ""}`}
              />
              Atualizar Gráfico
            </Button>
          </div>

          <div className="w-full bg-slate-50/50 rounded-lg border border-slate-100 p-6 max-h-[600px] overflow-y-auto">
            {loadingBolhas && dadosPipelineBolhas.length === 0 ? (
              <div className="w-full h-[300px] flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin mb-2 text-red-500" />
                Calculando oportunidades no PipeRun...
              </div>
            ) : dadosPipelineBolhas.length === 0 ? (
              <div className="w-full h-[300px] flex items-center justify-center text-slate-500 font-medium">
                Nenhum dado encontrado para os consultores atuais no Pipeline.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {dadosPipelineBolhas.map((entry, index) => {
                  let cor = "#8884d8";
                  if (entry.perfil === "RENOVACAO") cor = CORES.renovacao;
                  if (entry.perfil === "PORTABILIDADE")
                    cor = CORES.portabilidade;
                  if (entry.perfil === "CARTEIRA") cor = CORES.carteira_pipe;
                  if (entry.perfil === "AMBOS") cor = "#a855f7";

                  return (
                    <div
                      key={`bolha-${index}`}
                      className="flex flex-col items-center bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:border-red-200 transition-colors"
                    >
                      <h3 className="text-sm font-bold text-center mb-2 line-clamp-2 h-10 flex items-center text-slate-700">
                        {entry.nome}
                      </h3>
                      <div className="w-40 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Total", value: entry.total },
                                {
                                  name: "Vazio",
                                  value: entry.total === 0 ? 1 : 0,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={cor} />
                              <Cell fill={CORES.vazio} />
                            </Pie>
                            {renderCenterText(entry.total, "Total")}
                            <RechartsTooltip
                              formatter={(val: any) =>
                                val === 0 && entry.total === 0
                                  ? [0, "Oportunidades"]
                                  : [val, "Oportunidades"]
                              }
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="w-full max-w-7xl mx-auto">
        <div className="flex flex-col items-start justify-between w-full gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-red-600" /> Relatório de Perdas
              (Declinados)
            </h2>
            <p className="mt-1 text-sm text-slate-500 mb-3">
              Filtre por data para visualizar o Total Base enviado e a proporção
              declinada.
            </p>
          </div>

          {dadosPerdas.length > 0 && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewModePerdas("grafico")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
                  viewModePerdas === "grafico"
                    ? "bg-white shadow-sm text-red-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Gráficos
              </button>
              <button
                onClick={() => setViewModePerdas("tabela")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
                  viewModePerdas === "tabela"
                    ? "bg-white shadow-sm text-red-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <ListIcon className="w-4 h-4" /> Tabela
              </button>
            </div>
          )}
        </div>

        <Card className="bg-white border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row items-end gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-700">
                Data Criação (Início)
              </label>
              <input
                type="date"
                value={dataInicioPipe}
                onChange={(e) => setDataInicioPipe(e.target.value)}
                className="w-full h-10 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-700">
                Data Criação (Fim)
              </label>
              <input
                type="date"
                value={dataFimPipe}
                onChange={(e) => setDataFimPipe(e.target.value)}
                className="w-full h-10 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-red-500"
              />
            </div>
            <Button
              onClick={buscarRelatorioPerdasPeriodo}
              disabled={loadingPerdas}
              className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-bold w-full md:w-auto"
            >
              {loadingPerdas ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Buscar Perdas
            </Button>
          </div>

          {viewModePerdas === "grafico" && (
            <div className="w-full bg-slate-50/50 rounded-lg border border-slate-100 p-6 min-h-[300px] max-h-[600px] overflow-y-auto">
              {loadingPerdas ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-2 text-red-500" />
                  Calculando perdas e bases no PipeRun...
                </div>
              ) : dadosPerdas.length === 0 ? (
                <div className="w-full h-[200px] flex items-center justify-center text-slate-500 font-medium">
                  Nenhum dado filtrado. Selecione um período e clique em buscar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {dadosPerdas.map((row, index) => {
                    const restouBase = row.totalBase - row.totalDeclinados;

                    const dadosPie = [
                      {
                        name: "Restante (Base)",
                        value: restouBase < 0 ? 0 : restouBase,
                        fill: CORES.sucesso,
                      },
                      {
                        name: "Declinados",
                        value: row.totalDeclinados,
                        fill: CORES.declinio,
                      },
                    ];
                    const fmt = (val: number) =>
                      new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(val);

                    return (
                      <div
                        key={`perda-${index}`}
                        className="flex flex-col items-center bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:border-red-200 transition-colors"
                      >
                        <h3 className="text-sm font-bold text-center mb-1 line-clamp-2 h-10 flex items-center text-slate-800">
                          {row.nome}
                        </h3>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded mb-3 font-semibold uppercase tracking-wider">
                          {row.perfil}
                        </span>

                        <div className="w-40 h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={dadosPie}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                dataKey="value"
                                stroke="none"
                              >
                                {dadosPie.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(val: any, name: any) => [val, name]}
                                contentStyle={{
                                  borderRadius: "8px",
                                  border: "none",
                                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="w-full mt-4 space-y-2 text-xs">
                          <div className="flex justify-between items-center bg-red-50 p-1.5 rounded">
                            <span className="font-semibold text-red-600">
                              Declinados:
                            </span>
                            <span className="font-bold text-red-600">
                              {row.totalDeclinados}{" "}
                              <span className="text-[9px] text-red-400 font-normal">
                                ({fmt(row.valorDeclinados)})
                              </span>
                            </span>
                          </div>
                          <div className="text-center pt-1 border-t border-slate-100 mt-1">
                            <span
                              className={`font-bold ${Number(row.taxaPerda) > 50 ? "text-red-600" : "text-amber-500"}`}
                            >
                              {row.taxaPerda}% de Perda
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {viewModePerdas === "tabela" && (
            <div className="w-full overflow-x-auto rounded-lg border border-slate-200 mt-4">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Consultor</th>
                    <th className="px-6 py-4 text-center">Perfil</th>
                    <th className="px-6 py-4 text-center border-l border-slate-200">
                      Total Base (Qtd)
                    </th>
                    <th className="px-6 py-4 text-center text-red-600 border-l border-slate-200">
                      Declinados (Qtd)
                    </th>
                    <th className="px-6 py-4 text-center bg-slate-100">
                      % Perda
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dadosPerdas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        {loadingPerdas
                          ? "Buscando relatórios..."
                          : "Nenhum dado filtrado. Selecione um período e clique em buscar."}
                      </td>
                    </tr>
                  ) : (
                    dadosPerdas.map((row, index) => (
                      <tr
                        key={index}
                        className="hover:bg-slate-50 text-black transition-colors"
                      >
                        <td className="px-6 py-3 font-semibold text-slate-800">
                          {row.nome}
                        </td>
                        <td className="px-6 py-3 text-center text-xs">
                          <span className="bg-slate-100 px-2 py-1 rounded">
                            {row.perfil === "AMBOS"
                              ? "AMBOS (RENOV/PORTAB)"
                              : row.perfil === "CARTEIRA"
                                ? "CARTEIRA / RENOV"
                                : row.perfil}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center border-l border-slate-200 font-bold">
                          {row.totalBase}
                        </td>
                        <td className="px-6 py-3 text-center text-red-600 font-bold border-l border-slate-200">
                          {row.totalDeclinados}
                        </td>
                        <td className="px-6 py-3 text-center font-bold bg-slate-50">
                          <span
                            className={
                              Number(row.taxaPerda) > 50
                                ? "text-red-600"
                                : "text-amber-500"
                            }
                          >
                            {row.taxaPerda}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
