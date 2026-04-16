import { PLANOS_DISPONIVEIS } from "../configs/planos_proposta.config";

export class AnalisadorPlanosHelper {
  public extrairGb(texto: any): number {
    if (!texto) return 0;
    if (typeof texto === "number") return texto;
    const match = String(texto).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  public analisarPlanosCliente(servicos: any[]) {
    const planos_agrupados: Record<string, any> = {};
    let total_valor = 0;
    let total_gb = 0;
    let total_linhas = 0;

    for (const servico of servicos) {
      if (servico.linha_ativa === false) continue;

      const plano = servico.plano || "";
      const valor = Number(servico.valor) || 0;
      const gbBase = this.extrairGb(plano);

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
      planos_agrupados[plano].total_valor += valor;
      planos_agrupados[plano].total_gb += gbBase;
      total_valor += valor;
      total_gb += gbBase;
      total_linhas += 1;
    }

    return {
      planos_agrupados,
      total_valor,
      total_gb,
      total_linhas,
      servicos,
    };
  }

  // ============================================================================
  // OFERTA ECONÔMICA (Regra: Manter GB mínimo, buscar o Menor Valor)
  // ============================================================================
  public encontrarMelhorOfertaEconomica(analiseAtual: any) {
    const planos = PLANOS_DISPONIVEIS;
    const totalLinhas = analiseAtual.total_linhas;
    const gbMinimo = analiseAtual.total_gb;

    let melhorOferta: any = null;

    const gerarRecursivo = (
      linhasRestantes: number,
      gbAcumulado: number,
      valorAcumulado: number,
      comboAtual: any[],
      idxPlano: number,
    ) => {
      if (melhorOferta && valorAcumulado >= melhorOferta.total_valor) {
        return;
      }

      if (linhasRestantes === 0) {
        if (gbAcumulado >= gbMinimo) {
          const totalBonus = comboAtual.reduce(
            (acc, p) => acc + p.bonus * p.qtd,
            0,
          );
          const ofertaAtual = {
            combo: [...comboAtual],
            total_gb: gbAcumulado,
            total_gb_com_bonus: gbAcumulado + totalBonus,
            total_valor: valorAcumulado,
          };

          if (
            !melhorOferta ||
            ofertaAtual.total_valor < melhorOferta.total_valor
          ) {
            melhorOferta = ofertaAtual;
          }
        }
        return;
      }

      for (let i = idxPlano; i < planos.length; i++) {
        const plano = planos[i];
        for (let qtd = 1; qtd <= linhasRestantes; qtd++) {
          comboAtual.push({
            qtd,
            gb: plano.gb,
            valor: plano.valor,
            bonus: plano.bonus,
          });

          gerarRecursivo(
            linhasRestantes - qtd,
            gbAcumulado + plano.gb * qtd,
            valorAcumulado + plano.valor * qtd,
            comboAtual,
            i + 1,
          );

          comboAtual.pop();
        }
      }
    };

    gerarRecursivo(totalLinhas, 0, 0, [], 0);
    return melhorOferta;
  }

  // ============================================================================
  // OFERTA MAIS GB (Regra: Teto elástico, MAIS CARA e MAIOR GB BASE que a Eco)
  // ============================================================================
  public encontrarMelhorOfertaMaisGb(analiseAtual: any, ofertaEconomica?: any) {
    const planos = PLANOS_DISPONIVEIS;
    const totalLinhas = analiseAtual.total_linhas;
    const gbMinimo = analiseAtual.total_gb;    
    
    const valorEco = ofertaEconomica ? ofertaEconomica.total_valor : -1;
    const gbBaseEco = ofertaEconomica ? ofertaEconomica.total_gb : -1;

    const buscarComLimite = (multiplicadorLimite: number) => {
      const limiteValorPermitido = analiseAtual.total_valor * multiplicadorLimite;
      let melhorOferta: any = null;

      const gerarRecursivo = (
        linhasRestantes: number,
        gbAcumulado: number,
        valorAcumulado: number,
        comboAtual: any[],
        idxPlano: number,
      ) => {
        if (valorAcumulado > limiteValorPermitido) {
          return;
        }

        if (linhasRestantes === 0) {
          if (gbAcumulado >= gbMinimo && valorAcumulado <= limiteValorPermitido) {
            
            // ===============================================================
            // REGRA ABSOLUTA DE DESEMPATE
            // Descarta a proposta se o valor for menor/igual OU o GB for menor/igual
            // ===============================================================
            if (ofertaEconomica) {
              if (valorAcumulado <= valorEco || gbAcumulado <= gbBaseEco) {
                return; 
              }
            }

            const totalBonus = comboAtual.reduce((acc, p) => acc + p.bonus * p.qtd, 0);
            const totalGbComBonus = gbAcumulado + totalBonus;

            const ofertaAtual = {
              combo: [...comboAtual],
              total_gb: gbAcumulado,
              total_gb_com_bonus: totalGbComBonus,
              total_valor: valorAcumulado,
            };

            if (!melhorOferta || ofertaAtual.total_gb_com_bonus > melhorOferta.total_gb_com_bonus) {
              melhorOferta = ofertaAtual;
            }
          }
          return;
        }

        for (let i = idxPlano; i < planos.length; i++) {
          const plano = planos[i];
          for (let qtd = 1; qtd <= linhasRestantes; qtd++) {
            comboAtual.push({ qtd, gb: plano.gb, valor: plano.valor, bonus: plano.bonus });

            gerarRecursivo(
              linhasRestantes - qtd,
              gbAcumulado + plano.gb * qtd,
              valorAcumulado + plano.valor * qtd,
              comboAtual,
              i + 1,
            );

            comboAtual.pop();
          }
        }
      };

      gerarRecursivo(totalLinhas, 0, 0, [], 0);
      return melhorOferta;
    };

    let ofertaEncontrada = null;
    let margemAtual = 1.06; 
    const margemMaxima = 1.40; 

    while (!ofertaEncontrada && margemAtual <= margemMaxima) {
      ofertaEncontrada = buscarComLimite(margemAtual);
      
      if (!ofertaEncontrada) {
        margemAtual += 0.02; 
      }
    }

    return ofertaEncontrada;
  }
}
