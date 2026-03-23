import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, UploadCloud, Loader2, Building2, RefreshCw, LayoutList, X } from "lucide-react"; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import API from "@/helpers/api";
import { ITelaDetalhesProps } from "./subirPipeGeral";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import { integrarServicosPipeRun } from "@/helpers/api_piperun";

export function PipeSubirRenovacao({ dados, onBack }: ITelaDetalhesProps) {
    const [consultorSelecionado, setConsultorSelecionado] = useState<number | null>(null);
    const [consultoresEnvio, setConsultoresEnvio] = useState<number[]>([]);
    const [limiteEnvio, setLimiteEnvio] = useState<number | "">("");

    const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
    const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);
    const [isEnviando, setIsEnviando] = useState(false);
    
    const hashConsultores = 'e015a67d-bab4-403a-a0f6-5b2cfbc35ebe';

    // Utilitário para formatação segura de data (Evita crash de renderização)
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
                
                // Tenta acessar o sessionStorage de forma segura
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
                        sessionStorage.removeItem(cacheKey); // Limpa o cache corrompido
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

    const handleSubirServicos = async () => {
        if (consultoresEnvio.length === 0) {
            alert("Selecione pelo menos um consultor na lista de envio.");
            return;
        }

        try {
            setIsEnviando(true);
            
            if (!Array.isArray(dados)) {
                throw new Error("A prop global 'dados' não é um iterável válido para envio.");
            }

            // 1. Filtra os dados globais para pegar apenas os serviços dos consultores selecionados
            let servicosParaEnviar = dados.filter(item => {
                try {
                    return consultoresEnvio.includes(Number(item.seq_consultor));
                } catch (filterError) {
                    console.error("🚨 [handleSubirServicos] Exception ao filtrar item específico:", item, filterError);
                    return false;
                }
            });

            // Valida se há serviços para subir
            if (servicosParaEnviar.length === 0) {
                alert("Os consultores selecionados não possuem serviços de renovação disponíveis para integração.");
                setIsEnviando(false);
                return;
            }

            // 2. Aplica o limite global de envio, se estipulado
            if (limiteEnvio && typeof limiteEnvio === "number" && limiteEnvio > 0) {
                servicosParaEnviar = servicosParaEnviar.slice(0, limiteEnvio);
            }

            console.info(`🚀 [handleSubirServicos] Iniciando a orquestração de ${servicosParaEnviar.length} serviços de renovação...`);

            let sucessosConfirmados = 0;
            let falhasConfirmadas = 0;

            // 3. Loop sequencial de envio (1 a 1) com controle de exceção granular
            for (const servico of servicosParaEnviar) {
                try {
                    if (!servico || !servico.seq_claro) {
                        console.warn("⚠️ [handleSubirServicos] Serviço iterado não possui 'seq_claro' válido. Pulando...", servico);
                        falhasConfirmadas++;
                        continue;
                    }

                    console.info(`⏳ [handleSubirServicos] Enviando serviço seq_claro: ${servico.seq_claro}`);

                    // Sobe o dado de Renovação para o PipeRun
                    const resultadoPipe = await integrarServicosPipeRun({
                        servicos: [servico],
                        hashFunil: hashConsultores 
                    });

                    // 4. ATUALIZAÇÃO DO BANCO LOCAL (Status CRM = true)
                    if (resultadoPipe && resultadoPipe.sucessos > 0) {
                        try {
                            await API.patch(`/api/servico-claro/piperun/${servico.seq_claro}`);
                            sucessosConfirmados++;
                            console.info(`✅ [handleSubirServicos] Sucesso absoluto no serviço seq_claro: ${servico.seq_claro}`);
                        } catch (patchError) {
                            console.error(`🚨 [handleSubirServicos/PATCH] Falha ao atualizar status no banco local para o seq_claro ${servico.seq_claro}. Integração ocorreu no PipeRun, mas o DB interno falhou.`, patchError);
                            falhasConfirmadas++;
                        }
                    } else {
                        console.error(`🚨 [handleSubirServicos/PIPERUN] Falha relatada pelo utilitário do PipeRun para o seq_claro ${servico.seq_claro}. Retorno:`, resultadoPipe);
                        falhasConfirmadas++;
                    }
                } catch (error) {
                    console.error(`🚨 [handleSubirServicos/LOOP] Exception isolada (Crash) ao processar o seq_claro ${servico?.seq_claro} (Renovação):`, error, "\nObjeto Base:", servico);
                    falhasConfirmadas++;
                }
            }

            // 5. Finalização
            console.info(`🏁 [handleSubirServicos] Processo finalizado. Sucessos: ${sucessosConfirmados} | Falhas: ${falhasConfirmadas}`);
            alert(`Processo de Renovação Finalizado!\n✅ Integrados com Sucesso: ${sucessosConfirmados}\n❌ Falhas: ${falhasConfirmadas}`);

        } catch (error) {
            console.error("🚨 [handleSubirServicos/GLOBAL] Exception crítica e estrutural ao processar o envio em massa de renovação:", error);
            alert("Ocorreu um erro estrutural durante a execução da integração. Verifique o console para mais detalhes.");
        } finally {
            setIsEnviando(false);
            setConsultoresEnvio([]);
            setLimiteEnvio("");
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

                <header className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="mt-2">
                        <div className="flex items-center gap-3 mb-2">
                            <RefreshCw className="h-8 w-8 text-blue-500" />
                            <h1 className="text-3xl font-bold tracking-tight">Detalhes de Renovação</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Visualizando <span className="font-semibold text-blue-500">{dadosFiltrados.length}</span> serviços {consultorSelecionado ? "deste consultor" : "no total"}.
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
                                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                        >
                                            {nomeConsultor}
                                            <button 
                                                onClick={() => handleRemoverConsultorEnvio(id)}
                                                className="rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5 transition-colors"
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
                                    <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-blue-500 text-foreground">
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
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <Button
                                onClick={handleSubirServicos}
                                disabled={consultoresEnvio.length === 0 || isEnviando}
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
                    </div>
                </header>

                <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b pb-4">
                                {consultorSelecionado ? <Users size={20} className="text-blue-500" /> : <LayoutList size={20} className="text-blue-500" />}
                            <h2 className="text-lg font-semibold mr-10 flex align-center text-center justify-center">
                                {consultorAtual
                                    ? `Carteira do Consultor: ${consultorAtual.nome} (Renovação)`
                                    : "Todos os Serviços de Renovação"}
                            </h2>

                            <div className="w-64">
                                <Select onValueChange={handleConsultorChange} disabled={isCarregandoConsultores}>
                                    <SelectTrigger className="h-10 bg-background border-border shadow-sm focus:ring-blue-500 text-foreground">
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
                                <div className="h-[300px] w-full border rounded-lg p-4 bg-muted/5">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                                        <Building2 size={16} /> Volume de Linhas a Renovar por Empresa
                                    </h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
                                            <XAxis
                                                dataKey="empresa"
                                                tick={{ fontSize: 12 }}
                                                hide={dadosFiltrados.length > 20}
                                                tickFormatter={(value: string) => value ? value.substring(0, 15) + "..." : ""}
                                            />
                                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                            <Tooltip cursor={{ fill: '#88888811' }} />
                                            <Bar dataKey="linhas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                                                            {item.classificacao_contrato || "N/A"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-blue-600">
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