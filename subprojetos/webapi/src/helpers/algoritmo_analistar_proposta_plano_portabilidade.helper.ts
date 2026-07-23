export const PLANOS_VIVO_DISPONIVEIS = [
  { gb: 6, valor: 39.99, bonus: 0 },
  { gb: 15, valor: 54.99, bonus: 0 },
  { gb: 20, valor: 59.99, bonus: 0 },
  { gb: 30, valor: 69.99, bonus: 0 },
  { gb: 40, valor: 79.99, bonus: 0 },
  { gb: 50, valor: 89.99, bonus: 0 },
  { gb: 100, valor: 99.99, bonus: 0 },
];

export class AnalisadorPlanosPortabilidadeHelper {
  private arredondarCentavos(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  public extrairGb(texto: any): number {
    if (!texto) return 0;
    if (typeof texto === "number") return texto;

    const textoStr = String(texto);
    if (/MB/i.test(textoStr)) {
      const match = textoStr.match(/(\d+)\s*MB/i);
      if (match) {
        const mb = parseInt(match[1], 10);
        return mb / 1000;
      }
    }
    const match = textoStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  public analisarPlanosCliente(servicos: any[]) {
    const planos_agrupados: Record<string, any> = {};
    let total_valor = 0;
    let total_gb = 0;
    let total_linhas = 0;

    const linhas_requisitos: number[] = [];

    for (const servico of servicos) {
      if (servico.linha_ativa === false) continue;

      const plano = servico.plano || "";
      const valor = Number(servico.valor) || 0;
      const gbBase = this.extrairGb(plano);

      linhas_requisitos.push(gbBase);

      if (!planos_agrupados[plano]) {
        planos_agrupados[plano] = {
          quantidade: 0,
          gb_unitario: gbBase,
          valor_unitario: valor,
          total_valor: 0,
          total_gb: 0,
        };
      }

      planos_agrupados[plano].quantidade += 1;
      planos_agrupados[plano].total_valor = this.arredondarCentavos(
        planos_agrupados[plano].total_valor + valor,
      );
      total_valor = this.arredondarCentavos(total_valor + valor);
      planos_agrupados[plano].total_gb += gbBase;
      total_gb += gbBase;
      total_linhas += 1;
    }

    return {
      planos_agrupados,
      total_valor,
      total_gb,
      total_linhas,
      linhas_requisitos,
      servicos,
    };
  }

  public encontrarMelhorOfertaEconomica(analiseAtual: any) {
    const planos = PLANOS_VIVO_DISPONIVEIS;
    const linhasReq = analiseAtual.linhas_requisitos as number[];
    const limiteMinimo = this.arredondarCentavos(
      analiseAtual.total_valor * 0.82,
    );
    const limiteMaximo = analiseAtual.total_valor;

    let planosEscolhidos = linhasReq.map(() => planos[0]);
    let totalValor = planosEscolhidos.reduce((acc, p) => acc + p.valor, 0);

    if (totalValor >= limiteMaximo) return null;

    const indicesOrdenados = linhasReq
      .map((gb, idx) => ({ gb, idx }))
      .sort((a, b) => b.gb - a.gb);

    let houveMudanca = true;

    while (totalValor < limiteMinimo && houveMudanca) {
      houveMudanca = false;
      for (const item of indicesOrdenados) {
        const idx = item.idx;
        const planoAtual = planosEscolhidos[idx];
        const planoIndex = planos.findIndex(
          (p) => p.gb === planoAtual.gb && p.valor === planoAtual.valor,
        );

        if (planoIndex < planos.length - 1) {
          const proximoPlano = planos[planoIndex + 1];

          if (
            totalValor - planoAtual.valor + proximoPlano.valor <
            limiteMaximo
          ) {
            planosEscolhidos[idx] = proximoPlano;
            totalValor = this.arredondarCentavos(
              totalValor - planoAtual.valor + proximoPlano.valor,
            );
            houveMudanca = true;
            if (totalValor >= limiteMinimo) break;
          }
        }
      }
    }

    return this.compilarOferta(planosEscolhidos);
  }

  public encontrarMelhorOfertaMaisGb(analiseAtual: any, ofertaEconomica?: any) {
    const planos = PLANOS_VIVO_DISPONIVEIS;
    const linhasReq = analiseAtual.linhas_requisitos as number[];
    const limiteMaximo = this.arredondarCentavos(
      analiseAtual.total_valor * 1.30,
    );
    
    const alvoGb = Math.max(
      analiseAtual.total_gb,
      ofertaEconomica ? ofertaEconomica.total_gb_com_bonus : 0,
    );
    const valorEco = ofertaEconomica ? ofertaEconomica.total_valor : 0;

    let planosEscolhidos = ofertaEconomica
      ? ofertaEconomica.planos_por_linha.map(
          (p: any) =>
            planos.find((pl) => pl.valor === p.valor && pl.gb === p.gb) ||
            planos[0],
        )
      : linhasReq.map(() => planos[0]);

    let totalValor = planosEscolhidos.reduce((acc: number, p: any) => acc + p.valor, 0);
    let totalGb = planosEscolhidos.reduce((acc: number, p: any) => acc + p.gb, 0);

    const indicesOrdenados = linhasReq
      .map((gb, idx) => ({ gb, idx }))
      .sort((a, b) => b.gb - a.gb);

    let houveMudanca = true;
    while (houveMudanca) {
      houveMudanca = false;
      for (const item of indicesOrdenados) {
        const idx = item.idx;
        const planoAtual = planosEscolhidos[idx];
        const planoIndex = planos.findIndex(
          (p) => p.gb === planoAtual.gb && p.valor === planoAtual.valor,
        );

        if (planoIndex < planos.length - 1) {
          const proximoPlano = planos[planoIndex + 1];
          const novoTotalValor = this.arredondarCentavos(
            totalValor - planoAtual.valor + proximoPlano.valor,
          );
          const novoTotalGb = totalGb - planoAtual.gb + proximoPlano.gb;
          const novoTotalGbComBonus = novoTotalGb + 10;

          if (novoTotalValor <= limiteMaximo) {
            planosEscolhidos[idx] = proximoPlano;
            totalValor = novoTotalValor;
            totalGb = novoTotalGb;
            houveMudanca = true;

            if (novoTotalGbComBonus > alvoGb && totalValor > valorEco) {
              return this.compilarOferta(planosEscolhidos);
            }
          }
        }
      }
    }

    return null;
  }

  private compilarOferta(planosEscolhidos: any[]) {
    let totalValor = 0;
    let totalGb = 0;
    const contagemPlanos: Record<number, any> = {};

    planosEscolhidos.forEach((plano, idxOriginal) => {
      totalValor += plano.valor;
      totalGb += plano.gb;

      const idxBusca = PLANOS_VIVO_DISPONIVEIS.indexOf(plano);
      if (!contagemPlanos[idxBusca]) {
        contagemPlanos[idxBusca] = {
          gb: plano.gb,
          valor: plano.valor,
          qtd: 0,
        };
      }
      contagemPlanos[idxBusca].qtd += 1;
    });

    return {
      combo: Object.values(contagemPlanos),
      planos_por_linha: [...planosEscolhidos],
      total_gb: totalGb,
      total_gb_com_bonus: totalGb + 10, 
      total_valor: this.arredondarCentavos(totalValor),
    };
  }
}
