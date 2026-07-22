export const CORES_VIVO = {
  primaria: "#660099",
  primaria_escura: "#4C0073",
  primaria_clara: "#8A2BE2",
  primaria_bg: "rgba(102, 0, 153, 0.15)",
  preto: "#0A0A0A",
  preto_suave: "#1A1A1A",
  preto_card: "#111111",
  cinza_escuro: "#333333",
  cinza_medio: "#666666",
  cinza_claro: "#999999",
  branco: "#FFFFFF",
  destaque: "#FF9900",
  destaque_bg: "rgba(255, 153, 0, 0.12)",
  azul: "#00A9E0",
  azul_bg: "#277995",
};

export function gerarHtmlPropostaPortabilidade(proposta: any): string {
  let eco = proposta.oferta_economica;
  let turbo = proposta.oferta_mais_gb;

  if (eco && turbo) {
    if (turbo.total_valor <= eco.total_valor) turbo = null;
  }

  const atual = proposta.situacao_atual;

  const formatarTelefoneProposta = (numeroStr: string): string => {
    if (!numeroStr) return "-";
    let apenasNumeros = String(numeroStr).replace(/\D/g, "");
    if (apenasNumeros.startsWith("55") && apenasNumeros.length >= 12) {
      apenasNumeros = apenasNumeros.substring(2);
    }
    if (apenasNumeros.length === 11)
      return `+55 ${apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}`;
    if (apenasNumeros.length === 10)
      return `+55 ${apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")}`;
    return numeroStr;
  };

  const linhasAtivas = (atual.servicos || []).filter(
    (s: any) => s.linha_ativa !== false,
  );
  const telefonesReais = linhasAtivas.map((s: any) =>
    formatarTelefoneProposta(s.numero_linha),
  );

  const eco_total_val = eco ? eco.total_valor : 0;
  const eco_total_gb = eco ? eco.total_gb_com_bonus : 0;
  const turbo_total_val = turbo ? turbo.total_valor : 0;
  const turbo_total_gb = turbo ? turbo.total_gb_com_bonus : 0;

  const economia_contrato = eco ? (atual.total_valor - eco_total_val) * 24 : 0;
  const ganho_gb = turbo ? turbo_total_gb - atual.total_gb : 0;

  const gerarTabelaProposta = (oferta: any) => {
    if (
      !oferta ||
      !oferta.planos_por_linha ||
      oferta.planos_por_linha.length === 0
    ) {
      return "<p style='color:#ccc;'>Nenhuma combinação viável encontrada.</p>";
    }

    let linhasHtml = "";
    let prop_gb_base = 0;
    let prop_bonus = 0;
    let prop_valor = 0;

    oferta.planos_por_linha.forEach((planoLinha: any, index: number) => {
      const numero_real = telefonesReais[index] || `Linha ${index + 1}`;
      const plano_nome = `Vivo Pós ${planoLinha.gb}GB`;
      const gb_total = planoLinha.gb + planoLinha.bonus;

      prop_gb_base += planoLinha.gb;
      prop_bonus += planoLinha.bonus;
      prop_valor += planoLinha.valor;

      linhasHtml += `
      <tr>
          <td>${numero_real}</td>
          <td class="plan-name">${plano_nome}</td>
          <td style="color: ${CORES_VIVO.destaque}; font-weight:bold;">+${planoLinha.bonus} GB</td>
          <td class="highlight-purple">${gb_total} GB</td>
          <td class="highlight-white">R$ ${planoLinha.valor.toFixed(2)}</td>
      </tr>`;
    });

    return `
    <div class="table-wrapper">
        <table>
            <thead>
                <tr><th>Número da Linha</th><th>Novo Plano Vivo</th><th>Bônus Portab.</th><th>GB Total (Por Mês)</th><th>Valor</th></tr>
            </thead>
            <tbody>${linhasHtml}</tbody>
            <tfoot>
                <tr>
                    <td colspan="2"><strong>TOTAL DA CONTA</strong></td>
                    <td style="color:${CORES_VIVO.preto};"><strong>${prop_bonus} GB</strong></td>
                    <td><strong>${prop_gb_base + prop_bonus} GB</strong></td>
                    <td><strong>R$ ${prop_valor.toFixed(2)}</strong></td>
                </tr>
            </tfoot>
        </table>
    </div>`;
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Proposta Comercial VIVO - ${proposta.empresa.razao_social}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', -apple-system, sans-serif;
            background: linear-gradient(135deg, ${CORES_VIVO.preto} 0%, #150020 50%, ${CORES_VIVO.preto_suave} 100%);
            min-height: 100vh; padding: 40px 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        
        .promo-banner {
            background: linear-gradient(90deg, ${CORES_VIVO.primaria}, ${CORES_VIVO.primaria_clara});
            color: #fff; text-align: center; padding: 18px; border-radius: 12px; margin-bottom: 30px;
            font-size: 1.3em; font-weight: 600; letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(102, 0, 153, 0.4); border: 1px solid ${CORES_VIVO.primaria_clara};
        }
        .promo-banner strong { color: ${CORES_VIVO.destaque}; font-size: 1.1em; }

        .glass {
            background: rgba(102, 0, 153, 0.05); backdrop-filter: blur(10px);
            border-radius: 20px; border: 1px solid rgba(102, 0, 153, 0.2);
            padding: 40px; margin-bottom: 30px;
        }
        .header { text-align: center; color: white; margin-bottom: 20px; }
        .header h1 { font-size: 3em; font-weight: 800; margin-bottom: 10px; color: ${CORES_VIVO.branco}; }
        .header p { font-size: 1.3em; opacity: 0.9; color: ${CORES_VIVO.azul}; }
        
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .info-card { background: rgba(0,0,0,0.6); padding: 25px; border-radius: 15px; text-align: center; border: 1px solid rgba(102,0,153,0.3); }
        .info-card h3 { color: ${CORES_VIVO.cinza_claro}; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; }
        .info-card p { font-size: 2em; font-weight: 700; color: #fff; }
        
        .offers-title { text-align: center; color: ${CORES_VIVO.branco}; font-size: 2.2em; margin-bottom: 30px; font-weight: 700; }
        .offers-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px; }
        .offer-card { background: rgba(0,0,0,0.7); border-radius: 20px; padding: 35px; position: relative; overflow: hidden; border: 1px solid rgba(102,0,153,0.3); }
        .offer-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
        .offer-economica::before { background: linear-gradient(90deg, ${CORES_VIVO.azul}, #00FFFF); }
        .offer-turbo::before { background: linear-gradient(90deg, ${CORES_VIVO.destaque}, #FFCC00); }
        
        .offer-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 0.85em; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
        .badge-economica { background: ${CORES_VIVO.azul_bg}; color: ${CORES_VIVO.azul}; }
        .badge-turbo { background: ${CORES_VIVO.destaque_bg}; color: ${CORES_VIVO.destaque}; }
        
        .offer-title { font-size: 1.6em; margin-bottom: 10px; color: #fff; font-weight: 700; }
        .offer-price { font-size: 3em; font-weight: 800; margin: 20px 0; line-height: 1; }
        .offer-economica .offer-price { color: ${CORES_VIVO.branco}; }
        .offer-turbo .offer-price { color: ${CORES_VIVO.branco}; }
        .offer-price small { font-size: 0.3em; color: #888; font-weight: 400; }
        
        .highlight-box { background: rgba(255,255,255,0.05); padding: 18px; border-radius: 12px; margin: 20px 0; text-align: center; }
        .offer-economica .highlight-box { border-left: 4px solid ${CORES_VIVO.azul}; }
        .offer-turbo .highlight-box { border-left: 4px solid ${CORES_VIVO.destaque}; }
        .highlight-box strong { display: block; font-size: 1.3em; margin-bottom: 5px; }
        .offer-economica .highlight-box strong { color: ${CORES_VIVO.azul}; }
        .offer-turbo .highlight-box strong { color: ${CORES_VIVO.destaque}; }
        .highlight-box p { color: #ccc; font-size: 0.95em; }
        
        .benefit-item { display: flex; align-items: center; gap: 12px; padding: 12px; margin: 8px 0; background: rgba(255,255,255,0.03); border-radius: 8px; }
        .benefit-icon { font-size: 1.5em; min-width: 30px; }
        .benefit-text { color: #ddd; font-weight: 500; font-size: 0.95em; }
        .benefit-text strong { color: ${CORES_VIVO.primaria_clara}; display: block; margin-bottom: 3px; }
        
        .table-section { margin-top: 50px; }
        .table-section h2 { color: ${CORES_VIVO.branco}; margin-bottom: 20px; font-size: 1.8em; text-align: center; }
        .table-wrapper { overflow-x: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); background: rgba(0, 0, 0, 0.7); margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; }
        thead { background: linear-gradient(135deg, ${CORES_VIVO.primaria_escura} 0%, ${CORES_VIVO.preto_suave} 100%); color: white; }
        th { padding: 18px 15px; text-align: left; font-weight: 600; font-size: 0.95em; letter-spacing: 0.5px; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: center; }
        tbody tr { border-bottom: 1px solid rgba(102, 0, 153, 0.2); transition: all 0.3s ease; }
        tbody tr:hover { background: rgba(102, 0, 153, 0.1); }
        td { padding: 16px 15px; color: #ccc; font-size: 0.9em; }
        td:nth-child(3), td:nth-child(4), td:nth-child(5) { text-align: center; }
        .highlight-purple { background: rgba(138, 43, 226, 0.15); font-weight: 600; color: ${CORES_VIVO.primaria_clara}; }
        .highlight-white { font-weight: 600; color: ${CORES_VIVO.branco}; }
        .plan-name { font-weight: 600; color: #fff; }
        tfoot { background: linear-gradient(135deg, ${CORES_VIVO.branco} 0%, #e0e0e0 100%); color: ${CORES_VIVO.preto}; font-weight: 700; font-size: 1.1em; }
        tfoot td { padding: 20px 15px; border-top: 3px solid ${CORES_VIVO.primaria}; color: ${CORES_VIVO.preto}; }
        tfoot td:nth-child(3), tfoot td:nth-child(4), tfoot td:nth-child(5) { text-align: center; }
        .footer { text-align: center; color: #666; margin-top: 40px; padding: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="promo-banner">
            PROMOÇÃO DE PORTABILIDADE: Traga seu número e ganhe <strong>+10GB DE BÔNUS</strong> por linha todo mês!
        </div>

        <div class="glass header">
            <h1>Proposta Portabilidade</h1>
            <p><strong>${proposta.empresa.cnpj}</strong></p>
            <p style="color:#fff;">${proposta.empresa.razao_social}</p>
        </div>

        <div class="glass">
            <div class="info-grid">
                <div class="info-card"><h3>Linhas Atuais</h3><p>${atual.total_linhas}</p></div>
                <div class="info-card"><h3>Internet Atual</h3><p>${atual.total_gb} GB</p></div>
                <div class="info-card"><h3>Fatura Atual</h3><p>R$ ${atual.total_valor.toFixed(2)}</p></div>
            </div>
        </div>

        <h2 class="offers-title">🎯 Novas Opções VIVO Empresas</h2>
        <div class="offers-container">
            ${
              eco
                ? `
            <div class="offer-card offer-economica">
                <span class="offer-badge badge-economica">💰 Redução de Custos</span>
                <h3 class="offer-title">Plano Econômico</h3>
                <div class="offer-price">R$ ${eco_total_val.toFixed(2)}<small>/mês</small></div>
                <div class="highlight-box">
                    <strong>Economia de R$ ${economia_contrato.toFixed(2)}</strong>
                    <p>Ao final de 24 meses</p>
                    <p>Compartilhamento Internet Gratuito</p>
                </div>
                
                <div class="benefit-item">
                    <span class="benefit-icon">🛜</span>
                    <div class="benefit-text"><strong>Internet Turbinada</strong><br>${eco_total_gb} GB disponíveis no Total Mês</div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">📞</span>
                    <div class="benefit-text"><strong>Ligações Ilimitadas</strong><br>Para fixo e móvel em todo o Brasil</div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">💬</span>
                    <div class="benefit-text"><strong>Apps Ilimitados</strong><br>WhatsApp e Waze</div>
                </div>
            </div>`
                : ""
            }

            ${
              turbo
                ? `
            <div class="offer-card offer-turbo">
                <span class="offer-badge badge-turbo">🚀 Máxima Performance</span>
                <h3 class="offer-title">Plano Mais Dados</h3>
                <div class="offer-price">R$ ${turbo_total_val.toFixed(2)}<small>/mês</small></div>
                <div class="highlight-box">
                    <strong>+${ganho_gb.toFixed(0)} GB Adicionais</strong>
                    <p>Compartilhamento Internet Gratuito</p>
                </div>  
                <div class="benefit-item">
                    <span class="benefit-icon">🛜</span>
                    <div class="benefit-text"><strong>Internet Turbinada</strong><br>${turbo_total_gb} GB disponíveis no Total Mês</div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">📞</span>
                    <div class="benefit-text"><strong>Ligações Ilimitadas</strong><br>Para fixo e móvel em todo o Brasil</div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">💬</span>
                    <div class="benefit-text"><strong>Apps Ilimitados</strong><br>WhatsApp e Waze</div>
                </div>
            </div>`
                : ""
            }
        </div>

       ${
         eco
           ? `
            <div class="glass table-section">
                <h2>💰 Detalhamento - Plano Econômico</h2>
                ${gerarTabelaProposta(eco)}
            </div>`
           : ""
       }

        ${
          turbo
            ? `
            <div class="glass table-section">
                <h2>🚀 Detalhamento - Plano Mais Dados</h2>
                ${gerarTabelaProposta(turbo)}
            </div>`
            : ""
        }

        <div class="footer">
            <p>Proposta válida por 7 dias • Sujeito a análise de crédito • Gerado em: ${proposta.data_geracao}</p>
        </div>
    </div>
</body>
</html>`;
}
