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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import API from "@/services/api";
import {
  DownloadCloud,
  Activity,
  Send,
  CheckCircle2,
  MessageSquareOff,
  AlertTriangle,
  Target,
  Trophy,
  XOctagon,
} from "lucide-react";

export default function DisparosWhatsapp() {
  const [dashboardInfo, setDashboardInfo] = useState({
    totais: {
      disponiveis: 0,
      disparados_total: 0,
      por_indicacao: {} as Record<string, number>,
      analise_funil: {} as Record<string, any>,
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const getBaseUrl = () => {
    let url = API.defaults.baseURL || "http://192.168.0.149:3333";
    if (url.endsWith("/")) url = url.slice(0, -1);
    if (url.endsWith("/api")) url = url.slice(0, -4);
    return url;
  };

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    try {
      const response = await fetch(
        `${getBaseUrl()}/api/disparo-whatsapp/dashboard`,
      );
      if (!response.ok) return;
      const result = await response.json();
      if (result?.status && result.data) setDashboardInfo(result.data);
    } catch (error) {
      console.error("Falha de comunicação:", error);
    }
  };

  const handleGerarDisparos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.seq_consultor || !form.indicacao || !form.limite) {
      setStatus({
        loading: false,
        success: null,
        error: "Preencha todos os campos corretamente.",
      });
      return;
    }
    setStatus({ loading: true, success: null, error: null });

    try {
      const response = await fetch(
        `${getBaseUrl()}/api/disparo-whatsapp/gerar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seq_consultor: form.seq_consultor,
            indicacao: form.indicacao,
            limite: Number(form.limite),
          }),
        },
      );

      const data = await response.json();
      if (response.ok && data.sucesso) {
        setStatus({
          loading: false,
          error: null,
          success: `${data.qtd_gerada} leads separados! Baixando...`,
        });
        window.location.href = `${getBaseUrl()}/api/disparo-whatsapp/download/${data.arquivo}`;
        setTimeout(() => {
          setIsModalOpen(false);
          carregarDashboard();
        }, 2500);
      } else {
        setStatus({
          loading: false,
          success: null,
          error: data.erro || "Erro ao processar leads.",
        });
      }
    } catch (error) {
      setStatus({
        loading: false,
        success: null,
        error: "Erro de conexão com o servidor. Verifique o console.",
      });
    }
  };

  const FunilCards = ({ dados }: { dados: any }) => {
    if (!dados) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card className="bg-card border border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Send className="w-4 h-4 text-blue-400" /> Total Enviado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold text-foreground">{dados.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Respondeu
              (Sucesso)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold text-emerald-400">
              {dados.sucessos}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <MessageSquareOff className="w-4 h-4 text-amber-400" /> Sem
              Resposta
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold text-amber-400">
              {dados.sem_resposta}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Falha no
              Disparo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold text-red-400">{dados.falhas}</p>
          </CardContent>
        </Card>

        {/* Linha 2 do Funil (CRM) */}
        <Card className="bg-card border border-border/50 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1 md:col-start-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Target className="w-4 h-4 text-indigo-400" /> CRM Aberto (Lead)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold text-indigo-400">
              {dados.crm_aberto}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Trophy className="w-4 h-4 text-green-500" /> CRM Ganho (Venda)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold text-green-500">
              {dados.crm_ganho}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <XOctagon className="w-4 h-4 text-rose-500" /> CRM Perdido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-3xl font-bold text-rose-500">
              {dados.crm_perdido}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const abasIndicacao = [
    "GERAL",
    "RENOVACAO",
    "PORTABILIDADE",
    "FORA DO PRAZO",
    "PRAZO LIMITADO",
    "PRAZO EXCEDIDO",
  ];

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <div className="w-[280px] h-full flex-shrink-0 z-20">
        <Sidebar />
      </div>

      <main className="relative flex-1 h-full flex flex-col overflow-y-auto bg-background/95 p-6 sm:p-10">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Central de Disparos
            </h2>
            <p className="text-muted-foreground mt-1">
              Geração de bases e acompanhamento de funil
            </p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold shadow-lg"
              >
                <DownloadCloud className="w-5 h-5 text-black" /> Gerar Disparos
                (XLSX)
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-xl text-white">
                  Extrair Base de Disparo
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleGerarDisparos} className="space-y-5 mt-2">
                <div className="space-y-2">
                  <Label className="text-white">Consultor Responsável</Label>
                  <Select
                    onValueChange={(val) =>
                      setForm({ ...form, seq_consultor: val })
                    }
                    value={form.seq_consultor}
                  >
                    <SelectTrigger className="bg-background text-white border-border">
                      <SelectValue placeholder="Selecione um consultor..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {dashboardInfo.consultores.map((c: any) => (
                        <SelectItem
                          className="text-white hover:bg-muted focus:bg-muted focus:text-white cursor-pointer"
                          key={c.seq_consultor}
                          value={String(c.seq_consultor)}
                        >
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Indicação (Campanha)</Label>
                  <Select
                    onValueChange={(val) =>
                      setForm({ ...form, indicacao: val })
                    }
                    value={form.indicacao}
                  >
                    <SelectTrigger className="bg-background text-white border-border">
                      <SelectValue placeholder="Selecione a indicação..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem
                        className="text-white hover:bg-muted focus:bg-muted focus:text-white cursor-pointer"
                        value="FORA DO PRAZO"
                      >
                        Fora do Prazo
                      </SelectItem>
                      <SelectItem
                        className="text-white hover:bg-muted focus:bg-muted focus:text-white cursor-pointer"
                        value="RENOVACAO"
                      >
                        Renovação
                      </SelectItem>
                      <SelectItem
                        className="text-white hover:bg-muted focus:bg-muted focus:text-white cursor-pointer"
                        value="PORTABILIDADE"
                      >
                        Portabilidade
                      </SelectItem>
                      <SelectItem
                        className="text-white hover:bg-muted focus:bg-muted focus:text-white cursor-pointer"
                        value="PRAZO LIMITADO"
                      >
                        Prazo Limitado
                      </SelectItem>
                      <SelectItem
                        className="text-white hover:bg-muted focus:bg-muted focus:text-white cursor-pointer"
                        value="PRAZO EXCEDIDO"
                      >
                        Prazo Excedido
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Quantidade Limite</Label>
                  <Input
                    className="bg-background text-white border-border placeholder:text-gray-500"
                    type="number"
                    min="1"
                    placeholder="Ex: 100"
                    value={form.limite}
                    onChange={(e) =>
                      setForm({ ...form, limite: e.target.value })
                    }
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  disabled={status.loading}
                >
                  {status.loading
                    ? "Processando..."
                    : "Confirmar e Baixar Planilha"}
                </Button>
                {status.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-sm text-center">
                    {status.error}
                  </div>
                )}
                {status.success && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-sm text-center">
                    {status.success}
                  </div>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* CARDS MACRO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-yellow-400 border-none shadow-md text-black">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold opacity-80 uppercase tracking-wide">
                Leads Frios Disponíveis (Geral)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-black">
                {dashboardInfo.totais.disponiveis}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-600 border-none shadow-md text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold opacity-80 uppercase tracking-wide">
                Histórico Total Disparado (Geral)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-black">
                {dashboardInfo.totais.disparados_total}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ANALISE DE FUNIL COM TABS */}
        <Card className="shadow-xl border-border bg-card/100 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="w-5 h-5 text-primary" />
              Análise Analítica de Desempenho
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs defaultValue="GERAL" className="w-full flex flex-col">
              <div className="overflow-x-auto pb-2 mb-2 scrollbar-thin">
                <TabsList className="flex w-max space-x-1 bg-transparent p-0">
                  {abasIndicacao.map((aba) => (
                    <TabsTrigger
                      key={aba}
                      value={aba}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:hover:bg-muted/80 rounded-full px-6 py-2 text-sm font-medium transition-all"
                    >
                      {aba}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {abasIndicacao.map((aba) => (
                <TabsContent
                  key={aba}
                  value={aba}
                  className="mt-4 focus-visible:outline-none focus-visible:ring-0 w-full"
                >
                  {aba !== "GERAL" && (
                    <div className="mb-6 p-5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between w-full">
                      <div>
                        <h4 className="font-bold text-blue-400 text-lg">
                          Base Fria (Não Disparada)
                        </h4>
                        <p className="text-sm text-blue-400/80 mt-1">
                          Quantidade de empresas de{" "}
                          <span className="font-semibold">{aba}</span> aptas
                          aguardando extração.
                        </p>
                      </div>
                      <span className="text-4xl font-black text-blue-400">
                        {dashboardInfo.totais.por_indicacao[aba] || 0}
                      </span>
                    </div>
                  )}

                  <FunilCards dados={dashboardInfo.totais.analise_funil[aba]} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
