import { ReactNode } from "react"
import { OmniBackground } from "../decoration/OmniBackground"
import { Sidebar } from "../sidebar_consultores/sidebar_consultor"

export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            {/* Fixamos a largura da Sidebar */}
            <div className="w-[280px] h-full flex-shrink-0">
                <Sidebar />
            </div>

            {/* Main content com background pattern sutil */}
            <main className="relative flex-1 h-full overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-10">
                <div className="relative z-10 w-full max-w-4xl flex items-center justify-center">
                    {children}
                </div>
                <OmniBackground />
            </main>
        </div>
    )
}