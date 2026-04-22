import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  History,
  Filter,
  Eraser,
  Download,
  Users,
  AlertCircle,
  BarChart2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

interface DashHistoricoProps {
  historicoFiltrado: any[];
  limparFiltrosHistorico: () => void;
  aplicarFiltrosHistorico: () => void;
  setModalExportacaoAberto: (modal: "servicos" | "historico" | null) => void;
  filtroHistConsultor: string;
  setFiltroHistConsultor: (val: string) => void;
  listaConsultoresHistUnicos: { seq: number | string; nome: string }[];
  filtroHistMotivo: string;
  setFiltroHistMotivo: (val: string) => void;
  listaMotivosUnicos: string[];
  dadosGraficoMotivo: any[];
  dadosGraficoConsultor: any[];
  CORES: {
    grafico_barras_1: string;
    grafico_barras_2: string;
    [key: string]: string;
  };
}

export default function DashHistorico({
  historicoFiltrado,
  limparFiltrosHistorico,
  aplicarFiltrosHistorico,
  setModalExportacaoAberto,
  filtroHistConsultor,
  setFiltroHistConsultor,
  listaConsultoresHistUnicos,
  filtroHistMotivo,
  setFiltroHistMotivo,
  listaMotivosUnicos,
  dadosGraficoMotivo,
  dadosGraficoConsultor,
  CORES,
}: DashHistoricoProps) {
  return (
    <section className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col items-start justify-between w-full gap-4 mb-6 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-primary" /> Análise de Histórico /
            Declínios
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visualização do histórico de atendimento dos consultores. Total
            Registros: {historicoFiltrado.length}
          </p>
        </div>
      </div>

      <Card className="bg-white border-none shadow-md mb-6">
        <CardContent className="p-5">
          <div className="flex flex-col justify-between gap-4 pb-4 mb-5 border-b md:flex-row md:items-center border-slate-100">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Filter className="w-4 h-4 text-primary" /> Filtros Específicos do
              Histórico
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={limparFiltrosHistorico}
                variant="outline"
                size="sm"
                className="transition-colors shadow-sm cursor-pointer text-white bg-slate-400 hover:bg-slate-500 border-none"
              >
                <Eraser className="w-3.5 h-3.5 mr-2" /> Limpar Filtros Histórico
              </Button>
              <Button
                onClick={aplicarFiltrosHistorico}
                size="sm"
                className="px-6 transition-transform shadow-md cursor-pointer hover:scale-105 bg-emerald-400 text-black font-semibold"
              >
                Aplicar no Histórico
              </Button>
              <Button
                onClick={() => setModalExportacaoAberto("historico")}
                size="sm"
                className="px-4 transition-colors shadow-md cursor-pointer bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <Download className="w-4 h-4 mr-2" /> Exportar Dados do
                Histórico
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Users className="w-3.5 h-3.5 text-purple-500" /> Consultor do
                Histórico
              </label>
              <select
                value={filtroHistConsultor}
                onChange={(e) => setFiltroHistConsultor(e.target.value)}
                className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
              >
                <option value="TODOS">Todos os Consultores</option>
                <optgroup label="Consultores do Histórico">
                  {listaConsultoresHistUnicos.map((c) => (
                    <option key={`hist_c_${c.seq}`} value={String(c.seq)}>
                      {c.nome}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Motivo de
                Declínio
              </label>
              <select
                value={filtroHistMotivo}
                onChange={(e) => setFiltroHistMotivo(e.target.value)}
                className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
              >
                <option value="TODOS">Todos os Motivos</option>
                <option value="SEM_DECLINIO">
                  🏆 Sem Declínio (Fechado/Ganho)
                </option>
                <optgroup label="Motivos Existentes">
                  {listaMotivosUnicos.map((motivo, i) => (
                    <option key={`hist_m_${i}`} value={motivo}>
                      {motivo}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
              <BarChart2 className="w-4 h-4 text-purple-500" />
              Top 10 - Volume por Motivo de Declínio
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosGraficoMotivo}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  type="number"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={150}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill={CORES.grafico_barras_1}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  name="Total de Históricos"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
              <Users className="w-4 h-4 text-emerald-500" />
              Top 10 - Volume de Histórico por Consultor
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosGraficoConsultor}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelFormatter={(value) => `Consultor: ${value}`}
                />
                <Bar
                  dataKey="value"
                  fill={CORES.grafico_barras_2}
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  name="Volume de Atendimentos"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}