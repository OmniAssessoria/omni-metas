import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, CalendarDays, Coins, Users, Send } from "lucide-react"
import API from "@/services/api"
import ConsultorBD from "@/interfaces/consutorDb.interface"


export function MetaForm() {
    const [consultorSelecionado, setConsultorSelecionado] = useState<number | null>(null)
    const [valorMes, setValorMes] = useState("")
    const [valorAtingido, setValorAtingido] = useState("")
    const [data, setData] = useState("")
    const [consultores, setConsultores] = useState<ConsultorBD[]>([])
    const [metaAtual, setMetaAtual] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth()
    const primeiroDiaMes = new Date(anoAtual, mesAtual, 1).toISOString().split("T")[0]
    const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0).toISOString().split("T")[0]


    useEffect(() => {
        async function fetchConsultores() {
            try {
                const response = await API.get("/api/consultores")
                setConsultores(response.data?.dados ?? [])

            } catch (error) {
                console.error("Erro ao buscar consultores", error)
            }
        }

        fetchConsultores()
    }, [])

    const handleConsultorChange = (id: string) => {
        const seq = Number(id)
        setConsultorSelecionado(seq)
        const consultor = consultores.find(c => c.seq_consultor === seq)

        if (consultor) {
            setMetaAtual(consultor.meta_mensal)

            if (consultor.meta_mensal) {
                setValorMes(
                    new Intl.NumberFormat("pt-BR", {
                        minimumFractionDigits: 2
                    }).format(consultor.meta_mensal)
                )
            } else {
                setValorMes("")
            }
        }
    }

    const formatarMoeda = (valor: string) => {
        const numericValue = valor.replace(/\D/g, "")
        if (!numericValue) return ""
        return new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: 2
        }).format(Number(numericValue) / 100)
    }

    const handleValorMesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValorMes(formatarMoeda(e.target.value))
    }

    const handleValorAtingidoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValorAtingido(formatarMoeda(e.target.value))
    }

    const parseMoeda = (valor: string) => {
        return Number(valor.replace(/\./g, "").replace(",", "."))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!consultorSelecionado || !valorAtingido || !data) {
            alert("Preencha os campos obrigatórios")
            return
        }

        try {
            setIsLoading(true)
            await API.post("/api/consultores/meta-diaria", {
                seq_consultor: consultorSelecionado,
                data_referencia: data,
                valor_dia: parseMoeda(valorAtingido)
            })
            alert("Meta registrada com sucesso")
            setValorAtingido("")
            setData("")

        } catch (error) {
            console.error(error)
            alert("Erro ao registrar meta")

        } finally {
            setIsLoading(false)
        }
    }

    async function alterarValorMensal() {
        if (!consultorSelecionado || !valorMes) {
            alert("Selecione um consultor e informe a meta.")
            return
        }

        try {
            setIsLoading(true)

            const novaMeta = parseMoeda(valorMes)

            await API.put(`/api/consultores/${consultorSelecionado}/meta-mensal`, {
                meta_mensal: novaMeta
            })

            setMetaAtual(novaMeta)

            alert("Meta mensal atualizada!")

        } catch (error) {
            console.error(error)
            alert("Erro ao atualizar meta mensal")

        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-[420px]">
            <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Target className="text-primary w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                    Cadastro de Meta
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Lançamento diário de resultados e definição de novos objetivos.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Users size={16} className="text-primary" />
                            Consultor
                        </label>
                        <Select onValueChange={handleConsultorChange}>
                            <SelectTrigger className="h-12 w-full bg-background border-border focus:ring-primary text-foreground rounded-xl">
                                <SelectValue placeholder="Selecione consultor" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground mt-15 mb-15 p-2">
                                {consultores.map((c) => (
                                    <SelectItem key={c.seq_consultor} value={String(c.seq_consultor)}>
                                        {c.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Coins size={16} className="text-primary" />
                            Valor atingido no dia
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                R$
                            </span>
                            <Input
                                placeholder="Valor atingido"
                                value={valorAtingido}
                                onChange={handleValorAtingidoChange}
                                className="pl-10 h-12 bg-background border-border focus-visible:ring-primary text-foreground text-lg rounded-xl disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <CalendarDays size={16} className="text-primary" />
                            Data do Lançamento
                        </label>
                        <Input
                            type="date"
                            value={data}
                            min={primeiroDiaMes}
                            max={ultimoDiaMes}
                            onChange={(e) => setData(e.target.value)}
                            className="h-12 bg-background border-border focus-visible:ring-primary text-foreground rounded-xl disabled:opacity-50 [color-scheme:dark]"
                        />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100">
                        Registrar
                    </Button>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Target size={16} className="text-primary" />
                            Definir Meta Mensal
                        </label>

                        <div className="flex gap-2 align-center justify-center">

                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                    R$
                                </span>

                                <Input
                                    placeholder="Meta mensal"
                                    value={valorMes}
                                    onChange={handleValorMesChange}
                                    className="pl-10 h-12 bg-primary/5 border-primary/30 focus-visible:ring-primary text-foreground text-lg rounded-xl"
                                />
                            </div>

                            <Button
                                type="button"
                                onClick={alterarValorMensal}
                                disabled={isLoading}
                                className="h-12 px-4 rounded-xl"
                            >
                                <Send size={40} />
                            </Button>
                        </div>

                        {metaAtual !== null && (
                            <p className="text-xs text-muted-foreground">
                                Meta atual: R$ {metaAtual.toLocaleString("pt-BR")}
                            </p>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card >
    )
}