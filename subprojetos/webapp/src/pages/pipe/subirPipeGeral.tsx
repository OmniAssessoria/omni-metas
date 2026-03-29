import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, Briefcase, RefreshCcw, ArrowRightLeft, Bell, RotateCw, Filter, ToggleLeft, ToggleRight, BookDashed } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import API from "@/services/api";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { PipeSubirPortabilidade } from "./subir_pipe/subirPipePortabilidade";
import { PipeSubirRenovacao } from "./subir_pipe/subirPipeRenovacao";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Calendar } from "lucide-react";
import { sincronizarDadosPipeRun } from "@/services/apiPiperunVolta";


export interface ITelaDetalhesProps {
    dados: IServicoPipeRun[];
    onBack: () => void;
}

export interface IApiResponse {
    status: boolean;
    mensagem: string;
    dados: IServicoPipeRun[];
}

type ViewState = 'geral' | 'renovacao' | 'portabilidade';

export default function PipeSubirGeral() {
    const { id } = useParams();
    const [view, setView] = useState<ViewState>('geral');
    const [loading, setLoading] = useState<boolean>(false);
    const [renovacoes, setRenovacoes] = useState<IServicoPipeRun[]>([]);
    const [portabilidades, setPortabilidades] = useState<IServicoPipeRun[]>([]);
    const [notification, setNotification] = useState<string | null>(null);
    const [filteredRenovacoes, setFilteredRenovacoes] = useState<IServicoPipeRun[]>([]);
    const [filteredPortabilidades, setFilteredPortabilidades] = useState<IServicoPipeRun[]>([]);
    const [filtroLinhasAtivo, setFiltroLinhasAtivo] = useState(false);
    const [filtroLinhasValor, setFiltroLinhasValor] = useState(0);
    const [filtroDataAtivo, setFiltroDataAtivo] = useState(false);
    const [filtroDataValor, setFiltroDataValor] = useState<number>(0);
    const [dataExtracao, setDataExtracao] = useState<string>(new Date().toISOString().split('T')[0]);
    const [syncing, setSyncing] = useState<boolean>(false);
    const COR_RENOVACAO = "#eab308";
    const COR_PORTABILIDADE = "#3b82f6";
    const COR_FUNDO = "#e5e7eb";

    // =========================================================================
    // 1. LÓGICA DE CACHE E BUSCA DE DADOS
    // =========================================================================
    const fetchServicos = useCallback(async (isManualRefresh = false) => {
        setLoading(true);
        try {
            if (!isManualRefresh) {
                const cachedRenovacao = sessionStorage.getItem('cache_renovacoes');
                const cachedPortabilidade = sessionStorage.getItem('cache_portabilidades');

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
                API.get<IApiResponse>('/api/servico-claro/piperun/renovacao'),
                API.get<IApiResponse>('/api/servico-claro/piperun/portabilidade')
            ]);

            const dadosR = resRenovacao.data.dados || [];
            const dadosP = resPortabilidade.data.dados || [];

            setRenovacoes(dadosR);
            setPortabilidades(dadosP);
            setFilteredRenovacoes(dadosR);
            setFilteredPortabilidades(dadosP);

            sessionStorage.setItem('cache_renovacoes', JSON.stringify(dadosR));
            sessionStorage.setItem('cache_portabilidades', JSON.stringify(dadosP));

            const msg = isManualRefresh ? "Dados atualizados e cacheados com sucesso!" : "Serviços sincronizados.";
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

    // =========================================================================
    // 2. LÓGICA MATEMÁTICA DOS FILTROS
    // =========================================================================
    const todosServicos = useMemo(() => [...renovacoes, ...portabilidades], [renovacoes, portabilidades]);

    const maxLinhas = useMemo(() => {
        if (todosServicos.length === 0) return 100;
        return Math.max(...todosServicos.map(s => s.qtd_servico_claro || 0));
    }, [todosServicos]);

    const { minDateTs, maxDateTs } = useMemo(() => {
        if (todosServicos.length === 0) return { minDateTs: Date.now() - 86400000, maxDateTs: Date.now() };

        const timestamps = todosServicos
            .map(s => s.dt_ultima_leitura ? new Date(s.dt_ultima_leitura).getTime() : 0)
            .filter(ts => ts > 0);

        if (timestamps.length === 0) return { minDateTs: Date.now() - 86400000, maxDateTs: Date.now() };

        return {
            minDateTs: Math.min(...timestamps),
            maxDateTs: Math.max(...timestamps)
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

    const aplicarFiltros = () => {
        let filtradosR = [...renovacoes];
        let filtradosP = [...portabilidades];

        if (filtroLinhasAtivo) {
            filtradosR = filtradosR.filter(s => (s.qtd_servico_claro || 0) === filtroLinhasValor);
            filtradosP = filtradosP.filter(s => (s.qtd_servico_claro || 0) === filtroLinhasValor);
        }

        if (filtroDataAtivo) {
            filtradosR = filtradosR.filter(s => {
                if (!s.dt_ultima_leitura) return false;
                const ts = new Date(s.dt_ultima_leitura).getTime();
                return ts >= filtroDataValor;
            });
            filtradosP = filtradosP.filter(s => {
                if (!s.dt_ultima_leitura) return false;
                const ts = new Date(s.dt_ultima_leitura).getTime();
                return ts >= filtroDataValor;
            });
        }

        setFilteredRenovacoes(filtradosR);
        setFilteredPortabilidades(filtradosP);
    };

    // =========================================================================
    // 3. DADOS PARA OS GRÁFICOS (Baseados nos dados filtrados)
    // =========================================================================
    const totalR = filteredRenovacoes.length;
    const totalP = filteredPortabilidades.length;
    const totalGeral = totalR + totalP;


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

                <tspan
                    x="50%"
                    dy="2.5em"
                    fontSize="14"
                    fill="#6b7280"
                >
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

        setSyncing(true);
        setNotification(`Iniciando extração do PipeRun para o dia ${new Date(dataExtracao).toLocaleDateString()}... Isso pode levar alguns minutos.`);

        try {
            const resultado = await sincronizarDadosPipeRun(dataExtracao);

            setNotification(resultado.mensagem);
            setTimeout(() => setNotification(null), 8000);
            await fetchServicos(true);

        } catch (error: any) {
            console.error("Erro na sincronização:", error);
            setNotification(error.message || "Erro crítico ao sincronizar com PipeRun.");
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setSyncing(false);
        }
    }

    if (view === 'renovacao') return <PipeSubirRenovacao dados={renovacoes} onBack={() => setView('geral')} />;
    if (view === 'portabilidade') return <PipeSubirPortabilidade dados={portabilidades} onBack={() => setView('geral')} />;

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

                <div className="flex pt-20 w-full items-center justify-between border-b border-border pb-6 max-w-6xl">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex flex-col gap-3 w-full">
                            <h1 className="text-3xl font-bold">Visão Geral dos Serviços Disponíveis ao PipeRun</h1>
                            <div className="flex flex-col sm:flex-row gap-3 items-center w-full mt-2">
                                <div className="flex items-center border border-input bg-background rounded-md h-10 px-3 shadow-sm w-full sm:w-auto">
                                    <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                                    <input
                                        type="date"
                                        className="bg-transparent border-none outline-none text-sm text-foreground w-full"
                                        value={dataExtracao}
                                        onChange={(e) => setDataExtracao(e.target.value)}
                                        disabled={syncing}
                                    />
                                </div>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-10 px-5 text-base w-full sm:w-auto shadow-md transition-all"
                                    onClick={sincronizarDados}
                                    disabled={syncing}
                                >
                                    {syncing ? (
                                        <><RotateCw className="mr-2 h-4 w-4 animate-spin" /> Sincronizando PipeRun...</>
                                    ) : (
                                        <><ArrowRightLeft className="mr-2 h-4 w-4" /> Sincronizar dados Piperun com DB</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="outline" size="icon"
                        className={`rounded-full h-12 w-12 shadow-sm ${loading ? 'opacity-50' : ''}`}
                        onClick={() => fetchServicos(true)} disabled={loading} title="Atualizar dados na API"
                    >
                        <RotateCw className={`h-5 w-5 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                    </Button>
                </div>

                <div className="w-full flex flex-col gap-8 mt-8 max-w-6xl">
                    <div className="max-h-[300px] overflow-y-auto pr-2 pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="hover:border-primary/50 transition-colors">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Renovação</CardTitle>
                                    <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-4xl font-bold">{loading ? "..." : renovacoes.length}</p></CardContent>
                            </Card>

                            <Card className="hover:border-primary/50 transition-colors">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Portabilidade</CardTitle>
                                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-4xl font-bold">{loading ? "..." : portabilidades.length}</p></CardContent>
                            </Card>

                            <Card className="bg-primary shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-primary-foreground/90">Total Geral (Sem Filtro)</CardTitle>
                                    <Briefcase className="h-4 w-4 text-primary-foreground" />
                                </CardHeader>
                                <CardContent><p className="text-4xl font-bold text-primary-foreground">{loading ? "..." : renovacoes.length + portabilidades.length}</p></CardContent>
                            </Card>
                        </div>

                        <Card className="border-primary/30 mt-4 shadow-sm">
                            <CardContent className="flex flex-col sm:flex-row justify-center items-center gap-6 pb-6 pt-6">
                                <Button size="lg" className="h-20 px-10 text-lg w-full sm:w-auto shadow-md" onClick={() => setView('renovacao')}>
                                    <RefreshCcw className="mr-2 h-5 w-5" /> Tela de Renovação
                                </Button>
                                <Button size="lg" variant="outline" className="h-16 px-10 text-lg w-full sm:w-auto shadow-md" onClick={() => setView('portabilidade')}>
                                    <ArrowRightLeft className="mr-2 h-5 w-5" /> Tela de Portabilidade
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <hr className="border-border my-2" />

                    {/* ========================================================= */}
                    {/* ÁREA DE FILTROS */}
                    {/* ========================================================= */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Filter className="h-5 w-5 text-primary" /> Filtros Avançados para Gráficos
                            </h2>
                            <Button onClick={aplicarFiltros} className="px-8 cursor-pointer shadow-md">
                                Aplicar Filtros
                            </Button>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center gap-4 relative">
                                <button onClick={() => setFiltroLinhasAtivo(!filtroLinhasAtivo)} className="cursor-pointer text-primary hover:text-primary/80 transition-colors">
                                    {filtroLinhasAtivo ? <ToggleRight className="h-8 w-8 text-green-500 cursor-pointer" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground cursor-pointer" />}
                                </button>
                                <div className="flex-1 relative group">
                                    <p className="text-sm font-medium mb-2 text-muted-foreground">Quantidade de Linhas (0 a {maxLinhas})</p>
                                    <div
                                        className={`absolute cursor-pointer -top-1 bg-red-600 text-white text-xs px-2 py-1 cursor-pointer rounded transition-opacity ${filtroLinhasAtivo ? 'opacity-100' : 'opacity-50'}`}
                                        style={{ left: `calc(${(filtroLinhasValor / (maxLinhas || 1)) * 100}% - 12px)` }}
                                    >
                                        {filtroLinhasValor}
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max={maxLinhas}
                                        value={filtroLinhasValor}
                                        onChange={(e) => setFiltroLinhasValor(Number(e.target.value))}
                                        disabled={!filtroLinhasAtivo}
                                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-colors ${filtroLinhasAtivo ? 'bg-red-200 accent-red-600' : 'bg-gray-200 accent-gray-400'}`}
                                        style={{ accentColor: filtroLinhasAtivo ? 'red' : 'gray' }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 relative">
                                <button onClick={() => setFiltroDataAtivo(!filtroDataAtivo)} className="cursor-pointer text-primary hover:text-primary/80 transition-colors">
                                    {filtroDataAtivo ? <ToggleRight className="h-8 w-8 text-green-500" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                                </button>
                                <div className="flex-1 relative group">
                                    <p className="text-sm font-medium mb-2 text-muted-foreground">Data da Última Leitura</p>

                                    <div
                                        className={`absolute -top-1 bg-red-600 text-white text-xs px-2 py-1 rounded transition-opacity flex items-center gap-1 whitespace-nowrap ${filtroDataAtivo ? 'opacity-100' : 'opacity-50'}`}
                                        style={{ left: `calc(${((filtroDataValor - minDateTs) / (maxDateTs - minDateTs || 1)) * 100}% - 20px)` }}
                                    >
                                        {new Date(filtroDataValor).toLocaleDateString()}
                                        <span className="bg-white text-red-600 px-1 rounded font-bold text-[10px] ml-1">
                                            {calcularDiasAtras(filtroDataValor)} Dias
                                        </span>
                                    </div>

                                    <input
                                        type="range"
                                        min={minDateTs} max={maxDateTs} step={86400000}
                                        value={filtroDataValor}
                                        onChange={(e) => setFiltroDataValor(Number(e.target.value))}
                                        disabled={!filtroDataAtivo}
                                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-colors ${filtroDataAtivo ? 'bg-red-200 accent-red-600' : 'bg-gray-200 accent-gray-400'}`}
                                        style={{ accentColor: filtroDataAtivo ? 'red' : 'gray' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* ÁREA DOS GRÁFICOS */}
                    {/* ========================================================= */}
                    <div className="bg-card border border-border rounded-xl p-2 shadow-sm flex flex-col items-center gap-3">
                        <div className="w-full flex flex-col md:flex-row justify-around items-center gap-3">
                            <div className="w-full md:w-1/2 flex flex-col items-center">
                                <h3 className="text-xl font-bold text-muted-">Renovação</h3>
                                <div className="w-64 h-64">foreground
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[{ name: 'Renovação', value: totalR }, { name: 'Vazio', value: totalR === 0 ? 1 : 0 }]}
                                                cx="50%" cy="50%"
                                                innerRadius={70} outerRadius={90}
                                                dataKey="value" stroke="none"
                                            >
                                                <Cell fill={COR_RENOVACAO} />
                                                <Cell fill={COR_FUNDO} />
                                            </Pie>
                                            {renderCenterText(totalR, "Serviços")}
                                            <RechartsTooltip formatter={(val: any) => val === 0 && totalR === 0 ? [0, 'Renovação'] : [val, 'Renovação']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 flex flex-col items-center">
                                <h3 className="text-xl font-bold text-muted-foreground">Portabilidade</h3>
                                <div className="w-64 h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[{ name: 'Portabilidade', value: totalP }, { name: 'Vazio', value: totalP === 0 ? 1 : 0 }]}
                                                cx="50%" cy="50%"
                                                innerRadius={70} outerRadius={90}
                                                dataKey="value" stroke="none"
                                            >
                                                <Cell fill={COR_PORTABILIDADE} />
                                                <Cell fill={COR_FUNDO} />
                                            </Pie>
                                            {renderCenterText(totalP, "Serviços")}
                                            <RechartsTooltip formatter={(val: any) => val === 0 && totalP === 0 ? [0, 'Portabilidade'] : [val, 'Portabilidade']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                        <div className="w-full flex flex-col items-center border-t border-border p-4">
                            <h3 className="text-2xl font-bold">Total Geral Filtrado</h3>
                            <div className="w-80 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Renovação', value: totalR },
                                                { name: 'Portabilidade', value: totalP },
                                                ...(totalGeral === 0 ? [{ name: 'Sem Dados', value: 1 }] : [])
                                            ]}
                                            cx="50%" cy="50%"
                                            innerRadius={90} outerRadius={120}
                                            dataKey="value" stroke="none"
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
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: COR_RENOVACAO }}></div> <span className="text-sm">Renovação</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: COR_PORTABILIDADE }}></div> <span className="text-sm">Portabilidade</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
