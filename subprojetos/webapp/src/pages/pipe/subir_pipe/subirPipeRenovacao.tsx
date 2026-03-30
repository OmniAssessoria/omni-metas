import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// IMPORTAÇÕES DO DIALOG E ÍCONES
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  UploadCloud,
  Loader2,
  Building2,
  RefreshCw,
  LayoutList,
  X,
  History,
  Calendar,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ITelaDetalhesProps } from "../subirPipeGeral";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import API from "@/services/api";
import { useIntegracaoPipeRun } from "@/services/hookApiRun";

// 1. INTERFACE DO HISTÓRICO
interface IHistoricoEmpresa {
  seq_historico_consultor_empresa: number;
  tipo_servico: string;
  data_inicio_atendimento: string;
  data_fim_atendimento: string | null;
  consultor_nome: string;
  perfil_indicacao: string;
  perfil_qtd_linhas_min: number;
  perfil_qtd_linhas_max: number;
  motivo_declinio: string | null;
  situacao_atendimento: string | null;
}

export function PipeSubirRenovacao({ dados, onBack }: ITelaDetalhesProps) {
  const [consultorSelecionado, setConsultorSelecionado] = useState<
    number | null | "nao_atribuidos"
  >(null);
  const [consultoresEnvio, setConsultoresEnvio] = useState<number[]>([]);
  const [limiteEnvio, setLimiteEnvio] = useState<number | "">("");

  const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
  const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);

  // 2. ESTADOS DO MODAL DE HISTÓRICO
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [empresaHistoricoNome, setEmpresaHistoricoNome] = useState("");
  const [dadosHistorico, setDadosHistorico] = useState<IHistoricoEmpresa[]>([]);
  const [isCarregandoHistorico, setIsCarregandoHistorico] = useState(false);

  const hashConsultores = "e015a67d-bab4-403a-a0f6-5b2cfbc35ebe";
  const { handleSubirServicos, isEnviando } = useIntegracaoPipeRun();

  const formatarDataApenasDia = (
    dataString: string | Date | undefined | null,
  ) => {
    if (!dataString) return "Não informado";
    try {
      const dateObj = new Date(dataString);
      if (isNaN(dateObj.getTime())) throw new Error();
      return dateObj.toLocaleDateString("pt-BR");
    } catch {
      return "Data Inválida";
    }
  };

  const formatarDataComHora = (
    dataString: string | Date | undefined | null,
  ) => {
    if (!dataString) return "Não informado";
    try {
      const dateObj = new Date(dataString);
      if (isNaN(dateObj.getTime())) throw new Error();
      return dateObj.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data Inválida";
    }
  };

  const calcularDiferencaDias = (
    dataString: string | Date | undefined | null,
  ) => {
    if (!dataString) return null;
    const dataAlvo = new Date(dataString);
    const hoje = new Date();
    dataAlvo.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);
    const diffTime = dataAlvo.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    async function fetchConsultores() {
      try {
        setIsCarregandoConsultores(true);
        const cacheKey = "consultores_geral_cache";
        let cachedData: string | null = null;

        try {
          cachedData = sessionStorage.getItem(cacheKey);
        } catch (e) {}

        if (cachedData) {
          try {
            const parsedCache = JSON.parse(cachedData);
            if (Array.isArray(parsedCache)) {
              setConsultores(parsedCache);
              return;
            }
          } catch (e) {
            sessionStorage.removeItem(cacheKey);
          }
        }

        const response = await API.get("/api/consultores");
        const listaConsultores = response.data?.dados ?? [];
        if (Array.isArray(listaConsultores)) {
          setConsultores(listaConsultores);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(listaConsultores));
          } catch (e) {}
        }
      } catch (error) {
        console.error("Falha na busca de consultores:", error);
      } finally {
        setIsCarregandoConsultores(false);
      }
    }
    fetchConsultores();
  }, []);

  const handleConsultorChange = (id: string) => {
    if (id === "todos") {
      setConsultorSelecionado(null);
    } else if (id === "nao_atribuidos") {
      setConsultorSelecionado("nao_atribuidos");
    } else {
      setConsultorSelecionado(Number(id));
    }
  };

  const handleAddConsultorEnvio = (idStr: string) => {
    const id = Number(idStr);
    if (!isNaN(id) && !consultoresEnvio.includes(id)) {
      setConsultoresEnvio((prev) => [...prev, id]);
    }
  };

  const handleRemoverConsultorEnvio = (idToRemove: number) => {
    setConsultoresEnvio((prev) => prev.filter((id) => id !== idToRemove));
  };

  // 3. FUNÇÃO PARA ABRIR O HISTÓRICO
  const abrirHistorico = async (seq_empresa: number, razao: string) => {
    setEmpresaHistoricoNome(razao);
    setModalHistoricoAberto(true);
    setIsCarregandoHistorico(true);
    setDadosHistorico([]);

    try {
      const response = await API.get(
        `/api/consultor/historico/empresa/${seq_empresa}`,
      );
      if (response.data && response.data.dados) {
        setDadosHistorico(response.data.dados);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setIsCarregandoHistorico(false);
    }
  };

  const consultorAtual = useMemo(
    () => consultores.find((c) => c.seq_consultor === consultorSelecionado),
    [consultores, consultorSelecionado],
  );

  const mapaConsultores = useMemo(() => {
    const mapa = new Map<number, string>();
    consultores.forEach((c) => {
      if (c && c.seq_consultor)
        mapa.set(Number(c.seq_consultor), c.nome || "Sem Nome");
    });
    return mapa;
  }, [consultores]);

  const dadosFiltrados = useMemo(() => {
    if (!Array.isArray(dados)) return [];

    if (consultorSelecionado === null) return dados;

    if (consultorSelecionado === "nao_atribuidos") {
      return dados.filter((item) => !item.seq_consultor);
    }

    return dados.filter((item) => item.seq_consultor === consultorSelecionado);
  }, [dados, consultorSelecionado]);

  const dadosGrafico = useMemo(() => {
    return dadosFiltrados.map((item) => ({
      empresa: item.razao || "Empresa sem Razão",
      linhas:
        typeof item.qtd_servico_claro === "number" ? item.qtd_servico_claro : 0,
      cnpj: item.cnpj || "Sem CNPJ",
    }));
  }, [dadosFiltrados]);

  const onClickSubirServicos = () => {
    handleSubirServicos({
      tipoOperacao: "Renovação",
      hashFunil: hashConsultores,
      dadosGlobais: dados,
      consultoresEnvio: consultoresEnvio,
      limiteEnvio: limiteEnvio,
      onSuccessCb: () => {
        setConsultoresEnvio([]);
        setLimiteEnvio("");
      },
    });
  };

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <div className="w-[280px] h-full flex-shrink-0 border-r border-border">
        <Sidebar />
      </div>

      <main className="flex-1 h-full overflow-y-auto p-10 bg-muted/10">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 -ml-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel Geral
        </Button>

        <header className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="mt-2">
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="h-8 w-8 text-yellow-500" />
              <h1 className="text-3xl font-bold tracking-tight">
                Detalhes de Renovação
              </h1>
            </div>
            <h2 className="text-lg font-semibold flex-1 flex align-center justify-start">
              {consultorAtual
                ? `Carteira do Consultor: ${consultorAtual.nome} (Renovação)`
                : consultorSelecionado === "nao_atribuidos"
                  ? "Serviços Não Atribuídos (Renovação)"
                  : "Todos os Serviços de Renovação"}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-3">
            {consultoresEnvio.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2 max-w-lg">
                {consultoresEnvio.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-sm text-yellow-700 shadow-sm"
                  >
                    {mapaConsultores.get(id) || "Desconhecido"}
                    <button
                      onClick={() => handleRemoverConsultorEnvio(id)}
                      className="rounded-full hover:bg-yellow-200 p-0.5 transition-colors"
                      title="Remover"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-56">
                <Select
                  onValueChange={handleAddConsultorEnvio}
                  value=""
                  disabled={isCarregandoConsultores}
                >
                  <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-yellow-500 text-foreground">
                    <SelectValue
                      placeholder={
                        isCarregandoConsultores
                          ? "Carregando..."
                          : "Adicionar para Envio"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {consultores.map((c) => (
                      <SelectItem
                        key={`envio-${c.seq_consultor}`}
                        value={String(c.seq_consultor)}
                      >
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32">
                <input
                  type="number"
                  min="1"
                  placeholder="Qtd Limite"
                  value={limiteEnvio}
                  onChange={(e) =>
                    setLimiteEnvio(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                />
              </div>

              <Button
                onClick={onClickSubirServicos}
                disabled={consultoresEnvio.length === 0 || isEnviando}
                className="h-10 px-6 shadow-sm bg-yellow-500 hover:bg-yellow-600 text-white dark:text-zinc-900 font-medium transition-colors"
              >
                {isEnviando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {isEnviando ? "Processando..." : "Subir Renovações"}
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              {consultorSelecionado ? (
                <Users size={20} className="text-yellow-500" />
              ) : (
                <LayoutList size={20} className="text-yellow-500" />
              )}
              <h2 className="text-lg font-semibold flex-1 flex align-center justify-start">
                {consultorAtual
                  ? `Carteira do Consultor: ${consultorAtual.nome} (Renovação)`
                  : "Todos os Serviços de Renovação"}
              </h2>

              <div className="w-64">
                <Select
                  onValueChange={handleConsultorChange}
                  disabled={isCarregandoConsultores}
                >
                  <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-yellow-500 text-foreground">
                    <SelectValue
                      placeholder={
                        isCarregandoConsultores
                          ? "Carregando..."
                          : "Filtrar por Consultor"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Consultores</SelectItem>
                    <SelectItem value="nao_atribuidos">
                      Não Atribuídos
                    </SelectItem>
                    {consultores.map((c) => (
                      <SelectItem
                        key={`filtro-${c.seq_consultor}`}
                        value={String(c.seq_consultor)}
                      >
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dadosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>Não há serviços de renovação para exibir.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="h-[350px] w-full border rounded-lg p-4 bg-muted/5 flex flex-col">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <Building2 size={16} /> Volume de Linhas a Renovar por
                    Empresa
                  </h3>
                  <div className="flex-1 w-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosGrafico}
                        margin={{ top: 10, right: 20, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#88888833"
                        />
                        <XAxis
                          dataKey="empresa"
                          tick={{ fontSize: 12 }}
                          hide={dadosFiltrados.length > 20}
                          tickFormatter={(value: string) =>
                            value ? value.substring(0, 15) + "..." : ""
                          }
                        />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip cursor={{ fill: "#88888811" }} />
                        <Bar
                          dataKey="linhas"
                          fill="#eab308"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 border-b pb-4">
                    <h2 className="text-lg font-semibold flex-1">
                      {consultorAtual
                        ? `Carteira: ${consultorAtual.nome}`
                        : "Todos os Serviços"}
                    </h2>
                    <div className="w-64">
                      <Select onValueChange={handleConsultorChange}>
                        <SelectTrigger className="h-10 bg-background">
                          <SelectValue placeholder="Filtrar por Consultor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="nao_atribuidos">
                            Não Atribuídos
                          </SelectItem>
                          {consultores.map((c) => (
                            <SelectItem
                              key={`filtro-${c.seq_consultor}`}
                              value={String(c.seq_consultor)}
                            >
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-md border overflow-y-auto max-h-[500px] relative">
                    <Table className="relative border-collapse">
                      <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="bg-muted">Empresa</TableHead>
                          <TableHead className="bg-muted">CNPJ</TableHead>
                          {!consultorSelecionado && (
                            <TableHead className="bg-muted">
                              Consultor
                            </TableHead>
                          )}
                          <TableHead className="text-center bg-muted">
                            Qtd. Linhas
                          </TableHead>
                          <TableHead className="text-right bg-muted">
                            Fim Contrato
                          </TableHead>
                          <TableHead className="text-right bg-muted">
                            Última Leitura
                          </TableHead>
                          <TableHead className="text-center bg-muted">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dadosFiltrados.map((item) => {
                          const diff = calcularDiferencaDias(
                            item.dt_ultima_leitura,
                          );
                          return (
                            <TableRow
                              key={`${item.seq_empresa}-${item.seq_claro}`}
                            >
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {item.razao}
                              </TableCell>
                              <TableCell>{item.cnpj}</TableCell>
                              {!consultorSelecionado && (
                                <TableCell className="text-muted-foreground">
                                  {mapaConsultores.get(
                                    Number(item.seq_consultor),
                                  ) || "Não Atribuído"}
                                </TableCell>
                              )}
                              <TableCell className="text-center font-bold text-yellow-600">
                                {item.qtd_servico_claro}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatarDataApenasDia(item.dt_fim_contrato)}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <span className="text-muted-foreground mr-2">
                                  {formatarDataApenasDia(
                                    item.dt_ultima_leitura,
                                  )}
                                </span>
                                {diff !== null && (
                                  <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-xs shadow-sm">
                                    {diff === 0 ? "Hoje" : `${diff}d`}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 transition-colors"
                                  onClick={() =>
                                    abrirHistorico(
                                      item.seq_empresa,
                                      item.razao || "Empresa Desconhecida",
                                    )
                                  }
                                >
                                  <History className="w-4 h-4 mr-2" />
                                  Histórico
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={modalHistoricoAberto}
          onOpenChange={setModalHistoricoAberto}
        >
          <DialogContent className="sm:max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background [&>button.absolute]:hidden">
            <div className="p-6 border-b border-border bg-muted/10 shrink-0 flex items-start justify-between">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl text-yellow-600">
                  <History className="w-6 h-6" />
                  Histórico de Consultores
                </DialogTitle>
                <DialogDescription className="text-base font-semibold text-foreground mt-2">
                  Atendimentos registrados para:{" "}
                  <span className="text-yellow-600">
                    {empresaHistoricoNome}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
                onClick={() => setModalHistoricoAberto(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto relative">
              {isCarregandoHistorico ? (
                <div className="flex flex-col items-center justify-center py-12 h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-4" />
                  <p className="text-muted-foreground font-medium">
                    Buscando linha do tempo...
                  </p>
                </div>
              ) : dadosHistorico.length === 0 ? (
                <div className="bg-muted/30 p-10 rounded-lg text-center border border-dashed border-border mt-4">
                  <History className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground font-medium">
                    Nenhum histórico de consultor encontrado para esta empresa.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-yellow-200 ml-4 space-y-8 py-4">
                  {dadosHistorico.map((hist, index) => (
                    <div
                      key={hist.seq_historico_consultor_empresa}
                      className="relative pl-8"
                    >
                      <div className="absolute w-5 h-5 bg-yellow-500 rounded-full -left-[11px] top-1.5 border-4 border-background shadow-sm" />

                      <div className="bg-card border border-border shadow-sm rounded-xl p-5 transition-all hover:shadow-md hover:border-yellow-200">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                          <div>
                            <h4 className="text-xl font-bold flex items-center gap-2 text-foreground">
                              <Users className="w-5 h-5 text-yellow-500" />
                              {hist.consultor_nome}
                            </h4>

                            <div className="flex flex-wrap gap-2 mt-3">
                              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-bold">
                                <Target className="w-3.5 h-3.5" />
                                {hist.perfil_indicacao || "S/ Perfil"}
                              </span>
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold">
                                <LayoutList className="w-3.5 h-3.5" />
                                Linhas: {hist.perfil_qtd_linhas_min} a{" "}
                                {hist.perfil_qtd_linhas_max}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-start md:items-end text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50 min-w-[180px]">
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium">Início:</span>{" "}
                              {formatarDataComHora(
                                hist.data_inicio_atendimento,
                              )}
                            </span>
                            {hist.data_fim_atendimento ? (
                              <span className="flex items-center gap-2 mt-2">
                                <Calendar className="w-4 h-4 text-orange-500" />
                                <span className="font-medium">Fim:</span>{" "}
                                {formatarDataComHora(hist.data_fim_atendimento)}
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 mt-2 text-green-600">
                                <span className="relative flex h-3 w-3 mr-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                Em Andamento
                              </span>
                            )}
                          </div>
                        </div>

                        <hr className="border-border my-4" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1.5">
                              Desfecho / Declinio
                            </span>
                            {hist.motivo_declinio ? (
                              <span className="font-bold text-red-700 bg-red-50 px-3 py-1 rounded-md border border-red-200 inline-block">
                                {hist.motivo_declinio}
                              </span>
                            ) : (
                              <span className="font-bold text-green-700 bg-green-50 px-3 py-1 rounded-md border border-green-200 inline-block">
                                GANHO / CONVERTIDO
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1.5">
                              Serviço Analisado
                            </span>
                            <span className="font-semibold bg-yellow-50/50 text-yellow-800 px-3 py-1 rounded-md border border-yellow-200 inline-block">
                              {hist.situacao_atendimento || "N/A"} -{" "}
                              {hist.tipo_servico}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
