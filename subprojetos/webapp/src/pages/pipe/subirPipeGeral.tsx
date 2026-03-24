import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, ArrowLeft, Briefcase, RefreshCcw, ArrowRightLeft, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import API from "@/helpers/api";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { PipeSubirPortabilidade } from "./subir_pipe/subirPipePortabilidade";
import { PipeSubirRenovacao } from "./subir_pipe/subirPipeRenovacao";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";

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
    const [loading, setLoading] = useState<boolean>(true);
    const [renovacoes, setRenovacoes] = useState<IServicoPipeRun[]>([]);
    const [portabilidades, setPortabilidades] = useState<IServicoPipeRun[]>([]);
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        if (renovacoes.length > 0 || portabilidades.length > 0) return;

        let isMounted = true;

        const fetchServicos = async () => {
            setLoading(true);
            try {
                const resRenovacao = await API.get<IApiResponse>('/api/servico-claro/piperun/renovacao');
                const resPortabilidade = await API.get<IApiResponse>('/api/servico-claro/piperun/portabilidade');
                
                if (isMounted) {
                    setRenovacoes(resRenovacao.data.dados || []);
                    setPortabilidades(resPortabilidade.data.dados || []);
                    setNotification("Serviços sincronizados com sucesso.");
                    setTimeout(() => setNotification(null), 5000);
                }
            } catch (error) {
                if (isMounted) {
                    console.error("Erro ao buscar serviços do PipeRun:", error);
                    setNotification("Falha ao buscar os serviços. Verifique a conexão.");
                    setTimeout(() => setNotification(null), 5000);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchServicos();

        return () => {
            isMounted = false;
        };
    }, []);

    const totalRenovacao = renovacoes.length;
    const totalPortabilidade = portabilidades.length;
    const totalServicos = totalRenovacao + totalPortabilidade;
    const nomeConsultor = renovacoes[0]?.consultor_nome || portabilidades[0]?.consultor_nome || "Consultor";

    if (view === 'renovacao') {
        return <PipeSubirRenovacao dados={renovacoes} onBack={() => setView('geral')} />;
    }

    if (view === 'portabilidade') {
        return <PipeSubirPortabilidade dados={portabilidades} onBack={() => setView('geral')} />;
    }

    return (
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            <div className="w-[280px] h-full flex-shrink-0">
                <Sidebar />
            </div>

            <main className="relative flex-1 h-full overflow-y-auto flex flex-col items-center justify-start p-6 sm:p-10">
                {notification && (
                    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-primary text-primary-foreground px-6 py-4 rounded-xl shadow-2xl border border-primary-foreground/10 animate-in slide-in-from-top-4 fade-in duration-300">
                        <div className="bg-background/20 p-2 rounded-full">
                            <Bell className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-sm sm:text-base">
                            {notification}
                        </p>
                    </div>
                )}

                <div className="flex pt-20 w-full items-center gap-4 border-b border-border pb-6">
                    <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
                        <UserCircle size={40} className="text-primary" />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{nomeConsultor}</h1>
                        <p className="text-muted-foreground">Visão Geral dos Serviços Disponíveis ao PipeRun</p>
                    </div>
                </div>

                <div className="flex w-full flex-col gap-8 mt-8 max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="hover:border-primary/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Total Renovação
                                </CardTitle>
                                <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">
                                    {loading ? "..." : totalRenovacao}
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
                                    {loading ? "..." : totalPortabilidade}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-primary shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-primary-foreground/90">
                                    Total de Serviços Geral
                                </CardTitle>
                                <Briefcase className="h-4 w-4 text-primary-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold text-primary-foreground">
                                    {loading ? "..." : totalServicos}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-primary/30 mt-4 shadow-sm">
                        <CardHeader className="text-center pt-8">
                            <CardTitle className="text-2xl font-bold tracking-tight uppercase text-foreground">
                                Acessar Detalhes dos Serviços
                            </CardTitle>
                            <p className="text-muted-foreground mt-2">
                                Selecione a categoria abaixo para visualizar e processar as oportunidades no PipeRun.
                            </p>
                        </CardHeader>

                        <CardContent className="flex flex-col sm:flex-row justify-center items-center gap-6 pb-10 pt-4">
                            <Button
                                size="lg"
                                className="h-16 px-10 text-lg w-full sm:w-auto shadow-md"
                                onClick={() => setView('renovacao')}
                                disabled={loading}
                            >
                                <RefreshCcw className="mr-2 h-5 w-5" />
                                Tela de Renovação
                            </Button>

                            <Button
                                size="lg"
                                variant="outline"
                                className="h-16 px-10 text-lg w-full sm:w-auto border-primary/50 hover:bg-primary/10 shadow-md"
                                onClick={() => setView('portabilidade')}
                                disabled={loading}
                            >
                                <ArrowRightLeft className="mr-2 h-5 w-5" />
                                Tela de Portabilidade
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}