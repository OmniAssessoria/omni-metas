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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  UploadCloud,
  Loader2,
  Building2,
  LayoutList,
  X,
  History,
  Smartphone,
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

// 1. Definição da interface fornecida
export interface DadosServicoOperadora {
  seq_servico_operadora: number;
  seq_empresa: number;
  tipo_servico: "CLARO" | "VIVO";
  dt_fim_compromisso: string;
  numero_linha: number;
  plano: string;
  valor: string;
  bonus: string;
  linha_ativa: boolean;
}

export function PipeSubirPortabilidade({ dados, onBack }: ITelaDetalhesProps) {
  const [consultorSelecionado, setConsultorSelecionado] = useState<
    number | null | "nao_atribuidos"
  >(null);
  const [consultoresEnvio, setConsultoresEnvio] = useState<number[]>([]);
  const [limiteEnvio, setLimiteEnvio] = useState<number | "">("");
  const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
  const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);

  // Estados do Histórico
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [empresaHistoricoNome, setEmpresaHistoricoNome] = useState("");
  const [dadosHistorico, setDadosHistorico] = useState<IHistoricoEmpresa[]>([]);
  const [isCarregandoHistorico, setIsCarregandoHistorico] = useState(false);

  // 2. Estados da nova Modal de Linhas
  const [modalLinhasAberto, setModalLinhasAberto] = useState(false);
  const [empresaLinhasNome, setEmpresaLinhasNome] = useState("");
  const [dadosLinhas, setDadosLinhas] = useState<DadosServicoOperadora[]>([]);
  const [isCarregandoLinhas, setIsCarregandoLinhas] = useState(false);

  const hashConsultores = "e015a67d-bab4-403a-a0f6-5b2cfbc35ebe";
  const { handleSubirServicos, isEnviando } = useIntegracaoPipeRun();

  // Utilitários de Data
  const formatarDataApenasDia = (
    dataString: string | Date | undefined | null
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
    dataString: string | Date | undefined | null
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

  const formatarTelefone = (numero: number | string) => {
    if (!numero) return "Não informado";
    const str = String(numero).replace(/\D/g, "");
    if (str.length === 11) {
      return `+55 (${str.substring(0, 2)}) ${str.substring(2, 7)}-${str.substring(7)}`;
    } else if (str.length === 10) {
      return `+55 (${str.substring(0, 2)}) ${str.substring(2, 6)}-${str.substring(6)}`;
    }
    return `+55 ${str}`;
  };

  const formatarMoedaBRL = (valor: string | number) => {
    if (!valor) return "R$ 0,00";
    const num = typeof valor === "string" ? parseFloat(valor) : valor;
    if (isNaN(num)) return "R$ 0,00";
    return num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
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
        `/api/consultor/historico/empresa/${seq_empresa}`
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

  const abrirModalLinhas = async (seq_empresa: number, razao: string) => {
    setEmpresaLinhasNome(razao);
    setModalLinhasAberto(true);
    setIsCarregandoLinhas(true);
    setDadosLinhas([]);

    try {
      const response = await API.get(`/api/servico-operadora/${seq_empresa}`);
      console.log(response)
      if (response.data) {
        setDadosLinhas(response.data.dados);
      }
    } catch (error) {
      console.error("Erro ao buscar informações das linhas:", error);
    } finally {
      setIsCarregandoLinhas(false);
    }
  };

  const consultorAtual = useMemo(
    () => consultores.find((c) => c.seq_consultor === consultorSelecionado),
    [consultores, consultorSelecionado]
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
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="flex-shrink-0 w-[280px] h-full border-r border-border">
        <Sidebar />
      </div>

      <main className="relative flex-1 h-full p-10 overflow-y-auto bg-muted/10">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 -ml-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel Geral
        </Button>

        <header className="flex flex-col gap-4 mb-8 md:flex-row md:items-start justify-between">
          <div className="mt-2">
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
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
                    {mapaConsultores.get(id)?.textoExibicao || "Desconhecido"}
                    <button
                      onClick={() => handleRemoverConsultorEnvio(id)}
                      className="p-0.5 transition-colors rounded-full hover:bg-blue-200"
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
                  <SelectTrigger className="h-10 shadow-sm bg-background border-border text-foreground">
                    <SelectValue
                      placeholder={
                        isCarregandoConsultores
                          ? "Carregando..."
                          : "Adicionar para Envio"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
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
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <Button
                onClick={onClickSubirServicos}
                disabled={consultoresEnvio.length === 0 || isEnviando}
                className="h-10 px-6 font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {isEnviando ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4 mr-2" />
                )}
                {isEnviando ? "Processando..." : "Subir Serviços"}
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="p-6 border rounded-xl border-border bg-background shadow-sm">
            <div className="flex items-center gap-2 pb-4 mb-6 border-b">
              {consultorSelecionado ? (
                <Users size={20} className="text-blue-500" />
              ) : (
                <LayoutList size={20} className="text-blue-500" />
              )}
              <h2 className="flex-1 text-lg font-semibold">
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
                  <SelectTrigger className="h-10 shadow-sm bg-background border-border text-foreground">
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
                  <h3 className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
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

                <div className="relative border shadow-sm rounded-md scrollbar-thin [&>div]:max-h-[550px] [&>div]:overflow-y-auto">
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
                        <TableHead className="w-[120px] text-center bg-muted">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosFiltrados.map((item) => {
                        const diffDias = calcularDiferencaDias(
                          item.dt_ultima_leitura
                        );
                        return (
                          <TableRow
                            key={`row-${item.seq_empresa}-${item.seq_claro}`}
                          >
                            <TableCell className="max-w-[200px] truncate font-medium">
                              {item.razao}
                            </TableCell>
                            <TableCell>{item.cnpj}</TableCell>
                            {typeof consultorSelecionado !== "number" && (
                              <TableCell className="text-muted-foreground">
                                {mapaConsultores.get(Number(item.seq_consultor))
                                  ?.textoExibicao || "Não Atribuído"}
                              </TableCell>
                            )}
                            {/* 5. Transformando a quantidade de linhas em botão */}
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  abrirModalLinhas(
                                    item.seq_empresa,
                                    item.razao || "Empresa Desconhecida"
                                  )
                                }
                                className="h-8 px-3 font-bold text-blue-600 transition-colors rounded-full hover:bg-blue-100 hover:text-blue-800"
                              >
                                {item.qtd_servico_claro}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatarDataApenasDia(item.dt_fim_contrato)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              <span className="mr-2 text-muted-foreground">
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
                                className="transition-colors border-blue-200 text-blue-600 hover:bg-yellow-50"
                                onClick={() =>
                                  abrirHistorico(
                                    item.seq_empresa,
                                    item.razao || "Empresa Desconhecida"
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

        <Dialog open={modalLinhasAberto} onOpenChange={setModalLinhasAberto}>
          <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col overflow-hidden bg-background">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-blue-700">
                <Smartphone className="w-6 h-6" />
                Detalhamento das Linhas - {empresaLinhasNome}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 px-1 overflow-y-auto scrollbar-thin">
              {isCarregandoLinhas ? (
                <div className="flex flex-col items-center justify-center py-12 text-blue-600">
                  <Loader2 className="w-8 h-8 mb-4 animate-spin" />
                  <p className="font-medium">Carregando informações das linhas...</p>
                </div>
              ) : dadosLinhas.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>Nenhuma informação de linha encontrada para esta empresa.</p>
                </div>
              ) : (
                <Table className="relative border-collapse">
                  <TableHeader className="sticky top-0 z-10 shadow-sm bg-muted ring-1 ring-border/50">
                    <TableRow>
                      <TableHead className="font-semibold text-blue-800 bg-blue-50/50">
                        Número
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 bg-blue-50/50">
                        Operadora
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 bg-blue-50/50">
                        Plano
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 bg-blue-50/50">
                        Valor
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 bg-blue-50/50">
                        Bônus
                      </TableHead>
                      <TableHead className="font-semibold text-right text-blue-800 bg-blue-50/50">
                        Fim Compromisso
                      </TableHead>
                      <TableHead className="font-semibold text-center text-blue-800 bg-blue-50/50">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosLinhas.map((linha, index) => (
                      <TableRow
                        key={`linha-${linha.seq_servico_operadora || index}`}
                        className="hover:bg-blue-50/30"
                      >
                        <TableCell className="font-medium tracking-wide">
                          {formatarTelefone(linha.numero_linha)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-bold text-xs px-2 py-1 rounded-full ${
                              linha.tipo_servico === "CLARO"
                                ? "bg-red-100 text-red-700"
                                : linha.tipo_servico === "VIVO"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {linha.tipo_servico}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {linha.plano || "-"}
                        </TableCell>
                        <TableCell className="font-semibold text-muted-foreground">
                          {formatarMoedaBRL(linha.valor)}
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate text-muted-foreground">
                          {linha.bonus || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatarDataApenasDia(linha.dt_fim_compromisso)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`w-3 h-3 rounded-full shadow-sm ${
                                linha.linha_ativa
                                  ? "bg-green-500 shadow-green-200"
                                  : "bg-red-500 shadow-red-200"
                              }`}
                              title={linha.linha_ativa ? "Ativa" : "Inativa"}
                            />
                            <span className="text-sm text-muted-foreground w-[45px]">
                              {linha.linha_ativa ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}