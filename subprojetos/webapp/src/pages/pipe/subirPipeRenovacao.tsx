import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, UploadCloud, Loader2, Building2, AlertCircle, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import API from "@/helpers/api";
import { ITelaDetalhesProps } from "./subirPipeGeral";
import ConsultorBD from "@/interfaces/consutorDb.interface";

export function PipeSubirRenovacao({ dados, onBack }: ITelaDetalhesProps) {
    const [consultorSelecionado, setConsultorSelecionado] = useState<number | null>(null);
    const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
    const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);
    const [isEnviando, setIsEnviando] = useState(false);

    // 1. Busca de Consultores com Cache (SessionStorage)
    // Reutilizamos a mesma chave de cache para otimizar a transição entre telas
    useEffect(() => {
        async function fetchConsultores() {
            try {
                setIsCarregandoConsultores(true);
                const cacheKey = "consultores_geral_cache"; // Nome genérico para servir ambas as telas
                const cachedData = sessionStorage.getItem(cacheKey);

                if (cachedData) {
                    setConsultores(JSON.parse(cachedData));
                    return;
                }

                const response = await API.get("/api/consultores");
                const listaConsultores = response.data?.dados ?? [];

                setConsultores(listaConsultores);
                sessionStorage.setItem(cacheKey, JSON.stringify(listaConsultores));

            } catch (error) {
                console.error("Erro ao buscar consultores para renovação:", error);
            } finally {
                setIsCarregandoConsultores(false);
            }
        }

        fetchConsultores();
    }, []);

    // 2. Manipulação de Estado Derivado
    const handleConsultorChange = (id: string) => {
        setConsultorSelecionado(Number(id));
    };

    const consultorAtual = consultores.find(c => c.seq_consultor === consultorSelecionado);

    // Filtra os serviços apenas do consultor selecionado usando useMemo para performance
    const dadosFiltrados = useMemo(() => {
        if (!consultorSelecionado) return [];
        return dados.filter(item => item.seq_consultor === consultorSelecionado);
    }, [dados, consultorSelecionado]);

    // Prepara os dados para o Gráfico do Recharts
    const dadosGrafico = useMemo(() => {
        return dadosFiltrados.map(item => ({
            empresa: item.razao || "Empresa sem Razão",
            linhas: item.qtd_servico_claro || 0,
            cnpj: item.cnpj
        }));
    }, [dadosFiltrados]);

    // 3. Função de Envio para a API do PipeRun (Específica para Renovação)
    const handleSubirServicos = async () => {
        if (!consultorSelecionado || dadosFiltrados.length === 0) return;

        try {
            setIsEnviando(true);

            let sucessos = 0;
            let falhas = 0;

            for (const servico of dadosFiltrados) {
                try {
                    // Aqui você pode ter uma rota específica para renovação, caso o funil ou a tag no PipeRun seja diferente
                    await API.post("/api/piperun/integrar_renovacao", {
                        dados_servico: servico,
                        id_consultor: consultorSelecionado,
                        tipo_operacao: "RENOVACAO"
                    });
                    sucessos++;
                } catch (err) {
                    console.error(`Erro ao subir serviço de renovação da empresa ${servico.razao}:`, err);
                    falhas++;
                }
            }

            alert(`Processo de Renovação finalizado!\nSucesso: ${sucessos}\nFalhas: ${falhas}`);

        } catch (error) {
            console.error("Erro geral ao processar a subida de renovação:", error);
            alert("Ocorreu um erro crítico ao tentar subir os dados de renovação.");
        } finally {
            setIsEnviando(false);
        }
    };

    return (
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            <div className="w-[280px] h-full flex-shrink-0 border-r border-border">
                <Sidebar />
            </div>

            <main className="flex-1 h-full overflow-y-auto p-10 bg-muted/10">
                <Button variant="ghost" onClick={onBack} className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel Geral
                </Button>

                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <RefreshCw className="h-8 w-8 text-blue-500" />
                            <h1 className="text-3xl font-bold tracking-tight">Detalhes de Renovação</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Gerenciando <span className="font-semibold text-blue-500">{dados.length}</span> serviços globais de renovação aguardando subida ao PipeRun.
                        </p>
                    </div>

                    {/* Área de Ação Principal */}
                    <div className="flex items-center gap-3">
                        <div className="w-64">
                            <Select onValueChange={handleConsultorChange} disabled={isCarregandoConsultores}>
                                <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-blue-500 text-foreground">
                                    <SelectValue placeholder={isCarregandoConsultores ? "Carregando..." : "Filtrar por Consultor"} />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border text-popover-foreground">
                                    {consultores.map((c) => (
                                        <SelectItem key={c.seq_consultor} value={String(c.seq_consultor)}>
                                            {c.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleSubirServicos}
                            disabled={!consultorSelecionado || dadosFiltrados.length === 0 || isEnviando}
                            className="h-10 px-6 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isEnviando ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UploadCloud className="mr-2 h-4 w-4" />
                            )}
                            {isEnviando ? "Processando..." : "Subir Renovações"}
                        </Button>
                    </div>
                </header>

                <div className="space-y-6">
                    {/* Visualização de Dados */}
                    <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b pb-4">
                            <Users size={20} className="text-blue-500" />
                            <h2 className="text-lg font-semibold">
                                {consultorAtual
                                    ? `Carteira do Consultor: ${consultorAtual.nome} (Renovação)`
                                    : "Visão do Consultor"}
                            </h2>
                        </div>

                        {!consultorSelecionado ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <AlertCircle size={48} className="mb-4 opacity-20" />
                                <p>Nenhum dado de renovação carregado no momento.</p>
                                <p className="text-sm">Escolha um consultor no menu acima para exibir os clientes aptos à renovação.</p>
                            </div>
                        ) : dadosFiltrados.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <p>Este consultor não possui serviços de renovação na fila no momento.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* GRÁFICO: Linhas por Empresa */}
                                <div className="h-[300px] w-full border rounded-lg p-4 bg-muted/5">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                                        <Building2 size={16} /> Volume de Linhas a Renovar por Empresa
                                    </h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
                                            {/* CORREÇÃO DO TYPESCRIPT APLICADA AQUI ABAIXO */}
                                            <XAxis
                                                dataKey="empresa"
                                                tick={{ fontSize: 12 }}
                                                tickFormatter={(value: string) => value ? value.substring(0, 15) + "..." : ""}
                                            />
                                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                            <Tooltip
                                                cursor={{ fill: '#88888811' }}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            />
                                            <Bar
                                                dataKey="linhas"
                                                fill="#3b82f6" // Cor azul para diferenciar da portabilidade visualmente
                                                radius={[4, 4, 0, 0]}
                                                name="Qtd de Linhas"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* TABELA: Detalhamento dos Serviços */}
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Empresa (Razão Social)</TableHead>
                                                <TableHead>CNPJ</TableHead>
                                                <TableHead>Classificação</TableHead>
                                                <TableHead className="text-center">Qtd. Linhas</TableHead>
                                                <TableHead className="text-right">Fim Contrato</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {dadosFiltrados.map((item) => (
                                                <TableRow key={`${item.seq_empresa}-${item.seq_claro}`}>
                                                    <TableCell className="font-medium max-w-[200px] truncate" title={item.razao}>
                                                        {item.razao}
                                                    </TableCell>
                                                    <TableCell>{item.cnpj}</TableCell>
                                                    <TableCell>
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                                            {item.classificacao_contrato || "N/A"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-blue-600 dark:text-blue-400">
                                                        {item.qtd_servico_claro}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.dt_fim_contrato ? new Date(item.dt_fim_contrato).toLocaleDateString('pt-BR') : "Não informado"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}