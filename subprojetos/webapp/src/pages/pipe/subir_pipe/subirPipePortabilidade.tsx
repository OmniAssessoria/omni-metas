import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, UploadCloud, Loader2, Building2, LayoutList, X } from "lucide-react"; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ITelaDetalhesProps } from "../subirPipeGeral";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import API from "@/services/api";
import { useIntegracaoPipeRun } from "@/services/hookApiRun";


export function PipeSubirPortabilidade({ dados, onBack }: ITelaDetalhesProps) {
    const [consultorSelecionado, setConsultorSelecionado] = useState<number | null>(null);
    const [consultoresEnvio, setConsultoresEnvio] = useState<number[]>([]);
    const [limiteEnvio, setLimiteEnvio] = useState<number | "">("");
    const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
    const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);
    
    const hashConsultores = 'e015a67d-bab4-403a-a0f6-5b2cfbc35ebe'; 

    // INICIALIZAÇÃO CORRETA DO HOOK
    const { handleSubirServicos, isEnviando } = useIntegracaoPipeRun();

    const formatarDataSegura = (dataString: string | Date | undefined | null) => {
        if (!dataString) return "Não informado";
        try {
            const dateObj = new Date(dataString);
            if (isNaN(dateObj.getTime())) {
                throw new Error("Data inválida detectada pelo construtor.");
            }
            return dateObj.toLocaleDateString('pt-BR');
        } catch (error) {
            console.error("🚨 [Render/Data] Exception ao processar data de fim de contrato:", { dado: dataString, erro: error });
            return "Data Inválida";
        }
    };

    useEffect(() => {
        async function fetchConsultores() {
            try {
                setIsCarregandoConsultores(true);
                const cacheKey = "consultores_portabilidade_cache";
                
                let cachedData: string | null = null;

                try {
                    cachedData = sessionStorage.getItem(cacheKey);
                } catch (storageError) {
                    console.error("🚨 [useEffect/Storage] Exception ao tentar ler do sessionStorage:", storageError);
                }

                if (cachedData) {
                    try {
                        const parsedCache = JSON.parse(cachedData);
                        if (Array.isArray(parsedCache)) {
                            setConsultores(parsedCache);
                            console.info("✅ [useEffect/Cache] Consultores de portabilidade carregados da sessão.");
                            return;
                        } else {
                            throw new Error("O cache de portabilidade não contém um array iterável.");
                        }
                    } catch (parseError) {
                        console.error("🚨 [useEffect/Parse] Exception de parse JSON. Invalidando cache de portabilidade.", parseError);
                        sessionStorage.removeItem(cacheKey);
                    }
                }

                console.info("🔄 [useEffect/API] Requisição de consultores disparada...");
                const response = await API.get("/api/consultores");
                const listaConsultores = response.data?.dados ?? [];

                if (!Array.isArray(listaConsultores)) {
                    throw new Error("Contrato de API violado: '/api/consultores' não retornou um array.");
                }

                setConsultores(listaConsultores);
                
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(listaConsultores));
                } catch (setItemError) {
                    console.error("🚨 [useEffect/Storage] Erro ao alocar memória no sessionStorage:", setItemError);
                }

            } catch (error) {
                console.error("🚨 [useEffect/API] Falha crítica na busca de consultores:", error);
            } finally {
                setIsCarregandoConsultores(false);
            }
        }

        fetchConsultores();
    }, []);

    const handleConsultorChange = (id: string) => {
        try {
            setConsultorSelecionado(id === "todos" ? null : Number(id));
        } catch (error) {
            console.error("🚨 [handleConsultorChange] Exception ao processar ID do consultor:", error);
        }
    };

    const handleAddConsultorEnvio = (idStr: string) => {
        try {
            const id = Number(idStr);
            if (isNaN(id)) throw new Error(`Input de consultor inválido: ${idStr}`);
            
            if (!consultoresEnvio.includes(id)) {
                setConsultoresEnvio((prev) => [...prev, id]);
            }
        } catch (error) {
            console.error("🚨 [handleAddConsultorEnvio] Erro ao enfileirar consultor:", error);
        }
    };

    const handleRemoverConsultorEnvio = (idToRemove: number) => {
        try {
            setConsultoresEnvio((prev) => prev.filter((id) => id !== idToRemove));
        } catch (error) {
            console.error("🚨 [handleRemoverConsultorEnvio] Erro ao remover consultor da fila:", error);
        }
    };

    const consultorAtual = useMemo(() => {
        try {
            if (!Array.isArray(consultores)) return undefined;
            return consultores.find(c => c.seq_consultor === consultorSelecionado);
        } catch (error) {
            console.error("🚨 [useMemo/consultorAtual] Erro de indexação:", error);
            return undefined;
        }
    }, [consultores, consultorSelecionado]);

    const mapaConsultores = useMemo(() => {
        try {
            const mapa = new Map<number, string>();
            if (!Array.isArray(consultores)) {
                console.warn("⚠️ [useMemo/mapaConsultores] Fallback acionado. Array corrompido.");
                return mapa;
            }
            consultores.forEach(c => {
                if (c && c.seq_consultor) {
                    mapa.set(Number(c.seq_consultor), c.nome || "Não Identificado");
                }
            });
            return mapa;
        } catch (error) {
            console.error("🚨 [useMemo/mapaConsultores] Quebra estrutural ao montar dicionário:", error);
            return new Map<number, string>();
        }
    }, [consultores]);

    const dadosFiltrados = useMemo(() => {
        try {
            if (!Array.isArray(dados)) {
                console.warn("⚠️ [useMemo/dadosFiltrados] A propriedade 'dados' injetada não é iterável.");
                return [];
            }
            if (!consultorSelecionado) return dados; 
            return dados.filter(item => item.seq_consultor === consultorSelecionado);
        } catch (error) {
            console.error("🚨 [useMemo/dadosFiltrados] Erro ao aplicar filtro hierárquico:", error);
            return [];
        }
    }, [dados, consultorSelecionado]);

    const dadosGrafico = useMemo(() => {
        try {
            if (!Array.isArray(dadosFiltrados)) return [];
            return dadosFiltrados.map(item => ({
                empresa: item.razao || "Empresa sem Razão",
                linhas: typeof item.qtd_servico_claro === 'number' ? item.qtd_servico_claro : 0,
                cnpj: item.cnpj || "N/D"
            }));
        } catch (error) {
            console.error("🚨 [useMemo/dadosGrafico] Quebra de projeção de dados para o Recharts:", error);
            return [];
        }
    }, [dadosFiltrados]);

    // WRAPPER DE CLIQUE: Passando os parâmetros exatos para o Hook
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
            }
        });
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

                <header className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="mt-2">
                        <h1 className="text-3xl font-bold mb-2 tracking-tight">Detalhes de Portabilidade</h1>
                        <p className="text-muted-foreground">
                            Visualizando <span className="font-semibold text-primary">{dadosFiltrados.length}</span> serviços {consultorSelecionado ? "deste consultor" : "no total"}.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        {consultoresEnvio.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-2 max-w-lg">
                                {consultoresEnvio.map((id) => {
                                    const nomeConsultor = mapaConsultores.get(id) || "Desconhecido";
                                    return (
                                        <span 
                                            key={`badge-${id}`} 
                                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm"
                                        >
                                            {nomeConsultor}
                                            <button 
                                                onClick={() => handleRemoverConsultorEnvio(id)}
                                                className="rounded-full hover:bg-muted p-0.5 text-muted-foreground transition-colors"
                                                title="Remover"
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <div className="w-56">
                                <Select onValueChange={handleAddConsultorEnvio} value="" disabled={isCarregandoConsultores}>
                                    <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-primary text-foreground">
                                        <SelectValue placeholder={isCarregandoConsultores ? "Carregando..." : "Adicionar para Envio"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                        {consultores.map((c) => (
                                            <SelectItem key={`add-${c.seq_consultor}`} value={String(c.seq_consultor)}>
                                                {c.nome}
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
                                    onChange={(e) => setLimiteEnvio(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <Button
                                onClick={onClickSubirServicos}
                                disabled={consultoresEnvio.length === 0 || isEnviando}
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
                    </div>
                </header>

                <div className="space-y-6">        
                    <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b pb-4">
                            {consultorSelecionado ? <Users size={20} className="text-primary" /> : <LayoutList size={20} className="text-blue-500" />}
                            <h2 className="text-lg font-semibold flex-1">
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
                                            <SelectItem key={`filtro-${c.seq_consultor}`} value={String(c.seq_consultor)}>
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
                                                {!consultorSelecionado && <TableHead>Consultor Responsável</TableHead>}
                                                <TableHead>Classificação</TableHead>
                                                <TableHead className="text-center">Qtd. Linhas</TableHead>
                                                <TableHead className="text-right">Fim Contrato</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {dadosFiltrados.map((item) => (
                                                <TableRow key={`row-${item.seq_empresa}-${item.seq_claro}`}>
                                                    <TableCell className="font-medium max-w-[200px] truncate" title={item.razao}>
                                                        {item.razao}
                                                    </TableCell>
                                                    <TableCell>{item.cnpj}</TableCell>
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
                                                        {formatarDataSegura(item.dt_fim_contrato)}
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