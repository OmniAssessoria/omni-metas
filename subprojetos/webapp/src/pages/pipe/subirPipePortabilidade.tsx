import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, UploadCloud, Loader2, Building2, LayoutList } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import API from "@/helpers/api";
import { ITelaDetalhesProps } from "./subirPipeGeral";
import ConsultorBD from "@/interfaces/consutorDb.interface";

export function PipeSubirPortabilidade({ dados, onBack }: ITelaDetalhesProps) {
    const [consultorSelecionado, setConsultorSelecionado] = useState<number | null>(null);
    const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
    const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);
    const [isEnviando, setIsEnviando] = useState(false);

    useEffect(() => {
        async function fetchConsultores() {
            try {
                setIsCarregandoConsultores(true);
                const cacheKey = "consultores_portabilidade_cache";
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
                console.error("Erro ao buscar consultores:", error);
            } finally {
                setIsCarregandoConsultores(false);
            }
        }

        fetchConsultores();
    }, []);

    const handleConsultorChange = (id: string) => {
        setConsultorSelecionado(id === "todos" ? null : Number(id));
    };

    const consultorAtual = consultores.find(c => c.seq_consultor === consultorSelecionado);

    // Mapeamento otimizado para a tabela (Portabilidade)
    const mapaConsultores = useMemo(() => {
        const mapa = new Map<number, string>();
        consultores.forEach(c => mapa.set(Number(c.seq_consultor), c.nome));
        return mapa;
    }, [consultores]);

    const dadosFiltrados = useMemo(() => {
        if (!consultorSelecionado) return dados; 
        return dados.filter(item => item.seq_consultor === consultorSelecionado);
    }, [dados, consultorSelecionado]);

    const dadosGrafico = useMemo(() => {
        return dadosFiltrados.map(item => ({
            empresa: item.razao || "Empresa sem Razão",
            linhas: item.qtd_servico_claro || 0,
            cnpj: item.cnpj
        }));
    }, [dadosFiltrados]);

    const handleSubirServicos = async () => {
        if (!consultorSelecionado || dadosFiltrados.length === 0) return;

        try {
            setIsEnviando(true);
            let sucessos = 0;
            let falhas = 0;

            for (const servico of dadosFiltrados) {
                try {
                    await API.post("/api/piperun/integrar", {
                        dados_servico: servico,
                        id_consultor: consultorSelecionado
                    });
                    sucessos++;
                } catch (err) {
                    console.error(`Erro ao subir serviço da empresa ${servico.razao}:`, err);
                    falhas++;
                }
            }

            alert(`Processo finalizado!\nSucesso: ${sucessos}\nFalhas: ${falhas}`);
        } catch (error) {
            console.error("Erro geral ao processar a subida:", error);
            alert("Ocorreu um erro crítico ao tentar subir os dados.");
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
                        <h1 className="text-3xl font-bold mb-2 tracking-tight">Detalhes de Portabilidade</h1>
                        <p className="text-muted-foreground">
                            Visualizando <span className="font-semibold text-primary">{dadosFiltrados.length}</span> serviços {consultorSelecionado ? "deste consultor" : "no total"}.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSubirServicos}
                            disabled={!consultorSelecionado || dadosFiltrados.length === 0 || isEnviando}
                            className="h-10 px-6 shadow-sm"
                        >
                            {isEnviando ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UploadCloud className="mr-2 h-4 w-4" />
                            )}
                            {isEnviando ? "Processando..." : "Subir Serviços"}
                        </Button>
                    </div>
                </header>

                <div className="space-y-6">        
                  
                    <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b pb-4">
                            {consultorSelecionado ? <Users size={20} className="text-primary" /> : <LayoutList size={20} className="text-blue-500" />}
                            <h2 className="text-lg font-semibold">
                                {consultorAtual
                                    ? `Carteira do Consultor: ${consultorAtual.nome}`
                                    : "Todos os Serviços Disponíveis"}
                            </h2>
                            <div className="w-64">
                                <Select onValueChange={handleConsultorChange} disabled={isCarregandoConsultores}>
                                    <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-primary text-foreground">
                                        <SelectValue placeholder={isCarregandoConsultores ? "Carregando..." : "Filtrar por Consultor"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                        <SelectItem value="todos">Todos os Consultores</SelectItem>
                                        {consultores.map((c) => (
                                            <SelectItem key={c.seq_consultor} value={String(c.seq_consultor)}>
                                                {c.nome}
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
                                <div className="h-[300px] w-full border rounded-lg p-4 bg-muted/5">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                                            <Building2 size={16} /> Volume de Linhas por Empresa
                                            </h3>
                                            <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
                                            <XAxis dataKey="empresa" tick={{ fontSize: 12 }} hide={dadosFiltrados.length > 20} />
                                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                            <Tooltip cursor={{ fill: '#88888811' }} />
                                            <Bar dataKey="linhas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>Empresa (Razão Social)</TableHead>
                                                <TableHead>CNPJ</TableHead>
                                                {/* CONDICIONAL DA COLUNA DE CONSULTOR */}
                                                {!consultorSelecionado && <TableHead>Consultor Responsável</TableHead>}
                                                <TableHead>Classificação</TableHead>
                                                <TableHead className="text-center">Qtd. Linhas</TableHead>
                                                <TableHead className="text-right">Fim Contrato</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {dadosFiltrados.map((item) => (
                                                <TableRow key={`${item.seq_empresa}-${item.seq_claro}`}>
                                                    <TableCell className="font-medium max-w-[200px] truncate">{item.razao}</TableCell>
                                                    <TableCell>{item.cnpj}</TableCell>
                                                    {/* CELULA DO CONSULTOR RENDERIZADA CONDICIONALMENTE */}
                                                    {!consultorSelecionado && (
                                                        <TableCell className="text-muted-foreground">
                                                            {mapaConsultores.get(Number(item.seq_consultor)) || "Não Atribuído"}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                                            {item.classificacao_contrato || "N/A"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-primary">
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