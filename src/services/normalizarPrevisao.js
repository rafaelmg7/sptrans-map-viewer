function getLinhas(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.linhas)) {
    return payload.linhas;
  }

  if (Array.isArray(payload?.p?.l)) {
    return payload.p.l;
  }

  if (Array.isArray(payload?.l)) {
    return payload.l;
  }

  return [];
}

function getDescricaoLinha(linha) {
  if (linha?.descricao) {
    return linha.descricao;
  }

  if (linha?.lt0 && linha?.lt1) {
    return `${linha.lt0} ⇄ ${linha.lt1}`;
  }

  return linha?.c ?? linha?.cl ?? linha?.codigoLinha ?? "Linha";
}

function normalizeVeiculo(veiculo, linha) {
  return {
    placa: veiculo?.placa ?? veiculo?.p ?? null,
    horario: veiculo?.horaPrevista ?? veiculo?.horario ?? veiculo?.t ?? null,
    minutos: veiculo?.minutos ?? null,
    ativo: veiculo?.ativo ?? veiculo?.a ?? null,
    py: veiculo?.py ?? null,
    px: veiculo?.px ?? null,
    linha: linha?.codigoLinha ?? linha?.cl ?? linha?.c ?? null,
    descricaoLinha: getDescricaoLinha(linha),
  };
}

export function normalizarPrevisoes(payload) {
  return getLinhas(payload).flatMap((linha) => {
    const veiculos = linha?.veiculos ?? linha?.vs ?? [];

    if (!Array.isArray(veiculos)) {
      return [];
    }

    return veiculos.map((veiculo) => normalizeVeiculo(veiculo, linha));
  });
}
