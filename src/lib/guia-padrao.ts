// Tabelas de medidas padrão (cm), usadas quando o produto não tem um guia
// escolhido no painel. Ficam aqui, fora do componente, para a página do
// produto e o assistente do chat lerem exatamente os mesmos números.
export const GUIA_CAMISETA = {
  cols: ["Tamanho", "Largura (peito)", "Comprimento", "Ombro"],
  rows: [
    ["P", "50 cm", "70 cm", "43 cm"],
    ["M", "53 cm", "72 cm", "45 cm"],
    ["G", "56 cm", "74 cm", "47 cm"],
    ["GG", "59 cm", "76 cm", "49 cm"],
  ],
};

export const GUIA_MODA_PRAIA = {
  cols: ["Tamanho", "Cintura (elástico)", "Comprimento"],
  rows: [
    ["P", "38–44 cm", "44 cm"],
    ["M", "42–48 cm", "46 cm"],
    ["G", "46–52 cm", "48 cm"],
    ["GG", "50–56 cm", "50 cm"],
  ],
};
