import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, UploadCloud, Loader2, Building2, LayoutList, X } from "lucide-react"; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import API from "@/helpers/api";
import { ITelaDetalhesProps } from "./subirPipeGeral";
import ConsultorBD from "@/interfaces/consutorDb.interface";
import { integrarServicosPipeRun } from "@/helpers/api_piperun";

export function PipeSubirPortabilidade({ dados, onBack }: ITelaDetalhesProps) {
    const [consultorSelecionado, setConsultorSelecionado] = useState<number | null>(null);
    const [consultoresEnvio, setConsultoresEnvio] = useState<number[]>([]);
    const [limiteEnvio, setLimiteEnvio] = useState<number | "">("");
    const [consultores, setConsultores] = useState<ConsultorBD[]>([]);
    const [isCarregandoConsultores, setIsCarregandoConsultores] = useState(true);
    const [isEnviando, setIsEnviando] = useState(false);
    
    // Hash do Funil do PipeRun
    const hashConsultores = 'e015a67d-bab4-403a-a0f6-5b2cfbc35ebe';

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

    const handleAddConsultorEnvio = (idStr: string) => {
        const id = Number(idStr);
        if (!consultoresEnvio.includes(id)) {
            setConsultoresEnvio((prev) => [...prev, id]);
        }
    };

    const handleRemoverConsultorEnvio = (idToRemove: number) => {
        setConsultoresEnvio((prev) => prev.filter((id) => id !== idToRemove));
    };

    const consultorAtual = consultores.find(c => c.seq_consultor === consultorSelecionado);

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
        if (consultoresEnvio.length === 0) {
            alert("Selecione pelo menos um consultor na lista de envio.");
            return;
        }

        try {
            setIsEnviando(true);
            
            // 1. Filtra os dados globais. 
            // Se o consultor selecionado não tem serviços cadastrados nos `dados`, ele é automaticamente ignorado aqui.
            let servicosParaEnviar = dados.filter(item => 
                consultoresEnvio.includes(Number(item.seq_consultor))
            );

            // Valida se sobrou algum serviço para subir
            if (servicosParaEnviar.length === 0) {
                alert("Os consultores selecionados não possuem serviços disponíveis para integração.");
                setIsEnviando(false);
                return;
            }

            // 2. Aplica o limite global de envio, se houver
            if (limiteEnvio && typeof limiteEnvio === "number" && limiteEnvio > 0) {
                servicosParaEnviar = servicosParaEnviar.slice(0, limiteEnvio);
            }

            console.log(`Iniciando a orquestração de ${servicosParaEnviar.length} serviços...`);
            
            let sucessosConfirmados = 0;
            let falhasConfirmadas = 0;

            // 3. Loop sequencial 
            // Processamos 1 a 1 para garantir que só atualizaremos o DB local se o PipeRun retornar sucesso real.
            for (const servico of servicosParaEnviar) {
                try {
                    // Sobe a Oportunidade/Empresa/Decisor para o PipeRun
                    const resultadoPipe = await integrarServicosPipeRun({
                        servicos: [servico], // Array de 1 posição para validação isolada
                        hashFunil: hashConsultores
                    });

                    if (resultadoPipe.sucessos > 0) {
                        // 4. ATUALIZAÇÃO DO BANCO LOCAL (Status CRM = true)
                        // Dispara patch/put passando o seq_claro na URL da sua API
                        await API.patch(`/api/servico-claro/piperun/${servico.seq_claro}`);
                        
                        sucessosConfirmados++;
                    } else {
                        // Se falhou no PipeRun, incrementamos as falhas e pulamos a requisição do BD local
                        falhasConfirmadas++;
                    }
                } catch (error) {
                    console.error(`Falha isolada ao processar o seq_claro ${servico.seq_claro}:`, error);
                    falhasConfirmadas++;
                }
            }

            // 5. Finalização e feedback visual
            alert(`Processo Finalizado!\n✅ Integrados com Sucesso no PipeRun e BD: ${sucessosConfirmados}\n❌ Falhas: ${falhasConfirmadas}`);

        } catch (error) {
            console.error("Erro crítico ao processar o envio em massa:", error);
            alert("Ocorreu um erro estrutural durante a execução da integração.");
        } finally {
            setIsEnviando(false);
            // Reseta a fila de preparo de consultores e limite (opcional, pode ser removido caso prefira manter a seleção após subir)
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
                                            key={id} 
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
                                            <SelectItem key={c.seq_consultor} value={String(c.seq_consultor)}>
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
                                onClick={handleSubirServicos}
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