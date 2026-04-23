import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Filter,
  Eraser,
  Download,
  Power,
  Target,
  Users,
  AlertCircle,
  Wallet,
  CloudCog,
  Calendar,
  ScanSearch,
  Tag,
  Briefcase,
  ToggleRight,
  ToggleLeft,
  RefreshCcw,
  Image as ImageIcon,
  Database,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  TipoAtivoFilter,
  TipoCarteiraFilter,
  TipoClassificacaoFilter,
  TipoFiltroLinha,
  TipoPiperunFilter,
  TipoSituacaoFilter,
} from "@/interfaces/dashboard.type";

interface ConsultorSimples {
  seq: number | string;
  nome: string;
}

export interface DashServicoClaroProps {
  ultimaAtualizacao: Date | null;
  exportToImage: (elementId: string, fileNamePrefix: string) => void;
  fetchTodasViews: () => void;
  loading: boolean;
  limparFiltros: () => void;
  aplicarFiltrosGlobais: () => void;
  setModalExportacaoAberto: (
    val: "servicos" | "historico" | "carteira" | "crm" | null,
  ) => void;

  filtroAtivo: TipoAtivoFilter;
  setFiltroAtivo: (val: TipoAtivoFilter) => void;
  filtroExclusivo: "TODOS" | "SIM" | "NAO";
  setFiltroExclusivo: (val: "TODOS" | "SIM" | "NAO") => void;
  filtroDDD: string;
  setFiltroDDD: (val: string) => void;
  filtroConsultor: string;
  setFiltroConsultor: (val: string) => void;
  listaConsultoresUnicos: ConsultorSimples[];
  filtroSituacao: TipoSituacaoFilter;
  setFiltroSituacao: (val: TipoSituacaoFilter) => void;
  filtroCarteira: TipoCarteiraFilter;
  setFiltroCarteira: (val: TipoCarteiraFilter) => void;
  filtroPiperun: TipoPiperunFilter;
  setFiltroPiperun: (val: TipoPiperunFilter) => void;
  filtroDataFim: string;
  setFiltroDataFim: (val: string) => void;
  filtroClassificacao: TipoClassificacaoFilter;
  setFiltroClassificacao: (val: TipoClassificacaoFilter) => void;

  tipoFiltroLinha: TipoFiltroLinha;
  setTipoFiltroLinha: (val: TipoFiltroLinha) => void;
  filtroLinhasRangeMin: number;
  setFiltroLinhasRangeMin: (val: number) => void;
  filtroLinhasRangeMax: number;
  setFiltroLinhasRangeMax: (val: number) => void;

  // Propriedades mantidas na interface para evitar erros com o componente Pai,
  // mas a lógica visual e funcional foi unificada no Range.
  filtroLinhasExact: number;
  setFiltroLinhasExact: (val: number) => void;

  maxLinhasGlobal: number;

  filtroCpcAtivo: boolean;
  setFiltroCpcAtivo: (val: boolean) => void;
  filtroCpcValor: number;
  setFiltroCpcValor: (val: number) => void;
  maxDiasCpcGlobal: number;

  totais: {
    renovacao: number;
    portabilidade: number;
    fora_prazo: number;
    aquecendo: number;
    prazo_limitado: number;
    prazo_excedido: number;
    geral: number;
  };
  CORES: any;
  renderCenterText: (value: number, label: string) => React.ReactNode;
}

export default function DashServicoClaro({
  ultimaAtualizacao,
  exportToImage,
  fetchTodasViews,
  loading,
  limparFiltros,
  aplicarFiltrosGlobais,
  setModalExportacaoAberto,
  filtroAtivo,
  setFiltroAtivo,
  filtroExclusivo,
  setFiltroExclusivo,
  filtroDDD,
  setFiltroDDD,
  filtroConsultor,
  setFiltroConsultor,
  listaConsultoresUnicos,
  filtroSituacao,
  setFiltroSituacao,
  filtroCarteira,
  setFiltroCarteira,
  filtroPiperun,
  setFiltroPiperun,
  filtroDataFim,
  setFiltroDataFim,
  filtroClassificacao,
  setFiltroClassificacao,
  tipoFiltroLinha,
  setTipoFiltroLinha,
  filtroLinhasRangeMin,
  setFiltroLinhasRangeMin,
  filtroLinhasRangeMax,
  setFiltroLinhasRangeMax,
  maxLinhasGlobal,
  filtroCpcAtivo,
  setFiltroCpcAtivo,
  filtroCpcValor,
  setFiltroCpcValor,
  maxDiasCpcGlobal,
  totais,
  CORES,
  renderCenterText,
}: DashServicoClaroProps) {
  const safeMaxLinhas = Math.max(maxLinhasGlobal || 0, 1);

  const renderMiniGrafico = (
    titulo: string,
    valor: number,
    corGrafico: string,
  ) => {
    const isVazio = valor === 0;
    const dataGrafico = [
      {
        name: titulo,
        value: isVazio ? 1 : valor,
        fill: isVazio ? CORES.vazio : corGrafico,
      },
    ];
    return (
      <div className="flex flex-col items-center p-4 transition-shadow bg-white border shadow-sm rounded-xl border-slate-100 hover:shadow-md">
        <h3 className="flex items-center justify-center h-10 mb-2 text-sm font-bold tracking-wide text-center uppercase text-slate-700">
          {titulo}
        </h3>
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataGrafico}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={dataGrafico[0].fill} />
              </Pie>
              {renderCenterText(valor, "Serviços")}
              <RechartsTooltip
                formatter={() => (isVazio ? [0, titulo] : [valor, titulo])}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderRangeSlider = (
    titulo: string,
    icone: React.ReactNode,
    ativo: boolean,
    setAtivo: (v: boolean) => void,
    valor: number,
    setValor: (v: number) => void,
    maximo: number,
    sufixoVal: string = "",
    minLabel: string = "0",
    maxLabel: string = "Máx",
  ) => (
    <div className="space-y-1.5 px-1">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          {icone} {titulo}
        </label>
        <button
          onClick={() => setAtivo(!ativo)}
          className="transition-opacity cursor-pointer text-primary hover:opacity-80"
        >
          {ativo ? (
            <ToggleRight className="w-6 h-6 text-emerald-500" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-slate-400" />
          )}
        </button>
      </div>
      <div
        className={`relative pt-3 pb-1 transition-opacity duration-300 ${ativo ? "opacity-100" : "opacity-40 pointer-events-none"}`}
      >
        <div
          className="absolute px-1.5 py-0.5 text-[10px] text-white transition-all shadow-lg top-[-4px] bg-slate-800 rounded z-10 whitespace-nowrap"
          style={{ left: `calc(${(valor / (maximo || 1)) * 100}% - 14px)` }}
        >
          {valor}
          {sufixoVal}
        </div>
        <input
          type="range"
          min="0"
          max={maximo}
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-primary relative z-0"
        />
        <div className="flex justify-between mt-1 text-[10px] text-slate-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  );

  return (
    <section id="dash-servicos-container" className="pt-2">
      <div className="flex flex-col items-start justify-between w-full max-w-7xl gap-4 mb-6 mx-auto lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
            Análise Geral das Bases (Serviços Claro)
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Última atualização:{" "}
            {ultimaAtualizacao
              ? ultimaAtualizacao.toLocaleTimeString()
              : "Aguardando sincronização"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() =>
              exportToImage("dash-servicos-container", "Analise_Servicos_Claro")
            }
            className="flex items-center gap-2 px-4 py-2 font-semibold text-slate-700 transition-all shadow-sm bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
            title="Salvar Gráficos como Imagem"
          >
            <ImageIcon className="w-4 h-4 text-blue-600" />
            Print Gráficos
          </Button>

          <Button
            onClick={() => setModalExportacaoAberto("servicos")}
            className="flex items-center gap-2 px-4 py-2 font-semibold text-white transition-all shadow-sm bg-blue-600 hover:bg-blue-700 rounded-xl"
            title="Baixar Tabela de Dados (Excel, PDF, CSV)"
          >
            <Download className="w-4 h-4" />
            Exportar Dados
          </Button>

          <Button
            onClick={fetchTodasViews}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 font-semibold text-white transition-all shadow-md bg-slate-800 hover:bg-slate-900 rounded-xl"
          >
            <RefreshCcw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Buscando..." : "Refresh Dados"}
          </Button>
        </div>
      </div>

      <div className="w-full space-y-6 max-w-7xl mx-auto">
        <Card className="bg-white border-none shadow-md">
          <CardContent className="p-5">
            <div className="flex flex-col justify-between gap-4 pb-4 mb-5 border-b md:flex-row md:items-center border-slate-100">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Filter className="w-4 h-4 text-primary" /> Filtros em Memória
                (Sem usar DB)
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={limparFiltros}
                  variant="outline"
                  size="sm"
                  className="transition-colors shadow-sm cursor-pointer text-slate-600 hover:text-slate-900 border-slate-300"
                >
                  <Eraser className="w-3.5 h-3.5 mr-2" /> Limpar Filtros
                </Button>
                <Button
                  onClick={aplicarFiltrosGlobais}
                  size="sm"
                  className="px-6 transition-transform shadow-md cursor-pointer hover:scale-105 bg-emerald-400 text-black font-semibold"
                >
                  Aplicar na Base Atual
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Power className="w-3.5 h-3.5 text-orange-500" /> Serviço
                  Ativo?
                </label>
                <select
                  value={filtroAtivo}
                  onChange={(e) =>
                    setFiltroAtivo(e.target.value as TipoAtivoFilter)
                  }
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                >
                  <option value="TODOS">Todos (Ativos e Inativos)</option>
                  <option value="SIM">Sim (Apenas Ativos)</option>
                  <option value="NAO">Não (Apenas Inativos)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Target className="w-3.5 h-3.5 text-yellow-500" /> Serviço
                  Exclusivo
                </label>
                <select
                  value={filtroExclusivo}
                  onChange={(e) =>
                    setFiltroExclusivo(
                      e.target.value as "TODOS" | "SIM" | "NAO",
                    )
                  }
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                >
                  <option value="TODOS">Ambos (Sim e Não)</option>
                  <option value="SIM">Sim (Apenas Exclusivos)</option>
                  <option value="NAO">Não (Apenas Normais)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span className="font-extrabold text-blue-500">📞</span>{" "}
                  Região (DDD Maioral)
                </label>
                <select
                  value={filtroDDD}
                  onChange={(e) => setFiltroDDD(e.target.value)}
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                >
                  <option value="TODOS">Todos os DDDs</option>
                  <optgroup label="Filtros Inteligentes">
                    <option value="EXCLUSO_11_RENOVACAO_E_FORA_ESTADO">
                      Todos (Sem 11 p/ Renovação e Fora do Estado)
                    </option>
                    <option value="EXCLUSO_11_RENOVACAO">
                      Todos (Excluso 11 Renovação)
                    </option>
                    <option value="FORA_SP">DDDs Fora de São Paulo</option>
                  </optgroup>
                  <optgroup label="São Paulo">
                    <option value="11">11 - São Paulo/Metropol.</option>
                    <option value="12">12 - Vale do Paraíba/Lit.</option>
                    <option value="13">13 - Baixada Santista</option>
                    <option value="14">14 - Bauru/Marília</option>
                    <option value="15">15 - Sorocaba/Itapetininga</option>
                    <option value="16">16 - Ribeirão Preto/Franca</option>
                    <option value="17">17 - S. José do Rio Preto</option>
                    <option value="18">18 - Pres. Prud./Araçatuba</option>
                    <option value="19">19 - Campinas/Piracicaba</option>
                  </optgroup>
                  <optgroup label="Outros">
                    <option value="00">Indefinido/Sem Linhas</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Users className="w-3.5 h-3.5 text-purple-500" /> Consultor
                  Atribuído
                </label>
                <select
                  value={filtroConsultor}
                  onChange={(e) => setFiltroConsultor(e.target.value)}
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                >
                  <option value="TODOS">Todos os Consultores</option>
                  <option value="NAO_ATRIBUIDO">❌ Não Atribuídos</option>
                  <optgroup label="Consultores Disponíveis">
                    {listaConsultoresUnicos.map((consultor) => (
                      <option key={consultor.seq} value={String(consultor.seq)}>
                        {consultor.nome}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <AlertCircle className="w-3.5 h-3.5 text-sky-500" /> Situação
                  do Atend.
                </label>
                <select
                  value={filtroSituacao}
                  onChange={(e) =>
                    setFiltroSituacao(e.target.value as TipoSituacaoFilter)
                  }
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                >
                  <option value="TODOS">Todas as Situações</option>
                  <option value="ABERTO">Aberto (Em Negociação)</option>
                  <option value="TEMPORARIO">Temporário (Aguard. 15d)</option>
                  <option value="PAUSADO">Pausado (Aguard. 30d)</option>
                  <option value="INVIAVEL">Inviável (Perdido)</option>
                  <option value="GANHO">Ganho (Fechado)</option>
                  <option value="BLACKLIST">Blacklist</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Wallet className="w-3.5 h-3.5 text-emerald-500" /> Atrib. de
                  Carteira
                </label>
                <select
                  value={filtroCarteira}
                  onChange={(e) =>
                    setFiltroCarteira(e.target.value as TipoCarteiraFilter)
                  }
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                >
                  <option value="AMBOS">Ambos (Com e Sem)</option>
                  <option value="COM_CARTEIRA">Com Carteira</option>
                  <option value="SEM_CARTEIRA">Sem Carteira</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <CloudCog className="w-3.5 h-3.5 text-indigo-500" />
                  Abertos no PipeRun (CRM)
                </label>
                <select
                  value={filtroPiperun}
                  onChange={(e) =>
                    setFiltroPiperun(e.target.value as TipoPiperunFilter)
                  }
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                >
                  <option value="AMBOS">Ambos (Dentro e Fora)</option>
                  <option value="SIM">Sim (No CRM)</option>
                  <option value="NAO">Não (Fora do CRM)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-red-500" /> Vencimento
                  Contr.
                </label>
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none cursor-pointer border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-pink-500" /> Classificação
                </label>
                <select
                  value={filtroClassificacao}
                  onChange={(e) =>
                    setFiltroClassificacao(
                      e.target.value as TipoClassificacaoFilter,
                    )
                  }
                  className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                >
                  <option value="TODOS">Todas as Classificações</option>
                  <option value="CA">CA</option>
                  <option value="CB">CB</option>
                  <option value="CC">CC</option>
                  <option value="CD">CD</option>
                  <option value="CE">CE</option>
                  <option value="CF">CF</option>
                  <option value="CG">CG</option>
                  <option value="SEM_CLASSIFICACAO">Sem Classificação</option>
                </select>
              </div>

              <div className=" border border-slate-200 bg-white rounded-lg p-3 space-y-3">
                {renderRangeSlider(
                  "Dias de Leitura CPC",
                  <ScanSearch className="w-3.5 h-3.5 text-teal-500" />,
                  filtroCpcAtivo,
                  setFiltroCpcAtivo,
                  filtroCpcValor,
                  setFiltroCpcValor,
                  maxDiasCpcGlobal,
                  "d",
                  "Hoje (0d)",
                  `Até ${maxDiasCpcGlobal}d`,
                )}
              </div>

              <div className="col-span-1 md:col-span-2 xl:col-span-3 border border-slate-200 bg-white rounded-lg p-3 space-y-3">
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <Briefcase className="w-4 h-4 text-amber-500" /> Controle de
                  Volume de Linhas Totais
                </label>

                <div
                  className={`relative p-5 rounded-xl border-2 transition-all max-w-2xl ${
                    tipoFiltroLinha === "RANGE"
                      ? "border-primary bg-slate-50 shadow-sm"
                      : "border-slate-100 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">
                        Intervalo de Linhas
                      </p>
                      <p className="text-[11px] mt-0.5 text-slate-500">
                        Ex: De 2 até 7 linhas (ou digite 1 até 1 para buscar um
                        valor exato)
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setTipoFiltroLinha(
                          tipoFiltroLinha === "RANGE" ? "NONE" : "RANGE",
                        )
                      }
                      className="transition-opacity cursor-pointer text-primary hover:opacity-80"
                      title={
                        tipoFiltroLinha === "RANGE"
                          ? "Desativar filtro de linhas"
                          : "Ativar filtro de linhas"
                      }
                    >
                      {tipoFiltroLinha === "RANGE" ? (
                        <ToggleRight className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        De (Mínimo)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={safeMaxLinhas}
                        value={filtroLinhasRangeMin}
                        onChange={(e) =>
                          setFiltroLinhasRangeMin(Number(e.target.value))
                        }
                        disabled={tipoFiltroLinha !== "RANGE"}
                        className="w-full h-11 px-4 text-sm font-bold transition-all border shadow-inner outline-none border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder="Mínimo"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Até (Máximo)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={safeMaxLinhas}
                        value={filtroLinhasRangeMax}
                        onChange={(e) =>
                          setFiltroLinhasRangeMax(Number(e.target.value))
                        }
                        disabled={tipoFiltroLinha !== "RANGE"}
                        className="w-full h-11 px-4 text-sm font-bold transition-all border shadow-inner outline-none border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder="Máximo"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4">
          <div>
            <h2 className="flex items-center gap-2 mb-4 text-lg font-bold text-slate-800">
              <PieChart className="w-5 h-5 text-primary" /> Visualização
              Comparativa por Indicação
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {renderMiniGrafico(
              "Fora do Prazo",
              totais.fora_prazo,
              CORES.fora_prazo,
            )}
            {renderMiniGrafico("Aquecendo", totais.aquecendo, CORES.aquecendo)}
            {renderMiniGrafico("Renovação", totais.renovacao, CORES.renovacao)}
            {renderMiniGrafico(
              "Portabilidade",
              totais.portabilidade,
              CORES.portabilidade,
            )}
            {renderMiniGrafico(
              "Prazo Excedido",
              totais.prazo_excedido,
              CORES.prazo_excedido,
            )}
            {renderMiniGrafico(
              "Prazo Limitado",
              totais.prazo_limitado,
              CORES.prazo_limitado,
            )}
          </div>
        </div>

        <Card className="mt-6 text-white border-none shadow-xl bg-slate-800">
          <CardContent className="flex flex-col items-center justify-between p-5 md:flex-row">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="p-3 rounded-full bg-white/10">
                <Database className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium tracking-wider uppercase text-slate-400">
                  Volume Total Filtrado
                </p>
                <h3 className="font-black text-3xl">{totais.geral}</h3>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-right">
                <p className="mb-0.5 text-slate-400">Volume Atual</p>
                <p className="flex items-center gap-2 font-bold text-amber-400">
                  Renovação{" "}
                  <span className="px-2 py-0.5 text-white rounded bg-white/20">
                    {totais.renovacao}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="mb-0.5 text-slate-400">Volume Atual</p>
                <p className="flex items-center gap-2 font-bold text-blue-400">
                  Portabilidade{" "}
                  <span className="px-2 py-0.5 text-white rounded bg-white/20">
                    {totais.portabilidade}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
