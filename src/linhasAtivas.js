export const PALETA_CORES_LINHAS = [
  "#0f766e",
  "#0369a1",
  "#b45309",
  "#b91c1c",
  "#4338ca",
];
export const COR_PARADA_COMPARTILHADA = "#111827";

export const MAX_ACTIVE_LINES = 5;
export const MENSAGEM_LIMITE_LINHAS = `Limite de ${MAX_ACTIVE_LINES} linhas no mapa.`;

function temValor(value) {
  return value !== undefined && value !== null && value !== "";
}

function obterCodigosUnicos(codigos = []) {
  const codigosUnicos = [];

  codigos.forEach((codigo) => {
    if (!temValor(codigo)) {
      return;
    }

    const codigoNormalizado = String(codigo);

    if (!codigosUnicos.includes(codigoNormalizado)) {
      codigosUnicos.push(codigoNormalizado);
    }
  });

  return codigosUnicos;
}

export function calcularCodigosParaAdicionar({
  codigosSelecionados,
  codigosAtivos,
  limite = MAX_ACTIVE_LINES,
}) {
  const selecionados = obterCodigosUnicos(codigosSelecionados);
  const ativos = new Set(obterCodigosUnicos(codigosAtivos));
  const candidatos = selecionados.filter((codigo) => !ativos.has(codigo));
  const vagasDisponiveis = Math.max(limite - ativos.size, 0);

  return {
    codigosParaAdicionar: candidatos.slice(0, vagasDisponiveis),
    limiteAtingido: candidatos.length > vagasDisponiveis,
  };
}

export function obterCorDisponivel(linhasAtivas = []) {
  const coresEmUso = new Set(linhasAtivas.map((linhaAtiva) => linhaAtiva.cor));
  return (
    PALETA_CORES_LINHAS.find((cor) => !coresEmUso.has(cor)) ??
    PALETA_CORES_LINHAS[0]
  );
}

export function montarLinhaAtivaInicial({ linha, descricao, cor }) {
  return {
    id: String(linha.cl),
    linha,
    descricao,
    cor,
    paradas: [],
    onibus: [],
    carregando: true,
    erro: null,
    ultimaAtualizacao: null,
  };
}

export function contarParadasAgrupadas(linhasAtivas = []) {
  const codigosParada = new Set();

  linhasAtivas.forEach((linhaAtiva) => {
    linhaAtiva.paradas.forEach((parada) => {
      if (temValor(parada?.cp)) {
        codigosParada.add(String(parada.cp));
      }
    });
  });

  return codigosParada.size;
}

export function somarVeiculos(linhasAtivas = []) {
  return linhasAtivas.reduce(
    (total, linhaAtiva) => total + linhaAtiva.onibus.length,
    0,
  );
}

export function algumaLinhaCarregando(linhasAtivas = []) {
  return linhasAtivas.some((linhaAtiva) => linhaAtiva.carregando);
}
