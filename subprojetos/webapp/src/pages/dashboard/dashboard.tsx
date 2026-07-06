import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import * as htmlToImage from "html-to-image";
import {
  Bell,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode2,
  X,
} from "lucide-react";
import API from "@/services/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
} from "@/services/hook/hookApiRunTotalServicoConsultor";
import { IConsultor } from "@/interfaces/pipeRunOportunidades.interface";
import DashCrm from "@/components/dash_crm/dash_crm";
import DashHistorico from "@/components/dash_historico/dash_historico";
import DashServicoClaro from "@/components/dash_servico_claro/dash_servico_claro";
import DashCarteira from "@/components/dash_carteira.ts/dash_carteira";

const getDataAtualFormata = () => {
  const hoje = new Date();
  return hoje.toISOString().split("T")[0];
};

const getPrimeiroDiaMesFormatado = () => {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return primeiroDia.toISOString().split("T")[0];
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

const verificarSeElegivelAquecimento = (
  dataFimContrato?: string | null,
  classificacao?: string | null,
): boolean => {
  const mesesAtivos = calcularMesesAtivosContrato(dataFimContrato);
  if (mesesAtivos === null) return false;

  let offsetRenovacao = 0;
  if (classificacao && ["CA", "CC", "CE"].includes(classificacao)) {
    offsetRenovacao = 2;
  }
  const mesExatoAquecimento = 15 + offsetRenovacao;
  return mesesAtivos === mesExatoAquecimento;
};

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

export default function DashboardAnaliticoMultiView() {
  const [loadingServicos, setLoadingServicos] = useState<boolean>(false);
  const [loadingCarteira, setLoadingCarteira] = useState<boolean>(false);
  const [loadingHistorico, setLoadingHistorico] = useState<boolean>(false);

  const [notification, setNotification] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [modalExportacaoAberto, setModalExportacaoAberto] = useState<
    "servicos" | "historico" | "carteira" | "crm" | null
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

  const [carteiraBruta, setCarteiraBruta] = useState<any[]>([]);
  const [carteiraFiltrada, setCarteiraFiltrada] = useState<any[]>([]);
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
  const [filtroFlagCpc, setFiltroFlagCpc] = useState<"TODOS" | "SIM" | "NAO">(
    "TODOS",
  );

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
  const [dadosPerdas, setDadosPerdas] = useState<any[]>([]);
  const [loadingPerdas, setLoadingPerdas] = useState<boolean>(false);
  const [dadosFunilCpc, setDadosFunilCpc] = useState<any>(null);
  const [viewModePerdas, setViewModePerdas] = useState<"grafico" | "tabela">(
    "grafico",
  );

  const [dataInicioPipe, setDataInicioPipe] = useState<string>(
    getPrimeiroDiaMesFormatado(),
  );
  const [dataFimPipe, setDataFimPipe] = useState<string>(getDataAtualFormata());

  const hasFetchedDefaultRelatorio = useRef<boolean>(false);

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

  const fetchServicos = useCallback(async (isManualRefresh = false) => {
    setLoadingServicos(true);
    try {
      const [resRenov, resPort, resFora, resLim, resExc, resFunil] =
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
          API.get<any>("/api/servico-claro/dashboard/empresas"),
        ]);

      const baseForaPrazoBruta = prepararDados(resFora.data?.dados || []);
      const arrayForaPrazoReal: IServicoViewAPI[] = [];
      const arrayAquecendo: IServicoViewAPI[] = [];

      baseForaPrazoBruta.forEach((item) => {
        if (
          verificarSeElegivelAquecimento(
            item.dt_fim_contrato,
            item.classificacao_contrato,
          )
        ) {
          item.indicacao = "AQUECENDO";
          arrayAquecendo.push(item);
        } else {
          arrayForaPrazoReal.push(item);
        }
      });

      const payloadServicos: DadosPorIndicacao = {
        renovacao: prepararDados(resRenov.data?.dados || []),
        portabilidade: prepararDados(resPort.data?.dados || []),
        fora_prazo: arrayForaPrazoReal,
        aquecendo: arrayAquecendo,
        prazo_limitado: prepararDados(resLim.data?.dados || []),
        prazo_excedido: prepararDados(resExc.data?.dados || []),
      };

      setDadosBrutos(payloadServicos);
      setDadosFiltrados(payloadServicos);
      if (resFunil?.data?.dados) setDadosFunilCpc(resFunil.data.dados);

      setUltimaAtualizacao(new Date());
      if (isManualRefresh) {
        setNotification("Base de Serviços sincronizada com sucesso!");
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("[ERRO FETCH SERVIÇOS]:", error);
      setNotification("Erro ao atualizar base de serviços.");
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoadingServicos(false);
    }
  }, []);

  const fetchCarteira = useCallback(async (isManualRefresh = false) => {
    setLoadingCarteira(true);
    try {
      const resCarteira = await API.get<any>(
        "/api/servico-claro/dashboard/empresas-carteira",
      );
      const baseCarteiraTratada = (resCarteira?.data?.dados || []).map(
        (item: any) => {
          if (item.indicacao === "FORA DO PRAZO") {
            if (
              verificarSeElegivelAquecimento(
                item.dt_fim_contrato,
                item.classificacao_contrato,
              )
            ) {
              item.indicacao = "AQUECENDO";
            }
          }
          return {
            ...item,
            exclusivo:
              item.exclusivo === true ||
              item.exclusivo === "true" ||
              item.exclusivo === "t" ||
              item.exclusivo === 1,
          };
        },
      );

      setCarteiraBruta(baseCarteiraTratada);
      setCarteiraFiltrada(baseCarteiraTratada);

      setUltimaAtualizacao(new Date());
      if (isManualRefresh) {
        setNotification("Base de Carteira sincronizada com sucesso!");
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("[ERRO FETCH CARTEIRA]:", error);
      setNotification("Erro ao atualizar carteira.");
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoadingCarteira(false);
    }
  }, []);

  const fetchHistorico = useCallback(async (isManualRefresh = false) => {
    setLoadingHistorico(true);
    try {
      const resHist = await API.get<IApiResponseView>(
        "/api/servico-claro/dashboard/historico",
      );
      const payloadHistorico = resHist.data?.dados || [];
      setHistoricoBruto(payloadHistorico);
      setHistoricoFiltrado(payloadHistorico);

      if (isManualRefresh) {
        setNotification("Histórico sincronizado com sucesso!");
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("[ERRO FETCH HISTORICO]:", error);
      setNotification("Erro ao atualizar histórico.");
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  useEffect(() => {
    fetchServicos();
    fetchCarteira();
    fetchHistorico();
  }, [fetchServicos, fetchCarteira, fetchHistorico]);

  const { maxLinhasGlobal, maxDiasCpcGlobal } = useMemo(() => {
    const todosServicos = [
      ...dadosBrutos.renovacao,
      ...dadosBrutos.portabilidade,
      ...dadosBrutos.fora_prazo,
      ...dadosBrutos.prazo_limitado,
      ...dadosBrutos.prazo_excedido,
      ...carteiraBruta,
    ];
    let maxLinhas = 0;
    let maxCpc = 0;

    todosServicos.forEach((item) => {
      const linhas = Math.max(
        Number(item.qtd_linhas_total || 0),
        Number(item.qtd_servico_claro || 0),
      );
      if (linhas > maxLinhas) maxLinhas = linhas;
      const dataLeituraCpc = item.dt_leitura_cpc_empresa || item.dt_leitura_cpc;
      const diasCpc = calcularDiasPassados(dataLeituraCpc);
      if (diasCpc !== null && diasCpc > maxCpc) maxCpc = diasCpc;
    });

    return {
      maxLinhasGlobal: maxLinhas || 100,
      maxDiasCpcGlobal: maxCpc || 30,
    };
  }, [dadosBrutos, carteiraBruta]);

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
    const aplicarRegrasServicos = (array: IServicoViewAPI[]) => {
      return array.filter((item) => {
        if (filtroSituacao !== "TODOS" && item.situacao !== filtroSituacao)
          return false;

        const isCarteiraVazia =
          !item.carteira || String(item.carteira).trim() === "";
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

        // Flag verdadeira no banco = PRECISA SER LIDO (Pendente).
        // Flag falsa no banco = JÁ LIDO.
        if (filtroFlagCpc === "SIM" && item.flag_cpc_servico === true)
          return false;
        if (filtroFlagCpc === "NAO" && item.flag_cpc_servico === false)
          return false;

        if (filtroDDD !== "TODOS") {
          if (filtroDDD === "EXCLUSO_11_RENOVACAO") {
            if (
              item.ddd_predominante === "11" &&
              item.indicacao === "RENOVACAO"
            )
              return false;
          } else if (filtroDDD === "EXCLUSO_11_RENOVACAO_E_FORA_ESTADO") {
            if (
              item.ddd_predominante === "11" &&
              item.indicacao === "RENOVACAO"
            )
              return false;
            const dddNum = Number(item.ddd_predominante);
            if (dddNum < 11 || dddNum > 19) return false;
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

        // Correção de segurança: Uso do Optional Chaining (?.) para evitar quebras em dados undefined
        if (filtroClassificacao !== "TODOS") {
          if (filtroClassificacao === "SEM_CLASSIFICACAO") {
            if (
              item.classificacao_contrato !== null &&
              item.classificacao_contrato?.trim() !== ""
            )
              return false;
          } else {
            if (item.classificacao_contrato !== filtroClassificacao)
              return false;
          }
        }

        if (filtroDataFim !== "") {
          if (!item.dt_fim_contrato) return false;
          // Prevenção extra para garantir que o formato suporta o substring corretamente
          if (String(item.dt_fim_contrato).substring(0, 10) !== filtroDataFim)
            return false;
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

    const aplicarRegrasCarteira = (array: any[]) => {
      return array.filter((item) => {
        if (
          filtroSituacao !== "TODOS" &&
          item.claro_situacao !== filtroSituacao
        )
          return false;
        if (filtroPiperun === "SIM" && item.crm !== true) return false;
        if (filtroPiperun === "NAO" && item.crm === true) return false;
        if (filtroAtivo === "SIM" && item.claro_ativo !== true) return false;
        if (filtroAtivo === "NAO" && item.claro_ativo === true) return false;
        if (filtroExclusivo === "SIM" && item.exclusivo !== true) return false;
        if (filtroExclusivo === "NAO" && item.exclusivo === true) return false;

        // --- LÓGICA INVERTIDA CPC NA CARTEIRA ---
        const isCpcPendente =
          item.cpc !== undefined ? item.cpc : item.flag_cpc_servico;
        if (filtroFlagCpc === "SIM" && isCpcPendente === true) return false;
        if (filtroFlagCpc === "NAO" && isCpcPendente === false) return false;

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
              item.classificacao_contrato?.trim() !== ""
            )
              return false;
          } else {
            if (item.classificacao_contrato !== filtroClassificacao)
              return false;
          }
        }

        if (filtroDataFim !== "") {
          if (!item.dt_fim_contrato) return false;
          if (String(item.dt_fim_contrato).substring(0, 10) !== filtroDataFim)
            return false;
        }

        if (filtroCpcAtivo) {
          const diasCpc = calcularDiasPassados(item.dt_leitura_cpc);
          if (diasCpc === null || diasCpc > filtroCpcValor) return false;
        }

        if (tipoFiltroLinha !== "NONE") {
          const qtdeLinhasAvaliada = Math.max(
            Number(item.qtd_linhas_total || 0),
            Number(item.qtd_servico_claro || 0),
          );
          if (tipoFiltroLinha === "RANGE") {
            if (
              qtdeLinhasAvaliada < filtroLinhasRangeMin ||
              qtdeLinhasAvaliada > filtroLinhasRangeMax
            )
              return false;
          } else if (tipoFiltroLinha === "EXACT") {
            if (qtdeLinhasAvaliada !== filtroLinhasExact) return false;
          }
        }

        if (filtroDDD !== "TODOS" && item.numero_linha) {
          const dddStr = String(item.numero_linha).substring(0, 2);
          const dddNum = Number(dddStr);
          if (filtroDDD === "FORA_SP") {
            if (dddNum >= 11 && dddNum <= 19) return false;
          } else if (filtroDDD === "EXCLUSO_11_RENOVACAO") {
            if (dddStr === "11" && item.indicacao === "RENOVACAO") return false;
          } else if (filtroDDD === "EXCLUSO_11_RENOVACAO_E_FORA_ESTADO") {
            if (dddStr === "11" && item.indicacao === "RENOVACAO") return false;
            if (dddNum < 11 || dddNum > 19) return false;
          } else {
            if (dddStr !== filtroDDD) return false;
          }
        }
        return true;
      });
    };

    setDadosFiltrados({
      renovacao: aplicarRegrasServicos(dadosBrutos.renovacao),
      portabilidade: aplicarRegrasServicos(dadosBrutos.portabilidade),
      fora_prazo: aplicarRegrasServicos(dadosBrutos.fora_prazo),
      aquecendo: aplicarRegrasServicos(dadosBrutos.aquecendo),
      prazo_limitado: aplicarRegrasServicos(dadosBrutos.prazo_limitado),
      prazo_excedido: aplicarRegrasServicos(dadosBrutos.prazo_excedido),
    });

    setCarteiraFiltrada(aplicarRegrasCarteira(carteiraBruta));
  };

  const limparFiltros = () => {
    setFiltroSituacao("TODOS");
    setFiltroFlagCpc("TODOS");
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
    setCarteiraFiltrada(carteiraBruta);
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

  const totaisCarteira = useMemo(() => {
    let renovacao = 0,
      portabilidade = 0,
      fora_prazo = 0,
      aquecendo = 0,
      prazo_limitado = 0,
      prazo_excedido = 0,
      cancelados_inviavel = 0;
    carteiraFiltrada.forEach((item) => {
      if (
        item.dt_leitura_cpc !== null &&
        item.claro_situacao === null &&
        item.numero_linha === null
      )
        cancelados_inviavel++;
      if (item.indicacao === "RENOVACAO") renovacao++;
      if (item.indicacao === "PORTABILIDADE") portabilidade++;
      if (item.indicacao === "FORA DO PRAZO") fora_prazo++;
      if (item.indicacao === "AQUECENDO") aquecendo++;
      if (item.indicacao === "PRAZO LIMITADO") prazo_limitado++;
      if (item.indicacao === "PRAZO EXCEDIDO") prazo_excedido++;
    });
    return {
      renovacao,
      portabilidade,
      fora_prazo,
      aquecendo,
      prazo_limitado,
      prazo_excedido,
      cancelados_inviavel,
      geral: carteiraFiltrada.length,
    };
  }, [carteiraFiltrada]);

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
      if (h.consultor_nome && h.consultor_nome.trim() !== "") {
        const nome = h.consultor_nome;
        map.set(nome, (map.get(nome) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [historicoFiltrado]);

  const exportToImage = async (elementId?: string, fileNamePrefix?: string) => {
    const element = elementId
      ? document.getElementById(elementId)
      : dashboardRef.current;
    if (!element) {
      setNotification(
        "Erro: Não foi possível localizar a área para exportação.",
      );
      return;
    }
    try {
      const nodeWidth = element.offsetWidth;
      const nodeHeight = element.offsetHeight;
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        backgroundColor: "#f8fafc",
        pixelRatio: 2,
        width: nodeWidth,
        height: nodeHeight,
        style: { overflow: "hidden" },
      });
      const link = document.createElement("a");
      const nomeArquivo = fileNamePrefix ? fileNamePrefix : "Analise_Dashboard";
      link.download = `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      setNotification(
        fileNamePrefix
          ? `Print exportado com sucesso!`
          : "Print da análise exportado com sucesso!",
      );
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error("Erro ao exportar imagem nativa:", err);
      setNotification("Erro ao gerar imagem da análise.");
    }
  };

  const getDataToExport = () => {
    if (modalExportacaoAberto === "carteira") return carteiraFiltrada;
    if (modalExportacaoAberto === "servicos") return todosServicosFiltrados;
    if (modalExportacaoAberto === "crm") return dadosPerdas;
    return historicoFiltrado;
  };

  const getFileName = () => {
    let prefix = "Base_Geral";
    if (modalExportacaoAberto === "carteira") prefix = "Base_Carteira";
    else if (modalExportacaoAberto === "servicos") prefix = "Base_Servicos";
    else if (modalExportacaoAberto === "historico") prefix = "Base_Historico";
    else if (modalExportacaoAberto === "crm") prefix = "Base_CRM_Perdas";
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
          .map(
            (k) =>
              `"${(row as any)[k] !== null && (row as any)[k] !== undefined ? (row as any)[k] : ""}"`,
          )
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
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Dados Exportados");
      const keys = Object.keys(data[0]);
      worksheet.columns = keys.map((key) => ({
        header: key.toUpperCase(),
        key: key,
        width: 25,
      }));
      data.forEach((item) => worksheet.addRow(item));
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
      alert("Houve um erro ao processar o arquivo XLSX.");
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
    doc.text(`Relatório Analítico de Base`, 40, 40);
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
        const payloadConsultoresFormatado: IConsultor[] = consultoresDB.map(
          (c) =>
            ({
              nome: c.nome,
              owner_id: c.codigo_crm,
              seq: c.codigo_crm || 0,
              email: "",
              perfil: String(c.perfil_indicacao)
                .trim()
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""),
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
        setNotification("Falha ao atualizar o gráfico do Pipeline.");
        setTimeout(() => setNotification(null), 5000);
      } finally {
        setLoadingBolhas(false);
      }
    },
    [consultoresDB],
  );

  const buscarRelatorioPerdasPeriodo = useCallback(
    async (isAutoLoad = false) => {
      if (!dataInicioPipe || !dataFimPipe) {
        setNotification("Por favor, selecione a Data de Início e Fim.");
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      if (consultoresDB.length === 0) return;

      setLoadingPerdas(true);
      try {
        const payloadConsultoresFormatado: IConsultor[] = consultoresDB.map(
          (c) =>
            ({
              nome: c.nome,
              owner_id: c.codigo_crm,
              seq: c.codigo_crm || 0,
              email: "",
              perfil: String(c.perfil_indicacao)
                .trim()
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""),
            }) as IConsultor,
        );

        const relatorio = await compilarRelatorioPerdas(
          payloadConsultoresFormatado,
          dataInicioPipe,
          dataFimPipe,
        );

        setDadosPerdas(relatorio);

        if (!isAutoLoad) {
          setNotification("Relatório de Oportunidades atualizado com sucesso!");
          setTimeout(() => setNotification(null), 3000);
        }
      } catch (error) {
        setNotification("Falha ao gerar o relatório.");
        setTimeout(() => setNotification(null), 3000);
      } finally {
        setLoadingPerdas(false);
      }
    },
    [consultoresDB, dataInicioPipe, dataFimPipe],
  );

  useEffect(() => {
    if (consultoresDB.length > 0 && !hasFetchedDefaultRelatorio.current) {
      fetchDadosBolhas();
      buscarRelatorioPerdasPeriodo(true);
      hasFetchedDefaultRelatorio.current = true;
    }
  }, [consultoresDB, fetchDadosBolhas, buscarRelatorioPerdasPeriodo]);

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
                  <Download className="w-5 h-5 text-primary" /> Exportar Dados (
                  {modalExportacaoAberto.toUpperCase()})
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

        <DashServicoClaro
          filtroFlagCpc={filtroFlagCpc}
          setFiltroFlagCpc={setFiltroFlagCpc}
          ultimaAtualizacao={ultimaAtualizacao}
          exportToImage={exportToImage}
          fetchTodasViews={() => fetchServicos(true)}
          loading={loadingServicos}
          limparFiltros={limparFiltros}
          aplicarFiltrosGlobais={aplicarFiltrosGlobais}
          setModalExportacaoAberto={setModalExportacaoAberto}
          filtroAtivo={filtroAtivo}
          setFiltroAtivo={setFiltroAtivo}
          filtroExclusivo={filtroExclusivo}
          setFiltroExclusivo={setFiltroExclusivo}
          filtroDDD={filtroDDD}
          setFiltroDDD={setFiltroDDD}
          filtroConsultor={filtroConsultor}
          setFiltroConsultor={setFiltroConsultor}
          listaConsultoresUnicos={listaConsultoresUnicos}
          filtroSituacao={filtroSituacao}
          setFiltroSituacao={setFiltroSituacao}
          filtroCarteira={filtroCarteira}
          setFiltroCarteira={setFiltroCarteira}
          filtroPiperun={filtroPiperun}
          setFiltroPiperun={setFiltroPiperun}
          filtroDataFim={filtroDataFim}
          setFiltroDataFim={setFiltroDataFim}
          filtroClassificacao={filtroClassificacao}
          setFiltroClassificacao={setFiltroClassificacao}
          tipoFiltroLinha={tipoFiltroLinha}
          setTipoFiltroLinha={setTipoFiltroLinha}
          filtroLinhasRangeMin={filtroLinhasRangeMin}
          setFiltroLinhasRangeMin={setFiltroLinhasRangeMin}
          filtroLinhasRangeMax={filtroLinhasRangeMax}
          setFiltroLinhasRangeMax={setFiltroLinhasRangeMax}
          filtroLinhasExact={filtroLinhasExact}
          setFiltroLinhasExact={setFiltroLinhasExact}
          maxLinhasGlobal={maxLinhasGlobal}
          filtroCpcAtivo={filtroCpcAtivo}
          setFiltroCpcAtivo={setFiltroCpcAtivo}
          filtroCpcValor={filtroCpcValor}
          setFiltroCpcValor={setFiltroCpcValor}
          maxDiasCpcGlobal={maxDiasCpcGlobal}
          totais={totais}
          CORES={CORES}
          renderCenterText={renderCenterText}
        />

        <div className="w-full max-w-7xl mx-auto space-y-6">
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
                    Lido CPC (SEM SERVIÇO)
                  </p>
                  <p className="text-xl font-black text-white">
                    {dadosFunilCpc?.total_passado_cpc_sem_servico || 0}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center leading-tight">
                    CPC + eDoc <br />
                    (SEM SERVIÇO E DRIVE)
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
                <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center text-center">
                    Disp. p/ CPC (SEM SERVICO)
                  </p>
                  <p className="text-xl font-black text-amber-400">
                    {dadosFunilCpc?.disp_cpc_sem_servico || 0}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center p-4 text-center transition-colors bg-slate-900 hover:bg-slate-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 line-clamp-2 h-7 flex items-center text-center">
                    Disp. p/ CPC + EDOC (LIDO NO EDOC)
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
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg shadow-sm transition-all hover:bg-slate-800">
              <h4 className="text-sm font-bold text-emerald-400 mb-1">CPC</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                São empresas que já foram lidas na aplicação de planos e linhas.
              </p>
            </div>
            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg shadow-sm transition-all hover:bg-slate-800">
              <h4 className="text-sm font-bold text-sky-400 mb-1">eDoc</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                São empresas que foram lidas na aplicação eDoc de contratos.
              </p>
            </div>
            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg shadow-sm transition-all hover:bg-slate-800">
              <h4 className="text-sm font-bold text-blue-400 mb-1">DRIVE</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                São as empresas que foram lidas e possuem CONTRATO.
              </p>
            </div>
            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg shadow-sm transition-all hover:bg-slate-800">
              <h4 className="text-sm font-bold text-purple-400 mb-1">
                Serviço Claro
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                São empresas que têm serviço (planos e linhas para
                trabalharmos).
              </p>
            </div>
          </div>
        </div>

        <hr className="w-full max-w-7xl mx-auto border-t-[6px] border-emerald-500 rounded-full opacity-80 my-8" />

        <DashCarteira
          filtroFlagCpc={filtroFlagCpc}
          setFiltroFlagCpc={setFiltroFlagCpc}
          ultimaAtualizacao={ultimaAtualizacao}
          exportToImage={exportToImage}
          fetchTodasViews={() => fetchCarteira(true)}
          loading={loadingCarteira}
          limparFiltros={limparFiltros}
          aplicarFiltrosGlobais={aplicarFiltrosGlobais}
          setModalExportacaoAberto={setModalExportacaoAberto}
          filtroAtivo={filtroAtivo}
          setFiltroAtivo={setFiltroAtivo}
          filtroExclusivo={filtroExclusivo}
          setFiltroExclusivo={setFiltroExclusivo}
          filtroDDD={filtroDDD}
          setFiltroDDD={setFiltroDDD}
          filtroConsultor={filtroConsultor}
          setFiltroConsultor={setFiltroConsultor}
          listaConsultoresUnicos={listaConsultoresUnicos}
          filtroSituacao={filtroSituacao}
          setFiltroSituacao={setFiltroSituacao}
          filtroPiperun={filtroPiperun}
          setFiltroPiperun={setFiltroPiperun}
          filtroDataFim={filtroDataFim}
          setFiltroDataFim={setFiltroDataFim}
          filtroClassificacao={filtroClassificacao}
          setFiltroClassificacao={setFiltroClassificacao}
          tipoFiltroLinha={tipoFiltroLinha}
          setTipoFiltroLinha={setTipoFiltroLinha}
          filtroLinhasRangeMin={filtroLinhasRangeMin}
          setFiltroLinhasRangeMin={setFiltroLinhasRangeMin}
          filtroLinhasRangeMax={filtroLinhasRangeMax}
          setFiltroLinhasRangeMax={setFiltroLinhasRangeMax}
          filtroLinhasExact={filtroLinhasExact}
          setFiltroLinhasExact={setFiltroLinhasExact}
          maxLinhasGlobal={maxLinhasGlobal}
          filtroCpcAtivo={filtroCpcAtivo}
          setFiltroCpcAtivo={setFiltroCpcAtivo}
          filtroCpcValor={filtroCpcValor}
          setFiltroCpcValor={setFiltroCpcValor}
          maxDiasCpcGlobal={maxDiasCpcGlobal}
          totais={totaisCarteira}
          CORES={CORES}
          renderCenterText={renderCenterText}
        />
        <hr className="w-full max-w-7xl mx-auto border-t-7 border-red-700 rounded-full" />
        <DashCrm
          loadingBolhas={loadingBolhas}
          dadosPipelineBolhas={dadosPipelineBolhas}
          fetchDadosBolhas={fetchDadosBolhas}
          CORES={CORES}
          renderCenterText={renderCenterText}
          dadosPerdas={dadosPerdas}
          viewModePerdas={viewModePerdas}
          setViewModePerdas={setViewModePerdas}
          dataInicioPipe={dataInicioPipe}
          setDataInicioPipe={setDataInicioPipe}
          dataFimPipe={dataFimPipe}
          setDataFimPipe={setDataFimPipe}
          buscarRelatorioPerdasPeriodo={buscarRelatorioPerdasPeriodo}
          loadingPerdas={loadingPerdas}
          exportToImage={exportToImage}
          setModalExportacaoAberto={setModalExportacaoAberto}
        />
        <hr className="w-full max-w-7xl mx-auto border-t-7 border-yellow-500 rounded-full opacity-80 my-8" />
        <DashHistorico
          historicoFiltrado={historicoFiltrado}
          limparFiltrosHistorico={limparFiltrosHistorico}
          aplicarFiltrosHistorico={aplicarFiltrosHistorico}
          setModalExportacaoAberto={setModalExportacaoAberto}
          filtroHistConsultor={filtroHistConsultor}
          setFiltroHistConsultor={setFiltroHistConsultor}
          listaConsultoresHistUnicos={listaConsultoresHistUnicos}
          filtroHistMotivo={filtroHistMotivo}
          setFiltroHistMotivo={setFiltroHistMotivo}
          listaMotivosUnicos={listaMotivosUnicos}
          dadosGraficoMotivo={dadosGraficoMotivo}
          dadosGraficoConsultor={dadosGraficoConsultor}
          CORES={CORES}
          exportToImage={exportToImage}
          fetchHistorico={() => fetchHistorico(true)}
          loading={loadingHistorico}
        />
      </main>
    </div>
  );
}
