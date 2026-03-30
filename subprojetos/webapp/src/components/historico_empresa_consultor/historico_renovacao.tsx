import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  X,
  History,
  Users,
  LayoutList,
  Calendar,
  Target,
  Loader2,
} from "lucide-react";

export interface IHistoricoEmpresa {
  seq_historico_consultor_empresa: number;
  tipo_servico: string;
  data_inicio_atendimento: string;
  data_fim_atendimento: string | null;
  consultor_nome: string;
  perfil_indicacao: string;
  perfil_qtd_linhas_min: number;
  perfil_qtd_linhas_max: number;
  motivo_declinio: string | null;
  situacao_atendimento: string | null;
}

interface IDialogHistoricoRenovacaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaNome: string;
  dadosHistorico: IHistoricoEmpresa[];
  isCarregando: boolean;
}

export default function DialogHistoricoRenovacao({
  open,
  onOpenChange,
  empresaNome,
  dadosHistorico,
  isCarregando,
}: IDialogHistoricoRenovacaoProps) {
  
  const formatarDataComHora = (
    dataString: string | Date | undefined | null,
  ) => {
    if (!dataString) return "Não informado";
    try {
      const dateObj = new Date(dataString);
      if (isNaN(dateObj.getTime())) throw new Error();
      return dateObj.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data Inválida";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background [&>button.absolute]:hidden">
        <div className="p-6 border-b border-border bg-muted/10 shrink-0 flex items-start justify-between">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-yellow-600">
              <History className="w-6 h-6" />
              Histórico de Consultores
            </DialogTitle>
            <DialogDescription className="text-base font-semibold text-foreground mt-2">
              Atendimentos registrados para:{" "}
              <span className="text-yellow-600">{empresaNome}</span>
            </DialogDescription>
          </DialogHeader>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto relative">
          {isCarregando ? (
            <div className="flex flex-col items-center justify-center py-12 h-full">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-4" />
              <p className="text-muted-foreground font-medium">
                Buscando linha do tempo...
              </p>
            </div>
          ) : dadosHistorico.length === 0 ? (
            <div className="bg-muted/30 p-10 rounded-lg text-center border border-dashed border-border mt-4">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">
                Nenhum histórico de consultor encontrado para esta empresa.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-yellow-200 ml-4 space-y-8 py-4">
              {dadosHistorico.map((hist) => (
                <div
                  key={hist.seq_historico_consultor_empresa}
                  className="relative pl-8"
                >
                  <div className="absolute w-5 h-5 bg-yellow-500 rounded-full -left-[11px] top-1.5 border-4 border-background shadow-sm" />

                  <div className="bg-card border border-border shadow-sm rounded-xl p-5 transition-all hover:shadow-md hover:border-yellow-200">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        <h4 className="text-xl font-bold flex items-center gap-2 text-foreground">
                          <Users className="w-5 h-5 text-yellow-500" />
                          {hist.consultor_nome}
                        </h4>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-bold">
                            <Target className="w-3.5 h-3.5" />
                            {hist.perfil_indicacao || "S/ Perfil"}
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold">
                            <LayoutList className="w-3.5 h-3.5" />
                            Linhas: {hist.perfil_qtd_linhas_min} a{" "}
                            {hist.perfil_qtd_linhas_max}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-start md:items-end text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50 min-w-[180px]">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow-600" />
                          <span className="font-medium">Início:</span>{" "}
                          {formatarDataComHora(hist.data_inicio_atendimento)}
                        </span>
                        {hist.data_fim_atendimento ? (
                          <span className="flex items-center gap-2 mt-2">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            <span className="font-medium">Fim:</span>{" "}
                            {formatarDataComHora(hist.data_fim_atendimento)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 mt-2 text-green-600">
                            <span className="relative flex h-3 w-3 mr-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            Em Andamento
                          </span>
                        )}
                      </div>
                    </div>

                    <hr className="border-border my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1.5">
                          Desfecho / Declinio
                        </span>
                        {hist.motivo_declinio ? (
                          <span className="font-bold text-red-700 bg-red-50 px-3 py-1 rounded-md border border-red-200 inline-block">
                            {hist.motivo_declinio}
                          </span>
                        ) : (
                          <span className="font-bold text-green-700 bg-green-50 px-3 py-1 rounded-md border border-green-200 inline-block">
                            GANHO / CONVERTIDO
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1.5">
                          Serviço Analisado
                        </span>
                        <span className="font-semibold bg-yellow-50/50 text-yellow-800 px-3 py-1 rounded-md border border-yellow-200 inline-block">
                          {hist.situacao_atendimento || "N/A"} -{" "}
                          {hist.tipo_servico}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}