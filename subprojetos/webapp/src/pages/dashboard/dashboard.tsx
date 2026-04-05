import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    Database
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
} from "recharts";
import API from "@/services/api";

export interface IServicoViewAPI {
    seq_claro: number;
    indicacao: string;
    situacao: string;
    classificacao_contrato: string;
    dt_ultima_leitura_servico: string;
    empresa_razao: string;
    consultor_nome: string | null;
    qtd_linhas_total: number;
    flag_crm_servico: boolean;
    flag_cpc_servico: boolean;
    carteira: string | null;
}

interface IApiResponseView {
    status: boolean;
    mensagem: string;
    dados: IServicoViewAPI[];
}

type ViewState = "geral" | "renovacao" | "portabilidade";
type TipoCarteiraFilter = "TODOS" | "COM_CARTEIRA" | "SEM_CARTEIRA";
type TipoSituacaoFilter = "TODOS" | "ABERTO" | "INVIAVEL" | "TEMPORARIO" | "PAUSADO" | "GANHO" | "BLACKLIST";

type DadosPorIndicacao = {
    renovacao: IServicoViewAPI[];
    portabilidade: IServicoViewAPI[];
    fora_prazo: IServicoViewAPI[];
    prazo_limitado: IServicoViewAPI[];
    prazo_excedido: IServicoViewAPI[];
};

export default function DashboardAnaliticoMultiView() {
    const [view, setView] = useState<ViewState>("geral");
    const [loading, setLoading] = useState<boolean>(true);
    const [notification, setNotification] = useState<string | null>(null);

    const [dadosBrutos, setDadosBrutos] = useState<DadosPorIndicacao>({
        renovacao: [], portabilidade: [], fora_prazo: [], prazo_limitado: [], prazo_excedido: []
    });

    const [dadosFiltrados, setDadosFiltrados] = useState<DadosPorIndicacao>({
        renovacao: [], portabilidade: [], fora_prazo: [], prazo_limitado: [], prazo_excedido: []
    });

    const [filtroSituacao, setFiltroSituacao] = useState<TipoSituacaoFilter>("TODOS");
    const [filtroCarteira, setFiltroCarteira] = useState<TipoCarteiraFilter>("TODOS");
    const [filtroLinhasAtivo, setFiltroLinhasAtivo] = useState(false);
    const [filtroLinhasValor, setFiltroLinhasValor] = useState(0);

    const CORES = {
        renovacao: "#eab308",
        portabilidade: "#3b82f6",
        fora_prazo: "#ef4444",
        prazo_limitado: "#f97316",
        prazo_excedido: "#8b5cf6",
        vazio: "#e5e7eb"
    };

    const fetchTodasViews = useCallback(async () => {
        setLoading(true);
        try {
            const [resRenov, resPort, resFora, resLim, resExc] = await Promise.all([
                API.get<IApiResponseView>("/api/servico-claro/dashboard/indicacao/renovacao"),
                API.get<IApiResponseView>("/api/servico-claro/dashboard/indicacao/portabilidade"),
                API.get<IApiResponseView>("/api/servico-claro/dashboard/indicacao/fora-do-prazo"),
                API.get<IApiResponseView>("/api/servico-claro/dashboard/indicacao/prazo-limitado"),
                API.get<IApiResponseView>("/api/servico-claro/dashboard/indicacao/prazo-excedido")
            ]);

            const payload: DadosPorIndicacao = {
                renovacao: resRenov.data.dados || [],
                portabilidade: resPort.data.dados || [],
                fora_prazo: resFora.data.dados || [],
                prazo_limitado: resLim.data.dados || [],
                prazo_excedido: resExc.data.dados || []
            };

            setDadosBrutos(payload);
            setDadosFiltrados(payload);

            setNotification("Todas as bases de indicação carregadas com sucesso!");
            setTimeout(() => setNotification(null), 4000);
        } catch (error) {
            console.error("Erro Crítico ao buscar múltiplas views:", error);
            setNotification("Falha ao comunicar com o servidor. Verifique os logs.");
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTodasViews();
    }, [fetchTodasViews]);

    const maxLinhasGlobal = useMemo(() => {
        const todosServicos = [
            ...dadosBrutos.renovacao, ...dadosBrutos.portabilidade,
            ...dadosBrutos.fora_prazo, ...dadosBrutos.prazo_limitado, ...dadosBrutos.prazo_excedido
        ];
        if (todosServicos.length === 0) return 100;
        return Math.max(...todosServicos.map(s => Number(s.qtd_linhas_total) || 0));
    }, [dadosBrutos]);

    const aplicarFiltrosGlobais = () => {
        const aplicarRegras = (array: IServicoViewAPI[]) => {
            return array.filter(item => {
                if (filtroSituacao !== "TODOS" && item.situacao !== filtroSituacao) return false;
                if (filtroCarteira === "COM_CARTEIRA" && (!item.consultor_nome || item.consultor_nome.trim() === "")) return false;
                if (filtroCarteira === "SEM_CARTEIRA" && (item.consultor_nome && item.consultor_nome.trim() !== "")) return false;
                if (filtroLinhasAtivo && Number(item.qtd_linhas_total || 0) !== filtroLinhasValor) return false;
                return true;
            });
        };

        setDadosFiltrados({
            renovacao: aplicarRegras(dadosBrutos.renovacao),
            portabilidade: aplicarRegras(dadosBrutos.portabilidade),
            fora_prazo: aplicarRegras(dadosBrutos.fora_prazo),
            prazo_limitado: aplicarRegras(dadosBrutos.prazo_limitado),
            prazo_excedido: aplicarRegras(dadosBrutos.prazo_excedido)
        });
    };

    const totais = useMemo(() => {
        const tr = dadosFiltrados.renovacao.length;
        const tp = dadosFiltrados.portabilidade.length;
        const tf = dadosFiltrados.fora_prazo.length;
        const tl = dadosFiltrados.prazo_limitado.length;
        const te = dadosFiltrados.prazo_excedido.length;
        return {
            renovacao: tr,
            portabilidade: tp,
            fora_prazo: tf,
            prazo_limitado: tl,
            prazo_excedido: te,
            geral: tr + tp + tf + tl + te
        };
    }, [dadosFiltrados]);

    const renderCenterText = (value: number, label: string) => (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
            <tspan x="50%" dy="-0.2em" fontSize="26" fontWeight="bold" fill="#374151">{value}</tspan>
            <tspan x="50%" dy="1.5em" fontSize="11" fill="#6b7280">{label}</tspan>
        </text>
    );

    const renderMiniGrafico = (titulo: string, valor: number, corGrafico: string) => {
        const isVazio = valor === 0;
        const dataGrafico = [
            { name: titulo, value: isVazio ? 1 : valor, fill: isVazio ? CORES.vazio : corGrafico }
        ];

        return (
            <div className="flex flex-col items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-sm font-bold text-slate-700 text-center mb-2 h-10 flex items-center justify-center uppercase tracking-wide">
                    {titulo}
                </h3>
                <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={dataGrafico}
                                cx="50%" cy="50%" innerRadius={50} outerRadius={70}
                                dataKey="value" stroke="none"
                            >
                                <Cell fill={dataGrafico[0].fill} />
                            </Pie>
                            {renderCenterText(valor, "Serviços")}
                            <RechartsTooltip
                                formatter={() => isVazio ? [0, titulo] : [valor, titulo]}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen w-screen flex bg-slate-50 text-slate-900 overflow-hidden">
            <div className="w-[280px] h-full flex-shrink-0">
                <Sidebar />
            </div>

            <main className="relative flex-1 h-full overflow-y-auto flex flex-col p-6 sm:p-10">

                {notification && (
                    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right-8 duration-300">
                        <Bell className="h-5 w-5 text-emerald-400" />
                        <p className="font-medium">{notification}</p>
                    </div>
                )}

                {loading && totais.geral === 0 && (
                    <div className="absolute inset-0 z-40 bg-slate-50/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-slate-700">Extraindo dados das Views...</h2>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 w-full max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Análise Multi-Views Operacional</h1>
                        <p className="text-slate-500 mt-1">Consumo direto do banco fatiado por Indicação e Situação.</p>
                    </div>
                </div>

                <div className="w-full max-w-7xl mx-auto space-y-6">

                    <Card className="border-none shadow-md bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                    <Filter className="h-5 w-5 text-primary" /> Filtros Globais Simultâneos
                                </h2>
                                <Button onClick={aplicarFiltrosGlobais} className="px-8 shadow-md hover:scale-105 transition-transform">
                                    Aplicar aos 5 Gráficos
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-sky-500" /> Situação do Atendimento
                                    </label>
                                    <select
                                        value={filtroSituacao}
                                        onChange={(e) => setFiltroSituacao(e.target.value as TipoSituacaoFilter)}
                                        className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                    >
                                        <option value="TODOS">Todas as Situações</option>
                                        <option value="ABERTO">Aberto (Em Negociação)</option>
                                        <option value="TEMPORARIO">Temporário (Aguardando 15d)</option>
                                        <option value="PAUSADO">Pausado (Aguardando 30d)</option>
                                        <option value="INVIAVEL">Inviável (Perdido)</option>
                                        <option value="GANHO">Ganho (Fechado)</option>
                                        <option value="BLACKLIST">Blacklist</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-emerald-500" /> Atribuição de Carteira
                                    </label>
                                    <select
                                        value={filtroCarteira}
                                        onChange={(e) => setFiltroCarteira(e.target.value as TipoCarteiraFilter)}
                                        className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-slate-50 focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                    >
                                        <option value="TODOS">Visão Mista (Com e Sem Consultor)</option>
                                        <option value="COM_CARTEIRA">Somente Clientes Atribuídos</option>
                                        <option value="SEM_CARTEIRA">Somente Clientes Avulsos</option>
                                    </select>
                                </div>

                                <div className="space-y-3 xl:col-span-1 md:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-amber-500" /> Escopo (Linhas)
                                        </label>
                                        <button onClick={() => setFiltroLinhasAtivo(!filtroLinhasAtivo)} className="text-primary hover:opacity-80 transition-opacity">
                                            {filtroLinhasAtivo ? <ToggleRight className="h-8 w-8 text-emerald-500" /> : <ToggleLeft className="h-8 w-8 text-slate-400" />}
                                        </button>
                                    </div>

                                    <div className={`relative pt-4 transition-opacity duration-300 ${filtroLinhasAtivo ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                        <div
                                            className="absolute -top-1 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg transition-all"
                                            style={{ left: `calc(${(filtroLinhasValor / (maxLinhasGlobal || 1)) * 100}% - 12px)` }}
                                        >
                                            {filtroLinhasValor}
                                        </div>
                                        <input
                                            type="range" min="0" max={maxLinhasGlobal}
                                            value={filtroLinhasValor}
                                            onChange={(e) => setFiltroLinhasValor(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <div className="flex justify-between text-xs text-slate-400 mt-2">
                                            <span>0</span>
                                            <span>{maxLinhasGlobal} Máx</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <PieChart className="h-6 w-6 text-primary" /> Visualização Comparativa por Indicação
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {renderMiniGrafico("Fora do Prazo", totais.fora_prazo, CORES.fora_prazo)}
                            {renderMiniGrafico("Renovação", totais.renovacao, CORES.renovacao)}
                            {renderMiniGrafico("Portabilidade", totais.portabilidade, CORES.portabilidade)}
                            {renderMiniGrafico("Prazo Excedido", totais.prazo_excedido, CORES.prazo_excedido)}
                            {renderMiniGrafico("Prazo Limitado", totais.prazo_limitado, CORES.prazo_limitado)}
                        </div>
                    </div>

                    <Card className="bg-slate-800 text-white border-none shadow-xl mt-8">
                        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between">
                            <div className="flex items-center gap-4 mb-4 md:mb-0">
                                <div className="bg-white/10 p-4 rounded-full">
                                    <Database className="h-8 w-8 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Volume Total Filtrado</p>
                                    <h3 className="text-4xl font-black">{totais.geral}</h3>
                                </div>
                            </div>

                            <div className="flex gap-6 text-sm">
                                <div className="text-right">
                                    <p className="text-slate-400 mb-1">Maior Volume Atual</p>
                                    <p className="font-bold flex items-center gap-2 text-amber-400">
                                        Renovação <span className="bg-white/20 px-2 py-1 rounded text-white">{totais.renovacao}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 mb-1">2º Maior Volume</p>
                                    <p className="font-bold flex items-center gap-2 text-blue-400">
                                        Portabilidade <span className="bg-white/20 px-2 py-1 rounded text-white">{totais.portabilidade}</span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
}
