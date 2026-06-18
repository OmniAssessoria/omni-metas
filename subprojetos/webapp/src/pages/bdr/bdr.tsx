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
  ServerCrash
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface IBDRMock {
  id: string;
  nome: string;
  enviadosCrm: number;
  carteira: number;
  pendentesEnvio: number;
}

export default function PainelBDR() {
  const [bdrSelecionado, setBdrSelecionado] = useState<string>("");
  const [quantidadeUpload, setQuantidadeUpload] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [leadsGlobais, setLeadsGlobais] = useState<number>(0);
  const [listaBDRs, setListaBDRs] = useState<IBDRMock[]>([]);
  const [loadingDados, setLoadingDados] = useState<boolean>(true);

  useEffect(() => {
    const carregarDados = () => {
      setLoadingDados(true);
      setTimeout(() => {
        setLeadsGlobais(Math.floor(Math.random() * 5000) + 1500);

        const bdrMock: IBDRMock[] = Array.from({ length: 8 }).map((_, i) => ({
          id: `bdr-${i + 1}`,
          nome: `BDR Hunter ${i + 1}`,
          enviadosCrm: Math.floor(Math.random() * 800) + 100,
          carteira: Math.floor(Math.random() * 150) + 20,
          pendentesEnvio: Math.floor(Math.random() * 300) + 10,
        }));

        bdrMock.sort((a, b) => b.pendentesEnvio - a.pendentesEnvio);

        setListaBDRs(bdrMock);
        setLoadingDados(false);
      }, 1000);
    };

    carregarDados();
  }, []);

  const handleDispararLeads = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      console.log("Payload enviado:", {
        bdrId: bdrSelecionado,
        quantidade: Number(quantidadeUpload),
      });

      setLeadsGlobais((prev) => Math.max(0, prev - Number(quantidadeUpload)));
      setNotification(`Sucesso! ${quantidadeUpload} leads enviados para o CRM do BDR selecionado.`);
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              Operação BDR
            </h1>
            <p className="text-muted-foreground mt-1 text-base">
              Gestão de leads outbound, carteira e sincronização com CRM de prospecção.
            </p>
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
                    <Label className="font-semibold text-muted-foreground">Selecione o BDR</Label>
                    <Select
                      value={bdrSelecionado}
                      onValueChange={setBdrSelecionado}
                      disabled={isSubmitting || loadingDados}
                    >
                      <SelectTrigger className="h-12 bg-background">
                        <SelectValue placeholder="Escolha um consultor..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {listaBDRs.map((bdr) => (
                          <SelectItem key={`select-${bdr.id}`} value={bdr.id}>
                            {bdr.nome}
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
                      placeholder="Ex: 150"
                      value={quantidadeUpload}
                      onChange={(e) => setQuantidadeUpload(e.target.value)}
                      disabled={isSubmitting || loadingDados}
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
                        Number(quantidadeUpload) <= 0
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
                <p>Carregando métricas dos BDRs...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {listaBDRs.map((bdr) => (
                  <Card key={bdr.id} className="hover:border-primary/40 transition-colors group">
                    <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
                      <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                        {bdr.nome}
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
                            {bdr.enviadosCrm.toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-background">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Briefcase className="h-4 w-4 text-amber-500" />
                            Carteira
                          </div>
                          <span className="font-bold text-lg tabular-nums text-foreground/80">
                            {bdr.carteira.toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-primary/5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <Clock className="h-4 w-4" />
                            Pendentes de Envio
                          </div>
                          <span className="font-bold text-lg tabular-nums text-primary">
                            {bdr.pendentesEnvio.toLocaleString("pt-BR")}
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