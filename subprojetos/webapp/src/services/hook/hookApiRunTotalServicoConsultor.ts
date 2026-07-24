import axios from "axios";
import { IConsultor } from "@/interfaces/pipeRunOportunidades.interface";

// ============================================================================
// MAPEAMENTO DE CONSULTORES E PERFIS
// ============================================================================
const MAPA_CONSULTORES: Record<string, { nome: string; perfil: string }> = {
  "otavio.souza@omniassessoria.com.br": { nome: "Otavio Souza", perfil: "BDR" },
  "nathalia.dadalte@omniassessoria.com.br": { nome: "Nathália Dadalte", perfil: "BDR" },
  "aline.araujo@omniassessoria.com.br": { nome: "Aline Araujo", perfil: "BDR" },
  "julia.penaforte@omniassessoria.com.br": { nome: "Julia Penaforte", perfil: "BDR" },
  "auditoria.rp@omniassessoria.com.br": { nome: "Letícia Petean", perfil: "BDR" },
  "carolina.souza@omniassessoria.com.br": { nome: "Carolina Souza", perfil: "RENOVACAO" },
  "aderlane.mendes@omniassessoria.com.br": { nome: "Aderlane Mendes", perfil: "RENOVACAO" },
  "natalia.ribeiro@omniassessoria.com.br": { nome: "Natalia Ribeiro", perfil: "RENOVACAO" },
  "gabrieli.lima@omniassessoria.com.br": { nome: "Gabrieli Lima", perfil: "PORTABILIDADE" },
  "leticia.ohara@omniassessoria.com.br": { nome: "Letícia Ohara", perfil: "PORTABILIDADE" },
  "leonardo.sousa@omniassessoria.com.br": { nome: "Leonardo Sousa", perfil: "OUTROS" },
};

// ============================================================================
// FUNÇÃO AUXILIAR: BUSCAR LEADS OMNI CRM COM PAGINAÇÃO
// ============================================================================
export async function fetchTodosLeadsOmni(status: "open" | "won" | "lost" = "open"): Promise<any[]> {
  const limit = 200;
  let page = 1;
  let hasMore = true;
  let allDeals: any[] = [];
  const token = import.meta.env.VITE_TOKEN_API_KEY;

  if (!token) {
    throw new Error("Token de autenticação (VITE_TOKEN_API_KEY) não encontrado no .env");
  }

  while (hasMore) {
    try {
      const url = `https://omniassessoria.online/api/local/v1/deals?limit=${limit}&status=${status}&page=${page}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const deals = response.data?.data || response.data?.deals || response.data;

      if (!Array.isArray(deals) || deals.length === 0) {
        hasMore = false;
        break;
      }

      allDeals = [...allDeals, ...deals];

      if (deals.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(`[Omni CRM] Erro ao buscar página ${page} do status ${status}:`, error);
      hasMore = false; 
    }
  }

  return allDeals;
}

// ============================================================================
// 1. FUNÇÃO: COMPILAR OPORTUNIDADES ABERTAS
// ============================================================================
export async function compilarOportunidadesDinamico(
  consultoresDinamic: IConsultor[]
) {
  const todosDeals = await fetchTodosLeadsOmni("open");
  const contadores: Record<string, number> = {};
  
  Object.keys(MAPA_CONSULTORES).forEach((email) => {
    contadores[email.toLowerCase()] = 0;
  });

  todosDeals.forEach((deal) => {
    const emailConsultor = deal.user?.email || deal.owner?.email || deal.email;

    if (emailConsultor) {
      const emailNormalizado = emailConsultor.toLowerCase().trim();

      if (contadores[emailNormalizado] !== undefined) {
        contadores[emailNormalizado]++;
      }
    }
  });

  const resultadoFinal = Object.keys(contadores).map((email) => {
    const info = MAPA_CONSULTORES[email];
    return {
      nome: info.nome,
      perfil: info.perfil,
      total: contadores[email],
    };
  });

  return resultadoFinal.filter((c) => c.total > 0);
}

// ============================================================================
// 2. FUNÇÃO: COMPILAR RELATÓRIO DE PERDAS, GANHOS E ABERTOS (SAFRA)
// ============================================================================
export async function compilarRelatorioPerdas(
  consultoresDinamic: IConsultor[],
  dataInicio: string,
  dataFim: string,
) {
  console.log(`[Omni CRM] Extraindo Safra (Período: ${dataInicio} até ${dataFim})...`);

  const [dealsAbertos, dealsGanhos, dealsPerdidos] = await Promise.all([
    fetchTodosLeadsOmni("open"),
    fetchTodosLeadsOmni("won"),
    fetchTodosLeadsOmni("lost"),
  ]);

  const contadores: Record<string, { totalAbertos: number; totalGanhos: number; totalPerdidos: number }> = {};
  Object.keys(MAPA_CONSULTORES).forEach((email) => {
    contadores[email.toLowerCase()] = { totalAbertos: 0, totalGanhos: 0, totalPerdidos: 0 };
  });

  const isWithinDate = (deal: any, campoData: "criacao" | "fechamento") => {
    const rawDate = campoData === "criacao" 
      ? (deal.createdAt || deal.created_at || "") 
      : (deal.closed_at || deal.updatedAt || deal.updated_at || deal.createdAt || "");
      
    if (!rawDate) return false;

    const dataValida = rawDate.split("T")[0].split(" ")[0];
    
    return dataValida >= dataInicio && dataValida <= dataFim;
  };

  // Processa as 3 listas
  dealsAbertos.forEach(deal => {
    const email = (deal.user?.email || deal.owner?.email || deal.email || "").toLowerCase().trim();
    if (contadores[email] && isWithinDate(deal, "criacao")) {
      contadores[email].totalAbertos++;
    }
  });

  dealsGanhos.forEach(deal => {
    const email = (deal.user?.email || deal.owner?.email || deal.email || "").toLowerCase().trim();
    if (contadores[email] && isWithinDate(deal, "fechamento")) {
      contadores[email].totalGanhos++;
    }
  });

  dealsPerdidos.forEach(deal => {
    const email = (deal.user?.email || deal.owner?.email || deal.email || "").toLowerCase().trim();
    if (contadores[email] && isWithinDate(deal, "fechamento")) {
      contadores[email].totalPerdidos++;
    }
  });

  const resultadoFinal = Object.keys(contadores).map((email) => {
    const info = MAPA_CONSULTORES[email];
    const stats = contadores[email];
    
    return {
      nome: info.nome,
      perfil: info.perfil,
      totalGanhos: stats.totalGanhos,
      totalPerdidos: stats.totalPerdidos,
      totalAbertos: stats.totalAbertos,
    };
  });

  return resultadoFinal
    .filter((c) => c.totalGanhos > 0 || c.totalPerdidos > 0 || c.totalAbertos > 0)
    .sort(
      (a, b) =>
        (b.totalGanhos + b.totalPerdidos + b.totalAbertos) -
        (a.totalGanhos + a.totalPerdidos + a.totalAbertos)
    );
}
