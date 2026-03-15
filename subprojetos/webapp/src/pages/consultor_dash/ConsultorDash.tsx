import { useParams } from "react-router-dom"
import { AppLayout } from "@/components/layout_tela_consultores/layout_principal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCircle, BarChart3 } from "lucide-react"
import { useState, useEffect } from "react"
import API from "@/helpers/api"
import { Sidebar } from "@/components/sidebar_consultores/sidebar_consultor"

export default function ConsultorDash() {
    const { id } = useParams()
    const [consultor, setConsultor] = useState<any>(null)
    const [metas, setMetas] = useState<any[]>([])

    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()

    const diasNoMes = new Date(ano, mes + 1, 0).getDate()

    function formatarMoeda(valor: number) {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(valor)
    }
    useEffect(() => {
        async function carregarDados() {

            const consultorResp = await API.get(`/api/consultores/${id}`)
            setConsultor(consultorResp.data.dados)

            const metasResp = await API.get(`/api/consultores/${id}/meta-mensal`)
            setMetas(metasResp.data.dados)
        }

        carregarDados()

    }, [id])

    const totalVendido = metas.reduce((acc, m) => acc + Number(m.valor_dia), 0)

    const metaMensal = consultor?.meta_mensal ?? 0

    const faltaParaMeta = metaMensal - totalVendido

    function valorDoDia(dia: number) {
        const registro = metas.find(m => new Date(m.data_referencia).getDate() === dia)
        return registro?.valor_dia ?? null
    }

    return (
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            <div className="w-[280px] h-full flex-shrink-0">
                <Sidebar />
            </div>
            <main className="relative flex-1 h-full overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-10">
                <div className="flex pt-60 w-full items-center gap-4 border-b border-border pb-6">
                    <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
                        <UserCircle size={40} className="text-primary" />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{consultor?.nome}</h1>
                        <p className="text-muted-foreground">Visão do Consultor</p>
                    </div>
                </div>


                <div className="flex w-full flex-col gap-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm text-muted-foreground">
                                    Dias registrados
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <p className="text-3xl font-bold">
                                    {metas.length}
                                </p>
                            </CardContent>
                        </Card>


                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm text-muted-foreground">
                                    Total vendido
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <p className="text-3xl font-bold">
                                    {formatarMoeda(totalVendido)}
                                </p>
                            </CardContent>
                        </Card>


                        <Card className="bg-primary">
                            <CardHeader>
                                <CardTitle className="text-sm text-primary-foreground/80">
                                    Meta do mês
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <p className="text-3xl font-bold text-white">
                                    {formatarMoeda(metaMensal)}
                                </p>
                            </CardContent>
                        </Card>

                    </div>


                    <Card className="border-primary/30">
                        <CardHeader>
                            <CardTitle>Falta para atingir a meta</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-4xl font-bold text-primary">
                                {formatarMoeda(Math.max(faltaParaMeta, 0))}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dias registrados no mês</CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div className="grid grid-cols-7 gap-3">
                                {Array.from({ length: diasNoMes }).map((_, index) => {
                                    const dia = index + 1
                                    const valor = valorDoDia(dia)
                                    return (
                                        <div key={dia} className="relative group">
                                            <div
                                                className={`flex items-center justify-center h-12 rounded-lg border text-sm cursor-pointer transition
            ${valor ? "bg-primary text-white border-primary" : "bg-muted/30 border-border"}
            `}
                                            >
                                                {dia}
                                            </div>

                                            {valor && (
                                                <div className="absolute z-50 -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                                                    <div className="bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                                        {formatarMoeda(Number(valor))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>


                    {/* LINK BI */}

                    <Card className="border-emerald-400">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 size={18} />
                                Análise completa no BI
                            </CardTitle>
                        </CardHeader>

                        <CardContent>

                            <a
                                href="#"
                                className="text-lg font-semibold text-emerald-400 hover:underline"
                            >
                                Abrir dashboard completo do consultor
                            </a>

                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}