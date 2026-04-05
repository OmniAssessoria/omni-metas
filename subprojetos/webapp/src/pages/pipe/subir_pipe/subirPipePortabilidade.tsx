import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
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
  CheckSquare,
  PieChart as PieChartIcon,
  UserPlus,
  Save,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ITelaDetalhesProps } from "../subirPipeGeral";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import API from "@/services/api";
import { useIntegracaoPipeRun } from "@/services/hookApiRun";

import DialogHistoricoPortabilidade, {
  IHistoricoEmpresa,
} from "@/components/historico_empresa_consultor/historico_portabilidade";
import { DadosServicoOperadora } from "@/interfaces/servico_operadora.interface";

// Interface para a tipagem dos consultores disponíveis vindos da nova rota
export interface IConsultorDisponivel {
  seq_consultor: number;
  nome: string;
  perfil_indicacao: string;
  perfil_qtd_linhas_min: number;
  perfil_qtd_linhas_max: number;
  carga_atual: number;
}

export function PipeSubirPortabilidade({ dados, onBack }: ITelaDetalhesProps) {
  // Estado local para permitir atualização otimista na tabela
  const [dadosLocais, setDadosLocais] = useState<any[]>([]);

  const [consultorSelecionado, setConsultorSelecionado] = useState<
    number | null | "nao_atribuidos"
  >(null);
  const [consultoresEnvio, setConsultoresEnvio] = useState<number[]>([]);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<number[]>([]);
  const [limiteEnvio, setLimiteEnvio] = useState<number | "">("");
  const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
  const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);

  // Estados do Histórico
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [empresaHistoricoNome, setEmpresaHistoricoNome] = useState("");
  const [dadosHistorico, setDadosHistorico] = useState<IHistoricoEmpresa[]>([]);
  const [isCarregandoHistorico, setIsCarregandoHistorico] = useState(false);

  // Estados da Modal de Linhas
  const [modalLinhasAberto, setModalLinhasAberto] = useState(false);
  const [empresaLinhasNome, setEmpresaLinhasNome] = useState("");
  const [dadosLinhas, setDadosLinhas] = useState<DadosServicoOperadora[]>([]);
  const [isCarregandoLinhas, setIsCarregandoLinhas] = useState(false);

  // =========================================================================
  // NOVOS ESTADOS: Modal de Atribuição Manual de Consultor
  // =========================================================================
  const [modalAtribuicaoAberto, setModalAtribuicaoAberto] = useState(false);
  const [empresaAtribuicao, setEmpresaAtribuicao] = useState<{
    seq: number;
    nome: string;
  } | null>(null);
  const [consultoresDisponiveis, setConsultoresDisponiveis] = useState<IConsultorDisponivel[]>([]);
  const [isCarregandoConsultoresDisponiveis, setIsCarregandoConsultoresDisponiveis] = useState(false);
  const [consultorSelecionadoAtribuicao, setConsultorSelecionadoAtribuicao] = useState<string>("");
  const [isSalvandoAtribuicao, setIsSalvandoAtribuicao] = useState(false);

  const hashConsultores = "e015a67d-bab4-403a-a0f6-5b2cfbc35ebe";
  const { handleSubirServicos, isEnviando } = useIntegracaoPipeRun();

  // Sincroniza as props iniciais com o estado local para edições in-memory
  useEffect(() => {
    if (Array.isArray(dados)) {
      setDadosLocais(dados);
    }
  }, [dados]);

  // Utilitários de Data
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
        } catch (e) { }

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
          } catch (e) { }
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
      return perfil === "PORTABILIDADE" || perfil === "AMBOS" || perfil === "CARTEIRA";
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

  const handleToggleEmpresa = (seq_empresa: number) => {
    setEmpresasSelecionadas((prev) =>
      prev.includes(seq_empresa)
        ? prev.filter((id) => id !== seq_empresa)
        : [...prev, seq_empresa],
    );
  };

  const handleToggleTodasEmpresas = (checked: boolean) => {
    if (checked) {
      const todosIds = dadosFiltrados.map((item) => item.seq_empresa);
      setEmpresasSelecionadas((prev) =>
        Array.from(new Set([...prev, ...todosIds])),
      );
    } else {
      const idsPaginaAtual = dadosFiltrados.map((item) => item.seq_empresa);
      setEmpresasSelecionadas((prev) =>
        prev.filter((id) => !idsPaginaAtual.includes(id)),
      );
    }
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

  const abrirModalLinhas = async (seq_empresa: number, razao: string) => {
    setEmpresaLinhasNome(razao);
    setModalLinhasAberto(true);
    setIsCarregandoLinhas(true);
    setDadosLinhas([]);

    try {
      const response = await API.get(`/api/servico-operadora/${seq_empresa}`);
      if (response.data) {
        setDadosLinhas(response.data.dados);
      }
    } catch (error) {
      console.error("Erro ao buscar informações das linhas:", error);
    } finally {
      setIsCarregandoLinhas(false);
    }
  };

  // =========================================================================
  // FUNÇÕES DA NOVA MODAL DE ATRIBUIÇÃO (CONTEXTO: PORTABILIDADE)
  // =========================================================================

  const abrirModalAtribuicao = async (seq_empresa: number, razao: string) => {
    setEmpresaAtribuicao({ seq: seq_empresa, nome: razao });
    setConsultorSelecionadoAtribuicao("");
    setConsultoresDisponiveis([]);
    setModalAtribuicaoAberto(true);
    setIsCarregandoConsultoresDisponiveis(true);

    try {
      // Diferença principal: Passamos o contexto indicacao=PORTABILIDADE para a API
      const response = await API.get(
        `/api/consultor/disponiveis/empresa/${seq_empresa}?indicacao=PORTABILIDADE`
      );
      if (response.data && response.data.dados) {
        setConsultoresDisponiveis(response.data.dados);
      }
    } catch (error) {
      console.error("Erro ao buscar consultores disponíveis:", error);
      alert("Falha ao buscar consultores disponíveis para esta empresa.");
    } finally {
      setIsCarregandoConsultoresDisponiveis(false);
    }
  };

  const salvarNovaAtribuicao = async () => {
    if (!empresaAtribuicao || !consultorSelecionadoAtribuicao) {
      alert("Por favor, selecione um consultor da lista.");
      return;
    }

    setIsSalvandoAtribuicao(true);
    try {
      await API.put(`/api/consultor/empresa/${empresaAtribuicao.seq}`, {
        seq_consultor: Number(consultorSelecionadoAtribuicao),
      });
      setDadosLocais((prev) =>
        prev.map((item) =>
          item.seq_empresa === empresaAtribuicao.seq
            ? { ...item, seq_consultor: Number(consultorSelecionadoAtribuicao) }
            : item
        )
      );
      setModalAtribuicaoAberto(false);
      console.log(`[Sucesso] Consultor alterado para a empresa ${empresaAtribuicao.nome}`);
    } catch (error: any) {
      console.error("Erro ao atribuir novo consultor:", error);
      alert(error.response?.data?.mensagem || "Ocorreu um erro ao salvar o novo consultor. Tente novamente.");
    } finally {
      setIsSalvandoAtribuicao(false);
    }
  };

  const consultorAtual = useMemo(
    () => consultores.find((c) => c.seq_consultor === consultorSelecionado),
    [consultores, consultorSelecionado],
  );

  const dadosFiltrados = useMemo(() => {
    if (!Array.isArray(dadosLocais)) return [];
    if (consultorSelecionado === null) return dadosLocais;
    if (consultorSelecionado === "nao_atribuidos") {
      return dadosLocais.filter((item) => !item.seq_consultor);
    }
    return dadosLocais.filter((item) => item.seq_consultor === consultorSelecionado);
  }, [dadosLocais, consultorSelecionado]);

  const dadosGrafico = useMemo(() => {
    if (consultorSelecionado === null) {
      const contagem = new Map<string | number, { nome: string; valor: number }>();
      consultoresElegiveis.forEach((c) => {
        contagem.set(c.seq_consultor, {
          nome: c.nome,
          valor: 0,
        });
      });

      let qtdNaoAtribuidos = 0;

      dadosFiltrados.forEach((item) => {
        if (item.seq_consultor) {
          if (contagem.has(item.seq_consultor)) {
            contagem.get(item.seq_consultor)!.valor += 1;
          } else {
            const nomeConsultor = mapaConsultores.get(Number(item.seq_consultor))?.nome || `Consultor ${item.seq_consultor}`;
            contagem.set(item.seq_consultor, { nome: nomeConsultor, valor: 1 });
          }
        } else {
          qtdNaoAtribuidos += 1;
        }
      });

      const arrayGrafico = Array.from(contagem.values()).sort((a, b) => b.valor - a.valor);
      if (qtdNaoAtribuidos > 0) {
        arrayGrafico.push({ nome: "Não Atribuídos", valor: qtdNaoAtribuidos });
      }
      return arrayGrafico.map((item) => ({
        chave_x: item.nome,
        valor_y: item.valor,
        tooltip_label: "Serviços Atribuídos",
      }));
    }

    return dadosFiltrados.map((item) => ({
      chave_x: item.razao || "Empresa sem Razão",
      valor_y: typeof item.qtd_servico_claro === "number" ? item.qtd_servico_claro : 0,
      tooltip_label: "Linhas Ativas",
      cnpj: item.cnpj || "N/D",
    }));
  }, [dadosFiltrados, consultorSelecionado, consultoresElegiveis, mapaConsultores]);

  const totalServicosGeral = useMemo(() => {
    if (!Array.isArray(dadosLocais)) return 0;
    return dadosLocais.length;
  }, [dadosLocais]);

  const totalServicosFiltrados = useMemo(() => {
    return dadosFiltrados.length;
  }, [dadosFiltrados]);

  const dadosGraficoPizza = useMemo(() => {
    const COR_AZUL = "#3b82f6";
    const COR_BRANCO = "#ffffff";

    if (consultorSelecionado === null) {
      return [
        {
          name: "Total Portabilidade",
          value: totalServicosGeral,
          color: COR_AZUL,
        },
      ];
    } else {
      const restante = totalServicosGeral - totalServicosFiltrados;
      return [
        {
          name: "Consultor Selecionado",
          value: totalServicosFiltrados,
          color: COR_AZUL,
        },
        {
          name: "Demais Consultores/Serviços",
          value: restante > 0 ? restante : 0,
          color: COR_BRANCO,
        },
      ];
    }
  }, [consultorSelecionado, totalServicosGeral, totalServicosFiltrados]);

  const todasEmpresasAtuaisSelecionadas = useMemo(() => {
    if (dadosFiltrados.length === 0) return false;
    return dadosFiltrados.every((item) =>
      empresasSelecionadas.includes(item.seq_empresa),
    );
  }, [dadosFiltrados, empresasSelecionadas]);

  const onClickSubirServicos = () => {
    handleSubirServicos({
      tipoOperacao: "Portabilidade",
      hashFunil: hashConsultores,
      dadosGlobais: dadosLocais,
      consultoresEnvio: consultoresEnvio,
      empresasEnvio: empresasSelecionadas,
      limiteEnvio: limiteEnvio,
      onSuccessCb: () => {
        setConsultoresEnvio([]);
        setEmpresasSelecionadas([]);
        setLimiteEnvio("");
      },
    });
  };

  const isBotaoEnvioHabilitado =
    consultoresEnvio.length > 0 || empresasSelecionadas.length > 0;

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
            {(consultoresEnvio.length > 0 ||
              empresasSelecionadas.length > 0) && (
                <div className="flex flex-wrap justify-end gap-2 max-w-lg">
                  {consultoresEnvio.map((id) => {
                    const nomeConsultor = mapaConsultores.get(id)?.nome || "Desconhecido";
                    const totalDoConsultor = dadosLocais.filter((item) => item.seq_consultor === id).length;
                    const qtdParaEnviar = typeof limiteEnvio === "number" && limiteEnvio > 0
                      ? limiteEnvio
                      : totalDoConsultor;

                    return (
                      <span
                        key={`badge-consultor-${id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 pl-3 pr-1 py-1 text-sm text-blue-700 shadow-sm"
                      >
                        <Users size={14} className="opacity-70" />
                        <span className="font-semibold">{nomeConsultor}</span>
                        <span
                          className="flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-blue-900 rounded-full shadow-sm min-w-[24px]"
                          title="Quantidade de serviços que serão enviados ao Pipe"
                        >
                          {qtdParaEnviar}
                        </span>

                        <button
                          onClick={() => handleRemoverConsultorEnvio(id)}
                          className="p-1 ml-1 transition-colors rounded-full hover:bg-red-100 hover:text-red-700 text-blue-400"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    );
                  })}

                  {empresasSelecionadas.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 shadow-sm">
                      <CheckSquare size={14} />
                      {empresasSelecionadas.length} Empresa(s) Selecionada(s)
                      <button
                        onClick={() => setEmpresasSelecionadas([])}
                        className="p-0.5 transition-colors rounded-full hover:bg-emerald-200"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  )}
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
                          : "Adicionar Lote (Por Consultor)"
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
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <Button
                onClick={onClickSubirServicos}
                disabled={!isBotaoEnvioHabilitado || isEnviando}
                className="h-10 px-6 font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
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
            <div className="flex items-center gap-2 pb-4">
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="h-[350px] lg:col-span-2 border rounded-lg p-4 bg-muted/5 flex flex-col shadow-sm">
                    <h3 className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                      {consultorSelecionado === null ? (
                        <>
                          <Users size={16} /> Volume de Serviços por Consultor
                        </>
                      ) : (
                        <>
                          <Building2 size={16} /> Volume de Linhas por Empresa
                        </>
                      )}
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
                            stroke="#ffffff"
                            opacity={0.1}
                          />
                          <XAxis
                            dataKey="chave_x"
                            tick={{ fontSize: 12 }}
                            hide={dadosGrafico.length > 20}
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            cursor={{ fill: "#fff6f66b" }}
                            formatter={(value, name, props) => [
                              value,
                              props.payload.tooltip_label
                            ]}
                          />
                          <Bar
                            dataKey="valor_y"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="h-[350px] lg:col-span-1 border rounded-lg p-4 bg-muted/5 flex flex-col items-center relative shadow-sm">
                    <h3 className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground w-full">
                      <PieChartIcon size={16} /> Distribuição de Serviços
                      (Portabilidade)
                    </h3>

                    <div className="relative flex-1 w-full flex items-center justify-center min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dadosGraficoPizza}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={105}
                            dataKey="value"
                            stroke="none"
                            paddingAngle={dadosGraficoPizza.length > 1 ? 3 : 0}
                          >
                            {dadosGraficoPizza.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [
                              `${value} serviços`,
                              "Quantidade",
                            ]}
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-4xl font-extrabold text-foreground tracking-tight">
                          {totalServicosFiltrados}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium text-center px-2 mt-1">
                          {consultorSelecionado
                            ? "Serviços do Filtro"
                            : "Total de Serviços"}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center gap-6 mt-2 w-full pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm"></div>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {consultorSelecionado ? "Filtrado" : "Total Geral"}
                        </span>
                      </div>
                      {consultorSelecionado !== null && (
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full bg-white border border-border shadow-sm"></div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Demais
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative border shadow-sm rounded-md scrollbar-thin [&>div]:max-h-[550px] [&>div]:overflow-y-auto">
                  <Table className="relative border-collapse">
                    <TableHeader className="sticky top-0 z-20 bg-muted shadow-[0_2px_2px_-1px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[40px] bg-muted flex-shrink-0">
                          <Checkbox
                            checked={todasEmpresasAtuaisSelecionadas}
                            onCheckedChange={handleToggleTodasEmpresas}
                            aria-label="Selecionar todas as empresas desta página"
                            className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                          />
                        </TableHead>
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
                          item.dt_ultima_leitura,
                        );
                        const isSelecionada = empresasSelecionadas.includes(
                          item.seq_empresa,
                        );

                        return (
                          <TableRow
                            key={`row-${item.seq_empresa}-${item.seq_claro}`}
                            className={
                              isSelecionada
                                ? "bg-emerald-50/50 hover:bg-emerald-50/80"
                                : ""
                            }
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelecionada}
                                onCheckedChange={() =>
                                  handleToggleEmpresa(item.seq_empresa)
                                }
                                aria-label={`Selecionar ${item.razao}`}
                                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                              />
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate font-medium">
                              {item.razao}
                            </TableCell>
                            <TableCell>{item.cnpj}</TableCell>
                            {typeof consultorSelecionado !== "number" && (
                              <TableCell className="text-white">
                                {mapaConsultores.get(Number(item.seq_consultor))
                                  ?.textoExibicao || "Não Atribuído"}
                              </TableCell>
                            )}
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  abrirModalLinhas(
                                    item.seq_empresa,
                                    item.razao || "Empresa Desconhecida",
                                  )
                                }
                                className="h-8 px-3 font-bold text-blue-600 transition-colors rounded-full hover:bg-blue-100 hover:text-blue-800"
                              >
                                {item.qtd_servico_claro}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right text-white">
                              {formatarDataApenasDia(item.dt_fim_contrato)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              <span className="mr-2 text-white">
                                {formatarDataApenasDia(item.dt_ultima_leitura)}
                              </span>
                              {diffDias !== null && (
                                <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-xs">
                                  {diffDias === 0 ? "Hoje" : `${diffDias}d`}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="px-2 transition-colors border-blue-200 text-blue-600 hover:bg-blue-50"
                                  title="Histórico"
                                  onClick={() =>
                                    abrirHistorico(
                                      item.seq_empresa,
                                      item.razao || "Empresa Desconhecida",
                                    )
                                  }
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="px-2 transition-colors border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                  title="Alterar Consultor Manualmente"
                                  onClick={() =>
                                    abrirModalAtribuicao(
                                      item.seq_empresa,
                                      item.razao || "Empresa Desconhecida",
                                    )
                                  }
                                >
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                              </div>
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
          <DialogContent className="sm:max-w-6xl w-[95vw] max-h[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background [&>button.absolute]:hidden">
            <div className="p-6 border-b border-border bg-muted/10 shrink-0 flex items-start justify-between">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
                  <Smartphone className="w-6 h-6 text-white" />
                  Detalhamento das Linhas
                </DialogTitle>
                <DialogDescription className="text-base font-medium text-white mt-2">
                  Empresa:{" "}
                  <span className="font-extrabold text-blue-700">
                    {empresaLinhasNome}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-white hover:bg-muted hover:text-white"
                onClick={() => setModalLinhasAberto(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto relative">
              {isCarregandoLinhas ? (
                <div className="flex flex-col items-center justify-center py-12 h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-white mb-4" />
                  <p className="text-blue-700 font-bold text-lg">
                    Carregando informações das linhas...
                  </p>
                </div>
              ) : dadosLinhas.length === 0 ? (
                <div className="bg-muted/30 p-10 rounded-lg text-center border border-dashed border-border mt-4">
                  <Smartphone className="w-10 h-10 text-white mx-auto mb-3 opacity-80" />
                  <p className="text-blue-700 font-bold text-lg">
                    Nenhuma informação de linha encontrada para esta empresa.
                  </p>
                </div>
              ) : (
                <div className="border border-border rounded-lg shadow-sm w-full bg-card">
                  <Table className="relative border-collapse w-full">
                    <TableHeader className="sticky top-0 z-10 shadow-sm bg-muted ring-1 ring-border/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-white py-3">
                          Número
                        </TableHead>
                        <TableHead className="font-bold text-white py-3">
                          Operadora
                        </TableHead>
                        <TableHead className="font-bold text-white py-3">
                          Plano
                        </TableHead>
                        <TableHead className="font-bold text-white py-3">
                          Valor
                        </TableHead>
                        <TableHead className="font-bold text-white py-3">
                          Bônus
                        </TableHead>
                        <TableHead className="font-bold text-right text-white py-3">
                          Fim Compromisso
                        </TableHead>
                        <TableHead className="font-bold text-center text-white py-3">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosLinhas.map((linha, index) => (
                        <TableRow
                          key={`linha-${linha.seq_servico_operadora || index}`}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="font-bold tracking-wide py-3 text-blue-700">
                            {formatarTelefone(linha.numero_linha)}
                          </TableCell>
                          <TableCell className="py-3">
                            <span
                              className={`font-bold text-xs px-2.5 py-1 rounded-md ${linha.tipo_servico === "CLARO"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : linha.tipo_servico === "VIVO"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-muted text-white border border-border"
                                }`}
                            >
                              {linha.tipo_servico}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 font-medium text-white">
                            {linha.plano || "-"}
                          </TableCell>
                          <TableCell className="font-bold text-white py-3">
                            {formatarMoedaBRL(linha.valor)}
                          </TableCell>
                          <TableCell className="font-medium text-white py-3">
                            {linha.bonus || "-"}
                          </TableCell>
                          <TableCell className="text-right py-3 font-medium text-white">
                            {formatarDataApenasDia(linha.dt_fim_compromisso)}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${linha.linha_ativa
                                  ? "bg-green-500"
                                  : "bg-red-500"
                                  }`}
                                title={linha.linha_ativa ? "Ativa" : "Inativa"}
                              />
                              <span className="text-sm font-bold text-white text-left">
                                {linha.linha_ativa ? "Ativa" : "Inativa"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ===================================================================== */}
        {/* NOVA MODAL: ATRIBUIR CONSULTOR MANUALMENTE */}
        {/* ===================================================================== */}
        <Dialog open={modalAtribuicaoAberto} onOpenChange={setModalAtribuicaoAberto}>
          <DialogContent className="sm:max-w-xl bg-background border border-border rounded-xl">
            <DialogHeader className="pb-4 border-b border-border">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Atribuir Consultor Manualmente
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                Empresa: <strong className="text-white">{empresaAtribuicao?.nome}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col gap-4">
              {isCarregandoConsultoresDisponiveis ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                  <span className="text-sm text-muted-foreground">Calculando consultores elegíveis com base na carga...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">
                      Selecione um Consultor Disponível
                    </label>
                    <Select
                      onValueChange={setConsultorSelecionadoAtribuicao}
                      value={consultorSelecionadoAtribuicao}
                      disabled={consultoresDisponiveis.length === 0}
                    >
                      <SelectTrigger className="w-full bg-muted/50 border-border focus:ring-blue-500 text-white h-12">
                        <SelectValue placeholder={consultoresDisponiveis.length === 0 ? "Nenhum consultor atende aos critérios" : "Escolha na lista..."} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {consultoresDisponiveis.map((c) => (
                          <SelectItem key={`atribuicao-${c.seq_consultor}`} value={String(c.seq_consultor)}>
                            <div className="flex justify-between items-center w-[400px]">
                              <span className="font-semibold">{c.nome}</span>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Carga: {c.carga_atual}</span>
                                <span className="bg-muted px-2 py-1 rounded">Min: {c.perfil_qtd_linhas_min} | Máx: {c.perfil_qtd_linhas_max}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {consultoresDisponiveis.length === 0 && !isCarregandoConsultoresDisponiveis && (
                    <div className="p-4 border rounded-md bg-red-500/10 border-red-500/20">
                      <p className="text-sm font-medium text-red-400">A lógica de distribuição não encontrou nenhum consultor compatível com a carga de linhas desta empresa para Portabilidade.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setModalAtribuicaoAberto(false)}
                disabled={isSalvandoAtribuicao}
                className="text-white hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                onClick={salvarNovaAtribuicao}
                disabled={isSalvandoAtribuicao || !consultorSelecionadoAtribuicao || consultoresDisponiveis.length === 0}
                className="font-semibold text-white bg-blue-600 min-w-[120px] hover:bg-blue-700"
              >
                {isSalvandoAtribuicao ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Salvar Atribuição
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}