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
import {
  ArrowLeft,
  Users,
  UploadCloud,
  Loader2,
  Building2,
  LayoutList,
  X,
  History,
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

import DialogHistoricoPortabilidade, {
  IHistoricoEmpresa,
} from "@/components/historico_empresa_consultor/historico_portabilidade";

export function PipeSubirPortabilidade({ dados, onBack }: ITelaDetalhesProps) {
  const [consultorSelecionado, setConsultorSelecionado] = useState<
    number | null | "nao_atribuidos"
  >(null);
  const [consultoresEnvio, setConsultoresEnvio] = useState<number[]>([]);
  const [limiteEnvio, setLimiteEnvio] = useState<number | "">("");
  const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
  const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);

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
      return dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    async function fetchConsultores() {
      try {
        setIsCarregandoConsultores(true);
        const cacheKey = "consultores_portabilidade_cache_v2";
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

  const consultoresElegiveis = useMemo(() => {
    return consultores.filter((c) => {
      if (!c.perfil_indicacao) return false;
      const perfil = String(c.perfil_indicacao).trim().toUpperCase();
      return perfil === "PORTABILIDADE" || perfil === "AMBOS";
    });
  }, [consultores]);

  const mapaConsultores = useMemo(() => {
    const mapa = new Map<number, { nome: string; textoExibicao: string }>();
    consultores.forEach((c) => {
      if (c && c.seq_consultor) {
        const min = c.perfil_qtd_linhas_min || 0;
        const max = c.perfil_qtd_linhas_max || 0;
        const nomeConsultor = c.nome || "Não Identificado";

        mapa.set(Number(c.seq_consultor), {
          nome: nomeConsultor,
          textoExibicao: `${nomeConsultor} (Min: ${min} / Máx: ${max} linhas)`,
        });
      }
    });
    return mapa;
  }, [consultores]);

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
      cnpj: item.cnpj || "N/D",
    }));
  }, [dadosFiltrados]);

  const onClickSubirServicos = () => {
    handleSubirServicos({
      tipoOperacao: "Portabilidade",
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

      <main className="flex-1 h-full overflow-y-auto p-10 bg-muted/10 relative">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 -ml-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel Geral
        </Button>

        <header className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="mt-2">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">
              Detalhes de Portabilidade
            </h1>
            <p className="text-muted-foreground">
              Visualizando{" "}
              <span className="font-semibold text-blue-500">
                {dadosFiltrados.length}
              </span>{" "}
              serviços
              {consultorSelecionado === "nao_atribuidos"
                ? " não atribuídos"
                : typeof consultorSelecionado === "number"
                  ? " deste consultor"
                  : " no total"}
              .
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            {consultoresEnvio.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2 max-w-lg">
                {consultoresEnvio.map((id) => (
                  <span
                    key={`badge-${id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 shadow-sm"
                  >
                    {/* Renderiza o nome completo com a qtd de linhas */}
                    {mapaConsultores.get(id)?.textoExibicao || "Desconhecido"}
                    <button
                      onClick={() => handleRemoverConsultorEnvio(id)}
                      className="rounded-full hover:bg-blue-200 p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-80">
                <Select
                  onValueChange={handleAddConsultorEnvio}
                  value=""
                  disabled={isCarregandoConsultores}
                >
                  <SelectTrigger className="h-10 bg-background border-border shadow-sm text-foreground">
                    <SelectValue
                      placeholder={
                        isCarregandoConsultores
                          ? "Carregando..."
                          : "Adicionar para Envio"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Iterando sobre consultoresElegiveis ao invés da lista completa */}
                    {consultoresElegiveis.map((c) => (
                      <SelectItem
                        key={`add-${c.seq_consultor}`}
                        value={String(c.seq_consultor)}
                      >
                        {c.nome} (Min: {c.perfil_qtd_linhas_min} / Máx:{" "}
                        {c.perfil_qtd_linhas_max})
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <Button
                onClick={onClickSubirServicos}
                disabled={consultoresEnvio.length === 0 || isEnviando}
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isEnviando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {isEnviando ? "Processando..." : "Subir Serviços"}
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              {consultorSelecionado ? (
                <Users size={20} className="text-blue-500" />
              ) : (
                <LayoutList size={20} className="text-blue-500" />
              )}
              <h2 className="text-lg font-semibold flex-1">
                {consultorAtual
                  ? `Carteira do Consultor: ${consultorAtual.nome} (Linhas: ${consultorAtual.perfil_qtd_linhas_min} a ${consultorAtual.perfil_qtd_linhas_max})`
                  : consultorSelecionado === "nao_atribuidos"
                    ? "Serviços Não Atribuídos (Portabilidade)"
                    : "Todos os Serviços de Portabilidade"}
              </h2>
              <div className="w-80">
                <Select
                  onValueChange={handleConsultorChange}
                  disabled={isCarregandoConsultores}
                >
                  <SelectTrigger className="h-10 bg-background border-border shadow-sm text-foreground">
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
                    {/* Filtro também reflete apenas consultores elegíveis */}
                    {consultoresElegiveis.map((c) => (
                      <SelectItem
                        key={`filtro-${c.seq_consultor}`}
                        value={String(c.seq_consultor)}
                      >
                        {c.nome} (Min: {c.perfil_qtd_linhas_min} / Máx:{" "}
                        {c.perfil_qtd_linhas_max})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dadosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>Não há serviços de portabilidade para exibir.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="h-[350px] w-full border rounded-lg p-4 bg-muted/5 flex flex-col">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <Building2 size={16} /> Volume de Linhas por Empresa
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
                        />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip cursor={{ fill: "#88888811" }} />
                        <Bar
                          dataKey="linhas"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-md border relative shadow-sm scrollbar-thin [&>div]:max-h-[550px] [&>div]:overflow-y-auto">
                  <Table className="relative border-collapse">
                    <TableHeader className="sticky top-0 z-20 bg-muted shadow-[0_2px_2px_-1px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="bg-muted">Empresa</TableHead>
                        <TableHead className="bg-muted">CNPJ</TableHead>
                        {typeof consultorSelecionado !== "number" && (
                          <TableHead className="bg-muted">Consultor</TableHead>
                        )}
                        <TableHead className="text-center bg-muted">
                          Linhas
                        </TableHead>
                        <TableHead className="text-right bg-muted">
                          Fim Contrato
                        </TableHead>
                        <TableHead className="text-right bg-muted">
                          Última Leitura
                        </TableHead>
                        <TableHead className="text-center w-[120px] bg-muted">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosFiltrados.map((item) => {
                        const diffDias = calcularDiferencaDias(
                          item.dt_ultima_leitura,
                        );
                        return (
                          <TableRow
                            key={`row-${item.seq_empresa}-${item.seq_claro}`}
                          >
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {item.razao}
                            </TableCell>
                            <TableCell>{item.cnpj}</TableCell>
                            {typeof consultorSelecionado !== "number" && (
                              <TableCell className="text-muted-foreground">
                                {mapaConsultores.get(Number(item.seq_consultor))
                                  ?.textoExibicao || "Não Atribuído"}
                              </TableCell>
                            )}
                            <TableCell className="text-center font-bold text-blue-600">
                              {item.qtd_servico_claro}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatarDataApenasDia(item.dt_fim_contrato)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <span className="text-muted-foreground mr-2">
                                {formatarDataApenasDia(item.dt_ultima_leitura)}
                              </span>
                              {diffDias !== null && (
                                <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-xs">
                                  {diffDias === 0 ? "Hoje" : `${diffDias}d`}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-200 hover:bg-yellow-50 transition-colors"
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
            )}
          </div>
        </div>

        <DialogHistoricoPortabilidade
          open={modalHistoricoAberto}
          onOpenChange={setModalHistoricoAberto}
          empresaNome={empresaHistoricoNome}
          dadosHistorico={dadosHistorico}
          isCarregando={isCarregandoHistorico}
        />
      </main>
    </div>
  );
}
