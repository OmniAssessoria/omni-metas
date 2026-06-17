import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  RefreshCcw,
  ArrowRightLeft,
  Bell,
  Target,
  Rocket,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import API from "@/services/api";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";
import { extrairTelefonesEmpresaDaObservacao } from "@/utils/formatarTelefonesLinhasEmpresa.util";
import { extrairEFormatarTelefonesDecisor } from "@/utils/formatarTelefonesDecisor.util";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import { ModalGerarDisparo } from "./modal_gerar_disparo.tsx/modal_gerar_disparo";
export interface ITelaDetalhesProps {
  dados: IServicoPipeRun[];
  onBack: () => void;
}

export interface IApiResponse {
  status: boolean;
  mensagem: string;
  dados: IServicoPipeRun[];
}

interface IResumoConsultorMock {
  id: string;
  nome: string;
  qtdDisparado: number;
  qtdTemporario: number;
  qtdAtribuido: number;
}

type ViewState = "geral" | "gerar_disparo";

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
      item.observacao || ""
    );
    const resDecisor = extrairEFormatarTelefonesDecisor(
      item.decisor_numero || "",
      item.decisor_num_obs || ""
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

export default function Disparo() {
  const [view, setView] = useState<ViewState>("geral");
  const [loading, setLoading] = useState<boolean>(false);
  const [renovacoes, setRenovacoes] = useState<IServicoPipeRun[]>([]);
  const [portabilidades, setPortabilidades] = useState<IServicoPipeRun[]>([]);
  const [exclusivos, setExclusivos] = useState<IServicoPipeRun[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [filtroDataValor, setFiltroDataValor] = useState<number>(0);
  const [consultoresDB, setConsultoresDB] = useState<ConsultorBD[]>([]);

  const mockDadosTabela: IResumoConsultorMock[] = useMemo(() => {
    return Array.from({ length: 20 }).map((_, index) => ({
      id: `consultor-${index + 1}`,
      nome: `Consultor Mockado ${index + 1}`,
      qtdDisparado: Math.floor(Math.random() * 500) + 50,
      qtdTemporario: Math.floor(Math.random() * 200) + 10,
      qtdAtribuido: Math.floor(Math.random() * 300) + 20,
    }));
  }, []);

  const fetchServicos = useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    try {
      if (!isManualRefresh) {
        const cachedRenovacao = sessionStorage.getItem("cache_renovacoes");
        const cachedPortabilidade = sessionStorage.getItem(
          "cache_portabilidades"
        );
        const cachedExclusivos = sessionStorage.getItem("cache_exclusivos");

        if (cachedRenovacao && cachedPortabilidade && cachedExclusivos) {
          const parsedR = filtrarPorRegraGeral(
            JSON.parse(cachedRenovacao),
            "RENOVACAO"
          );
          const parsedP = filtrarPorRegraGeral(
            JSON.parse(cachedPortabilidade),
            "PORTABILIDADE"
          );
          const parsedE = filtrarPorRegraGeral(
            JSON.parse(cachedExclusivos),
            "EXCLUSIVO"
          );

          setRenovacoes(parsedR);
          setPortabilidades(parsedP);
          setExclusivos(parsedE);
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
        "Falha crítica ao buscar os serviços. Verifique a conexão."
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
    [renovacoes, portabilidades, exclusivos]
  );

  const { minDateTs, maxDateTs } = useMemo(() => {
    if (todosServicos.length === 0)
      return { minDateTs: Date.now() - 86400000, maxDateTs: Date.now() };

    const timestamps = todosServicos
      .map((s) =>
        s.dt_ultima_leitura ? new Date(s.dt_ultima_leitura).getTime() : 0
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

  if (view === "gerar_disparo")
    return <ModalGerarDisparo onBack={() => setView("geral")} />; 

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <div className="w-[280px] h-full flex-shrink-0">
        <Sidebar />
      </div>
      
      <main className="relative flex-1 h-full flex flex-col p-6 sm:p-10 overflow-hidden">
        {notification && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-primary text-primary-foreground px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
            <Bell className="h-5 w-5" />
            <p className="font-medium">{notification}</p>
          </div>
        )}

        <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto h-full">
          
          <div className="flex items-center justify-between shrink-0 mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
              <p className="text-muted-foreground mt-1">Visão geral dos disparos e performance da equipe.</p>
            </div>
            
            <Button 
              size="lg"
              onClick={() => setView("gerar_disparo")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 gap-2 h-12 px-6 text-base"
            >
              <Rocket className="w-5 h-5" />
              Central de Disparos
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Fixa / Renovação
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

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border border-border/50 shadow-sm">
            <CardHeader className="shrink-0 bg-muted/20 border-b border-border/50 py-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Desempenho de Disparos por Consultor
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 overflow-auto relative">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs uppercase bg-muted/80 text-muted-foreground sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold w-[40%]">
                      Consultor
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">
                      Qtd Disparado
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">
                      Qtd Temporário
                      <span className="block text-[10px] font-normal text-muted-foreground normal-case mt-0.5">
                        (Sem resposta)
                      </span>
                    </th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">
                      Qtd Atribuído
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {mockDadosTabela.map((row) => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-primary bg-primary/5 group-hover:bg-primary/10 transition-colors border-r border-border/50">
                        {row.nome}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums font-medium">
                        {row.qtdDisparado.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-amber-600 dark:text-amber-500 font-medium">
                        {row.qtdTemporario.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-emerald-600 dark:text-emerald-500 font-medium">
                        {row.qtdAtribuido.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
