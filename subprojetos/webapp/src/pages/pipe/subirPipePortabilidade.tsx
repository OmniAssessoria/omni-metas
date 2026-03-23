import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor";
import { IServicoPipeRun, ITelaDetalhesProps } from "./subirPipeGeral";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";


export function PipeSubirPortabilidade({ dados, onBack }: ITelaDetalhesProps) {
    return (
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            <div className="w-[280px] h-full flex-shrink-0">
                <Sidebar />
            </div>
            <main className="flex-1 h-full overflow-y-auto p-10">
                <Button variant="ghost" onClick={onBack} className="mb-6 -ml-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Painel Geral
                </Button>
                <h1 className="text-3xl font-bold mb-2">Detalhes de Portabilidade</h1>
                <p className="text-muted-foreground mb-8">
                    Gerenciando {dados.length} serviços de portabilidade aguardando subida ao PipeRun.
                </p>

                {/* Aqui entra a tabela de detalhes no futuro */}
                <div className="rounded-md border p-4 bg-muted/20">
                    <pre className="text-xs overflow-auto max-h-[600px]">
                        {JSON.stringify(dados, null, 2)}
                    </pre>
                </div>
            </main>
        </div>
    );
}