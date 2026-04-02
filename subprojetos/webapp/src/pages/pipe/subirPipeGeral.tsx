import { useParams } from "react-router-dom";
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
import { CheckCircle2, XCircle, FileJson } from "lucide-react";
import { Loader2, Database } from "lucide-react";

export interface ITelaDetalhesProps {
  dados: IServicoPipeRun[];
  onBack: () => void;
}

export interface IApiResponse {
  status: boolean;
  mensagem: string;
  dados: IServicoPipeRun[];
}

type ViewState = "geral" | "renovacao" | "portabilidade";
type TipoCarteiraFilter = "Todos" | "Carteira" | "Renov/Port";

export default function PipeSubirGeral() {
  const [view, setView] = useState<ViewState>("geral");
  const [loading, setLoading] = useState<boolean>(false);
  const [renovacoes, setRenovacoes] = useState<IServicoPipeRun[]>([]);
  const [portabilidades, setPortabilidades] = useState<IServicoPipeRun[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [filteredRenovacoes, setFilteredRenovacoes] = useState<
    IServicoPipeRun[]
  >([]);
  const [filteredPortabilidades, setFilteredPortabilidades] = useState<
    IServicoPipeRun[]
  >([]);
  const [filtroLinhasAtivo, setFiltroLinhasAtivo] = useState(false);
  const [filtroLinhasValor, setFiltroLinhasValor] = useState(0);
  const [filtroDataAtivo, setFiltroDataAtivo] = useState(false);
  const [filtroDataValor, setFiltroDataValor] = useState<number>(0);
  const [filtroTipoCarteira, setFiltroTipoCarteira] =
    useState<TipoCarteiraFilter>("Todos");
  const [dataExtracao, setDataExtracao] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const COR_RENOVACAO = "#eab308";
  const COR_PORTABILIDADE = "#3b82f6";
  const COR_CARTEIRA = "#10b981";
  const COR_FUNDO = "#e5e7eb";

  const [syncLogs, setSyncLogs] = useState<{
    sucessos: any[];
    falhas: any[];
  } | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [logTab, setLogTab] = useState<"sucessos" | "falhas">("sucessos");
  const [progressState, setProgressState] = useState<{
    ativo: boolean;
    percentual: number;
    atual: number;
    total: number;
    mensagem: string;
  }>({
    ativo: false,
    percentual: 0,
    atual: 0,
    total: 0,
    mensagem: "",
  });

  const fetchServicos = useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    try {
      if (!isManualRefresh) {
        const cachedRenovacao = sessionStorage.getItem("cache_renovacoes");
        const cachedPortabilidade = sessionStorage.getItem(
          "cache_portabilidades",
        );

        if (cachedRenovacao && cachedPortabilidade) {
          const parsedR = JSON.parse(cachedRenovacao);
          const parsedP = JSON.parse(cachedPortabilidade);
          setRenovacoes(parsedR);
          setPortabilidades(parsedP);
          setFilteredRenovacoes(parsedR);
          setFilteredPortabilidades(parsedP);
          setLoading(false);
          return;
        }
      }

      const [resRenovacao, resPortabilidade] = await Promise.all([
        API.get<IApiResponse>("/api/servico-claro/piperun/renovacao"),
        API.get<IApiResponse>("/api/servico-claro/piperun/portabilidade"),
      ]);

      const dadosR = resRenovacao.data.dados || [];
      const dadosP = resPortabilidade.data.dados || [];

      setRenovacoes(dadosR);
      setPortabilidades(dadosP);
      setFilteredRenovacoes(dadosR);
      setFilteredPortabilidades(dadosP);

      sessionStorage.setItem("cache_renovacoes", JSON.stringify(dadosR));
      sessionStorage.setItem("cache_portabilidades", JSON.stringify(dadosP));

      const msg = isManualRefresh
        ? "Dados atualizados e cacheados com sucesso!"
        : "Serviços sincronizados.";
      setNotification(msg);
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      setNotification("Falha ao buscar os serviços. Verifique a conexão.");
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServicos();
  }, [fetchServicos]);

  const todosServicos = useMemo(
    () => [...renovacoes, ...portabilidades],
    [renovacoes, portabilidades],
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
    if (filtroDataValor === 0 && minDateTs > 0) {
      setFiltroDataValor(minDateTs);
    }
  }, [minDateTs, filtroDataValor]);

  const calcularDiasAtras = (timestamp: number) => {
    const hoje = new Date().getTime();
    const diffTempo = hoje - timestamp;
    return Math.floor(diffTempo / (1000 * 3600 * 24));
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

    if (filtroTipoCarteira === "Carteira") {
      filtradosR = filtradosR.filter((s) => hasCarteiraValid(s.carteira));
      filtradosP = filtradosP.filter((s) => hasCarteiraValid(s.carteira));
    } else if (filtroTipoCarteira === "Renov/Port") {
      filtradosR = filtradosR.filter((s) => !hasCarteiraValid(s.carteira));
      filtradosP = filtradosP.filter((s) => !hasCarteiraValid(s.carteira));
    }

    if (filtroLinhasAtivo) {
      filtradosR = filtradosR.filter(
        (s) => (s.qtd_servico_claro || 0) === filtroLinhasValor,
      );
      filtradosP = filtradosP.filter(
        (s) => (s.qtd_servico_claro || 0) === filtroLinhasValor,
      );
    }

    if (filtroDataAtivo) {
      filtradosR = filtradosR.filter((s) => {
        if (!s.dt_ultima_leitura) return false;
        const ts = new Date(s.dt_ultima_leitura).getTime();
        return ts >= filtroDataValor;
      });
      filtradosP = filtradosP.filter((s) => {
        if (!s.dt_ultima_leitura) return false;
        const ts = new Date(s.dt_ultima_leitura).getTime();
        return ts >= filtroDataValor;
      });
    }

    setFilteredRenovacoes(filtradosR);
    setFilteredPortabilidades(filtradosP);
  };

  const totalR = filteredRenovacoes.length;
  const totalP = filteredPortabilidades.length;
  const totalGeral = totalR + totalP;
  const totalR_carteira = filteredRenovacoes.filter((s) =>
    hasCarteiraValid(s.carteira),
  ).length;
  const totalP_carteira = filteredPortabilidades.filter((s) =>
    hasCarteiraValid(s.carteira),
  ).length;
  const totalCarteira = totalR_carteira + totalP_carteira;

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
    if (!dataExtracao) {
      setNotification("Por favor, selecione uma data válida para extração.");
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    setIsSyncModalOpen(false);
    setSyncing(true);

    // 1. ATIVA A TELA DE BLOQUEIO AQUI
    setProgressState({
      ativo: true,
      percentual: 0,
      atual: 0,
      total: 0,
      mensagem: `Iniciando extração do PipeRun para ${new Date(dataExtracao).toLocaleDateString()}...`,
    });

    try {
      // 2. PASSA A FUNÇÃO CALLBACK QUE ATUALIZA A TELA (Segundo parâmetro)
      const resultado = await sincronizarDadosPipeRun(
        dataExtracao,
        (progresso) => {
          setProgressState({
            ativo: true,
            percentual: progresso.percentual,
            atual: progresso.atual,
            total: progresso.total,
            mensagem: progresso.mensagem,
          });
        },
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
      setNotification(
        error.message || "Erro crítico ao sincronizar com PipeRun.",
      );
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSyncing(false);
      // 3. DESATIVA A TELA DE BLOQUEIO NO FIM
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

              <p className="text-xs text-muted-foreground text-center mt-6 bg-muted p-2 rounded w-full">
                ⚠️ Por favor, aguarde. Não feche ou atualize a página.
              </p>
            </div>
          </div>
        )}

        {isSyncModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
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
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Selecione no calendário abaixo a data base para extração e
                  sincronização dos dados do sistema PipeRun com a nossa base de
                  dados local.
                </p>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-foreground">
                    Data da Extração
                  </label>
                  <div className="flex items-center border-2 border-input hover:border-primary/50 transition-colors bg-background rounded-lg h-14 px-4 shadow-sm w-full focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <Calendar className="h-6 w-6 text-primary mr-3" />
                    <input
                      type="date"
                      className="bg-transparent border-none outline-none text-base font-medium text-foreground w-full cursor-pointer"
                      value={dataExtracao}
                      onChange={(e) => setDataExtracao(e.target.value)}
                      disabled={syncing}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 border-t border-border p-5 bg-muted/30">
                <Button
                  variant="outline"
                  onClick={() => setIsSyncModalOpen(false)}
                  disabled={syncing}
                  className="px-6 h-11 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all px-8 h-11 font-semibold cursor-pointer"
                  onClick={sincronizarDados}
                  disabled={syncing}
                >
                  <ArrowRightLeft className="mr-2 h-5 w-5" />
                  Sincronizar Agora
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. MODAL DE RELATÓRIO DE SINCRONIZAÇÃO (Debug View)       */}
        {/* ========================================================= */}
        {isLogModalOpen && syncLogs && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header do Modal */}
              <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileJson className="h-6 w-6 text-primary" />
                  Relatório de Sincronização (Debug View)
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-muted"
                  onClick={() => setIsLogModalOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex border-b border-border bg-muted/10">
                <button
                  className={`flex-1 py-4 font-semibold text-center transition-colors flex items-center justify-center gap-2 ${logTab === "sucessos" ? "bg-background border-b-2 border-green-500 text-green-600" : "text-muted-foreground hover:bg-muted/50"}`}
                  onClick={() => setLogTab("sucessos")}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Sucessos ({syncLogs.sucessos.length})
                </button>
                <button
                  className={`flex-1 py-4 font-semibold text-center transition-colors flex items-center justify-center gap-2 ${logTab === "falhas" ? "bg-background border-b-2 border-red-500 text-red-600" : "text-muted-foreground hover:bg-muted/50"}`}
                  onClick={() => setLogTab("falhas")}
                >
                  <XCircle className="h-5 w-5" />
                  Falhas ({syncLogs.falhas.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                {logTab === "sucessos" && (
                  <div className="space-y-4">
                    {syncLogs.sucessos.length === 0 ? (
                      <p className="text-center text-muted-foreground py-10">
                        Nenhum registro sincronizado com sucesso.
                      </p>
                    ) : (
                      syncLogs.sucessos.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-background border border-green-200 rounded-lg p-4 shadow-sm flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center border-b border-muted pb-2">
                            <span className="font-bold text-green-700">
                              CNPJ: {item.payload.cnpj}
                            </span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Operação concluída
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                            <div>
                              <strong>Tipo Serviço:</strong>{" "}
                              {item.payload.tipo_servico}
                            </div>
                            <div>
                              <strong>CRM Owner:</strong>{" "}
                              {item.payload.codigo_crm}
                            </div>
                            <div>
                              <strong>Status Deal:</strong>{" "}
                              {item.payload.is_ganho ? "Ganho" : "Perda"}
                            </div>
                          </div>
                          <details className="mt-2 text-xs bg-muted/30 p-2 rounded cursor-pointer">
                            <summary className="font-semibold text-muted-foreground">
                              Ver Payload Completo
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap break-all text-blue-600">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                            <pre className="mt-2 whitespace-pre-wrap break-all text-green-600">
                              Response:{" "}
                              {JSON.stringify(item.respostaApi, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {logTab === "falhas" && (
                  <div className="space-y-4">
                    {syncLogs.falhas.length === 0 ? (
                      <p className="text-center text-muted-foreground py-10">
                        Nenhuma falha registrada. Tudo certo!
                      </p>
                    ) : (
                      syncLogs.falhas.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-background border border-red-200 rounded-lg p-4 shadow-sm flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center border-b border-muted pb-2">
                            <span className="font-bold text-red-700">
                              CNPJ: {item.payload.cnpj}
                            </span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Falha na API Interna
                            </span>
                          </div>
                          <div className="text-sm mt-2 p-2 bg-red-50 text-red-800 rounded border border-red-100">
                            <strong>Motivo da Falha:</strong>{" "}
                            {typeof item.erro === "object"
                              ? JSON.stringify(item.erro)
                              : item.erro}
                          </div>
                          <details className="mt-2 text-xs bg-muted/30 p-2 rounded cursor-pointer">
                            <summary className="font-semibold text-muted-foreground">
                              Ver Payload Enviado
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap break-all text-blue-600">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex pt-20 w-full items-center justify-between border-b border-border pb-6 max-w-6xl">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col gap-3 w-full">
              <h1 className="text-3xl font-bold">
                Visão Geral dos Serviços Disponíveis ao PipeRun
              </h1>
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full mt-2">
                <Button
                  size="lg"
                  className="h-10 px-6 text-base w-full sm:w-auto cursor-pointer shadow-md transition-all"
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
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Sincronizar dados Piperun com DB
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            className={`rounded-full h-12 w-12 shadow-sm ${loading ? "opacity-50" : ""}`}
            onClick={() => fetchServicos(true)}
            disabled={loading}
            title="Atualizar dados na API"
          >
            <RotateCw
              className={`h-5 w-5 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`}
            />
          </Button>
        </div>

        <div className="w-full flex flex-col gap-8 mt-8 max-w-6xl">
          <div className="max-h-[300px] overflow-y-auto pr-2 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              <Card className="bg-primary shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-primary-foreground/90">
                    Total Geral (Sem Filtro)
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-primary-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary-foreground">
                    {loading
                      ? "..."
                      : renovacoes.length + portabilidades.length}
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
              </CardContent>
            </Card>
          </div>

          <hr className="border-border my-2" />

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" /> Filtros Avançados
                para Gráficos
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
                  <Wallet className="h-5 w-5 text-primary" />
                  Divisão da Carteira:
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
                <span className="text-xs text-muted-foreground ml-2">
                  *Este filtro mestre afeta os totais processados abaixo.
                </span>
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
                  <div
                    className={`absolute cursor-pointer -top-1 bg-red-600 text-white text-xs px-2 py-1 cursor-pointer rounded transition-opacity ${filtroLinhasAtivo ? "opacity-100" : "opacity-50"}`}
                    style={{
                      left: `calc(${(filtroLinhasValor / (maxLinhas || 1)) * 100}% - 12px)`,
                    }}
                  >
                    {filtroLinhasValor}
                  </div>
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

                  <div
                    className={`absolute -top-1 bg-red-600 text-white text-xs px-2 py-1 rounded transition-opacity flex items-center gap-1 whitespace-nowrap ${filtroDataAtivo ? "opacity-100" : "opacity-50"}`}
                    style={{
                      left: `calc(${((filtroDataValor - minDateTs) / (maxDateTs - minDateTs || 1)) * 100}% - 20px)`,
                    }}
                  >
                    {new Date(filtroDataValor).toLocaleDateString()}
                    <span className="bg-white text-red-600 px-1 rounded font-bold text-[10px] ml-1">
                      {calcularDiasAtras(filtroDataValor)} Dias
                    </span>
                  </div>

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
                      {totalGeral === 0 && <Cell fill={COR_FUNDO} />}
                    </Pie>
                    {renderCenterText(totalGeral, "Total de Serviços")}
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COR_RENOVACAO }}
                  ></div>{" "}
                  <span className="text-sm">Renovação</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COR_PORTABILIDADE }}
                  ></div>{" "}
                  <span className="text-sm">Portabilidade</span>
                </div>
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
          </div>
        </div>
      </main>
    </div>
  );
}
