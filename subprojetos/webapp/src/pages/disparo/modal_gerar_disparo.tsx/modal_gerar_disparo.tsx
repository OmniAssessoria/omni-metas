import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  UserPlus,
  FileSpreadsheet,
  Loader2,
  PieChart as PieChartIcon,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect} from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";

const COR_RENOVACAO = "#eab308";
const COR_PORTABILIDADE = "#3b82f6";
const COR_CARTEIRA = "#10b981";
const COR_FUNDO = "#e5e7eb";

interface IConsultorBolha {
  id: string;
  nome: string;
  total: number;
  perfil: "RENOVACAO" | "PORTABILIDADE" | "CARTEIRA" | "AMBOS";
}

export function ModalGerarDisparo({ onBack }: { onBack: () => void }) {
  const [loadingBolhas, setLoadingBolhas] = useState<boolean>(true);
  const [dadosPipelineBolhas, setDadosPipelineBolhas] = useState<IConsultorBolha[]>([]);
  const [modalAtribuicaoAberto, setModalAtribuicaoAberto] = useState<boolean>(false);
  const [consultorSelecionado, setConsultorSelecionado] = useState<string>("");
  const [tipoServicoSelecionado, setTipoServicoSelecionado] = useState<string>("");
  const [quantidadeContatos, setQuantidadeContatos] = useState<string>("");
  const [isSalvandoAtribuicao, setIsSalvandoAtribuicao] = useState<boolean>(false);

  useEffect(() => {
    const carregarMock = () => {
      setLoadingBolhas(true);
      setTimeout(() => {
        const perfis = [
          "RENOVACAO",
          "PORTABILIDADE",
          "CARTEIRA",
          "AMBOS",
        ] as const;

        const mockGerado: IConsultorBolha[] = Array.from({ length: 12 }).map(
          (_, index) => {
            const isVazio = Math.random() > 0.8;
            return {
              id: String(index + 1),
              nome: `Consultor Especialista ${index + 1}`,
              total: isVazio ? 0 : Math.floor(Math.random() * 450) + 15,
              perfil: perfis[Math.floor(Math.random() * perfis.length)],
            };
          },
        );

        mockGerado.sort((a, b) => b.total - a.total);
        setDadosPipelineBolhas(mockGerado);
        setLoadingBolhas(false);
      }, 1500);
    };

    carregarMock();
  }, []);

  const handleGerarPlanilha = () => {
    console.log("Gerando planilha...");
  };

  const handleAbrirModalAtribuicao = () => {
    setConsultorSelecionado("");
    setTipoServicoSelecionado("");
    setQuantidadeContatos("");
    setModalAtribuicaoAberto(true);
  };

  const salvarNovaAtribuicao = () => {
    setIsSalvandoAtribuicao(true);

    setTimeout(() => {
      console.log("Atribuição Realizada:", {
        consultorId: consultorSelecionado,
        tipoServico: tipoServicoSelecionado,
        quantidade: quantidadeContatos,
      });

      setIsSalvandoAtribuicao(false);
      setModalAtribuicaoAberto(false);
    }, 1500);
  };

  const renderCenterText = (value: number, label: string) => {
    return (
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
        <tspan x="50%" dy="-0.5em" fontSize="36" fontWeight="bold" fill="currentColor" className="text-foreground">
          {value}
        </tspan>
        <tspan x="50%" dy="2.5em" fontSize="14" fill="#6b7280">
          {label}
        </tspan>
      </text>
    );
  };

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <div className="w-[280px] h-full flex-shrink-0">
        <Sidebar />
      </div>

      <main className="relative flex-1 h-full flex flex-col bg-muted/5">
        <header className="w-full flex items-center justify-between px-8 py-6 bg-background border-b border-border shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <PieChartIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Gestão de Disparos
              </h1>
              <p className="text-sm text-muted-foreground">
                Atribuição de contatos e geração de planilhas táticas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>

            <Button
              variant="secondary"
              onClick={handleAbrirModalAtribuicao}
              className="gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800"
            >
              <UserPlus className="h-4 w-4" /> Atribuir Contatos
            </Button>

            <Button onClick={handleGerarPlanilha} className="gap-2 shadow-md">
              <FileSpreadsheet className="h-4 w-4" /> Gerar Planilha Disparo
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Distribuição de Oportunidades Atribuídas
              </h2>
              <div className="text-sm text-muted-foreground flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#eab308]"></div> Renovação
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Portabilidade
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Carteira
                </span>
              </div>
            </div>

            <div className="w-full bg-card rounded-xl border border-border p-6 shadow-sm min-h-[500px]">
              {loadingBolhas ? (
                <div className="w-full h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                  <p className="font-medium">Calculando distribuição de pipeline...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {dadosPipelineBolhas.map((entry) => {
                    let cor = "#8884d8";
                    if (entry.perfil === "RENOVACAO") cor = COR_RENOVACAO;
                    if (entry.perfil === "PORTABILIDADE") cor = COR_PORTABILIDADE;
                    if (entry.perfil === "CARTEIRA") cor = COR_CARTEIRA;
                    if (entry.perfil === "AMBOS") cor = "#a855f7";

                    return (
                      <div
                        key={`bolha-${entry.id}`}
                        className="flex flex-col items-center bg-background border border-border/60 rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-all duration-300 group"
                      >
                        <h3 className="text-sm font-bold text-center mb-1 line-clamp-2 h-10 flex items-center group-hover:text-primary transition-colors">
                          {entry.nome}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider font-semibold" style={{ color: cor }}>
                          {entry.perfil}
                        </p>
                        <div className="w-48 h-48 relative drop-shadow-sm">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[{ name: "Total", value: entry.total }, { name: "Vazio", value: entry.total === 0 ? 1 : 0 }]}
                                cx="50%" cy="50%" innerRadius={65} outerRadius={85} dataKey="value" stroke="none" cornerRadius={4} paddingAngle={2}
                              >
                                <Cell fill={entry.total === 0 ? COR_FUNDO : cor} />
                                <Cell fill={COR_FUNDO} opacity={0.3} />
                              </Pie>
                              {renderCenterText(entry.total, "Total")}
                              <RechartsTooltip formatter={(val: any) => val === 0 && entry.total === 0 ? [0, "Oportunidades"] : [val, "Oportunidades"]} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Atribuição */}
      <Dialog open={modalAtribuicaoAberto} onOpenChange={setModalAtribuicaoAberto}>
        <DialogContent className="sm:max-w-md bg-background border border-border rounded-xl">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <UserPlus className="w-5 h-5 text-primary" />
              Atribuir Contatos
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Defina a quantidade e o tipo de serviço para direcionar ao consultor selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col gap-5">
            <div className="space-y-2">
              <Label className="font-semibold">Consultor</Label>
              <Select value={consultorSelecionado} onValueChange={setConsultorSelecionado} disabled={isSalvandoAtribuicao}>
                <SelectTrigger className="w-full bg-muted/30 focus:ring-primary h-11">
                  <SelectValue placeholder="Selecione o consultor..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {dadosPipelineBolhas.map((c) => (
                    <SelectItem key={`select-${c.id}`} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Tipo de Serviço</Label>
              <Select value={tipoServicoSelecionado} onValueChange={setTipoServicoSelecionado} disabled={isSalvandoAtribuicao}>
                <SelectTrigger className="w-full bg-muted/30 focus:ring-primary h-11">
                  <SelectValue placeholder="Selecione o serviço..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXA_RENOVACAO">Fixa / Renovação</SelectItem>
                  <SelectItem value="PORTABILIDADE">Portabilidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Quantidade de Contatos</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 50"
                value={quantidadeContatos}
                onChange={(e) => setQuantidadeContatos(e.target.value)}
                disabled={isSalvandoAtribuicao}
                className="bg-muted/30 focus-visible:ring-primary h-11"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border flex justify-end gap-3 sm:justify-end">
            <Button variant="ghost" onClick={() => setModalAtribuicaoAberto(false)} disabled={isSalvandoAtribuicao} className="text-white bg-grey-400 hover:bg-muted">
              Cancelar
            </Button>
            <Button
              onClick={salvarNovaAtribuicao}
              disabled={isSalvandoAtribuicao || !consultorSelecionado || !tipoServicoSelecionado || !quantidadeContatos || Number(quantidadeContatos) <= 0}
              className="min-w-[130px] font-semibold transition-all"
            >
              {isSalvandoAtribuicao ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Atribuir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
