export const CORES = {
  primaria: "#F5A800",
  primaria_escura: "#D49200",
  primaria_clara: "#FFD466",
  preto: "#0A0A0A",
  preto_suave: "#1A1A1A",
  primaria_clara_bg: "rgba(253, 230, 138, 0.2)",
  primaria_bg: "rgba(245, 168, 0, 0.2)",
};

export interface IDadosLayoutHtml {
  razao_social: string;
  cnpj: string;
  data_atual: string;
  linhas_tabela: string;
  total_valor: number;
}

export function gerarHtmlGlassmorphism(dados: IDadosLayoutHtml): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposta Comercial - ${dados.razao_social}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', -apple-system, sans-serif;
            background: linear-gradient(135deg, ${CORES.preto} 0%, #1a1200 50%, ${CORES.preto_suave} 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .glass {
            background: rgba(245, 168, 0, 0.06);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(245, 168, 0, 0.15);
            padding: 40px;
            margin-bottom: 30px;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 3em;
            font-weight: 800;
            margin-bottom: 15px;
            color: ${CORES.primaria};
        }
        .header p {
            font-size: 1.3em;
            opacity: 0.9;
            color: #ccc;
        }
        .table-section h2 {
            color: ${CORES.primaria};
            margin-bottom: 20px;
            font-size: 1.8em;
            text-align: center;
        }
        .table-wrapper {
            overflow-x: auto;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            background: rgba(0, 0, 0, 0.7);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        thead {
            background: linear-gradient(135deg, ${CORES.preto} 0%, ${CORES.preto_suave} 100%);
            color: white;
        }
        th {
            padding: 18px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 0.95em;
            letter-spacing: 0.5px;
        }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) {
            text-align: center;
        }
        tbody tr {
            border-bottom: 1px solid rgba(245, 168, 0, 0.1);
            transition: all 0.3s ease;
        }
        tbody tr:hover {
            background: rgba(245, 168, 0, 0.05);
        }
        td {
            padding: 16px 15px;
            color: #ccc;
            font-size: 0.9em;
        }
        td:nth-child(3), td:nth-child(4), td:nth-child(5) {
            text-align: center;
        }
        .highlight-yellow {
            background: ${CORES.primaria_bg};
            font-weight: 600;
            color: ${CORES.primaria};
        }
        .plan-name {
            font-weight: 600;
            color: #fff;
        }
        tfoot {
            background: linear-gradient(135deg, ${CORES.primaria} 0%, ${CORES.primaria_escura} 100%);
            color: ${CORES.preto};
            font-weight: 700;
            font-size: 1.1em;
        }
        tfoot td {
            padding: 20px 15px;
            color: ${CORES.preto};
            border-top: 3px solid ${CORES.primaria_escura};
        }
        tfoot td:last-child {
            text-align: center;
        }
        .footer {
            text-align: center;
            color: #555;
            margin-top: 40px;
            padding: 30px;
        }
        .footer p { margin: 8px 0; font-size: 1em; color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <div class="glass header">
            <h1>Situação Atual dos Planos</h1>
            <p>${dados.cnpj}</p>
            <p>${dados.razao_social}</p>
        </div>

        <div class="glass table-section">
            <h2>Detalhamento por Linha</h2>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Plano</th>
                            <th>Vencimento</th>
                            <th>Bônus</th>
                            <th>Valor Ind.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dados.linhas_tabela}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="text-align: right;"><strong>VALOR TOTAL MENSAL</strong></td>
                            <td><strong>R$ ${dados.total_valor.toFixed(2)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="footer">
            <p>Documento gerado em ${dados.data_atual}</p>
        </div>
    </div>
</body>
</html>`;
}
