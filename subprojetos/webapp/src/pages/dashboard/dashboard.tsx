import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  RefreshCcw,
  History,
  BarChart2,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  FileText,
  FileCode2,
  X,
  RotateCw,
  Target,
  Search,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import API from "@/services/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import {
  IApiResponseView,
  IServicoViewAPI,
} from "@/interfaces/servico_view_dashboard.interface";
import { IHistoricoViewAPI } from "@/interfaces/historico_view_dashboard.interface";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import {
  DadosPorIndicacao,
  TipoAtivoFilter,
  TipoCarteiraFilter,
  TipoClassificacaoFilter,
  TipoFiltroLinha,
  TipoPiperunFilter,
  TipoSituacaoFilter,
} from "../../interfaces/dashboard.type";
import {
  compilarRelatorioPerdas,
  compilarOportunidadesDinamico,
} from "@/services/hookApiRunTotalServicoConsultor";
import { IConsultor } from "@/interfaces/pipeRunOportunidades.interface";

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
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [modalExportacaoAberto, setModalExportacaoAberto] = useState<
    "servicos" | "historico" | null
  >(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [dadosBrutos, setDadosBrutos] = useState<DadosPorIndicacao>({
    renovacao: [],
    portabilidade: [],
    fora_prazo: [],
    aquecendo: [],
    prazo_limitado: [],
    prazo_excedido: [],
  });

  const [dadosFiltrados, setDadosFiltrados] = useState<DadosPorIndicacao>({
    renovacao: [],
    portabilidade: [],
    fora_prazo: [],
    aquecendo: [],
    prazo_limitado: [],
    prazo_excedido: [],
  });
  const [filtroSituacao, setFiltroSituacao] =
    useState<TipoSituacaoFilter>("TODOS");
  const [filtroCarteira, setFiltroCarteira] =
    useState<TipoCarteiraFilter>("AMBOS");
  const [filtroPiperun, setFiltroPiperun] =
    useState<TipoPiperunFilter>("AMBOS");
  const [filtroAtivo, setFiltroAtivo] = useState<TipoAtivoFilter>("TODOS");

  const [filtroExclusivo, setFiltroExclusivo] = useState<
    "TODOS" | "SIM" | "NAO"
  >("TODOS");

  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [filtroDDD, setFiltroDDD] = useState<string>("TODOS");
  const [filtroConsultor, setFiltroConsultor] = useState<string>("TODOS");
  const [filtroClassificacao, setFiltroClassificacao] =
    useState<TipoClassificacaoFilter>("TODOS");
  const [tipoFiltroLinha, setTipoFiltroLinha] =
    useState<TipoFiltroLinha>("NONE");
  const [filtroLinhasRangeMin, setFiltroLinhasRangeMin] = useState(0);
  const [filtroLinhasRangeMax, setFiltroLinhasRangeMax] = useState(100);
  const [filtroLinhasExact, setFiltroLinhasExact] = useState(0);
  const [isLinhasMaxInitialized, setIsLinhasMaxInitialized] = useState(false);
  const [filtroCpcAtivo, setFiltroCpcAtivo] = useState(false);
  const [filtroCpcValor, setFiltroCpcValor] = useState(30);
  const [historicoBruto, setHistoricoBruto] = useState<IHistoricoViewAPI[]>([]);
  const [historicoFiltrado, setHistoricoFiltrado] = useState<
    IHistoricoViewAPI[]
  >([]);
  const [filtroHistConsultor, setFiltroHistConsultor] =
    useState<string>("TODOS");
  const [filtroHistMotivo, setFiltroHistMotivo] = useState<string>("TODOS");
  const [consultoresDB, setConsultoresDB] = useState<ConsultorBD[]>([]);
  const [dadosPipelineBolhas, setDadosPipelineBolhas] = useState<any[]>([]);
  const [loadingBolhas, setLoadingBolhas] = useState<boolean>(false);
  const [dataInicioPipe, setDataInicioPipe] = useState<string>("");
  const [dataFimPipe, setDataFimPipe] = useState<string>("");
  const [dadosPerdas, setDadosPerdas] = useState<any[]>([]);
  const [loadingPerdas, setLoadingPerdas] = useState<boolean>(false);
  const [dadosFunilCpc, setDadosFunilCpc] = useState<any>(null);
  const [viewModePerdas, setViewModePerdas] = useState<"grafico" | "tabela">(
    "grafico",
  );

  const CORES = {
    renovacao: "#eab308",
    portabilidade: "#3b82f6",
    fora_prazo: "#ef4444",
    aquecendo: "#0ea5e9",
    prazo_limitado: "#f97316",
    prazo_excedido: "#8b5cf6",
    vazio: "#e5e7eb",
    grafico_barras_1: "#8b5cf6",
    grafico_barras_2: "#10b981",
    grafico_barras_3: "#f43f5e",
    carteira_pipe: "#10b981",
    declinio: "#ef4444",
    sucesso: "#10b981",
  };

  const calcularMesesAtivosContrato = (
    dataFimString?: string | null,
  ): number | null => {
    if (!dataFimString) return null;
    const dataFim = new Date(dataFimString);
    if (isNaN(dataFim.getTime())) return null;

    const hoje = new Date();

    const diffAnos = hoje.getFullYear() - dataFim.getFullYear();
    const diffMeses = hoje.getMonth() - dataFim.getMonth();

    return diffAnos * 12 + diffMeses + 24;
  };

  const fetchTodasViews = useCallback(async () => {
    setLoading(true);
    try {
      const [resRenov, resPort, resFora, resLim, resExc, resHist, resFunil] =
        await Promise.all([
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
          API.get<IApiResponseView>("/api/servico-claro/dashboard/historico"),
          API.get<any>("/api/servico-claro/dashboard/empresas"),
        ]);

      const prepararDados = (lista: any[]) => {
        return lista.map((item) => {
          const isExclusivoReal =
            item.exclusivo === true ||
            item.exclusivo === "true" ||
            item.exclusivo === "t" ||
            item.exclusivo === 1;
          return {
            ...item,
            ddd_predominante: item.ddd_predominante
              ? String(item.ddd_predominante).trim()
              : "00",
            exclusivo: isExclusivoReal,
          };
        });
      };

      const baseForaPrazoBruta = prepararDados(resFora.data.dados || []);

      const arrayForaPrazoReal: IServicoViewAPI[] = [];
      const arrayAquecendo: IServicoViewAPI[] = [];

      baseForaPrazoBruta.forEach((item) => {
        const mesesAtivos = calcularMesesAtivosContrato(item.dt_fim_contrato);

        let offsetRenovacao = 0;
        if (["CA", "CC", "CE"].includes(item.classificacao_contrato)) {
          offsetRenovacao = 2;
        }

        const mesAlvoAquecimento = 15 + offsetRenovacao;

        if (mesesAtivos !== null && mesesAtivos === mesAlvoAquecimento) {
          item.indicacao = "AQUECENDO";
          arrayAquecendo.push(item);
        } else {
          arrayForaPrazoReal.push(item);
        }
      });

      const payloadServicos: DadosPorIndicacao = {
        renovacao: prepararDados(resRenov.data.dados || []),
        portabilidade: prepararDados(resPort.data.dados || []),
        fora_prazo: arrayForaPrazoReal,
        aquecendo: arrayAquecendo,
        prazo_limitado: prepararDados(resLim.data.dados || []),
        prazo_excedido: prepararDados(resExc.data.dados || []),
      };

      const payloadHistorico: IHistoricoViewAPI[] = resHist.data.dados || [];

      setDadosBrutos(payloadServicos);
      setDadosFiltrados(payloadServicos);
      setHistoricoBruto(payloadHistorico);
      setHistoricoFiltrado(payloadHistorico);

      if (resFunil?.data?.dados) {
        setDadosFunilCpc(resFunil.data.dados);
      }

      setUltimaAtualizacao(new Date());
      setNotification("Bases atualizadas, Aquecimentos calculados!");
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error("[ERRO FETCH VIEWS]:", error);
      setNotification("Erro ao atualizar base de dados.");
      setTimeout(() => setNotification(null), 4000);
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

  useEffect(() => {
    if (maxLinhasGlobal > 0 && !isLinhasMaxInitialized) {
      setFiltroLinhasRangeMax(maxLinhasGlobal);
      setIsLinhasMaxInitialized(true);
    }
  }, [maxLinhasGlobal, isLinhasMaxInitialized]);

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
        if (filtroExclusivo === "SIM" && item.exclusivo !== true) return false;
        if (filtroExclusivo === "NAO" && item.exclusivo === true) return false;
        if (filtroDDD !== "TODOS") {
          if (filtroDDD === "EXCLUSO_11_RENOVACAO") {
            if (
              item.ddd_predominante === "11" &&
              item.indicacao === "RENOVACAO"
            )
              return false;
          } else if (filtroDDD === "FORA_SP") {
            const dddNum = Number(item.ddd_predominante);
            if (dddNum >= 11 && dddNum <= 19) return false;
          } else {
            if (item.ddd_predominante !== filtroDDD) return false;
          }
        }
        if (filtroConsultor !== "TODOS") {
          if (filtroConsultor === "NAO_ATRIBUIDO") {
            if (item.seq_consultor !== null) return false;
          } else {
            if (String(item.seq_consultor) !== filtroConsultor) return false;
          }
        }
        if (filtroClassificacao !== "TODOS") {
          if (filtroClassificacao === "SEM_CLASSIFICACAO") {
            if (
              item.classificacao_contrato !== null &&
              item.classificacao_contrato.trim() !== ""
            )
              return false;
          } else {
            if (item.classificacao_contrato !== filtroClassificacao)
              return false;
          }
        }
        if (filtroDataFim !== "") {
          if (!item.dt_fim_contrato) return false;
          const dataFormatada = item.dt_fim_contrato.substring(0, 10);
          if (dataFormatada !== filtroDataFim) return false;
        }

        if (tipoFiltroLinha === "RANGE") {
          const linhas = Number(item.qtd_linhas_total || 0);
          if (linhas < filtroLinhasRangeMin || linhas > filtroLinhasRangeMax)
            return false;
        } else if (tipoFiltroLinha === "EXACT") {
          const linhas = Number(item.qtd_linhas_total || 0);
          if (linhas !== filtroLinhasExact) return false;
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
      aquecendo: aplicarRegras(dadosBrutos.aquecendo),
      prazo_limitado: aplicarRegras(dadosBrutos.prazo_limitado),
      prazo_excedido: aplicarRegras(dadosBrutos.prazo_excedido),
    });
  };

  const limparFiltros = () => {
    setFiltroSituacao("TODOS");
    setFiltroCarteira("AMBOS");
    setFiltroPiperun("AMBOS");
    setFiltroAtivo("TODOS");
    setFiltroExclusivo("TODOS");
    setFiltroDDD("TODOS");
    setFiltroConsultor("TODOS");
    setFiltroClassificacao("TODOS");
    setFiltroDataFim("");

    setTipoFiltroLinha("NONE");
    setFiltroLinhasRangeMin(0);
    setFiltroLinhasRangeMax(maxLinhasGlobal);
    setFiltroLinhasExact(0);

    setFiltroCpcAtivo(false);
    setFiltroCpcValor(maxDiasCpcGlobal);
    setDadosFiltrados(dadosBrutos);
  };

  const totais = useMemo(() => {
    const tr = dadosFiltrados.renovacao.length;
    const tp = dadosFiltrados.portabilidade.length;
    const tf = dadosFiltrados.fora_prazo.length;
    const ta = dadosFiltrados.aquecendo?.length || 0;
    const tl = dadosFiltrados.prazo_limitado.length;
    const te = dadosFiltrados.prazo_excedido.length;
    return {
      renovacao: tr,
      portabilidade: tp,
      fora_prazo: tf,
      aquecendo: ta,
      prazo_limitado: tl,
      prazo_excedido: te,
      geral: tr + tp + tf + ta + tl + te,
    };
  }, [dadosFiltrados]);

  const todosServicosFiltrados = useMemo(() => {
    return [
      ...dadosFiltrados.renovacao,
      ...dadosFiltrados.portabilidade,
      ...dadosFiltrados.fora_prazo,
      ...(dadosFiltrados.aquecendo || []),
      ...dadosFiltrados.prazo_limitado,
      ...dadosFiltrados.prazo_excedido,
    ];
  }, [dadosFiltrados]);

  const listaMotivosUnicos = useMemo(() => {
    const motivos = new Set<string>();
    historicoBruto.forEach((h) => {
      if (h.motivo_declinio) motivos.add(h.motivo_declinio);
    });
    return Array.from(motivos).sort();
  }, [historicoBruto]);

  const listaConsultoresHistUnicos = useMemo(() => {
    const map = new Map<number, string>();
    historicoBruto.forEach((h) => {
      if (h.seq_consultor && h.consultor_nome)
        map.set(h.seq_consultor, h.consultor_nome);
    });
    return Array.from(map.entries())
      .map(([seq, nome]) => ({ seq, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [historicoBruto]);

  const aplicarFiltrosHistorico = () => {
    const filtrado = historicoBruto.filter((h) => {
      if (
        filtroHistConsultor !== "TODOS" &&
        String(h.seq_consultor) !== filtroHistConsultor
      )
        return false;
      if (filtroHistMotivo !== "TODOS") {
        if (filtroHistMotivo === "SEM_DECLINIO" && h.motivo_declinio !== null)
          return false;
        if (
          filtroHistMotivo !== "SEM_DECLINIO" &&
          h.motivo_declinio !== filtroHistMotivo
        )
          return false;
      }
      return true;
    });
    setHistoricoFiltrado(filtrado);
  };

  const limparFiltrosHistorico = () => {
    setFiltroHistConsultor("TODOS");
    setFiltroHistMotivo("TODOS");
    setHistoricoFiltrado(historicoBruto);
  };

  const dadosGraficoMotivo = useMemo(() => {
    const map = new Map<string, number>();
    historicoFiltrado.forEach((h) => {
      const motivo = h.motivo_declinio || "Sem Declínio (Ganho)";
      map.set(motivo, (map.get(motivo) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [historicoFiltrado]);

  const dadosGraficoConsultor = useMemo(() => {
    const map = new Map<string, number>();
    historicoFiltrado.forEach((h) => {
      const nome = h.consultor_nome || "Não Atribuído";
      map.set(nome, (map.get(nome) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [historicoFiltrado]);

  const exportToImage = async () => {
    if (!dashboardRef.current) return;
    try {
      setLoading(true);
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Analise_Dashboard_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      setNotification("Print da análise exportado com sucesso!");
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Erro ao exportar imagem:", err);
      setNotification("Erro ao gerar imagem da análise.");
    } finally {
      setLoading(false);
    }
  };

  const getDataToExport = () => {
    return modalExportacaoAberto === "servicos"
      ? todosServicosFiltrados
      : historicoFiltrado;
  };

  const getFileName = () => {
    const prefix =
      modalExportacaoAberto === "servicos" ? "Base_Servicos" : "Base_Historico";
    return `${prefix}_${new Date().toISOString().slice(0, 10)}`;
  };

  const exportToCSV = () => {
    const data = getDataToExport();
    if (!data || data.length === 0) return alert("Nenhum dado para exportar.");

    const keys = Object.keys(data[0]);
    const csvContent = [
      keys.join(";"),
      ...data.map((row) =>
        keys
          .map((k) => `"${(row as any)[k] !== null ? (row as any)[k] : ""}"`)
          .join(";"),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${getFileName()}.csv`;
    link.click();
    setModalExportacaoAberto(null);
  };

  const exportToXLSX = async () => {
    const data = getDataToExport();
    if (!data || data.length === 0) return alert("Nenhum dado para exportar.");

    try {
      setLoading(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Dados Exportados");

      const keys = Object.keys(data[0]);

      worksheet.columns = keys.map((key) => ({
        header: key.toUpperCase(),
        key: key,
        width: 25,
      }));

      data.forEach((item) => {
        worksheet.addRow(item);
      });

      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `${getFileName()}.xlsx`);

      setModalExportacaoAberto(null);
      setNotification("Planilha XLSX gerada com sucesso!");
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      alert("Houve um erro ao processar o arquivo XLSX.");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const data = getDataToExport();
    if (!data || data.length === 0) return alert("Nenhum dado para exportar.");

    const doc = new jsPDF("landscape", "pt", "a4");
    const keys = Object.keys(data[0]);
    const displayKeys = keys.slice(0, 10);

    const tableData = data.map((row) =>
      displayKeys.map((k) => String((row as any)[k] || "")),
    );

    doc.text(
      `Relatório de ${modalExportacaoAberto === "servicos" ? "Serviços" : "Histórico"}`,
      40,
      40,
    );

    autoTable(doc, {
      head: [displayKeys],
      body: tableData,
      startY: 50,
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: { fillColor: [44, 62, 80] },
    });

    doc.save(`${getFileName()}.pdf`);
    setModalExportacaoAberto(null);
  };

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

  useEffect(() => {
    async function loadConsultores() {
      try {
        const response = await API.get("/api/consultores");
        const listaConsultores = response.data?.dados ?? [];
        if (Array.isArray(listaConsultores)) {
          setConsultoresDB(listaConsultores);
        }
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

        const payloadConsultoresFormatado: IConsultor[] = consultoresDB.map(
          (c) =>
            ({
              nome: c.nome,
              owner_id: c.codigo_crm,
              perfil: String(c.perfil_indicacao)
                .trim()
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""),
              seq: c.codigo_crm || 0,
              email: "",
            }) as IConsultor,
        );

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
        console.error("Erro ao compilar as bolhas do PipeRun:", error);
        setNotification("Falha ao atualizar o gráfico do Pipeline.");
        setTimeout(() => setNotification(null), 5000);
      } finally {
        setLoadingBolhas(false);
      }
    },
    [consultoresDB],
  );

  useEffect(() => {
    if (consultoresDB.length > 0) {
      fetchDadosBolhas();
    }
  }, [consultoresDB, fetchDadosBolhas]);

  const buscarRelatorioPerdasPeriodo = async () => {
    if (!dataInicioPipe || !dataFimPipe) {
      setNotification("Por favor, selecione a Data de Início e Fim.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (consultoresDB.length === 0) {
      setNotification("Aguarde o carregamento dos consultores.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setLoadingPerdas(true);
    try {
      const payloadConsultoresFormatado: IConsultor[] = consultoresDB.map(
        (c) =>
          ({
            nome: c.nome,
            owner_id: c.codigo_crm,
            perfil: String(c.perfil_indicacao)
              .trim()
              .toUpperCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
            seq: c.codigo_crm || 0,
            email: "",
          }) as IConsultor,
      );

      const relatorio = await compilarRelatorioPerdas(
        payloadConsultoresFormatado,
        dataInicioPipe,
        dataFimPipe,
      );

      setDadosPerdas(relatorio);
      setNotification("Relatório de Perdas atualizado com sucesso!");
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Erro ao buscar perdas:", error);
      setNotification("Falha ao gerar o relatório de perdas.");
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoadingPerdas(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden w-screen bg-slate-50 text-slate-900">
      <div className="w-[280px] h-full flex-shrink-0">
        <Sidebar />
      </div>

      <main
        ref={dashboardRef}
        className="relative flex flex-col flex-1 h-full p-4 overflow-y-auto sm:p-8 space-y-12"
      >
        {modalExportacaoAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6 border-b pb-3">
                <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                  <Download className="w-5 h-5 text-primary" />
                  Exportar{" "}
                  {modalExportacaoAberto === "servicos"
                    ? "Serviços"
                    : "Histórico"}
                </h3>
                <button
                  onClick={() => setModalExportacaoAberto(null)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Escolha o formato do arquivo para baixar os dados filtrados
                atualmente apresentados.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={exportToXLSX}
                  className="w-full justify-start gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                >
                  <FileSpreadsheet className="w-5 h-5" /> Exportar para Planilha
                  (.XLSX)
                </Button>
                <Button
                  onClick={exportToCSV}
                  className="w-full justify-start gap-3 bg-orange-400 hover:bg-orange-500 text-white font-semibold"
                >
                  <FileCode2 className="w-5 h-5" /> Exportar para Dados Brutos
                  (.CSV)
                </Button>
                <Button
                  onClick={exportToPDF}
                  className="w-full justify-start gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <FileText className="w-5 h-5" /> Exportar Relatório (.PDF)
                </Button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div className="fixed z-50 flex items-center gap-3 px-6 py-4 text-white shadow-2xl top-6 right-6 bg-slate-800 rounded-xl animate-in slide-in-from-right-8 duration-300">
            <Bell className="w-5 h-5 text-emerald-400" />
            <p className="font-medium">{notification}</p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-sm bg-slate-50/80">
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
            <h2 className="text-xl font-bold text-slate-700">Processando...</h2>
          </div>
        )}

        <section>
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

            <div className="flex items-center gap-3">
              <Button
                onClick={exportToImage}
                className="flex items-center gap-2 px-5 py-2 font-semibold text-slate-700 transition-all shadow-sm bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                <ImageIcon className="w-4 h-4 text-purple-500" />
                Exportar Análises (Imagem)
              </Button>
              <Button
                onClick={fetchTodasViews}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 font-semibold text-white transition-all shadow-md bg-blue-600 hover:bg-blue-700 rounded-xl"
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
                    <Filter className="w-4 h-4 text-primary" /> Filtros em
                    Memória (Sem usar DB)
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={limparFiltros}
                      variant="outline"
                      size="sm"
                      className="transition-colors shadow-sm cursor-pointer text-white"
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
                    <Button
                      onClick={() => setModalExportacaoAberto("servicos")}
                      size="sm"
                      className="px-4 transition-colors shadow-md cursor-pointer bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      <Download className="w-4 h-4 mr-2" /> Exportar Base
                      Serviços
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
                      <Users className="w-3.5 h-3.5 text-purple-500" />{" "}
                      Consultor Atribuído
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
                      <option value="TEMPORARIO">
                        Temporário (Aguard. 15d)
                      </option>
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
                      <CloudCog className="w-3.5 h-3.5 text-indigo-500" />{" "}
                      PipeRun (CRM)
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
                      <Calendar className="w-3.5 h-3.5 text-red-500" />{" "}
                      Vencimento Contr.
                    </label>
                    <input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="w-full h-9 px-3 text-sm transition-all border shadow-sm outline-none cursor-pointer border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className=" border border-slate-200 bg-white rounded-lg p-3 space-y-3">
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
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Tag className="w-3.5 h-3.5 text-pink-500" />{" "}
                      Classificação
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
                      <option value="SEM_CLASSIFICACAO">
                        Sem Classificação
                      </option>
                    </select>
                  </div>
                  <div className="col-span-1 md:col-span-2 xl:col-span-3 border border-slate-200 bg-white rounded-lg p-3 space-y-3">
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                      <Briefcase className="w-4 h-4 text-amber-500" /> Controle
                      de Volume de Linhas Totais
                    </label>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div
                        className={`relative p-4 rounded-xl border-2 transition-all ${tipoFiltroLinha === "RANGE" ? "border-primary bg-slate-50 shadow-sm" : "border-slate-100 opacity-60"}`}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">
                              Intervalo (Range)
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Ex: De 2 até 7 linhas
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setTipoFiltroLinha(
                                tipoFiltroLinha === "RANGE" ? "NONE" : "RANGE",
                              )
                            }
                            className="transition-opacity cursor-pointer text-primary hover:opacity-80"
                          >
                            {tipoFiltroLinha === "RANGE" ? (
                              <ToggleRight className="w-7 h-7 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-7 h-7 text-slate-400" />
                            )}
                          </button>
                        </div>

                        <div className="relative pt-6 pb-2">
                          <div
                            className={`absolute px-1.5 py-0.5 text-[10px] font-bold text-slate-900 transition-all shadow-md top-0 bg-yellow-400 rounded z-10 whitespace-nowrap ${tipoFiltroLinha !== "RANGE" ? "grayscale opacity-50" : ""}`}
                            style={{
                              left: `calc(${(filtroLinhasRangeMin / (maxLinhasGlobal || 1)) * 100}% - 12px)`,
                            }}
                          >
                            {filtroLinhasRangeMin}
                          </div>

                          <div
                            className={`absolute px-1.5 py-0.5 text-[10px] font-bold text-white transition-all shadow-md top-0 bg-green-500 rounded z-10 whitespace-nowrap ${tipoFiltroLinha !== "RANGE" ? "grayscale opacity-50" : ""}`}
                            style={{
                              left: `calc(${(filtroLinhasRangeMax / (maxLinhasGlobal || 1)) * 100}% - 12px)`,
                            }}
                          >
                            {filtroLinhasRangeMax}
                          </div>

                          <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`absolute h-full transition-all ${tipoFiltroLinha === "RANGE" ? "bg-slate-400" : "bg-slate-300"}`}
                              style={{
                                left: `${(filtroLinhasRangeMin / (maxLinhasGlobal || 1)) * 100}%`,
                                right: `${100 - (filtroLinhasRangeMax / (maxLinhasGlobal || 1)) * 100}%`,
                              }}
                            />
                          </div>

                          <input
                            type="range"
                            min="0"
                            max={maxLinhasGlobal}
                            value={filtroLinhasRangeMin}
                            onChange={(e) =>
                              setFiltroLinhasRangeMin(
                                Math.min(
                                  Number(e.target.value),
                                  filtroLinhasRangeMax - 1,
                                ),
                              )
                            }
                            disabled={tipoFiltroLinha !== "RANGE"}
                            className="absolute top-6 w-full h-2 appearance-none bg-transparent pointer-events-none 
                            [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md
                            [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-yellow-400 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                            z-20"
                          />

                          <input
                            type="range"
                            min="0"
                            max={maxLinhasGlobal}
                            value={filtroLinhasRangeMax}
                            onChange={(e) =>
                              setFiltroLinhasRangeMax(
                                Math.max(
                                  Number(e.target.value),
                                  filtroLinhasRangeMin + 1,
                                ),
                              )
                            }
                            disabled={tipoFiltroLinha !== "RANGE"}
                            className="absolute top-6 w-full h-2 appearance-none bg-transparent pointer-events-none 
                            [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md
                            [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                            z-30"
                          />

                          <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-medium">
                            <span>0 Lins</span>
                            <span>{maxLinhasGlobal} Máx</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`relative p-4 rounded-xl border-2 transition-all ${tipoFiltroLinha === "EXACT" ? "border-primary bg-slate-50 shadow-sm" : "border-slate-100 opacity-60"}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">
                              Valor Específico
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Ex: Exatamente 5 linhas
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setTipoFiltroLinha(
                                tipoFiltroLinha === "EXACT" ? "NONE" : "EXACT",
                              )
                            }
                            className="transition-opacity cursor-pointer text-primary hover:opacity-80"
                          >
                            {tipoFiltroLinha === "EXACT" ? (
                              <ToggleRight className="w-7 h-7 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-7 h-7 text-slate-400" />
                            )}
                          </button>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max={maxLinhasGlobal}
                            value={filtroLinhasExact}
                            onChange={(e) =>
                              setFiltroLinhasExact(Number(e.target.value))
                            }
                            disabled={tipoFiltroLinha !== "EXACT"}
                            className="w-full h-10 px-4 text-sm font-bold transition-all border shadow-inner outline-none border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            placeholder="Insira a quantia exata..."
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
                {renderMiniGrafico(
                  "Aquecendo",
                  totais.aquecendo,
                  CORES.aquecendo,
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

            <Card className="mt-4 text-slate-200 border-none shadow-lg bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b bg-slate-800/80 border-slate-700/50">
                <Database className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Métricas de Funil (CPC & eDoc) - Visão Global de Empresas
                </h3>
              </div>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[1px] bg-slate-700/50">
                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center text-center">
                      Passaram pelo CPC
                    </p>
                    <p className="text-xl font-black text-emerald-400">
                      {dadosFunilCpc?.total_passado_cpc || 0}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center text-center">
                      Lido CPC (Sem Serviço)
                    </p>
                    <p className="text-xl font-black text-white">
                      {dadosFunilCpc?.total_passado_cpc_sem_servico || 0}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center text-center">
                      Disp. p/ CPC (Sem Serv.)
                    </p>
                    <p className="text-xl font-black text-amber-400">
                      {dadosFunilCpc?.disp_cpc_sem_servico || 0}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center text-center">
                      Disp. p/ CPC (Com eDoc)
                    </p>
                    <p className="text-xl font-black text-white">
                      {dadosFunilCpc?.disp_cpc_com_edoc || 0}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center text-center">
                      Disp. CPC (eDoc + Drive)
                    </p>
                    <p className="text-xl font-black text-sky-400">
                      {dadosFunilCpc?.disp_cpc_edoc_e_docdrive || 0}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center leading-tight">
                      eDoc s/ Drive <br />
                      (Já Lido CPC)
                    </p>
                    <p className="text-xl font-black text-slate-300">
                      {dadosFunilCpc?.edoc_sem_docdrive_sem_serv_cpc_ok || 0}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-purple-300 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center leading-tight">
                      CPC + eDoc + Serviço <br /> (Total Geral)
                    </p>
                    <p className="text-xl font-black text-purple-400">
                      {dadosFunilCpc?.edoc_com_cpc_edoc_servico || 0}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-red-300 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center leading-tight">
                      CPC + eDoc + Serviço <br /> (SEM DRIVE)
                    </p>
                    <p className="text-xl font-black text-red-500">
                      {dadosFunilCpc?.edoc_com_cpc_edoc_servico_sem_drive || 0}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                    <p className="text-[10px] text-blue-300 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center leading-tight">
                      CPC + eDoc + Serviço <br /> (COM DRIVE)
                    </p>
                    <p className="text-xl font-black text-blue-400">
                      {dadosFunilCpc?.edoc_com_cpc_edoc_servico_com_drive || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <hr className="w-full max-w-7xl mx-auto border-slate-200" />

        <section className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col items-start justify-between w-full gap-4 mb-6 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                <CloudCog className="w-6 h-6 text-blue-600" /> Bases Abertas no
                PipeRun (Hoje)
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Visualização do volume de Oportunidades no Pipeline (Funil) por
                Consultor.
              </p>
            </div>
          </div>

          <Card className="bg-white border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Users className="w-5 h-5 text-blue-500" /> Oportunidades
                Compiladas
              </h2>
              <Button
                variant="outline"
                onClick={() => fetchDadosBolhas(true)}
                disabled={loadingBolhas}
                className="gap-2 shadow-sm flex items-center border-slate-200 text-white hover:bg-slate-50 cursor-pointer"
              >
                <RotateCw
                  className={`h-4 w-4 ${loadingBolhas ? "animate-spin text-blue-500" : ""}`}
                />
                Atualizar Gráfico Pipe
              </Button>
            </div>

            <div className="w-full bg-slate-50/50 rounded-lg border border-slate-100 p-6 max-h-[600px] overflow-y-auto">
              {loadingBolhas && dadosPipelineBolhas.length === 0 ? (
                <div className="w-full h-[300px] flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-500" />
                  Calculando oportunidades no PipeRun...
                </div>
              ) : dadosPipelineBolhas.length === 0 ? (
                <div className="w-full h-[300px] flex items-center justify-center text-slate-500 font-medium">
                  Nenhum dado encontrado para os consultores atuais no Pipeline.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {dadosPipelineBolhas.map((entry, index) => {
                    let cor = "#8884d8";
                    if (entry.perfil === "RENOVACAO") cor = CORES.renovacao;
                    if (entry.perfil === "PORTABILIDADE")
                      cor = CORES.portabilidade;
                    if (entry.perfil === "CARTEIRA") cor = CORES.carteira_pipe;
                    if (entry.perfil === "AMBOS") cor = "#a855f7";

                    return (
                      <div
                        key={`bolha-${index}`}
                        className="flex flex-col items-center bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:border-blue-200 transition-colors"
                      >
                        <h3 className="text-sm font-bold text-center mb-2 line-clamp-2 h-10 flex items-center text-slate-700">
                          {entry.nome}
                        </h3>
                        <div className="w-40 h-40">
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
                                innerRadius={50}
                                outerRadius={70}
                                dataKey="value"
                                stroke="none"
                              >
                                <Cell fill={cor} />
                                <Cell fill={CORES.vazio} />
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
          </Card>
        </section>

        <hr className="w-full max-w-7xl mx-auto border-slate-200 mt-8 mb-8" />

        <section className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col items-start justify-between w-full gap-4 mb-6 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-red-600" /> Análise de Perdas
                por Período (CRM)
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Filtre por data para visualizar o Total Base enviado ao
                consultor e a proporção declinada (em Bolhas ou Tabela).
              </p>
            </div>

            {dadosPerdas.length > 0 && (
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewModePerdas("grafico")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
                    viewModePerdas === "grafico"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" /> Gráficos
                </button>
                <button
                  onClick={() => setViewModePerdas("tabela")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition-all ${
                    viewModePerdas === "tabela"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <ListIcon className="w-4 h-4" /> Tabela
                </button>
              </div>
            )}
          </div>

          <Card className="bg-white border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row items-end gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="space-y-1.5 w-full md:w-auto">
                <label className="text-xs font-bold text-slate-700">
                  Data Criação (Início)
                </label>
                <input
                  type="date"
                  value={dataInicioPipe}
                  onChange={(e) => setDataInicioPipe(e.target.value)}
                  className="w-full h-10 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5 w-full md:w-auto">
                <label className="text-xs font-bold text-slate-700">
                  Data Criação (Fim)
                </label>
                <input
                  type="date"
                  value={dataFimPipe}
                  onChange={(e) => setDataFimPipe(e.target.value)}
                  className="w-full h-10 px-3 text-sm transition-all border shadow-sm outline-none border-slate-200 rounded-md bg-slate-50 text-slate-900 focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button
                onClick={buscarRelatorioPerdasPeriodo}
                disabled={loadingPerdas}
                className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white font-bold w-full md:w-auto"
              >
                {loadingPerdas ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Buscar Perdas
              </Button>
            </div>

            {viewModePerdas === "grafico" && (
              <div className="w-full bg-slate-50/50 rounded-lg border border-slate-100 p-6 min-h-[300px] max-h-[600px] overflow-y-auto">
                {loadingPerdas ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-red-500" />
                    Calculando perdas e bases no PipeRun...
                  </div>
                ) : dadosPerdas.length === 0 ? (
                  <div className="w-full h-[200px] flex items-center justify-center text-slate-500 font-medium">
                    Nenhum dado filtrado. Selecione um período e clique em
                    buscar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {dadosPerdas.map((row, index) => {
                      const restouBase = row.totalBase - row.totalDeclinados;

                      const dadosPie = [
                        {
                          name: "Restante (Base)",
                          value: restouBase < 0 ? 0 : restouBase,
                          fill: CORES.sucesso,
                        },
                        {
                          name: "Declinados",
                          value: row.totalDeclinados,
                          fill: CORES.declinio,
                        },
                      ];
                      const fmt = (val: number) =>
                        new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(val);

                      return (
                        <div
                          key={`perda-${index}`}
                          className="flex flex-col items-center bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:border-red-200 transition-colors"
                        >
                          <h3 className="text-sm font-bold text-center mb-1 line-clamp-2 h-10 flex items-center text-slate-800">
                            {row.nome}
                          </h3>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded mb-3 font-semibold uppercase tracking-wider">
                            {row.perfil}
                          </span>

                          <div className="w-40 h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={dadosPie}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={70}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {dadosPie.map((entry, idx) => (
                                    <Cell
                                      key={`cell-${idx}`}
                                      fill={entry.fill}
                                    />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  formatter={(val: any, name: any) => [
                                    val,
                                    name,
                                  ]}
                                  contentStyle={{
                                    borderRadius: "8px",
                                    border: "none",
                                    boxShadow:
                                      "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="w-full mt-4 space-y-2 text-xs">
                            <div className="flex justify-between items-center bg-red-50 p-1.5 rounded">
                              <span className="font-semibold text-red-600">
                                Declinados:
                              </span>
                              <span className="font-bold text-red-600">
                                {row.totalDeclinados}{" "}
                                <span className="text-[9px] text-red-400 font-normal">
                                  ({fmt(row.valorDeclinados)})
                                </span>
                              </span>
                            </div>
                            <div className="text-center pt-1 border-t border-slate-100 mt-1">
                              <span
                                className={`font-bold ${Number(row.taxaPerda) > 50 ? "text-red-600" : "text-amber-500"}`}
                              >
                                {row.taxaPerda}% de Perda
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {viewModePerdas === "tabela" && (
              <div className="w-full overflow-x-auto rounded-lg border border-slate-200 mt-4">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Consultor</th>
                      <th className="px-6 py-4 text-center">Perfil</th>
                      <th className="px-6 py-4 text-center border-l border-slate-200">
                        Total Base (Qtd)
                      </th>
                      <th className="px-6 py-4 text-center text-red-600 border-l border-slate-200">
                        Declinados (Qtd)
                      </th>
                      <th className="px-6 py-4 text-center bg-slate-100">
                        % Perda
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {dadosPerdas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-8 text-center text-slate-500"
                        >
                          {loadingPerdas
                            ? "Buscando relatórios..."
                            : "Nenhum dado filtrado. Selecione um período e clique em buscar."}
                        </td>
                      </tr>
                    ) : (
                      dadosPerdas.map((row, index) => (
                        <tr
                          key={index}
                          className="hover:bg-slate-50 text-black transition-colors"
                        >
                          <td className="px-6 py-3 font-semibold text-slate-800">
                            {row.nome}
                          </td>
                          <td className="px-6 py-3 text-center text-xs">
                            <span className="bg-slate-100 px-2 py-1 rounded">
                              {row.perfil === "AMBOS"
                                ? "AMBOS (RENOVACAO/PORTABILIDADE)"
                                : row.perfil === "CARTEIRA"
                                  ? "CARTEIRA / RENOVACAO"
                                  : row.perfil}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center border-l border-slate-200 font-bold">
                            {row.totalBase}
                          </td>
                          <td className="px-6 py-3 text-center text-red-600 font-bold border-l border-slate-200">
                            {row.totalDeclinados}
                          </td>
                          <td className="px-6 py-3 text-center font-bold bg-slate-50">
                            <span
                              className={
                                Number(row.taxaPerda) > 50
                                  ? "text-red-600"
                                  : "text-amber-500"
                              }
                            >
                              {row.taxaPerda}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <hr className="w-full max-w-7xl mx-auto border-slate-200" />

        <section className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col items-start justify-between w-full gap-4 mb-6 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                <History className="w-6 h-6 text-primary" /> Análise de
                Histórico / Declínios
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
                  <Filter className="w-4 h-4 text-primary" /> Filtros
                  Específicos do Histórico
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={limparFiltrosHistorico}
                    variant="outline"
                    size="sm"
                    className="transition-colors shadow-sm cursor-pointer text-white"
                  >
                    <Eraser className="w-3.5 h-3.5 mr-2" /> Limpar Filtros
                    Histórico
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
                    <Users className="w-3.5 h-3.5 text-purple-500" /> Consultor
                    do Histórico
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
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Motivo
                    de Declínio
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
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
      </main>
    </div>
  );
}
