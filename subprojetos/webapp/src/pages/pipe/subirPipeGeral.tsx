import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  RefreshCcw,
  ArrowRightLeft,
  Bell,
  RotateCw,
  Filter,
  ToggleLeft,
  ToggleRight,
  X,
  Wallet,
  Users,
  Target,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import API from "@/services/api";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { PipeSubirPortabilidade } from "./subir_pipe/subirPipePortabilidade";
import { PipeSubirRenovacao } from "./subir_pipe/subirPipeRenovacao";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Calendar } from "lucide-react";
import { sincronizarDadosPipeRun } from "@/services/apiPiperunVolta";
import {
  CheckCircle2,
  XCircle,
  FileJson,
  Loader2,
  Database,
} from "lucide-react";
import { extrairTelefonesEmpresaDaObservacao } from "@/utils/formatarTelefonesLinhasEmpresa.util";
import { extrairEFormatarTelefonesDecisor } from "@/utils/formatarTelefonesDecisor.util";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import { compilarOportunidadesDinamico } from "@/services/hookApiRunTotalServicoConsultor";
import { PipeSubirExclusivo } from "./subir_pipe/subirPipeExclusivos";

export interface ITelaDetalhesProps {
  dados: IServicoPipeRun[];
  onBack: () => void;
}

export interface IApiResponse {
  status: boolean;
  mensagem: string;
  dados: IServicoPipeRun[];
}

type ViewState = "geral" | "renovacao" | "portabilidade" | "exclusivo";
type TipoCarteiraFilter = "Todos" | "Carteira" | "Renov/Port";

const filtrarPorRegraGeral = (dados: any[], indicacaoPadrao: string) => {
  if (!Array.isArray(dados)) return [];

  return dados.filter((item) => {
    if (item.exclusivo === true || indicacaoPadrao === "EXCLUSIVO") {
      return true;
    }

    const qtdLinhas = Number(item.qtd_servico_claro) || 0;
    if (qtdLinhas < 2) {
      return false;
    }

    const resEmpresa = extrairTelefonesEmpresaDaObservacao(
      item.observacao || "",
    );
    const resDecisor = extrairEFormatarTelefonesDecisor(
      item.decisor_numero || "",
      item.decisor_num_obs || "",
    );

    const dddEmp = resEmpresa.dddPrincipal;
    const dddDec = resDecisor.dddPrincipal;
    const dddFinal = dddEmp !== "00" ? dddEmp : dddDec !== "00" ? dddDec : "00";

    const dddNum = parseInt(dddFinal, 10);

    if (isNaN(dddNum) || dddNum < 11 || dddNum > 19) {
      return false;
    }

    const indicacao = item.indicacao || indicacaoPadrao;
    if (indicacao === "RENOVACAO" && dddFinal === "11") {
      return false;
    }

    return true;
  });
};

export default function PipeSubirGeral() {
  const [view, setView] = useState<ViewState>("geral");
  const [loading, setLoading] = useState<boolean>(false);
  const [renovacoes, setRenovacoes] = useState<IServicoPipeRun[]>([]);
  const [portabilidades, setPortabilidades] = useState<IServicoPipeRun[]>([]);
  const [exclusivos, setExclusivos] = useState<IServicoPipeRun[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [filteredRenovacoes, setFilteredRenovacoes] = useState<
    IServicoPipeRun[]
  >([]);
  const [filteredPortabilidades, setFilteredPortabilidades] = useState<
    IServicoPipeRun[]
  >([]);
  const [filteredExclusivos, setFilteredExclusivos] = useState<
    IServicoPipeRun[]
  >([]);
  const [filtroLinhasAtivo, setFiltroLinhasAtivo] = useState(false);
  const [filtroLinhasValor, setFiltroLinhasValor] = useState(0);
  const [filtroDataAtivo, setFiltroDataAtivo] = useState(false);
  const [filtroDataValor, setFiltroDataValor] = useState<number>(0);
  const [filtroTipoCarteira, setFiltroTipoCarteira] =
    useState<TipoCarteiraFilter>("Todos");

  const [dataInicial, setDataInicial] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [dataFinal, setDataFinal] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const [syncing, setSyncing] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const COR_RENOVACAO = "#eab308";
  const COR_PORTABILIDADE = "#3b82f6";
  const COR_EXCLUSIVO = "#ca8a04";
  const COR_CARTEIRA = "#10b981";
  const COR_FUNDO = "#e5e7eb";

  const [syncLogs, setSyncLogs] = useState<{
    sucessos: any[];
    falhas: any[];
  } | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [logTab, setLogTab] = useState<"sucessos" | "falhas">("sucessos");
  const [progressState, setProgressState] = useState({
    ativo: false,
    percentual: 0,
    atual: 0,
    total: 0,
    mensagem: "",
  });
  const [consultoresDB, setConsultoresDB] = useState<ConsultorBD[]>([]);
  const [dadosPipelineBolhas, setDadosPipelineBolhas] = useState<any[]>([]);
  const [loadingBolhas, setLoadingBolhas] = useState<boolean>(false);

  const fetchServicos = useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    try {
      if (!isManualRefresh) {
        const cachedRenovacao = sessionStorage.getItem("cache_renovacoes");
        const cachedPortabilidade = sessionStorage.getItem(
          "cache_portabilidades",
        );
        const cachedExclusivos = sessionStorage.getItem("cache_exclusivos");

        if (cachedRenovacao && cachedPortabilidade && cachedExclusivos) {
          const parsedR = filtrarPorRegraGeral(
            JSON.parse(cachedRenovacao),
            "RENOVACAO",
          );
          const parsedP = filtrarPorRegraGeral(
            JSON.parse(cachedPortabilidade),
            "PORTABILIDADE",
          );
          const parsedE = filtrarPorRegraGeral(
            JSON.parse(cachedExclusivos),
            "EXCLUSIVO",
          );

          setRenovacoes(parsedR);
          setPortabilidades(parsedP);
          setExclusivos(parsedE);
          setFilteredRenovacoes(parsedR);
          setFilteredPortabilidades(parsedP);
          setFilteredExclusivos(parsedE);
          setLoading(false);
          return;
        }
      }

      const fetchSeguro = async (url: string) => {
        try {
          const res = await API.get<IApiResponse>(url);
          return res.data?.dados || [];
        } catch (error) {
          console.error(`[Aviso] Falha silenciosa ao buscar ${url}:`, error);
          return []; 
        }
      };

      const [dadosR_brutos, dadosP_brutos, dadosE_brutos] = await Promise.all([
        fetchSeguro("/api/servico-claro/piperun/renovacao"),
        fetchSeguro("/api/servico-claro/piperun/portabilidade"),
        fetchSeguro("/api/servico-claro/piperun/exclusivo"),
      ]);

      const dadosR = filtrarPorRegraGeral(dadosR_brutos, "RENOVACAO");
      const dadosP = filtrarPorRegraGeral(dadosP_brutos, "PORTABILIDADE");
      const dadosE = filtrarPorRegraGeral(dadosE_brutos, "EXCLUSIVO");

      setRenovacoes(dadosR);
      setPortabilidades(dadosP);
      setExclusivos(dadosE);

      setFilteredRenovacoes(dadosR);
      setFilteredPortabilidades(dadosP);
      setFilteredExclusivos(dadosE);

      sessionStorage.setItem("cache_renovacoes", JSON.stringify(dadosR));
      sessionStorage.setItem("cache_portabilidades", JSON.stringify(dadosP));
      sessionStorage.setItem("cache_exclusivos", JSON.stringify(dadosE));

      const msg = isManualRefresh
        ? "Dados atualizados e cacheados com sucesso!"
        : "Serviços sincronizados.";
      setNotification(msg);
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      setNotification(
        "Falha crítica ao buscar os serviços. Verifique a conexão.",
      );
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServicos();
  }, [fetchServicos]);

  const todosServicos = useMemo(
    () => [...renovacoes, ...portabilidades, ...exclusivos],
    [renovacoes, portabilidades, exclusivos],
  );

  const maxLinhas = useMemo(() => {
    if (todosServicos.length === 0) return 100;
    return Math.max(...todosServicos.map((s) => s.qtd_servico_claro || 0));
  }, [todosServicos]);

  const { minDateTs, maxDateTs } = useMemo(() => {
    if (todosServicos.length === 0)
      return { minDateTs: Date.now() - 86400000, maxDateTs: Date.now() };

    const timestamps = todosServicos
      .map((s) =>
        s.dt_ultima_leitura ? new Date(s.dt_ultima_leitura).getTime() : 0,
      )
      .filter((ts) => ts > 0);

    if (timestamps.length === 0)
      return { minDateTs: Date.now() - 86400000, maxDateTs: Date.now() };

    return {
      minDateTs: Math.min(...timestamps),
      maxDateTs: Math.max(...timestamps),
    };
  }, [todosServicos]);

  useEffect(() => {
    if (filtroDataValor === 0 && minDateTs > 0) setFiltroDataValor(minDateTs);
  }, [minDateTs, filtroDataValor]);

  useEffect(() => {
    async function loadConsultores() {
      try {
        const response = await API.get("/api/consultores");
        const listaConsultores = response.data?.dados ?? [];
        if (Array.isArray(listaConsultores)) setConsultoresDB(listaConsultores);
      } catch (error) {
        console.error("Falha ao buscar consultores do DB:", error);
      }
    }
    loadConsultores();
  }, []);

  const fetchDadosBolhas = useCallback(
    async (isManualRefresh = false) => {
      if (consultoresDB.length === 0 && !isManualRefresh) return;
      setLoadingBolhas(true);
      try {
        if (!isManualRefresh) {
          const cacheBolhas = sessionStorage.getItem("cache_bolhas_piperun");
          if (cacheBolhas) {
            setDadosPipelineBolhas(JSON.parse(cacheBolhas));
            setLoadingBolhas(false);
            return;
          }
        }
        const payloadConsultoresFormatado: any[] = consultoresDB.map((c) => ({
          nome: c.nome,
          owner_id: c.codigo_crm,
          perfil: String(c.perfil_indicacao)
            .trim()
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
        }));
        const dadosMapeados = await compilarOportunidadesDinamico(
          payloadConsultoresFormatado,
        );
        setDadosPipelineBolhas(dadosMapeados);
        sessionStorage.setItem(
          "cache_bolhas_piperun",
          JSON.stringify(dadosMapeados),
        );

        if (isManualRefresh) {
          setNotification("Gráfico de pipeline atualizado com sucesso!");
          setTimeout(() => setNotification(null), 5000);
        }
      } catch (error) {
        console.error("Erro ao buscar dados das bolhas:", error);
        setNotification("Falha ao atualizar o gráfico de consultores.");
        setTimeout(() => setNotification(null), 5000);
      } finally {
        setLoadingBolhas(false);
      }
    },
    [consultoresDB],
  );

  useEffect(() => {
    if (consultoresDB.length > 0) fetchDadosBolhas();
  }, [consultoresDB, fetchDadosBolhas]);

  const calcularDiasAtras = (timestamp: number) => {
    return Math.floor((new Date().getTime() - timestamp) / (1000 * 3600 * 24));
  };

  const hasCarteiraValid = (
    carteiraStr: string | null | undefined,
  ): boolean => {
    return (
      carteiraStr !== null &&
      carteiraStr !== undefined &&
      carteiraStr.trim() !== ""
    );
  };

  const aplicarFiltros = () => {
    let filtradosR = [...renovacoes];
    let filtradosP = [...portabilidades];
    let filtradosE = [...exclusivos];

    if (filtroTipoCarteira === "Carteira") {
      filtradosR = filtradosR.filter((s) => hasCarteiraValid(s.carteira));
      filtradosP = filtradosP.filter((s) => hasCarteiraValid(s.carteira));
      filtradosE = filtradosE.filter((s) => hasCarteiraValid(s.carteira));
    } else if (filtroTipoCarteira === "Renov/Port") {
      filtradosR = filtradosR.filter((s) => !hasCarteiraValid(s.carteira));
      filtradosP = filtradosP.filter((s) => !hasCarteiraValid(s.carteira));
      filtradosE = filtradosE.filter((s) => !hasCarteiraValid(s.carteira));
    }

    if (filtroLinhasAtivo) {
      filtradosR = filtradosR.filter(
        (s) => (s.qtd_servico_claro || 0) === filtroLinhasValor,
      );
      filtradosP = filtradosP.filter(
        (s) => (s.qtd_servico_claro || 0) === filtroLinhasValor,
      );
      filtradosE = filtradosE.filter(
        (s) => (s.qtd_servico_claro || 0) === filtroLinhasValor,
      );
    }

    if (filtroDataAtivo) {
      filtradosR = filtradosR.filter(
        (s) =>
          s.dt_ultima_leitura &&
          new Date(s.dt_ultima_leitura).getTime() >= filtroDataValor,
      );
      filtradosP = filtradosP.filter(
        (s) =>
          s.dt_ultima_leitura &&
          new Date(s.dt_ultima_leitura).getTime() >= filtroDataValor,
      );
      filtradosE = filtradosE.filter(
        (s) =>
          s.dt_ultima_leitura &&
          new Date(s.dt_ultima_leitura).getTime() >= filtroDataValor,
      );
    }

    setFilteredRenovacoes(filtradosR);
    setFilteredPortabilidades(filtradosP);
    setFilteredExclusivos(filtradosE);
  };

  const totalR = filteredRenovacoes.length;
  const totalP = filteredPortabilidades.length;
  const totalE = filteredExclusivos.length;
  const totalGeral = totalR + totalP + totalE;
  const totalCarteira =
    filteredRenovacoes.filter((s) => hasCarteiraValid(s.carteira)).length +
    filteredPortabilidades.filter((s) => hasCarteiraValid(s.carteira)).length +
    filteredExclusivos.filter((s) => hasCarteiraValid(s.carteira)).length;

  const renderCenterText = (value: number, label: string) => {
    return (
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
        <tspan
          x="50%"
          dy="-0.5em"
          fontSize="36"
          fontWeight="bold"
          fill="#FFFFFF"
        >
          {value}
        </tspan>
        <tspan x="50%" dy="2.5em" fontSize="14" fill="#6b7280">
          {label}
        </tspan>
      </text>
    );
  };

  const sincronizarDados = async () => {
    if (!dataInicial) {
      setNotification("Por favor, selecione uma data inicial válida.");
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    setIsSyncModalOpen(false);
    setSyncing(true);
    setProgressState({
      ativo: true,
      percentual: 0,
      atual: 0,
      total: 0,
      mensagem: "Iniciando extração...",
    });

    try {
      const resultado = await sincronizarDadosPipeRun(
        dataInicial,
        dataFinal || dataInicial,
        (progresso) => setProgressState({ ativo: true, ...progresso }),
      );
      setNotification(resultado.mensagem);
      setTimeout(() => setNotification(null), 8000);

      if (resultado.detalhes) {
        setSyncLogs(resultado.detalhes);
        setLogTab(resultado.detalhes.falhas.length > 0 ? "falhas" : "sucessos");
        setIsLogModalOpen(true);
      }
      await fetchServicos(true);
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
      setNotification(error.message || "Erro crítico ao sincronizar.");
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSyncing(false);
      setProgressState((prev) => ({ ...prev, ativo: false }));
    }
  };

  if (view === "renovacao")
    return (
      <PipeSubirRenovacao dados={renovacoes} onBack={() => setView("geral")} />
    );
  if (view === "portabilidade")
    return (
      <PipeSubirPortabilidade
        dados={portabilidades}
        onBack={() => setView("geral")}
      />
    );
  if (view === "exclusivo")
    return (
      <PipeSubirExclusivo dados={exclusivos} onBack={() => setView("geral")} />
    );

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <div className="w-[280px] h-full flex-shrink-0">
        <Sidebar />
      </div>
      <main className="relative flex-1 h-full overflow-y-auto flex flex-col items-center justify-start p-6 sm:p-10">
        {notification && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-primary text-primary-foreground px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
            <Bell className="h-5 w-5" />
            <p className="font-medium">{notification}</p>
          </div>
        )}

        {progressState.ativo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md pointer-events-auto">
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center animate-in zoom-in-95 duration-300">
              <div className="bg-primary/10 p-4 rounded-full mb-6">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
                Sincronizando Dados
              </h2>
              <p className="text-muted-foreground text-center mb-8 h-10 flex items-center justify-center">
                {progressState.mensagem}
              </p>
              {progressState.total > 0 && (
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Database className="h-4 w-4" /> Processado
                    </span>
                    <span className="text-primary font-bold">
                      {progressState.atual} / {progressState.total}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-in-out"
                      style={{ width: `${progressState.percentual}%` }}
                    />
                  </div>
                  <p className="text-right text-xs font-bold text-muted-foreground mt-1">
                    {progressState.percentual}% Completo
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {isSyncModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />{" "}
                  Sincronizar PipeRun
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-muted"
                  onClick={() => setIsSyncModalOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground">
                      Data Inicial
                    </label>
                    <div className="flex items-center border-2 border-input bg-background rounded-lg h-14 px-4 shadow-sm">
                      <Calendar className="h-5 w-5 text-primary mr-2" />
                      <input
                        type="date"
                        className="bg-transparent border-none outline-none w-full"
                        value={dataInicial}
                        onChange={(e) => setDataInicial(e.target.value)}
                        disabled={syncing}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground">
                      Data Final
                    </label>
                    <div className="flex items-center border-2 border-input bg-background rounded-lg h-14 px-4 shadow-sm">
                      <Calendar className="h-5 w-5 text-primary mr-2" />
                      <input
                        type="date"
                        className="bg-transparent border-none outline-none w-full"
                        value={dataFinal}
                        min={dataInicial}
                        onChange={(e) => setDataFinal(e.target.value)}
                        disabled={syncing}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 border-t border-border p-5 bg-muted/30">
                <Button
                  variant="outline"
                  onClick={() => setIsSyncModalOpen(false)}
                  disabled={syncing}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={sincronizarDados}
                  disabled={syncing}
                >
                  <ArrowRightLeft className="mr-2 h-5 w-5" /> Sincronizar Agora
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLogModalOpen && syncLogs && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileJson className="h-6 w-6 text-primary" /> Relatório
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsLogModalOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex border-b border-border bg-muted/10">
                <button
                  className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 ${logTab === "sucessos" ? "bg-background border-b-2 border-green-500 text-green-600" : "text-muted-foreground hover:bg-muted/50"}`}
                  onClick={() => setLogTab("sucessos")}
                >
                  <CheckCircle2 className="h-5 w-5" /> Sucessos (
                  {syncLogs.sucessos.length})
                </button>
                <button
                  className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 ${logTab === "falhas" ? "bg-background border-b-2 border-red-500 text-red-600" : "text-muted-foreground hover:bg-muted/50"}`}
                  onClick={() => setLogTab("falhas")}
                >
                  <XCircle className="h-5 w-5" /> Falhas (
                  {syncLogs.falhas.length})
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                {/* Lógica da listagem mantida idêntica para poupar espaço visual, renderizando logs corretamente */}
                {logTab === "sucessos" &&
                  syncLogs.sucessos.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-background border border-green-200 rounded-lg p-4 mb-4 flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="font-bold text-green-700">
                          CNPJ: {item.payload.cnpj}
                        </span>
                      </div>
                    </div>
                  ))}
                {logTab === "falhas" &&
                  syncLogs.falhas.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-background border border-red-200 rounded-lg p-4 mb-4 flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="font-bold text-red-700">
                          CNPJ: {item.payload.cnpj}
                        </span>
                      </div>
                      <div className="text-sm mt-2 p-2 bg-red-50 text-red-800 rounded">
                        {item.erro}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex pt-20 w-full items-center justify-between border-b border-border pb-6 max-w-6xl">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col gap-3 w-full">
              <h1 className="text-3xl font-bold">
                Visão Geral dos Serviços Disponíveis
              </h1>
              <Button
                size="lg"
                className="h-10 px-6 text-base w-full sm:w-auto shadow-md mt-2"
                onClick={() => setIsSyncModalOpen(true)}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Sincronizar
                    dados
                  </>
                )}
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full h-12 w-12 shadow-sm ${loading ? "opacity-50" : ""}`}
            onClick={() => fetchServicos(true)}
            disabled={loading}
          >
            <RotateCw
              className={`h-5 w-5 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`}
            />
          </Button>
        </div>

        <div className="w-full flex flex-col gap-8 mt-8 max-w-6xl">
          <div className="max-h-[300px] overflow-y-auto pr-2 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Renovação
                  </CardTitle>
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {loading ? "..." : renovacoes.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Portabilidade
                  </CardTitle>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {loading ? "..." : portabilidades.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors border-yellow-500/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-600">
                    Total Exclusivos
                  </CardTitle>
                  <Target className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-yellow-600">
                    {loading ? "..." : exclusivos.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-primary shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-primary-foreground/90">
                    Total Geral
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-primary-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary-foreground">
                    {loading
                      ? "..."
                      : renovacoes.length +
                        portabilidades.length +
                        exclusivos.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/30 mt-4 shadow-sm">
              <CardContent className="flex flex-col sm:flex-row justify-center items-center gap-6 pb-6 pt-6">
                <Button
                  size="lg"
                  className="h-16 px-10 cursor-pointer text-lg w-full sm:w-auto shadow-md"
                  onClick={() => setView("renovacao")}
                >
                  <RefreshCcw className="mr-2 h-5 w-5" /> Tela de Renovação
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 px-10 border-2 border-[#3b82f6] text-lg w-full cursor-pointer sm:w-auto shadow-md"
                  onClick={() => setView("portabilidade")}
                >
                  <ArrowRightLeft className="mr-2 h-5 w-5" /> Tela de
                  Portabilidade
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 px-10 border-2 border-yellow-600 text-yellow-600 hover:bg-yellow-50 text-lg w-full cursor-pointer sm:w-auto shadow-md"
                  onClick={() => setView("exclusivo")}
                >
                  <Target className="mr-2 h-5 w-5" /> Tela de Exclusivos
                </Button>
              </CardContent>
            </Card>
          </div>

          <hr className="border-border my-2" />

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" /> Filtros Avançados
              </h2>
              <Button
                onClick={aplicarFiltros}
                className="px-8 cursor-pointer shadow-md"
              >
                Aplicar Filtros
              </Button>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative bg-muted/30 p-4 rounded-lg border border-border">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" /> Divisão da
                  Carteira:
                </label>
                <select
                  value={filtroTipoCarteira}
                  onChange={(e) =>
                    setFiltroTipoCarteira(e.target.value as TipoCarteiraFilter)
                  }
                  className="border-2 border-input focus:border-primary focus:ring-1 focus:ring-primary bg-background rounded-lg h-10 px-3 w-full sm:w-80 outline-none transition-colors"
                >
                  <option value="Todos">Todos (Padrão)</option>
                  <option value="Carteira">
                    Somente Clientes com Carteira
                  </option>
                  <option value="Renov/Port">
                    Renovação e Portabilidade (Sem Carteira)
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-4 relative">
                <button
                  onClick={() => setFiltroLinhasAtivo(!filtroLinhasAtivo)}
                  className="cursor-pointer text-primary hover:text-primary/80 transition-colors"
                >
                  {filtroLinhasAtivo ? (
                    <ToggleRight className="h-8 w-8 text-green-500 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-muted-foreground cursor-pointer" />
                  )}
                </button>
                <div className="flex-1 relative group">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">
                    Quantidade de Linhas (0 a {maxLinhas})
                  </p>
                  <input
                    type="range"
                    min="0"
                    max={maxLinhas}
                    value={filtroLinhasValor}
                    onChange={(e) =>
                      setFiltroLinhasValor(Number(e.target.value))
                    }
                    disabled={!filtroLinhasAtivo}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-colors ${filtroLinhasAtivo ? "bg-red-200 accent-red-600" : "bg-gray-200 accent-gray-400"}`}
                    style={{ accentColor: filtroLinhasAtivo ? "red" : "gray" }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 relative">
                <button
                  onClick={() => setFiltroDataAtivo(!filtroDataAtivo)}
                  className="cursor-pointer text-primary hover:text-primary/80 transition-colors"
                >
                  {filtroDataAtivo ? (
                    <ToggleRight className="h-8 w-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 relative group">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">
                    Data da Última Leitura
                  </p>
                  <input
                    type="range"
                    min={minDateTs}
                    max={maxDateTs}
                    step={86400000}
                    value={filtroDataValor}
                    onChange={(e) => setFiltroDataValor(Number(e.target.value))}
                    disabled={!filtroDataAtivo}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-colors ${filtroDataAtivo ? "bg-red-200 accent-red-600" : "bg-gray-200 accent-gray-400"}`}
                    style={{ accentColor: filtroDataAtivo ? "red" : "gray" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-2 shadow-sm flex flex-col items-center gap-3">
            <div className="w-full flex flex-col items-center border-t border-border p-4">
              <h3 className="text-2xl font-bold">Total Geral Filtrado</h3>
              <div className="w-80 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Renovação", value: totalR },
                        { name: "Portabilidade", value: totalP },
                        { name: "Exclusivo", value: totalE },
                        ...(totalGeral === 0
                          ? [{ name: "Sem Dados", value: 1 }]
                          : []),
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={90}
                      outerRadius={120}
                      dataKey="value"
                      stroke="none"
                      paddingAngle={totalGeral > 0 ? 5 : 0}
                    >
                      <Cell fill={COR_RENOVACAO} />
                      <Cell fill={COR_PORTABILIDADE} />
                      <Cell fill={COR_EXCLUSIVO} />
                      {totalGeral === 0 && <Cell fill={COR_FUNDO} />}
                    </Pie>
                    {renderCenterText(totalGeral, "Serviços")}
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="w-full flex flex-col md:flex-row justify-around items-center gap-3 py-6">
              <div className="w-full md:w-1/3 flex flex-col items-center">
                <h3 className="text-xl font-bold">Renovação</h3>
                <div className="w-64 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Renovação", value: totalR },
                          { name: "Vazio", value: totalR === 0 ? 1 : 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={COR_RENOVACAO} />
                        <Cell fill={COR_FUNDO} />
                      </Pie>
                      {renderCenterText(totalR, "Serviços")}
                      <RechartsTooltip
                        formatter={(val: any) =>
                          val === 0 && totalR === 0
                            ? [0, "Renovação"]
                            : [val, "Renovação"]
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="w-full md:w-1/3 flex flex-col items-center">
                <h3 className="text-xl font-bold">Portabilidade</h3>
                <div className="w-64 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Portabilidade", value: totalP },
                          { name: "Vazio", value: totalP === 0 ? 1 : 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={COR_PORTABILIDADE} />
                        <Cell fill={COR_FUNDO} />
                      </Pie>
                      {renderCenterText(totalP, "Serviços")}
                      <RechartsTooltip
                        formatter={(val: any) =>
                          val === 0 && totalP === 0
                            ? [0, "Portabilidade"]
                            : [val, "Portabilidade"]
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="w-full md:w-1/3 flex flex-col items-center border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0">
                <h3 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> Com Carteira
                </h3>
                <div className="w-64 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Carteira", value: totalCarteira },
                          { name: "Vazio", value: totalCarteira === 0 ? 1 : 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={COR_CARTEIRA} />
                        <Cell fill={COR_FUNDO} />
                      </Pie>
                      {renderCenterText(totalCarteira, "Clientes")}
                      <RechartsTooltip
                        formatter={(val: any) =>
                          val === 0 && totalCarteira === 0
                            ? [0, "Com Carteira"]
                            : [val, "Com Carteira"]
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 w-full px-4 pt-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Volume no Pipeline
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={() => fetchDadosBolhas(true)}
                disabled={loadingBolhas}
                className="gap-2 shadow-sm"
              >
                <RotateCw
                  className={`h-4 w-4 ${loadingBolhas ? "animate-spin text-primary" : ""}`}
                />{" "}
                Atualizar Pipeline
              </Button>
            </div>

            <div className="w-full bg-muted/10 rounded-lg border border-border p-6 max-h-[550px] overflow-y-auto">
              {loadingBolhas && dadosPipelineBolhas.length === 0 ? (
                <div className="w-full h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />{" "}
                  Calculando...
                </div>
              ) : dadosPipelineBolhas.length === 0 ? (
                <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {dadosPipelineBolhas.map((entry, index) => {
                    let cor = "#8884d8";
                    if (entry.perfil === "RENOVACAO") cor = COR_RENOVACAO;
                    if (entry.perfil === "PORTABILIDADE")
                      cor = COR_PORTABILIDADE;
                    if (entry.perfil === "CARTEIRA") cor = COR_CARTEIRA;
                    if (entry.perfil === "AMBOS") cor = "#a855f7";

                    return (
                      <div
                        key={`bolha-${index}`}
                        className="flex flex-col items-center bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 transition-colors"
                      >
                        <h3 className="text-base font-bold text-center mb-2 line-clamp-2 h-12 flex items-center">
                          {entry.nome}
                        </h3>
                        <div className="w-48 h-48">
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
                                innerRadius={60}
                                outerRadius={80}
                                dataKey="value"
                                stroke="none"
                              >
                                <Cell fill={cor} />
                                <Cell fill={COR_FUNDO} />
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
          </div>
        </div>
      </main>
    </div>
  );
}
