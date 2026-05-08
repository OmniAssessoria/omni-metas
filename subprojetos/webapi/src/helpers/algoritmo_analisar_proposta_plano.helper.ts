import { PLANOS_DISPONIVEIS } from "../configs/planos_proposta.config";

export class AnalisadorPlanosHelper {
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

    // Comportamento original para GB
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
    const planos = PLANOS_DISPONIVEIS;
    const linhasReq = analiseAtual.linhas_requisitos as number[];

    let totalValorOferta = 0;
    let totalGbOferta = 0;
    let totalGbComBonusOferta = 0;
    const contagemPlanos: Record<number, any> = {};

    for (const gbMinimoLinha of linhasReq) {
      const planosValidos = planos
        .map((p, idx) => ({ ...p, originalIndex: idx }))
        .filter((p) => p.gb >= gbMinimoLinha);

      if (planosValidos.length === 0) {
        return null;
      }

      planosValidos.sort((a, b) => a.valor - b.valor);
      const melhorPlano = planosValidos[0];

      totalValorOferta = this.arredondarCentavos(
        totalValorOferta + melhorPlano.valor,
      );
      totalGbOferta += melhorPlano.gb;
      totalGbComBonusOferta += melhorPlano.gb + melhorPlano.bonus;

      if (!contagemPlanos[melhorPlano.originalIndex]) {
        contagemPlanos[melhorPlano.originalIndex] = {
          gb: melhorPlano.gb,
          valor: melhorPlano.valor,
          bonus: melhorPlano.bonus,
          qtd: 0,
        };
      }
      contagemPlanos[melhorPlano.originalIndex].qtd += 1;
    }

    return {
      combo: Object.values(contagemPlanos),
      total_gb: totalGbOferta,
      total_gb_com_bonus: totalGbComBonusOferta,
      total_valor: totalValorOferta,
    };
  }

  public encontrarMelhorOfertaMaisGb(analiseAtual: any, ofertaEconomica?: any) {
    const planos = PLANOS_DISPONIVEIS;
    const linhasReq = analiseAtual.linhas_requisitos as number[];

    const valorEco = ofertaEconomica ? ofertaEconomica.total_valor : -1;
    const gbTotalEco = ofertaEconomica
      ? ofertaEconomica.total_gb_com_bonus
      : -1;

    const valorBaseParaMargem = Math.max(analiseAtual.total_valor, valorEco);

    const planosValidosPorLinha = linhasReq.map((gbMinimo) => {
      return planos.filter((p) => p.gb >= gbMinimo);
    });

    if (planosValidosPorLinha.some((lista) => lista.length === 0)) return null;

    const custoMinimoPorLinha = planosValidosPorLinha.map((lista) =>
      Math.min(...lista.map((p) => p.valor)),
    );
    const sufixoCustoMinimo = new Array(linhasReq.length).fill(0);
    let acumulado = 0;
    for (let i = linhasReq.length - 1; i >= 0; i--) {
      acumulado = this.arredondarCentavos(acumulado + custoMinimoPorLinha[i]);
      sufixoCustoMinimo[i] = acumulado;
    }

    const buscarComLimite = (multiplicadorLimite: number) => {
      const limiteValorPermitido = this.arredondarCentavos(
        valorBaseParaMargem * multiplicadorLimite,
      );
      let melhorOferta: any = null;

      const gerarRecursivo = (
        indexLinha: number,
        gbAcumulado: number,
        bonusAcumulado: number,
        valorAcumulado: number,
        contagemAtual: Record<number, number>,
      ) => {
        const custoNecessarioRestante =
          indexLinha < linhasReq.length ? sufixoCustoMinimo[indexLinha] : 0;

        if (
          this.arredondarCentavos(valorAcumulado + custoNecessarioRestante) >
          limiteValorPermitido
        ) {
          return;
        }

        if (indexLinha === linhasReq.length) {
          const totalGbComBonus = gbAcumulado + bonusAcumulado;

          if (valorAcumulado < valorBaseParaMargem) {
            return;
          }

          if (ofertaEconomica) {
            if (valorAcumulado <= valorEco || totalGbComBonus <= gbTotalEco) {
              return;
            }
          }

          const ofertaAtual = {
            combo: converterContagemParaCombo(contagemAtual, planos),
            total_gb: gbAcumulado,
            total_gb_com_bonus: totalGbComBonus,
            total_valor: valorAcumulado,
          };

          if (
            !melhorOferta ||
            ofertaAtual.total_gb_com_bonus > melhorOferta.total_gb_com_bonus
          ) {
            melhorOferta = ofertaAtual;
          } else if (
            ofertaAtual.total_gb_com_bonus === melhorOferta.total_gb_com_bonus
          ) {
            if (ofertaAtual.total_valor < melhorOferta.total_valor) {
              melhorOferta = ofertaAtual;
            }
          }
          return;
        }

        const planosParaLinha = planosValidosPorLinha[indexLinha];

        for (let i = 0; i < planosParaLinha.length; i++) {
          const plano = planosParaLinha[i];
          const planoOriginalIndex = planos.indexOf(plano);

          contagemAtual[planoOriginalIndex] =
            (contagemAtual[planoOriginalIndex] || 0) + 1;

          gerarRecursivo(
            indexLinha + 1,
            gbAcumulado + plano.gb,
            bonusAcumulado + plano.bonus,
            this.arredondarCentavos(valorAcumulado + plano.valor),
            contagemAtual,
          );

          contagemAtual[planoOriginalIndex] -= 1;
          if (contagemAtual[planoOriginalIndex] === 0) {
            delete contagemAtual[planoOriginalIndex];
          }
        }
      };

      gerarRecursivo(0, 0, 0, 0, {});
      return melhorOferta;
    };

    const converterContagemParaCombo = (
      contagem: Record<number, number>,
      planosRef: any[],
    ) => {
      const combo = [];
      for (const idxStr in contagem) {
        const idx = Number(idxStr);
        const qtd = contagem[idx];
        if (qtd > 0) {
          combo.push({
            qtd,
            gb: planosRef[idx].gb,
            valor: planosRef[idx].valor,
            bonus: planosRef[idx].bonus,
          });
        }
      }
      return combo;
    };

    let ofertaEncontrada = null;
    let margemAtual = 1.06;
    const margemMaxima = 1.4;

    while (!ofertaEncontrada && margemAtual <= margemMaxima) {
      ofertaEncontrada = buscarComLimite(margemAtual);
      if (!ofertaEncontrada) {
        margemAtual = this.arredondarCentavos(margemAtual + 0.02);
      }
    }

    return ofertaEncontrada;
  }
}
