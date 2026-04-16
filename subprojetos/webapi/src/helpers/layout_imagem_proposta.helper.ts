export const CORES = {
  primaria: "#F5A800",
  primaria_escura: "#D49200",
  primaria_clara: "#FFD466",
  primaria_bg: "rgba(245, 168, 0, 0.15)",
  preto: "#0A0A0A",
  preto_suave: "#1A1A1A",
  preto_card: "#111111",
  cinza_escuro: "#333333",
  cinza_medio: "#666666",
  cinza_claro: "#999999",
  branco: "#FFFFFF",
  vermelho: "#F02742",
  vermelho_bg: "rgba(240, 39, 66, 0.12)",
  vermelho_escuro: "#D91E3E",
  azul: "#2196F3",
  azul_bg: "rgba(33, 150, 243, 0.15)",
};

// ============================================================================
// GERAÇÃO DO HTML
// ============================================================================
export function gerarHtmlPropostaCompleta(proposta: any): string {
  let eco = proposta.oferta_economica;
  let turbo = proposta.oferta_mais_gb;

  if (eco && turbo) {
    if (turbo.total_valor <= eco.total_valor) {
      turbo = null;
    }
  }

  if (eco && turbo && eco.total_valor > turbo.total_valor) {
    const temp = eco;
    eco = turbo;
    turbo = temp;
  }

  const atual = proposta.situacao_atual;

  const formatarTelefoneProposta = (numeroStr: string): string => {
    if (!numeroStr) return "-";
    let apenasNumeros = String(numeroStr).replace(/\D/g, "");

    if (apenasNumeros.startsWith("55") && apenasNumeros.length >= 12) {
      apenasNumeros = apenasNumeros.substring(2);
    }

    if (apenasNumeros.length === 11) {
      return `+55 ${apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}`;
    } else if (apenasNumeros.length === 10) {
      return `+55 ${apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")}`;
    }
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

  const economia = eco ? atual.total_valor - eco_total_val : 0;
  const economia_contrato = economia > 0 ? economia * 24 : 0;
  const ganho_gb = turbo ? turbo_total_gb - atual.total_gb : 0;

  const gerarTabelaProposta = (combo: any[]) => {
    if (!combo || combo.length === 0)
      return "<p style='color:#ccc;'>Nenhuma combinação viável encontrada.</p>";

    let linhasHtml = "";
    let prop_gb_base = 0;
    let prop_bonus = 0;
    let prop_valor = 0;

    let index_telefone = 0;

    combo.forEach((item: any) => {
      prop_gb_base += item.gb * item.qtd;
      prop_bonus += item.bonus * item.qtd;
      prop_valor += item.valor * item.qtd;

      for (let i = 0; i < item.qtd; i++) {
        const numero_real =
          telefonesReais[index_telefone] || `Linha ${index_telefone + 1}`;
        index_telefone++;

        const plano_nome = `Claro Pós ${item.gb}GB`;
        const gb_total = item.gb + item.bonus;

        linhasHtml += `
          <tr>
              <td>${numero_real}</td>
              <td class="plan-name">${plano_nome}</td>
              <td>${item.bonus.toFixed(1)} GB</td>
              <td class="highlight-red">${gb_total.toFixed(1)} GB</td>
              <td class="highlight-yellow">R$ ${item.valor.toFixed(2)}</td>
          </tr>`;
      }
    });

    return `
      <div class="table-wrapper">
          <table>
              <thead>
                  <tr><th>Número da Linha</th><th>Novo Plano Sugerido</th><th>Bônus</th><th>GB Total</th><th>Valor</th></tr>
              </thead>
              <tbody>${linhasHtml}</tbody>
              <tfoot>
                  <tr>
                      <td colspan="2"><strong>TOTAL</strong></td>
                      <td><strong>${prop_bonus.toFixed(1)} GB</strong></td>
                      <td><strong>${(prop_gb_base + prop_bonus).toFixed(1)} GB</strong></td>
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
    <title>Proposta Comercial - ${proposta.empresa.razao_social}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', -apple-system, sans-serif;
            background: linear-gradient(135deg, ${CORES.preto} 0%, #1a1200 50%, ${CORES.preto_suave} 100%);
            min-height: 100vh; padding: 40px 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .glass {
            background: rgba(245, 168, 0, 0.06); backdrop-filter: blur(10px);
            border-radius: 20px; border: 1px solid rgba(245, 168, 0, 0.15);
            padding: 40px; margin-bottom: 30px;
        }
        .header { text-align: center; color: white; margin-bottom: 40px; }
        .header h1 { font-size: 3em; font-weight: 800; margin-bottom: 15px; color: ${CORES.primaria}; }
        .header p { font-size: 1.3em; opacity: 0.9; color: #ccc; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .info-card { background: rgba(0,0,0,0.6); padding: 25px; border-radius: 15px; text-align: center; border: 1px solid rgba(245,168,0,0.2); }
        .info-card h3 { color: ${CORES.primaria}; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; }
        .info-card p { font-size: 2em; font-weight: 700; color: #fff; }
        .offers-title { text-align: center; color: ${CORES.primaria}; font-size: 2.2em; margin-bottom: 40px; font-weight: 700; }
        .offers-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px; }
        .offer-card { background: rgba(0,0,0,0.7); border-radius: 20px; padding: 35px; position: relative; overflow: hidden; border: 1px solid rgba(245,168,0,0.2); }
        .offer-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
        .offer-economica::before { background: linear-gradient(90deg, ${CORES.vermelho}, ${CORES.vermelho_escuro}); }
        .offer-turbo::before { background: linear-gradient(90deg, ${CORES.primaria}, ${CORES.primaria_clara}); }
        .offer-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 0.85em; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
        .badge-economica { background: ${CORES.vermelho_bg}; color: ${CORES.vermelho}; }
        .badge-turbo { background: ${CORES.primaria_bg}; color: ${CORES.primaria}; }
        .offer-title { font-size: 1.6em; margin-bottom: 10px; color: #fff; font-weight: 700; }
        .offer-price { font-size: 3em; font-weight: 800; margin: 20px 0; line-height: 1; }
        .offer-economica .offer-price { color: ${CORES.vermelho}; }
        .offer-turbo .offer-price { color: ${CORES.primaria}; }
        .offer-price small { font-size: 0.3em; color: #888; font-weight: 400; }
        .highlight-box { background: rgba(245,168,0,0.1); padding: 18px; border-radius: 12px; margin: 20px 0; text-align: center; border-left: 4px solid ${CORES.primaria}; }
        .highlight-box strong { display: block; font-size: 1.3em; color: ${CORES.primaria}; margin-bottom: 5px; }
        .highlight-box p { color: #aaa; font-size: 0.95em; }
        .benefit-item { display: flex; align-items: center; gap: 12px; padding: 12px; margin: 8px 0; background: rgba(245,168,0,0.08); border-radius: 8px; border-left: 3px solid ${CORES.primaria}; }
        .benefit-icon { font-size: 1.5em; min-width: 30px; }
        .benefit-text { color: #ddd; font-weight: 500; font-size: 0.95em; }
        .benefit-text strong { color: ${CORES.primaria}; display: block; margin-bottom: 3px; }
        .table-section { margin-top: 50px; }
        .table-section h2 { color: ${CORES.primaria}; margin-bottom: 20px; font-size: 1.8em; text-align: center; }
        .table-wrapper { overflow-x: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); background: rgba(0, 0, 0, 0.7); margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; }
        thead { background: linear-gradient(135deg, ${CORES.preto} 0%, ${CORES.preto_suave} 100%); color: white; }
        th { padding: 18px 15px; text-align: left; font-weight: 600; font-size: 0.95em; letter-spacing: 0.5px; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: center; }
        tbody tr { border-bottom: 1px solid rgba(245, 168, 0, 0.1); transition: all 0.3s ease; }
        tbody tr:hover { background: rgba(245, 168, 0, 0.05); }
        td { padding: 16px 15px; color: #ccc; font-size: 0.9em; }
        td:nth-child(3), td:nth-child(4), td:nth-child(5) { text-align: center; }
        .highlight-red { background: rgba(253, 230, 138, 0.2); font-weight: 600; color: ${CORES.primaria_clara}; }
        .highlight-yellow { background: rgba(245, 168, 0, 0.2); font-weight: 600; color: ${CORES.primaria}; }
        .plan-name { font-weight: 600; color: #fff; }
        tfoot { background: linear-gradient(135deg, ${CORES.primaria} 0%, ${CORES.primaria_escura} 100%); color: ${CORES.preto}; font-weight: 700; font-size: 1.1em; }
        tfoot td { padding: 20px 15px; border-top: 3px solid ${CORES.primaria_escura}; }
        tfoot td:nth-child(3), tfoot td:nth-child(4), tfoot td:nth-child(5) { text-align: center; }
        .footer { text-align: center; color: #555; margin-top: 40px; padding: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="glass header">
            <h1>Proposta Comercial</h1>
            <p><strong>${proposta.empresa.cnpj}</strong></p>
            <p>${proposta.empresa.razao_social}</p>
        </div>

        <div class="glass">
            <div class="info-grid">
                <div class="info-card"><h3>Linhas</h3><p>${atual.total_linhas}</p></div>
                <div class="info-card"><h3>GB Atual</h3><p>${atual.total_gb} GB</p></div>
                <div class="info-card"><h3>Valor Atual</h3><p>R$ ${atual.total_valor.toFixed(2)}</p></div>
            </div>
        </div>

        <h2 class="offers-title">🎯 Ofertas Personalizadas</h2>
        <div class="offers-container">
            ${
              eco
                ? `
            <div class="offer-card offer-economica">
                <span class="offer-badge badge-economica">💰 Economia</span>
                <h3 class="offer-title">Oferta Econômica</h3>
                <div class="offer-price">R$ ${eco_total_val.toFixed(2)}<small>/mês</small></div>
                <div class="highlight-box">
                    <strong>Economia no Contrato</strong>
                </div>
                
                <div class="benefit-item">
                    <span class="benefit-icon">🛜</span>
                    <div class="benefit-text"><strong>Internet Total</strong><br>${eco_total_gb} GB disponíveis (Compartilhável entre as linhas)</div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">📞</span>
                    <div class="benefit-text"><strong>Ligações Ilimitadas</strong><br>Para fixo e móvel em todo Brasil</div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">💬</span>
                    <div class="benefit-text"><strong>Apps Ilimitados</strong><br>WhatsApp e Waze sem consumir internet</div>
                </div>
            </div>`
                : ""
            }

            ${
              turbo
                ? `
            <div class="offer-card offer-turbo">
                <span class="offer-badge badge-turbo">🚀 Turbinado</span>
                <h3 class="offer-title">Oferta Mais GB</h3>
                <div class="offer-price">R$ ${turbo_total_val.toFixed(2)}<small>/mês</small></div>
                <div class="highlight-box">
                    <strong>+${ganho_gb.toFixed(0)} GB Extras</strong>
                    <p>Pelo mesmo investimento</p>
                </div>

                <div class="benefit-item">
                    <span class="benefit-icon">🛜</span>
                    <div class="benefit-text"><strong>Internet Total</strong><br>${turbo_total_gb} GB disponíveis (Compartilhável entre as linhas)</div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">📞</span>
                    <div class="benefit-text"><strong>Ligações Ilimitadas</strong><br>Para fixo e móvel em todo Brasil</div>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">💬</span>
                    <div class="benefit-text"><strong>Apps Ilimitados</strong><br>WhatsApp e Waze sem consumir intenet</div>
                </div>
            </div>`
                : ""
            }
        </div>

        ${
          eco
            ? `
        <div class="glass table-section">
            <h2>💰 Detalhamento - Oferta Econômica</h2>
            ${gerarTabelaProposta(eco.combo)}
        </div>`
            : ""
        }

        ${
          turbo
            ? `
        <div class="glass table-section">
            <h2>🚀 Detalhamento - Oferta Mais GB</h2>
            ${gerarTabelaProposta(turbo.combo)}
        </div>`
            : ""
        }

        <div class="footer">
            <p>Proposta válida por 7 dias • Contrato de 24 meses • Gerado em: ${proposta.data_geracao}</p>
        </div>
    </div>
</body>
</html>`;
}
