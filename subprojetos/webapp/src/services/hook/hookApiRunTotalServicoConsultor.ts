import axios from "axios";
import { IConsultor } from "@/interfaces/pipeRunOportunidades.interface";

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
};

async function fetchTodosLeadsOmni(status: "open" | "won" | "lost" = "open"): Promise<any[]> {
  const limit = 200;
  let page = 1;
  let hasMore = true;
  let allDeals: any[] = [];
  const token = import.meta.env.VITE_TOKEN_API_KEY;

  if (!token) {
    throw new Error("Token de autenticação (AXION_API_KEY) não encontrado.");
  }

  while (hasMore) {
    try {
      const url = `https://omniassessoria.online/api/local/v1/deals?limit=${limit}&status=${status}&sort=updatedAt:desc&page=${page}`;
      
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
      console.error(`[Omni CRM] Erro ao buscar página ${page}:`, error);
      hasMore = false; 
    }
  }

  return allDeals;
}


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
