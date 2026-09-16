"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import API from "@/services/api";

export default function DisparosWhatsapp() {
    const [dashboardInfo, setDashboardInfo] = useState({
        totais: {
            disponiveis: 0,
            disparados: 0,
            por_indicacao: {
                "RENOVACAO": 0,
                "PORTABILIDADE": 0,
                "FORA DO PRAZO": 0,
                "PRAZO LIMITADO": 0,
                "PRAZO EXCEDIDO": 0,
            },
        },
        consultores: [],
    });

    const [form, setForm] = useState({
        seq_consultor: "",
        indicacao: "",
        limite: "",
    });

    const [status, setStatus] = useState({
        loading: false,
        success: null as string | null,
        error: null as string | null,
    });

    useEffect(() => {
        carregarDashboard();
    }, []);

    const carregarDashboard = async () => {
        try {
            const response = await fetch(`${API}/api/disparo-whatsapp/dashboard`);
            const result = await response.json();

            if (result.status && result.data) {
                setDashboardInfo(result.data);
            }
        } catch (error) {
            console.error("Erro ao buscar dashboard:", error);
        }
    };

    const handleGerarDisparos = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.seq_consultor || !form.indicacao || !form.limite) {
            setStatus({ loading: false, success: null, error: "Preencha todos os campos corretamente." });
            return;
        }

        setStatus({ loading: true, success: null, error: null });

        try {
            const response = await fetch(`${API}/api/disparo-whatsapp/gerar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    seq_consultor: form.seq_consultor,
                    indicacao: form.indicacao,
                    limite: Number(form.limite),
                }),
            });

            const data = await response.json();

            if (response.ok && data.sucesso) {
                setStatus({
                    loading: false,
                    error: null,
                    success: `${data.qtd_gerada} leads separados com sucesso! Iniciando download...`,
                });

                window.location.href = `${API}/api/disparo-whatsapp/download/${data.arquivo}`;

                setTimeout(() => carregarDashboard(), 2000);
            } else {
                setStatus({
                    loading: false,
                    success: null,
                    error: data.erro || data.mensagem || "Erro ao processar leads.",
                });
            }
        } catch (error) {
            setStatus({
                loading: false,
                success: null,
                error: "Erro de conexão com o servidor. Tente novamente.",
            });
        }
    };

    return (
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            <div className="w-[280px] h-full flex-shrink-0">
                <Sidebar />
            </div>

            <main className="relative flex-1 h-full flex flex-col overflow-y-auto bg-muted/10 p-6 sm:p-10">

                <div className="mb-8">
                    <h2 className="text-3xl font-bold tracking-tight">Central de Disparos Take (Omni)</h2>
                    <p className="text-muted-foreground mt-1">Geração de bases e inserção em lote para o WhatsApp</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card className="bg-primary text-primary-foreground border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium opacity-90">Leads Totais Disponíveis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{dashboardInfo.totais.disponiveis}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-600 text-white border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium opacity-90">Total Disparado Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{dashboardInfo.totais.disparados}</p>
                        </CardContent>
                    </Card>
                </div>

                <h3 className="text-xl font-semibold mb-4 text-secondary-foreground">Disponibilidade por Indicação</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">

                    <Card className="shadow-sm border-blue-200">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs font-semibold text-blue-600 mb-1">RENOVAÇÃO</p>
                            <p className="text-2xl font-bold">{dashboardInfo.totais.por_indicacao["RENOVACAO"] || 0}</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-amber-200">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs font-semibold text-amber-500 mb-1">PORTABILIDADE</p>
                            <p className="text-2xl font-bold">{dashboardInfo.totais.por_indicacao["PORTABILIDADE"] || 0}</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-red-200">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs font-semibold text-red-500 mb-1">FORA DO PRAZO</p>
                            <p className="text-2xl font-bold">{dashboardInfo.totais.por_indicacao["FORA DO PRAZO"] || 0}</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-indigo-200">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs font-semibold text-indigo-500 mb-1">PRAZO LIMITADO</p>
                            <p className="text-2xl font-bold">{dashboardInfo.totais.por_indicacao["PRAZO LIMITADO"] || 0}</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-300">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs font-semibold text-slate-500 mb-1">PRAZO EXCEDIDO</p>
                            <p className="text-2xl font-bold">{dashboardInfo.totais.por_indicacao["PRAZO EXCEDIDO"] || 0}</p>
                        </CardContent>
                    </Card>

                </div>

                <Card className="shadow-sm border-border">
                    <CardHeader>
                        <CardTitle>Gerar Nova Base de Disparo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleGerarDisparos} className="space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="consultor">Consultor Responsável</Label>
                                    <Select
                                        onValueChange={(val) => setForm({ ...form, seq_consultor: val })}
                                        value={form.seq_consultor}
                                    >
                                        <SelectTrigger id="consultor">
                                            <SelectValue placeholder="Selecione um consultor..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dashboardInfo.consultores.map((c: any) => (
                                                <SelectItem key={c.seq_consultor} value={String(c.seq_consultor)}>
                                                    {c.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="indicacao">Indicação (Campanha)</Label>
                                    <Select
                                        onValueChange={(val) => setForm({ ...form, indicacao: val })}
                                        value={form.indicacao}
                                    >
                                        <SelectTrigger id="indicacao">
                                            <SelectValue placeholder="Selecione a indicação..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RENOVACAO">Renovação</SelectItem>
                                            <SelectItem value="PORTABILIDADE">Portabilidade</SelectItem>
                                            <SelectItem value="FORA DO PRAZO">Fora do Prazo</SelectItem>
                                            <SelectItem value="PRAZO LIMITADO">Prazo Limitado</SelectItem>
                                            <SelectItem value="PRAZO EXCEDIDO">Prazo Excedido</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="limite">Quantidade de Leads</Label>
                                    <Input
                                        id="limite"
                                        type="number"
                                        min="1"
                                        placeholder="Ex: 100"
                                        value={form.limite}
                                        onChange={(e) => setForm({ ...form, limite: e.target.value })}
                                    />
                                </div>

                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full text-base font-semibold"
                                    disabled={status.loading}
                                >
                                    {status.loading ? "Processando disparos e gerando planilha..." : "Processar Disparos e Baixar Planilha"}
                                </Button>
                            </div>

                            {status.error && (
                                <div className="p-4 text-sm text-red-800 bg-red-100 rounded-lg border border-red-200 mt-4">
                                    <strong>Erro:</strong> {status.error}
                                </div>
                            )}
                            {status.success && (
                                <div className="p-4 text-sm text-green-800 bg-green-100 rounded-lg border border-green-200 mt-4">
                                    <strong>Sucesso!</strong> {status.success}
                                </div>
                            )}

                        </form>
                    </CardContent>
                </Card>

            </main>
        </div>
    );
}
