import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import {
  Briefcase,
  Bell,
  Filter,
  Wallet,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Database,
  CloudCog,
  Calendar,
  Eraser,
  Users,
  ScanSearch,
  Power,
  Tag,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import API from "@/services/api";

export interface IServicoViewAPI {
  seq_claro: number;
  seq_empresa: number;
  seq_consultor: number | null;
  empresa_razao: string;
  empresa_cnpj: string;
  ddd_predominante: string;
  indicacao: string;
  situacao: string;
  classificacao_contrato: string | 'CA' | 'CC' | 'CE' | 'CG' | 'CB' | 'CD' | 'CF';
  carteira: string | null;
  observacao: string | null;
  qtd_linhas_total: number;
  qtd_linhas_ativas: number;
  qtd_linhas_claro_operadora: number;
  dt_fim_contrato: string | null;
  dt_fechamento: string | null;
  dt_ultima_leitura_servico: string | null;
  dt_leitura_cpc_empresa: string | null;
  flag_crm_servico: boolean;
  flag_cpc_servico: boolean;
  flag_edoc_servico: boolean;
  servico_claro_ativo: boolean;
  consultor_nome: string | null;
}

interface IApiResponseView {
  status: boolean;
  mensagem: string;
  dados: IServicoViewAPI[];
}

type ViewState = "geral" | "renovacao" | "portabilidade";
type TipoCarteiraFilter = "AMBOS" | "COM_CARTEIRA" | "SEM_CARTEIRA";
type TipoSituacaoFilter =
  | "TODOS"
  | "ABERTO"
  | "INVIAVEL"
  | "TEMPORARIO"
  | "PAUSADO"
  | "GANHO"
  | "BLACKLIST";
type TipoPiperunFilter = "AMBOS" | "SIM" | "NAO";
type TipoAtivoFilter = "TODOS" | "SIM" | "NAO";
type TipoClassificacaoFilter = "TODOS" | "CA" | "CB" | "CC" | "CD" | "CE" | "CF" | "CG" | "SEM_CLASSIFICACAO";

type DadosPorIndicacao = {
  renovacao: IServicoViewAPI[];
  portabilidade: IServicoViewAPI[];
  fora_prazo: IServicoViewAPI[];
  prazo_limitado: IServicoViewAPI[];
  prazo_excedido: IServicoViewAPI[];
};

const calcularDiasPassados = (dataString?: string | null): number | null => {
  if (!dataString) return null;
  const dataBase = new Date(dataString);
  if (isNaN(dataBase.getTime())) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataBase.setHours(0, 0, 0, 0);

  const diffTime = hoje.getTime() - dataBase.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

export default function DashboardAnaliticoMultiView() {
  const [view, setView] = useState<ViewState>("geral");
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  const [dadosBrutos, setDadosBrutos] = useState<DadosPorIndicacao>({
    renovacao: [],
    portabilidade: [],
    fora_prazo: [],
    prazo_limitado: [],
    prazo_excedido: [],
  });

  const [dadosFiltrados, setDadosFiltrados] = useState<DadosPorIndicacao>({
    renovacao: [],
    portabilidade: [],
    fora_prazo: [],
    prazo_limitado: [],
    prazo_excedido: [],
  });

  const [filtroSituacao, setFiltroSituacao] = useState<TipoSituacaoFilter>("TODOS");
  const [filtroCarteira, setFiltroCarteira] = useState<TipoCarteiraFilter>("AMBOS");
  const [filtroPiperun, setFiltroPiperun] = useState<TipoPiperunFilter>("AMBOS");
  const [filtroAtivo, setFiltroAtivo] = useState<TipoAtivoFilter>("TODOS");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [filtroDDD, setFiltroDDD] = useState<string>("TODOS");
  const [filtroConsultor, setFiltroConsultor] = useState<string>("TODOS");
  const [filtroClassificacao, setFiltroClassificacao] = useState<TipoClassificacaoFilter>("TODOS"); 

  const [filtroLinhasAtivo, setFiltroLinhasAtivo] = useState(false);
  const [filtroLinhasValor, setFiltroLinhasValor] = useState(0);

  const [filtroCpcAtivo, setFiltroCpcAtivo] = useState(false);
  const [filtroCpcValor, setFiltroCpcValor] = useState(30);

  const CORES = {
    renovacao: "#eab308",
    portabilidade: "#3b82f6",
    fora_prazo: "#ef4444",
    prazo_limitado: "#f97316",
    prazo_excedido: "#8b5cf6",
    vazio: "#e5e7eb",
  };

  const fetchTodasViews = useCallback(async () => {
    setLoading(true);
    try {
      const [resRenov, resPort, resFora, resLim, resExc] = await Promise.all([
        API.get<IApiResponseView>(
          "/api/servico-claro/dashboard/indicacao/renovacao",
        ),
        API.get<IApiResponseView>(
          "/api/servico-claro/dashboard/indicacao/portabilidade",
        ),
        API.get<IApiResponseView>(
          "/api/servico-claro/dashboard/indicacao/fora-do-prazo",
        ),
        API.get<IApiResponseView>(
          "/api/servico-claro/dashboard/indicacao/prazo-limitado",
        ),
        API.get<IApiResponseView>(
          "/api/servico-claro/dashboard/indicacao/prazo-excedido",
        ),
      ]);

      const prepararDados = (lista: IServicoViewAPI[]) => {
        return lista.map((item) => ({
          ...item,
          ddd_predominante: item.ddd_predominante
            ? String(item.ddd_predominante).trim()
            : "00",
        }));
      };

      const payload: DadosPorIndicacao = {
        renovacao: prepararDados(resRenov.data.dados || []),
        portabilidade: prepararDados(resPort.data.dados || []),
        fora_prazo: prepararDados(resFora.data.dados || []),
        prazo_limitado: prepararDados(resLim.data.dados || []),
        prazo_excedido: prepararDados(resExc.data.dados || []),
      };

      setDadosBrutos(payload);
      setDadosFiltrados(payload);

      setNotification("Todas as bases de indicação carregadas com sucesso!");
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error("[ERRO FETCH VIEWS]:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodasViews();
  }, [fetchTodasViews]);

  const { maxLinhasGlobal, maxDiasCpcGlobal } = useMemo(() => {
    const todosServicos = [
      ...dadosBrutos.renovacao,
      ...dadosBrutos.portabilidade,
      ...dadosBrutos.fora_prazo,
      ...dadosBrutos.prazo_limitado,
      ...dadosBrutos.prazo_excedido,
    ];

    let maxLinhas = 0;
    let maxCpc = 0;

    todosServicos.forEach((item) => {
      const linhas = Number(item.qtd_linhas_total) || 0;
      if (linhas > maxLinhas) maxLinhas = linhas;

      const diasCpc = calcularDiasPassados(item.dt_leitura_cpc_empresa);
      if (diasCpc !== null && diasCpc > maxCpc) maxCpc = diasCpc;
    });

    return {
      maxLinhasGlobal: maxLinhas || 100,
      maxDiasCpcGlobal: maxCpc || 30,
    };
  }, [dadosBrutos]);

  const listaConsultoresUnicos = useMemo(() => {
    const mapaConsultores = new Map<number, string>();
    const todosServicos = [
      ...dadosBrutos.renovacao,
      ...dadosBrutos.portabilidade,
      ...dadosBrutos.fora_prazo,
      ...dadosBrutos.prazo_limitado,
      ...dadosBrutos.prazo_excedido,
    ];

    todosServicos.forEach((item) => {
      if (item.seq_consultor && item.consultor_nome) {
        mapaConsultores.set(item.seq_consultor, item.consultor_nome);
      }
    });

    return Array.from(mapaConsultores.entries())
      .map(([seq, nome]) => ({ seq, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [dadosBrutos]);

  const aplicarFiltrosGlobais = () => {
    const aplicarRegras = (array: IServicoViewAPI[]) => {
      return array.filter((item) => {
        if (filtroSituacao !== "TODOS" && item.situacao !== filtroSituacao)
          return false;

        const isCarteiraVazia = !item.carteira || item.carteira.trim() === "";
        if (filtroCarteira === "COM_CARTEIRA" && isCarteiraVazia) return false;
        if (filtroCarteira === "SEM_CARTEIRA" && !isCarteiraVazia) return false;

        if (filtroPiperun === "SIM" && item.flag_crm_servico !== true)
          return false;
        if (filtroPiperun === "NAO" && item.flag_crm_servico === true)
          return false;

        if (filtroAtivo === "SIM" && item.servico_claro_ativo !== true)
          return false;
        if (filtroAtivo === "NAO" && item.servico_claro_ativo === true)
          return false;

        if (filtroDDD !== "TODOS" && item.ddd_predominante !== filtroDDD)
          return false;

        if (filtroConsultor !== "TODOS") {
          if (filtroConsultor === "NAO_ATRIBUIDO") {
            if (item.seq_consultor !== null) return false;
          } else {
            if (String(item.seq_consultor) !== filtroConsultor) return false;
          }
        }

        if (filtroClassificacao !== "TODOS") {
          if (filtroClassificacao === "SEM_CLASSIFICACAO") {
            if (item.classificacao_contrato !== null && item.classificacao_contrato.trim() !== "") return false;
          } else {
            if (item.classificacao_contrato !== filtroClassificacao) return false;
          }
        }

        if (filtroDataFim !== "") {
          if (!item.dt_fim_contrato) return false;
          const dataFormatada = item.dt_fim_contrato.substring(0, 10);
          if (dataFormatada !== filtroDataFim) return false;
        }

        if (
          filtroLinhasAtivo &&
          Number(item.qtd_linhas_total || 0) !== filtroLinhasValor
        ) {
          return false;
        }

        if (filtroCpcAtivo) {
          const diasCpc = calcularDiasPassados(item.dt_leitura_cpc_empresa);
          if (diasCpc === null || diasCpc > filtroCpcValor) return false;
        }

        return true;
      });
    };

    setDadosFiltrados({
      renovacao: aplicarRegras(dadosBrutos.renovacao),
      portabilidade: aplicarRegras(dadosBrutos.portabilidade),
      fora_prazo: aplicarRegras(dadosBrutos.fora_prazo),
      prazo_limitado: aplicarRegras(dadosBrutos.prazo_limitado),
      prazo_excedido: aplicarRegras(dadosBrutos.prazo_excedido),
    });
  };

  const limparFiltros = () => {
    setFiltroSituacao("TODOS");
    setFiltroCarteira("AMBOS");
    setFiltroPiperun("AMBOS");
    setFiltroAtivo("TODOS");
    setFiltroDDD("TODOS");
    setFiltroConsultor("TODOS");
    setFiltroClassificacao("TODOS");
    setFiltroDataFim("");

    setFiltroLinhasAtivo(false);
    setFiltroLinhasValor(0);
    setFiltroCpcAtivo(false);
    setFiltroCpcValor(maxDiasCpcGlobal);

    setDadosFiltrados(dadosBrutos);
  };

  const totais = useMemo(() => {
    const tr = dadosFiltrados.renovacao.length;
    const tp = dadosFiltrados.portabilidade.length;
    const tf = dadosFiltrados.fora_prazo.length;
    const tl = dadosFiltrados.prazo_limitado.length;
    const te = dadosFiltrados.prazo_excedido.length;
    return {
      renovacao: tr,
      portabilidade: tp,
      fora_prazo: tf,
      prazo_limitado: tl,
      prazo_excedido: te,
      geral: tr + tp + tf + tl + te,
    };
  }, [dadosFiltrados]);

  const renderCenterText = (value: number, label: string) => (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-0.2em" fontSize="26" fontWeight="bold" fill="#374151">
        {value}
      </tspan>
      <tspan x="50%" dy="1.5em" fontSize="11" fill="#6b7280">
        {label}
      </tspan>
    </text>
  );

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
    <div className="flex h-screen overflow-hidden w-screen bg-slate-50 text-slate-900">
      <div className="w-[280px] h-full flex-shrink-0">
        <Sidebar />
      </div>

      <main className="relative flex flex-col flex-1 h-full p-4 overflow-y-auto sm:p-8">
        {notification && (
          <div className="fixed z-50 flex items-center gap-3 px-6 py-4 text-white shadow-2xl top-6 right-6 bg-slate-800 rounded-xl animate-in slide-in-from-right-8 duration-300">
            <Bell className="w-5 h-5 text-emerald-400" />
            <p className="font-medium">{notification}</p>
          </div>
        )}

        {loading && totais.geral === 0 && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-sm bg-slate-50/80">
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
            <h2 className="text-xl font-bold text-slate-700">
              Extraindo dados das Views...
            </h2>
          </div>
        )}

        <div className="flex flex-col items-start justify-between w-full max-w-7xl gap-4 mb-6 mx-auto lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Análise Geral das Bases (Serviços Claro)
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Consumo direto do banco fatiado por Indicação do contrato.
            </p>
          </div>
        </div>

        <div className="w-full space-y-6 max-w-7xl mx-auto">
          <Card className="bg-white border-none shadow-md">
            <CardContent className="p-5">
              <div className="flex flex-col justify-between gap-4 pb-4 mb-5 border-b md:flex-row md:items-center border-slate-100">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
                  <Filter className="w-4 h-4 text-primary" /> Filtros Globais
                  Simultâneos
                </h2>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={limparFiltros}
                    variant="outline"
                    size="sm"
                    className="transition-colors shadow-sm cursor-pointer text-slate-600 hover:text-slate-900"
                  >
                    <Eraser className="w-3.5 h-3.5 mr-2" /> Limpar Filtros
                  </Button>
                  <Button
                    onClick={aplicarFiltrosGlobais}
                    size="sm"
                    className="px-6 shadow-md cursor-pointer hover:scale-105 transition-transform"
                  >
                    Aplicar aos 5 Gráficos
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Power className="w-3.5 h-3.5 text-orange-500" /> 
                    Serviço Ativo?
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
                    <span className="font-extrabold text-blue-500">📞</span>{" "}
                    Região (DDD Maioral)
                  </label>
                  <select
                    value={filtroDDD}
                    onChange={(e) => setFiltroDDD(e.target.value)}
                    className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                  >
                    <option value="TODOS">Todos os DDDs</option>
                    <option value="11">11 - São Paulo/Metropol.</option>
                    <option value="12">12 - Vale do Paraíba/Lit.</option>
                    <option value="13">13 - Baixada Santista</option>
                    <option value="14">14 - Bauru/Marília</option>
                    <option value="15">15 - Sorocaba/Itapetininga</option>
                    <option value="16">16 - Ribeirão Preto/Franca</option>
                    <option value="17">17 - S. José do Rio Preto</option>
                    <option value="18">18 - Pres. Prud./Araçatuba</option>
                    <option value="19">19 - Campinas/Piracicaba</option>
                    <option value="00">Indefinido/Sem Linhas</option>
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
                        <option
                          key={consultor.seq}
                          value={String(consultor.seq)}
                        >
                          {consultor.nome}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <AlertCircle className="w-3.5 h-3.5 text-sky-500" />{" "}
                    Situação do Atend.
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
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" /> Atrib.
                    de Carteira
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
                    <CloudCog className="w-3.5 h-3.5 text-indigo-500" /> PipeRun
                    (CRM)
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
                      setFiltroClassificacao(e.target.value as TipoClassificacaoFilter)
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

                {renderRangeSlider(
                  "Total de Linhas",
                  <Briefcase className="w-3.5 h-3.5 text-amber-500" />,
                  filtroLinhasAtivo,
                  setFiltroLinhasAtivo,
                  filtroLinhasValor,
                  setFiltroLinhasValor,
                  maxLinhasGlobal,
                  "",
                  "0",
                  `${maxLinhasGlobal} Máx`,
                )}

                {renderRangeSlider(
                  "Leitura CPC",
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
            </CardContent>
          </Card>

          <div className="mt-4">
            <div>
              <h2 className="flex items-center gap-2 mb-4 text-lg font-bold text-slate-800">
                <PieChart className="w-5 h-5 text-primary" /> Visualização
                Comparativa por Indicação
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {renderMiniGrafico(
                "Fora do Prazo",
                totais.fora_prazo,
                CORES.fora_prazo,
              )}
              {renderMiniGrafico(
                "Renovação",
                totais.renovacao,
                CORES.renovacao,
              )}
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
      </main>
    </div>
  );
}
