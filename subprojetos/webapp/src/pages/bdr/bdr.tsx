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
import {
  Database,
  Send,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ServerCrash,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import API from "@/services/api";

interface IContagemResponse {
  total_disponiveis: string | number;
}

interface IPainelConsultorResponse {
  seq_consultor: number;
  nome_consultor: string;
  total_ativo_crm: string | number;
  total_ativo_crm_carteira: string | number;
  total_disponivel_envio: string | number;
}

interface IBDRMetrics {
  seq_consultor: number;
  nome_consultor: string;
  total_ativo_crm: number;
  total_ativo_crm_carteira: number;
  total_disponivel_envio: number;
}

export default function PainelBDR() {
  const [bdrSelecionado, setBdrSelecionado] = useState<string>("");
  const [quantidadeUpload, setQuantidadeUpload] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);  
  const [leadsGlobais, setLeadsGlobais] = useState<number>(0);
  const [listaBDRs, setListaBDRs] = useState<IBDRMetrics[]>([]);
  const [loadingDados, setLoadingDados] = useState<boolean>(true);

  const carregarDados = async () => {
    setLoadingDados(true);
    try {
      const [resContagem, resIndicadores] = await Promise.all([
        API.get("/api/servico-omni/leads/contagem"),
        API.get("/api/servico-omni/dashboard/indicadores")
      ]);

      const dadosContagem: IContagemResponse = resContagem.data?.dados?.[0];
      const totalGeral = dadosContagem ? Number(dadosContagem.total_disponiveis) : 0;
      setLeadsGlobais(totalGeral);

      const dadosConsultores: IPainelConsultorResponse[] = resIndicadores.data?.dados || [];
      
      const bdrsMapeados: IBDRMetrics[] = dadosConsultores.map((item) => ({
        seq_consultor: Number(item.seq_consultor),
        nome_consultor: item.nome_consultor || "Consultor Sem Nome",
        total_ativo_crm: Number(item.total_ativo_crm || 0),
        total_ativo_crm_carteira: Number(item.total_ativo_crm_carteira || 0),
        total_disponivel_envio: Number(item.total_disponivel_envio || 0)
      }));

      bdrsMapeados.sort((a, b) => b.total_disponivel_envio - a.total_disponivel_envio);

      setListaBDRs(bdrsMapeados);
    } catch (error: any) {
      console.error("[Painel BDR] Erro ao carregar dados das Views:", error.message);
    } finally {
      setLoadingDados(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleDispararLeads = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      console.log("Payload que será enviado para a API:", {
        seq_consultor: Number(bdrSelecionado),
        quantidade: Number(quantidadeUpload),
      });
      setLeadsGlobais((prev) => Math.max(0, prev - Number(quantidadeUpload)));
      setNotification(`Sucesso! ${quantidadeUpload} leads enviados para o consultor selecionado.`);
      setIsSubmitting(false);
      setQuantidadeUpload("");
      setBdrSelecionado("");

      setTimeout(() => setNotification(null), 5000);
    }, 1500);
  };

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <div className="w-[280px] h-full flex-shrink-0">
        <Sidebar />
      </div>

      <main className="relative flex-1 h-full flex flex-col overflow-y-auto bg-muted/10 p-6 sm:p-10">
        {notification && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">{notification}</p>
          </div>
        )}

        <div className="w-full max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" />
                Operação BDR
              </h1>
              <p className="text-muted-foreground mt-1 text-base">
                Gestão de leads outbound, carteira e sincronização com CRM de prospecção.
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={carregarDados}
              disabled={loadingDados}
              className="flex items-center gap-2 bg-background shadow-sm hover:bg-muted transition-all"
              size="lg"
            >
              <RefreshCw className={`h-5 w-5 text-primary ${loadingDados ? "animate-spin" : ""}`} />
              Atualizar Dados
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <Card className="bg-primary shadow-lg border-none flex flex-col justify-center">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-primary-foreground/80 font-medium text-sm uppercase tracking-wider">
                      Leads Globais Disponíveis
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-extrabold text-primary-foreground">
                        {loadingDados ? "..." : leadsGlobais.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-primary-foreground/70 text-sm mt-2">
                      Aguardando distribuição para a equipe.
                    </p>
                  </div>
                  <div className="p-4 bg-primary-foreground/10 rounded-full">
                    <Database className="h-10 w-10 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Subir Leads para o CRM
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-end gap-5">

                  <div className="space-y-2 w-full sm:w-[40%]">
                    <Label className="font-semibold text-muted-foreground">Selecione o Consultor</Label>
                    <Select
                      value={bdrSelecionado}
                      onValueChange={setBdrSelecionado}
                      disabled={isSubmitting || loadingDados || leadsGlobais === 0}
                    >
                      <SelectTrigger className="h-12 bg-background">
                        <SelectValue placeholder="Escolha um consultor..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {listaBDRs.map((bdr) => (
                          <SelectItem key={`bdr-${bdr.seq_consultor}`} value={String(bdr.seq_consultor)}>
                            {bdr.nome_consultor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 w-full sm:w-[30%]">
                    <Label className="font-semibold text-muted-foreground">Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      max={leadsGlobais}
                      placeholder="Ex: 150"
                      value={quantidadeUpload}
                      onChange={(e) => setQuantidadeUpload(e.target.value)}
                      disabled={isSubmitting || loadingDados || leadsGlobais === 0}
                      className="h-12 bg-background font-medium"
                    />
                  </div>

                  <div className="w-full sm:w-[30%]">
                    <Button
                      onClick={handleDispararLeads}
                      disabled={
                        isSubmitting ||
                        !bdrSelecionado ||
                        !quantidadeUpload ||
                        Number(quantidadeUpload) <= 0 ||
                        Number(quantidadeUpload) > leadsGlobais
                      }
                      className="w-full h-12 text-base font-bold transition-all shadow-md"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" /> Disparar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground border-b border-border/50 pb-2">
              <Users className="h-6 w-6 text-muted-foreground" />
              Desempenho e Carga da Equipe
            </h2>

            {loadingDados ? (
              <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-xl border border-border">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                <p>Carregando métricas direto do banco...</p>
              </div>
            ) : listaBDRs.length === 0 ? (
              <div className="w-full h-32 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-xl border border-dashed border-border">
                <p>Nenhum consultor encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {listaBDRs.map((bdr) => (
                  <Card key={`card-${bdr.seq_consultor}`} className="hover:border-primary/40 transition-colors group">
                    <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
                      <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                        {bdr.nome_consultor}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/50">

                        <div className="flex items-center justify-between p-4 bg-background">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <ServerCrash className="h-4 w-4 text-emerald-500" />
                            Enviados ao CRM
                          </div>
                          <span className="font-bold text-lg tabular-nums">
                            {bdr.total_ativo_crm.toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-background">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Briefcase className="h-4 w-4 text-amber-500" />
                            Carteira
                          </div>
                          <span className="font-bold text-lg tabular-nums text-foreground/80">
                            {bdr.total_ativo_crm_carteira.toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-primary/5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <Clock className="h-4 w-4" />
                            Pendentes de Envio
                          </div>
                          <span className="font-bold text-lg tabular-nums text-primary">
                            {bdr.total_disponivel_envio.toLocaleString("pt-BR")}
                          </span>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
