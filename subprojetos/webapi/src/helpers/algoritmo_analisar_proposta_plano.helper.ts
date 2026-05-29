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
    
    const limiteDescontoMaximo = analiseAtual.total_linhas * 3;
    const valorMinimoPermitido = this.arredondarCentavos(analiseAtual.total_valor - limiteDescontoMaximo);

    let totalValorOfertaGuloso = 0;
    let totalGbOfertaGuloso = 0;
    let totalGbComBonusOfertaGuloso = 0;
    const contagemPlanosGuloso: Record<number, any> = {};
    const planosEscolhidosPorLinhaGuloso: any[] = [];

    const planosValidosPorLinha = linhasReq.map((gbMinimoLinha) => {
      const validos = planos
        .map((p, idx) => ({ ...p, originalIndex: idx }))
        .filter((p) => p.gb >= gbMinimoLinha);
      
      validos.sort((a, b) => a.valor - b.valor);
      return validos;
    });

    if (planosValidosPorLinha.some((lista) => lista.length === 0)) {
      return null;
    }

    for (const listaPlanos of planosValidosPorLinha) {
      const melhorPlano = listaPlanos[0];

      planosEscolhidosPorLinhaGuloso.push({
        gb: melhorPlano.gb,
        valor: melhorPlano.valor,
        bonus: melhorPlano.bonus,
      });

      totalValorOfertaGuloso = this.arredondarCentavos(totalValorOfertaGuloso + melhorPlano.valor);
      totalGbOfertaGuloso += melhorPlano.gb;
      totalGbComBonusOfertaGuloso += melhorPlano.gb + melhorPlano.bonus;

      if (!contagemPlanosGuloso[melhorPlano.originalIndex]) {
        contagemPlanosGuloso[melhorPlano.originalIndex] = {
          gb: melhorPlano.gb,
          valor: melhorPlano.valor,
          bonus: melhorPlano.bonus,
          qtd: 0,
        };
      }
      contagemPlanosGuloso[melhorPlano.originalIndex].qtd += 1;
    }

    const ofertaGuloso = {
      combo: Object.values(contagemPlanosGuloso),
      planos_por_linha: planosEscolhidosPorLinhaGuloso,
      total_gb: totalGbOfertaGuloso,
      total_gb_com_bonus: totalGbComBonusOfertaGuloso,
      total_valor: totalValorOfertaGuloso,
    };

    if (ofertaGuloso.total_valor >= valorMinimoPermitido) {
      return ofertaGuloso;
    }

    const sufixoCustoMinimo = new Array(linhasReq.length).fill(0);
    let acumulado = 0;
    for (let i = linhasReq.length - 1; i >= 0; i--) {
      acumulado = this.arredondarCentavos(acumulado + planosValidosPorLinha[i][0].valor);
      sufixoCustoMinimo[i] = acumulado;
    }

    let melhorOfertaAlternativa: any = null;

    const converterContagemParaCombo = (contagem: Record<number, number>, planosRef: any[]) => {
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

    const gerarRecursivoEco = (
      indexLinha: number,
      gbAcumulado: number,
      bonusAcumulado: number,
      valorAcumulado: number,
      contagemAtual: Record<number, number>,
      planosEscolhidos: any[]
    ) => {
      const custoNecessarioRestante = indexLinha < linhasReq.length ? sufixoCustoMinimo[indexLinha] : 0;
      const projecaoValorMinimo = this.arredondarCentavos(valorAcumulado + custoNecessarioRestante);
      if (melhorOfertaAlternativa && projecaoValorMinimo >= melhorOfertaAlternativa.total_valor) {
        return;
      }

      if (indexLinha === linhasReq.length) {
        if (valorAcumulado >= valorMinimoPermitido) {
          const totalGbComBonus = gbAcumulado + bonusAcumulado;

          const ofertaAtual = {
            combo: converterContagemParaCombo(contagemAtual, planos),
            planos_por_linha: [...planosEscolhidos],
            total_gb: gbAcumulado,
            total_gb_com_bonus: totalGbComBonus,
            total_valor: valorAcumulado,
          };

          if (!melhorOfertaAlternativa || ofertaAtual.total_valor < melhorOfertaAlternativa.total_valor) {
            melhorOfertaAlternativa = ofertaAtual;
          } else if (ofertaAtual.total_valor === melhorOfertaAlternativa.total_valor) {
            if (ofertaAtual.total_gb_com_bonus > melhorOfertaAlternativa.total_gb_com_bonus) {
              melhorOfertaAlternativa = ofertaAtual;
            }
          }
        }
        return;
      }

      const planosParaLinha = planosValidosPorLinha[indexLinha];

      for (let i = 0; i < planosParaLinha.length; i++) {
        const plano = planosParaLinha[i];
        const planoOriginalIndex = plano.originalIndex;

        contagemAtual[planoOriginalIndex] = (contagemAtual[planoOriginalIndex] || 0) + 1;
        planosEscolhidos.push({
          gb: plano.gb,
          valor: plano.valor,
          bonus: plano.bonus,
        });

        gerarRecursivoEco(
          indexLinha + 1,
          gbAcumulado + plano.gb,
          bonusAcumulado + plano.bonus,
          this.arredondarCentavos(valorAcumulado + plano.valor),
          contagemAtual,
          planosEscolhidos
        );

        planosEscolhidos.pop();
        contagemAtual[planoOriginalIndex] -= 1;
        if (contagemAtual[planoOriginalIndex] === 0) {
          delete contagemAtual[planoOriginalIndex];
        }
      }
    };

    gerarRecursivoEco(0, 0, 0, 0, {}, []);

    return melhorOfertaAlternativa;
  }

  public encontrarMelhorOfertaMaisGb(analiseAtual: any, ofertaEconomica?: any) {
    const planos = PLANOS_DISPONIVEIS;
    const linhasReq = analiseAtual.linhas_requisitos as number[];

    const valorEco = ofertaEconomica ? ofertaEconomica.total_valor : -1;
    const gbTotalEco = ofertaEconomica ? ofertaEconomica.total_gb_com_bonus : -1;
    const valorBaseParaMargem = Math.max(analiseAtual.total_valor, valorEco);

    const limiteDescontoMaximo = analiseAtual.total_linhas * 3;
    const valorMinimoPermitido = this.arredondarCentavos(analiseAtual.total_valor - limiteDescontoMaximo);

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

      const gerarRecursivo = (
        indexLinha: number,
        gbAcumulado: number,
        bonusAcumulado: number,
        valorAcumulado: number,
        contagemAtual: Record<number, number>,
        planosEscolhidos: any[],
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
          if (valorAcumulado < valorMinimoPermitido) {
            return;
          }

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
            planos_por_linha: [...planosEscolhidos],
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

          planosEscolhidos.push({
            gb: plano.gb,
            valor: plano.valor,
            bonus: plano.bonus,
          });

          gerarRecursivo(
            indexLinha + 1,
            gbAcumulado + plano.gb,
            bonusAcumulado + plano.bonus,
            this.arredondarCentavos(valorAcumulado + plano.valor),
            contagemAtual,
            planosEscolhidos,
          );

          planosEscolhidos.pop();

          contagemAtual[planoOriginalIndex] -= 1;
          if (contagemAtual[planoOriginalIndex] === 0) {
            delete contagemAtual[planoOriginalIndex];
          }
        }
      };

      gerarRecursivo(0, 0, 0, 0, {}, []);
      return melhorOferta;
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
