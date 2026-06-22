import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import {
  Database,
  Send,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ServerCrash,
  RefreshCw,
  FileJson,
  X,
  XCircle,
  ArrowRightLeft,
  Calendar
} from "lucide-react";
import { useState, useEffect } from "react";
import API from "@/services/api";
import { useIntegracaoPipeBdr } from "@/services/hookBdrSubir";
import { IProgressState, sincronizarDadosPipeRun } from "@/services/apiVoltaBdr";


interface IContagemResponse {
  total_disponiveis: string | number;
}

interface IPainelConsultorResponse {
  seq_consultor: number;
  nome_consultor: string;
  total_ativo_crm: string | number;
  total_ativo_crm_carteira: string | number;
  total_disponivel_envio: string | number;
}

interface IBDRMetrics {
  seq_consultor: number;
  nome_consultor: string;
  total_ativo_crm: number;
  total_ativo_crm_carteira: number;
  total_disponivel_envio: number;
}

export default function PainelBDR() {
  const [bdrSelecionado, setBdrSelecionado] = useState<string>("");
  const [quantidadeUpload, setQuantidadeUpload] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);
  const [leadsGlobais, setLeadsGlobais] = useState<number>(0);
  const [listaBDRs, setListaBDRs] = useState<IBDRMetrics[]>([]);
  const [loadingDados, setLoadingDados] = useState<boolean>(true);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [dataInicial, setDataInicial] = useState<string>("");
  const [dataFinal, setDataFinal] = useState<string>("");
  const [syncing, setSyncing] = useState<boolean>(false);
  const [progressState, setProgressState] = useState<IProgressState>({
    ativo: false,
    percentual: 0,
    atual: 0,
    total: 0,
    mensagem: "",
    etapa: "iniciando"
  });

  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [syncLogs, setSyncLogs] = useState<{ sucessos: any[]; falhas: any[] } | null>(null);
  const [logTab, setLogTab] = useState<"sucessos" | "falhas">("sucessos");
  const { handleSubirServicos, isEnviando } = useIntegracaoPipeBdr();

  const carregarDados = async () => {
    setLoadingDados(true);
    try {
      const [resContagem, resIndicadores] = await Promise.all([
        API.get("/api/servico-omni/leads/contagem"),
        API.get("/api/servico-omni/dashboard/indicadores"),
      ]);

      const dadosContagem: IContagemResponse = resContagem.data?.dados?.[0];
      const totalGeral = dadosContagem ? Number(dadosContagem.total_disponiveis) : 0;
      setLeadsGlobais(totalGeral);

      const dadosConsultores: IPainelConsultorResponse[] = resIndicadores.data?.dados || [];

      const bdrsMapeados: IBDRMetrics[] = dadosConsultores.map((item) => ({
        seq_consultor: Number(item.seq_consultor),
        nome_consultor: item.nome_consultor || "Consultor Sem Nome",
        total_ativo_crm: Number(item.total_ativo_crm || 0),
        total_ativo_crm_carteira: Number(item.total_ativo_crm_carteira || 0),
        total_disponivel_envio: Number(item.total_disponivel_envio || 0),
      }));

      bdrsMapeados.sort((a, b) => b.total_disponivel_envio - a.total_disponivel_envio);

      setListaBDRs(bdrsMapeados);
    } catch (error: any) {
      console.error("[Painel BDR] Erro ao carregar dados das Views:", error.message);
    } finally {
      setLoadingDados(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleDispararLeads = () => {
    handleSubirServicos({
      seqConsultor: Number(bdrSelecionado),
      limiteEnvio: Number(quantidadeUpload),
      onSuccessCb: (logs) => {
        if (logs) {
          setSyncLogs(logs);
          setLogTab(logs.falhas.length > 0 && logs.sucessos.length === 0 ? "falhas" : "sucessos");
          setIsLogModalOpen(true);
        }

        const totalSucessos = logs?.sucessos.length || 0;
        const totalFalhas = logs?.falhas.length || 0;

        setNotification(`Processamento concluído: ${totalSucessos} sucessos e ${totalFalhas} falhas.`);

        setQuantidadeUpload("");
        setBdrSelecionado("");
        carregarDados();

        setTimeout(() => setNotification(null), 7000);
      },
    });
  };

  const sincronizarDados = async () => {
    if (!dataInicial) {
      setNotification("Por favor, selecione uma data inicial válida.");
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    
    setSyncing(true);
    setProgressState({
      ativo: true,
      etapa: "iniciando",
      percentual: 0,
      atual: 0,
      total: 0,
      mensagem: "Iniciando extração do PipeRun...",
    });

    try {
      const resultado = await sincronizarDadosPipeRun(
        dataInicial,
        dataFinal || dataInicial,
        (progresso) => setProgressState({ ativo: true, ...progresso })
      );
      
      setNotification(resultado.mensagem);
      setTimeout(() => setNotification(null), 8000);

      if (resultado.detalhes) {
        setSyncLogs(resultado.detalhes);
        setLogTab(resultado.detalhes.falhas.length > 0 ? "falhas" : "sucessos");
        setIsLogModalOpen(true);
      }
      
      await carregarDados(); 
    } catch (error: any) {
      console.error("Erro na sincronização reversa:", error);
      setNotification(error.message || "Erro crítico ao sincronizar histórico.");
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSyncing(false);
      setProgressState((prev) => ({ ...prev, ativo: false }));
      setIsSyncModalOpen(false);
    }
  };

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <div className="w-[280px] h-full flex-shrink-0">
        <Sidebar />
      </div>

      <main className="relative flex-1 h-full flex flex-col overflow-y-auto bg-muted/10 p-6 sm:p-10">

        {notification && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">{notification}</p>
          </div>
        )}

        {isSyncModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ArrowRightLeft className="h-6 w-6 text-primary" />{" "}
                  Sincronizar Histórico PipeRun
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-muted"
                  onClick={() => !syncing && setIsSyncModalOpen(false)}
                  disabled={syncing}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="p-6 flex flex-col gap-6">
                <p className="text-sm text-muted-foreground">
                  Busque e atualize no banco local os negócios "Ganhos" e "Perdidos" do funil de Vendas do PipeRun, baseando-se na data de fechamento.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground">
                      Data Inicial
                    </label>
                    <div className="flex items-center border-2 border-input bg-background rounded-lg h-14 px-4 shadow-sm focus-within:border-primary transition-colors">
                      <Calendar className="h-5 w-5 text-primary mr-2" />
                      <input
                        type="date"
                        className="bg-transparent border-none outline-none w-full text-sm font-medium"
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
                    <div className="flex items-center border-2 border-input bg-background rounded-lg h-14 px-4 shadow-sm focus-within:border-primary transition-colors">
                      <Calendar className="h-5 w-5 text-primary mr-2" />
                      <input
                        type="date"
                        className="bg-transparent border-none outline-none w-full text-sm font-medium"
                        value={dataFinal}
                        min={dataInicial}
                        onChange={(e) => setDataFinal(e.target.value)}
                        disabled={syncing}
                      />
                    </div>
                  </div>
                </div>

                {progressState.ativo && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-primary animate-pulse flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> {progressState.mensagem}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
                        {progressState.percentual}%
                      </span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                        style={{ width: `${progressState.percentual}%` }}
                      ></div>
                    </div>
                    {progressState.total > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 text-right">
                        {progressState.atual} de {progressState.total} registros.
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3 border-t border-border p-5 bg-muted/10">
                <Button
                  variant="outline"
                  onClick={() => setIsSyncModalOpen(false)}
                  disabled={syncing}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all"
                  onClick={sincronizarDados}
                  disabled={syncing || !dataInicial}
                >
                  {syncing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</>
                  ) : (
                    <><ArrowRightLeft className="mr-2 h-5 w-5" /> Iniciar Sincronização</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLogModalOpen && syncLogs && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileJson className="h-6 w-6 text-primary" /> Relatório da Operação
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
                  className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${logTab === "sucessos" ? "bg-background border-b-2 border-green-500 text-green-600" : "text-muted-foreground hover:bg-muted/50"}`}
                  onClick={() => setLogTab("sucessos")}
                >
                  <CheckCircle2 className="h-5 w-5" /> Sucessos ({syncLogs.sucessos.length})
                </button>
                <button
                  className={`flex-1 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${logTab === "falhas" ? "bg-background border-b-2 border-red-500 text-red-600" : "text-muted-foreground hover:bg-muted/50"}`}
                  onClick={() => setLogTab("falhas")}
                >
                  <XCircle className="h-5 w-5" /> Falhas ({syncLogs.falhas.length})
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                {logTab === "sucessos" && syncLogs.sucessos.length === 0 && (
                   <p className="text-center text-muted-foreground py-10">Nenhum sucesso registrado.</p>
                )}
                {logTab === "sucessos" &&
                  syncLogs.sucessos.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-background border border-green-200 rounded-lg p-4 mb-4 flex flex-col gap-2 shadow-sm"
                    >
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="font-bold text-green-700">
                          CNPJ: {item.payload?.cnpj || item.cnpj || 'N/A'}
                        </span>
                        <span className="text-xs font-semibold text-green-800 bg-green-100 px-3 py-1 rounded-full">
                          {item.payload?.is_ganho ? "MARCADO COMO GANHO" : "MARCADO COMO PERDA"}
                        </span>
                      </div>
                      <div className="text-sm mt-1 text-muted-foreground">
                        Atualizado com sucesso no banco local.
                      </div>
                    </div>
                  ))}
                
                {logTab === "falhas" && syncLogs.falhas.length === 0 && (
                   <p className="text-center text-muted-foreground py-10">Nenhuma falha registrada.</p>
                )}
                {logTab === "falhas" &&
                  syncLogs.falhas.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-background border border-red-200 rounded-lg p-4 mb-4 flex flex-col gap-2 shadow-sm"
                    >
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="font-bold text-red-700">
                          CNPJ: {item.payload?.cnpj || item.cnpj || 'N/A'}
                        </span>
                      </div>
                      <div className="text-sm mt-2 p-3 bg-red-50 text-red-800 rounded border border-red-100 font-medium">
                        Motivo: {item.erro || item.motivo || "Erro não mapeado"}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-7xl mx-auto space-y-8">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" />
                Operação BDR
              </h1>
              <p className="text-muted-foreground mt-1 text-base">
                Gestão de leads outbound, envios para o CRM e sincronização de fechamentos.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button
                variant="default"
                onClick={() => setIsSyncModalOpen(true)}
                disabled={loadingDados || isEnviando || syncing}
                className="flex items-center gap-2 shadow-md transition-all flex-1 md:flex-none"
                size="lg"
              >
                <ArrowRightLeft className="h-5 w-5" />
                Puxar Histórico
              </Button>

              <Button
                variant="outline"
                onClick={carregarDados}
                disabled={loadingDados || syncing}
                className="flex items-center gap-2 bg-background shadow-sm hover:bg-muted transition-all flex-1 md:flex-none"
                size="lg"
              >
                <RefreshCw className={`h-5 w-5 text-muted-foreground ${loadingDados ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-primary shadow-lg border-none flex flex-col justify-center">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-primary-foreground/80 font-medium text-sm uppercase tracking-wider">
                      Leads Globais Disponíveis
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-extrabold text-primary-foreground">
                        {loadingDados ? "..." : leadsGlobais.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-primary-foreground/70 text-sm mt-2">
                      Aguardando distribuição para a equipe.
                    </p>
                  </div>
                  <div className="p-4 bg-primary-foreground/10 rounded-full">
                    <Database className="h-10 w-10 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Subir Leads para o CRM
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-end gap-5">
                  <div className="space-y-2 w-full sm:w-[40%]">
                    <Label className="font-semibold text-muted-foreground">
                      Selecione o Consultor
                    </Label>
                    <Select
                      value={bdrSelecionado}
                      onValueChange={setBdrSelecionado}
                      disabled={isEnviando || syncing || loadingDados || leadsGlobais === 0}
                    >
                      <SelectTrigger className="h-12 bg-background border-input">
                        <SelectValue placeholder="Escolha um consultor..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {listaBDRs.map((bdr) => (
                          <SelectItem
                            key={`bdr-${bdr.seq_consultor}`}
                            value={String(bdr.seq_consultor)}
                          >
                            {bdr.nome_consultor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 w-full sm:w-[30%]">
                    <Label className="font-semibold text-muted-foreground">
                      Quantidade
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max={leadsGlobais}
                      placeholder="Ex: 150"
                      value={quantidadeUpload}
                      onChange={(e) => setQuantidadeUpload(e.target.value)}
                      disabled={isEnviando || syncing || loadingDados || leadsGlobais === 0}
                      className="h-12 bg-background font-medium border-input"
                    />
                  </div>

                  <div className="w-full sm:w-[30%]">
                    <Button
                      onClick={handleDispararLeads}
                      disabled={
                        isEnviando ||
                        syncing ||
                        !bdrSelecionado ||
                        !quantidadeUpload ||
                        Number(quantidadeUpload) <= 0 ||
                        Number(quantidadeUpload) > leadsGlobais
                      }
                      className="w-full h-12 text-base font-bold transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="lg"
                    >
                      {isEnviando ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" /> Disparar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground border-b border-border/50 pb-2 mt-4">
              <Users className="h-6 w-6 text-muted-foreground" />
              Desempenho e Carga da Equipe
            </h2>

            {loadingDados ? (
              <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-xl border border-border">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                <p>Carregando métricas direto do banco...</p>
              </div>
            ) : listaBDRs.length === 0 ? (
              <div className="w-full h-32 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                <p>Nenhum consultor encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {listaBDRs.map((bdr) => (
                  <Card
                    key={`card-${bdr.seq_consultor}`}
                    className="hover:border-primary/40 transition-colors group"
                  >
                    <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
                      <CardTitle className="text-base font-bold group-hover:text-primary transition-colors truncate">
                        {bdr.nome_consultor}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/50">
                        <div className="flex items-center justify-between p-4 bg-background">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <ServerCrash className="h-4 w-4 text-emerald-500" />
                            Em Tratamento CRM
                          </div>
                          <span className="font-bold text-lg tabular-nums">
                            {bdr.total_ativo_crm.toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-background">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Briefcase className="h-4 w-4 text-amber-500" />
                            Carteira
                          </div>
                          <span className="font-bold text-lg tabular-nums text-foreground/80">
                            {bdr.total_ativo_crm_carteira.toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-primary/5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <Clock className="h-4 w-4" />
                            Aguardando Disparo
                          </div>
                          <span className="font-bold text-lg tabular-nums text-primary">
                            {bdr.total_disponivel_envio.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
