import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Logo } from "../logo_layout/logo"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Users, ChevronDown } from "lucide-react" // Adicionado ChevronDown
import ConsultorBD from "@/interfaces/consutorDb.interface"
import API from "@/services/api"

export function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const [consultores, setConsultores] = useState<ConsultorBD[]>([])
    const [isOpen, setIsOpen] = useState(true) // Estado para controlar a abertura da seção Equipe

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

    return (
        <aside className="h-full border-r border-border bg-card flex flex-col shadow-xl z-10">
            <div className="p-6 border-b border-border flex items-center gap-3">
                <Logo />
            </div>

            <div className="flex-1 flex flex-col pt-6 pb-10 overflow-hidden">
                <div className="px-6 mb-4 flex items-center gap-2 text-muted-foreground ">
                    <button
                        onClick={() => navigate(`/dashboard`)}
                        className={`text-left px-4 py-3 rounded-xl w-full transition-all duration-200 flex items-center justify-between group ${location.pathname === "/"
                            ? "bg-primary/10 text-primary font-medium border border-primary/20"
                            : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
                            }`}
                    >
                        <span>Dashboard Database</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </button>
                </div>

                <div className="px-6 mb-4 flex items-center gap-2 text-muted-foreground ">
                    <button
                        onClick={() => navigate(`/pipe-subir`)}
                        className={`text-left px-4 py-3 rounded-xl w-full transition-all duration-200 flex items-center justify-between group ${location.pathname === "/pipe-subi"
                            ? "bg-primary/10 text-primary font-medium border border-primary/20"
                            : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
                            }`}
                    >
                        <span>Leads Piperun</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </button>
                </div>         
                <div className="px-6 mb-4 flex items-center gap-2 text-muted-foreground ">
                    <button
                        onClick={() => navigate(`/disparo`)}
                        className={`text-left px-4 py-3 rounded-xl w-full transition-all duration-200 flex items-center justify-between group ${location.pathname === "/pipe-subi"
                            ? "bg-primary/10 text-primary font-medium border border-primary/20"
                            : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
                            }`}
                    >
                        <span>Disparo Comercial</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </button>
                </div> 
                <div className="px-6 mb-4 flex items-center gap-2 text-muted-foreground ">
                    <button
                        onClick={() => navigate(`/bdr`)}
                        className={`text-left px-4 py-3 rounded-xl w-full transition-all duration-200 flex items-center justify-between group ${location.pathname === "/pipe-subi"
                            ? "bg-primary/10 text-primary font-medium border border-primary/20"
                            : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
                            }`}
                    >
                        <span>Leads BDR</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </button>
                </div> 
            </div >
        </aside >
    )
}