import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, UploadCloud, Loader2, Building2, RefreshCw, LayoutList, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ITelaDetalhesProps } from "../subirPipeGeral";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import API from "@/services/api";
import { useIntegracaoPipeRun } from "@/services/hookApiRun";

export function PipeSubirRenovacao({ dados, onBack }: ITelaDetalhesProps) {
    const [consultorSelecionado, setConsultorSelecionado] = useState<number | null>(null);
    const [consultoresEnvio, setConsultoresEnvio] = useState<number[]>([]);
    const [limiteEnvio, setLimiteEnvio] = useState<number | "">("");

    const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
    const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);

    const hashConsultores = 'e015a67d-bab4-403a-a0f6-5b2cfbc35ebe';
    const { handleSubirServicos, isEnviando } = useIntegracaoPipeRun();

    const formatarDataSegura = (dataString: string | Date | undefined | null) => {
        if (!dataString) return "Não informado";
        try {
            const dateObj = new Date(dataString);
            if (isNaN(dateObj.getTime())) {
                throw new Error("Formato de data inválido detectado.");
            }
            return dateObj.toLocaleDateString('pt-BR');
        } catch (error) {
            console.error("🚨 [Render/Data] Exception ao formatar a data:", { dataRecebida: dataString, erro: error });
            return "Data Inválida";
        }
    };

    useEffect(() => {
        async function fetchConsultores() {
            try {
                setIsCarregandoConsultores(true);
                const cacheKey = "consultores_geral_cache";

                let cachedData: string | null = null;

                try {
                    cachedData = sessionStorage.getItem(cacheKey);
                } catch (storageError) {
                    console.error("🚨 [useEffect/Storage] Exception ao acessar sessionStorage:", storageError);
                }

                if (cachedData) {
                    try {
                        const parsedCache = JSON.parse(cachedData);
                        if (Array.isArray(parsedCache)) {
                            setConsultores(parsedCache);
                            console.info("✅ [useEffect/Cache] Consultores carregados do cache com sucesso.");
                            return;
                        } else {
                            throw new Error("Cache não é um array válido.");
                        }
                    } catch (parseError) {
                        console.error("🚨 [useEffect/Parse] Exception ao fazer parse do JSON em cache. O cache será invalidado.", parseError);
                        sessionStorage.removeItem(cacheKey);
                    }
                }

                console.info("🔄 [useEffect/API] Buscando consultores via API...");
                const response = await API.get("/api/consultores");
                const listaConsultores = response.data?.dados ?? [];

                if (!Array.isArray(listaConsultores)) {
                    throw new Error("A resposta da API para '/api/consultores' não conteve uma estrutura de array em 'dados'.");
                }

                setConsultores(listaConsultores);

                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(listaConsultores));
                } catch (setItemError) {
                    console.error("🚨 [useEffect/Storage] Exception ao salvar cache no sessionStorage. Dados muito grandes?", setItemError);
                }

            } catch (error) {
                console.error("🚨 [useEffect/API] Exception crítica ao buscar consultores para renovação:", error);
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
            console.error("🚨 [handleConsultorChange] Exception ao alterar o consultor:", error);
        }
    };

    const handleAddConsultorEnvio = (idStr: string) => {
        try {
            const id = Number(idStr);
            if (isNaN(id)) throw new Error(`O ID fornecido (${idStr}) não é um número válido.`);

            if (!consultoresEnvio.includes(id)) {
                setConsultoresEnvio((prev) => [...prev, id]);
            }
        } catch (error) {
            console.error("🚨 [handleAddConsultorEnvio] Exception ao adicionar consultor na lista de envio:", error);
        }
    };

    const handleRemoverConsultorEnvio = (idToRemove: number) => {
        try {
            setConsultoresEnvio((prev) => prev.filter((id) => id !== idToRemove));
        } catch (error) {
            console.error("🚨 [handleRemoverConsultorEnvio] Exception ao remover consultor da lista de envio:", error);
        }
    };

    const consultorAtual = useMemo(() => {
        try {
            if (!Array.isArray(consultores)) return undefined;
            return consultores.find(c => c.seq_consultor === consultorSelecionado);
        } catch (error) {
            console.error("🚨 [useMemo/consultorAtual] Exception ao calcular o consultor atual:", error);
            return undefined;
        }
    }, [consultores, consultorSelecionado]);

    const mapaConsultores = useMemo(() => {
        try {
            const mapa = new Map<number, string>();
            if (!Array.isArray(consultores)) {
                console.warn("⚠️ [useMemo/mapaConsultores] A lista de consultores não é um array válido. Retornando mapa vazio.");
                return mapa;
            }
            consultores.forEach(c => {
                if (c && c.seq_consultor) {
                    mapa.set(Number(c.seq_consultor), c.nome || "Sem Nome");
                }
            });
            return mapa;
        } catch (error) {
            console.error("🚨 [useMemo/mapaConsultores] Exception ao processar o mapa de consultores:", error);
            return new Map<number, string>();
        }
    }, [consultores]);

    const dadosFiltrados = useMemo(() => {
        try {
            if (!Array.isArray(dados)) {
                console.warn("⚠️ [useMemo/dadosFiltrados] A prop 'dados' recebida não é um array válido.");
                return [];
            }
            if (!consultorSelecionado) return dados;
            return dados.filter(item => item.seq_consultor === consultorSelecionado);
        } catch (error) {
            console.error("🚨 [useMemo/dadosFiltrados] Exception ao processar o filtro de dados:", error);
            return [];
        }
    }, [dados, consultorSelecionado]);

    const dadosGrafico = useMemo(() => {
        try {
            if (!Array.isArray(dadosFiltrados)) return [];
            return dadosFiltrados.map(item => ({
                empresa: item.razao || "Empresa sem Razão",
                linhas: typeof item.qtd_servico_claro === 'number' ? item.qtd_servico_claro : 0,
                cnpj: item.cnpj || "Sem CNPJ"
            }));
        } catch (error) {
            console.error("🚨 [useMemo/dadosGrafico] Exception ao estruturar dados para o gráfico:", error);
            return [];
        }
    }, [dadosFiltrados]);

    const onClickSubirServicos = () => {
        handleSubirServicos({
            tipoOperacao: "Renovação",
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
                        <div className="flex items-center gap-3 mb-2">
                            {/* Ícone alterado para amarelo */}
                            <RefreshCw className="h-8 w-8 text-yellow-500" />
                            <h1 className="text-3xl font-bold tracking-tight">Detalhes de Renovação</h1>
                        </div>
                        <p className="text-muted-foreground">
                            {/* Texto de destaque alterado para amarelo */}
                            Visualizando <span className="font-semibold text-yellow-500">{dadosFiltrados.length}</span> serviços {consultorSelecionado ? "deste consultor" : "no total"}.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        {consultoresEnvio.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-2 max-w-lg">
                                {consultoresEnvio.map((id) => {
                                    const nomeConsultor = mapaConsultores.get(id) || "Desconhecido";
                                    return (
                                        <span
                                            key={id}
                                            // Badges alteradas para amarelo
                                            className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-sm text-yellow-700 shadow-sm dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
                                        >
                                            {nomeConsultor}
                                            <button
                                                onClick={() => handleRemoverConsultorEnvio(id)}
                                                className="rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 p-0.5 transition-colors"
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
                                    <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-yellow-500 text-foreground">
                                        <SelectValue placeholder={isCarregandoConsultores ? "Carregando..." : "Adicionar para Envio"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border text-popover-foreground">
                                        {consultores.map((c) => (
                                            <SelectItem key={`envio-${c.seq_consultor}`} value={String(c.seq_consultor)}>
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
                                    // Focus border alterado para amarelo
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <Button
                                onClick={onClickSubirServicos}
                                disabled={consultoresEnvio.length === 0 || isEnviando}
                                // Botão principal alterado para tons de amarelo
                                className="h-10 px-6 shadow-sm bg-yellow-500 hover:bg-yellow-600 text-white dark:text-zinc-900 font-medium transition-colors"
                            >
                                {isEnviando ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                )}
                                {isEnviando ? "Processando..." : "Subir Renovações"}
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Área principal com controle de scroll integrado ao layout se necessário */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b pb-4">
                            {/* Ícones do título em amarelo */}
                            {consultorSelecionado ? <Users size={20} className="text-yellow-500" /> : <LayoutList size={20} className="text-yellow-500" />}
                            <h2 className="text-lg font-semibold mr-10 flex align-center text-center justify-center">
                                {consultorAtual
                                    ? `Carteira do Consultor: ${consultorAtual.nome} (Renovação)`
                                    : "Todos os Serviços de Renovação"}
                            </h2>

                            <div className="w-64">
                                <Select onValueChange={handleConsultorChange} disabled={isCarregandoConsultores}>
                                    <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-yellow-500 text-foreground">
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
                                <p>Não há serviços de renovação para exibir.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">

                                {/* GRÁFICO CORRIGIDO: Uso de flex-col e min-h para forçar o Recharts a respeitar os limites */}
                                <div className="h-[350px] w-full border rounded-lg p-4 bg-muted/5 flex flex-col">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                                        <Building2 size={16} /> Volume de Linhas a Renovar por Empresa
                                    </h3>
                                    <div className="flex-1 w-full min-h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            {/* Ajuste de margem para evitar cortes laterais no render das barras */}
                                            <BarChart data={dadosGrafico} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
                                                <XAxis
                                                    dataKey="empresa"
                                                    tick={{ fontSize: 12 }}
                                                    hide={dadosFiltrados.length > 20}
                                                    tickFormatter={(value: string) => value ? value.substring(0, 15) + "..." : ""}
                                                />
                                                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                                <Tooltip cursor={{ fill: '#88888811' }} />
                                                {/* Preenchimento alterado para o amarelo do Tailwind (yellow-500) */}
                                                <Bar dataKey="linhas" fill="#eab308" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* TABELA COM SCROLL: Adicionado max-h e overflow-y-auto */}
                                <div className="rounded-md border overflow-y-auto max-h-[400px] relative shadow-sm">
                                    <Table>
                                        {/* Cabeçalho fixo (sticky) para manter a leitura fácil ao rolar */}
                                        <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
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
                                                <TableRow key={`${item.seq_empresa}-${item.seq_claro}`}>
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
                                                        {/* Badges de tabela atualizadas para amarelo */}
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-yellow-50 text-yellow-700 border-yellow-200">
                                                            {item.classificacao_contrato || "N/A"}
                                                        </span>
                                                    </TableCell>
                                                    {/* Texto em destaque atualizado para amarelo */}
                                                    <TableCell className="text-center font-bold text-yellow-600">
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