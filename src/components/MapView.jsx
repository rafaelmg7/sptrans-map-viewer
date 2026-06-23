import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { COR_PARADA_COMPARTILHADA } from "../linhasAtivas";
import { normalizarPrevisoes } from "../services/normalizarPrevisao";
import { buscarPrevisao } from "../services/sptransAPI";

const COR_PARADA_PADRAO = "#0369a1";
const COR_ONIBUS_PADRAO = "#b91c1c";
const PADRAO_COR_HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const iconesPorChave = new Map();

function normalizarCor(cor, fallback) {
  if (typeof cor !== "string") {
    return fallback;
  }

  const corNormalizada = cor.trim();
  return PADRAO_COR_HEX.test(corNormalizada) ? corNormalizada : fallback;
}

function criarUrlSvg(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function criarSvgOnibus(cor) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="${cor}"/>
      <path d="M15 30c0-9 2-16 17-16s17 7 17 16v13c0 4-3 7-7 7v4c0 2-2 4-4 4s-4-2-4-4v-4h-4v4c0 2-2 4-4 4s-4-2-4-4v-4c-4 0-7-3-7-7V30z" fill="#111827"/>
      <path d="M21 22h22v12H21z" fill="#ffffff"/>
      <circle cx="24" cy="43" r="3" fill="#ffffff"/>
      <circle cx="40" cy="43" r="3" fill="#ffffff"/>
      <path d="M23 18h18" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
}

function criarSvgParada(cor) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M32 3C20.4 3 11 12.4 11 24c0 15.8 21 37 21 37s21-21.2 21-37C53 12.4 43.6 3 32 3z" fill="${cor}"/>
      <circle cx="32" cy="24" r="14" fill="#ffffff"/>
      <path d="M24 19c0-4 3-7 8-7s8 3 8 7v11c0 2-2 4-4 4v3h-3v-3h-2v3h-3v-3c-2 0-4-2-4-4V19z" fill="#111827"/>
      <path d="M28 18h8v6h-8z" fill="#ffffff"/>
      <circle cx="28" cy="29" r="1.6" fill="#ffffff"/>
      <circle cx="36" cy="29" r="1.6" fill="#ffffff"/>
    </svg>
  `;
}

function criarIconePorChave(chave, opcoes) {
  if (!iconesPorChave.has(chave)) {
    iconesPorChave.set(chave, new L.Icon(opcoes));
  }

  return iconesPorChave.get(chave);
}

function criarIconeOnibus(cor) {
  const markerColor = normalizarCor(cor, COR_ONIBUS_PADRAO);

  return criarIconePorChave(`onibus:${markerColor}`, {
    iconUrl: criarUrlSvg(criarSvgOnibus(markerColor)),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
    markerColor,
  });
}

function criarIconeParada(cor) {
  const markerColor = normalizarCor(cor, COR_PARADA_PADRAO);

  return criarIconePorChave(`parada:${markerColor}`, {
    iconUrl: criarUrlSvg(criarSvgParada(markerColor)),
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
    markerColor,
  });
}

function criarIconeParadaCompartilhada() {
  const markerColor = COR_PARADA_COMPARTILHADA;

  return criarIconePorChave(`parada-compartilhada:${markerColor}`, {
    iconUrl: criarUrlSvg(criarSvgParada(markerColor)),
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
    className: "shared-stop-marker",
    markerColor,
  });
}

function obterIconeParadaAgrupada(grupo) {
  if (grupo.quantidadeLinhas > 1) {
    return criarIconeParadaCompartilhada();
  }

  return criarIconeParada(grupo.linhas[0]?.cor);
}

function extrairDadosDoMapa({ linhasAtivas, paradas, onibus, codigoLinha }) {
  if (linhasAtivas.length === 0) {
    return {
      paradas: paradas.map((parada) => ({
        dados: parada,
        linhas: [],
      })),
      onibus: onibus.map((veiculo) => ({ dados: veiculo, linha: null })),
      codigoLinha,
    };
  }

  const ultimaLinhaAtiva = linhasAtivas[linhasAtivas.length - 1];

  return {
    paradas: linhasAtivas.flatMap((linhaAtiva) =>
      (linhaAtiva.paradas ?? []).map((parada) => ({
        dados: parada,
        linhas: [
          {
            codigo: linhaAtiva.linha?.cl,
            cor: linhaAtiva.cor,
            descricao: linhaAtiva.descricao,
          },
        ],
      })),
    ),
    onibus: linhasAtivas.flatMap((linhaAtiva) =>
      (linhaAtiva.onibus ?? []).map((veiculo) => ({
        dados: veiculo,
        linha: {
          cor: linhaAtiva.cor,
          descricao: linhaAtiva.descricao,
        },
      })),
    ),
    codigoLinha: ultimaLinhaAtiva?.linha?.cl ?? null,
  };
}

function temCoordenadasValidas(item) {
  return Number.isFinite(item?.py) && Number.isFinite(item?.px);
}

function agruparParadas(paradas = []) {
  const gruposPorCodigo = new Map();

  paradas.forEach((paradaComLinha) => {
    const parada = paradaComLinha.dados;

    if (!temCoordenadasValidas(parada) || parada?.cp === undefined) {
      return;
    }

    const codigoParada = String(parada.cp);
    const grupoAtual = gruposPorCodigo.get(codigoParada);

    if (!grupoAtual) {
      gruposPorCodigo.set(codigoParada, {
        parada,
        linhas: [...paradaComLinha.linhas],
      });
      return;
    }

    paradaComLinha.linhas.forEach((linha) => {
      const jaIncluida = grupoAtual.linhas.some(
        (linhaAtual) => String(linhaAtual.codigo) === String(linha.codigo),
      );

      if (!jaIncluida) {
        grupoAtual.linhas.push(linha);
      }
    });
  });

  return Array.from(gruposPorCodigo.values()).map((grupo) => ({
    ...grupo,
    quantidadeLinhas: grupo.linhas.length,
  }));
}

function criarChavePrevisao(codigoParada, codigoLinha) {
  return `${codigoParada}:${codigoLinha ?? "sem-linha"}`;
}

export default function MapView({
  linhasAtivas = [],
  paradas = [],
  onibus = [],
  codigoLinha,
}) {
  const [previsoes, setPrevisoes] = useState({});
  const dadosDoMapa = extrairDadosDoMapa({
    linhasAtivas,
    paradas,
    onibus,
    codigoLinha,
  });
  const center = [-23.55052, -46.633308]; // centro de SP
  const paradasAgrupadas = agruparParadas(dadosDoMapa.paradas);
  const onibusComCoordenadas = dadosDoMapa.onibus.filter((veiculoComLinha) =>
    temCoordenadasValidas(veiculoComLinha.dados),
  );

  async function carregarPrevisaoDaLinha(parada, linha) {
    const codigoLinhaPrevisao = linha?.codigo ?? dadosDoMapa.codigoLinha;
    const chave = criarChavePrevisao(parada.cp, codigoLinhaPrevisao);

    if (previsoes[chave]) {
      return;
    }

    if (!codigoLinhaPrevisao) {
      setPrevisoes((previsoesAtuais) => ({
        ...previsoesAtuais,
        [chave]: { carregando: false, veiculos: [], erro: null },
      }));
      return;
    }

    setPrevisoes((previsoesAtuais) => ({
      ...previsoesAtuais,
      [chave]: { carregando: true, veiculos: [], erro: null },
    }));

    try {
      const data = await buscarPrevisao(parada.cp, codigoLinhaPrevisao);
      const veiculos = normalizarPrevisoes(data);

      setPrevisoes((previsoesAtuais) => ({
        ...previsoesAtuais,
        [chave]: { carregando: false, veiculos, erro: null },
      }));
    } catch (err) {
      console.error("Erro ao buscar previsão:", err);
      setPrevisoes((previsoesAtuais) => ({
        ...previsoesAtuais,
        [chave]: { carregando: false, veiculos: [], erro: "Erro" },
      }));
    }
  }

  function renderizarPrevisaoDaLinha(parada, linha) {
    const codigoLinhaPrevisao = linha?.codigo ?? dadosDoMapa.codigoLinha;
    const chave = criarChavePrevisao(parada.cp, codigoLinhaPrevisao);
    const previsao = previsoes[chave];

    if (!previsao) {
      return null;
    }

    if (previsao.carregando) {
      return <span>Carregando previsão...</span>;
    }

    if (previsao.veiculos.length === 0) {
      return <span>Sem previsão disponível</span>;
    }

    return previsao.veiculos.map((v, i) => (
      <div key={i}>
        Previsão: <br /> 🚌 <b>{v.linha}</b> — {v.horario}
        {v.minutos !== null && v.minutos !== undefined
          ? ` (${v.minutos} min)`
          : ""}
      </div>
    ));
  }

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Paradas */}
      {paradasAgrupadas.map((grupo) => (
        <Marker
          key={grupo.parada.cp}
          position={[grupo.parada.py, grupo.parada.px]}
          icon={obterIconeParadaAgrupada(grupo)}
          eventHandlers={{
            click: () => {
              if (grupo.linhas.length === 0) {
                carregarPrevisaoDaLinha(grupo.parada, null);
              }
            },
          }}
        >
          <Popup>
            <b>{grupo.parada.np}</b>
            <br />
            Código: {grupo.parada.cp}
            {grupo.quantidadeLinhas > 1 && (
              <>
                <br />
                <span>{grupo.quantidadeLinhas} linhas nesta parada</span>
              </>
            )}
            {grupo.linhas.length > 0 && (
              <>
                <hr />
                <strong>Linhas atendidas</strong>
                {grupo.linhas.map((linha) => (
                  <div key={linha.codigo ?? linha.descricao}>
                    {linha.cor && (
                      <span
                        aria-label={`Cor da linha ${linha.descricao}`}
                        style={{
                          backgroundColor: linha.cor,
                          display: "inline-block",
                          height: 10,
                          marginRight: 6,
                          width: 10,
                        }}
                      />
                    )}
                    <span>{linha.descricao ?? linha.codigo}</span>
                  </div>
                ))}
              </>
            )}
            <hr />
            {grupo.linhas.length > 0 ? (
              grupo.linhas.map((linha) => (
                <div key={`previsao-${linha.codigo ?? linha.descricao}`}>
                  <button
                    type="button"
                    aria-label={`Carregar previsao ${
                      linha.descricao ?? linha.codigo
                    }`}
                    onClick={() => carregarPrevisaoDaLinha(grupo.parada, linha)}
                  >
                    {linha.descricao ?? linha.codigo}
                  </button>
                  {renderizarPrevisaoDaLinha(grupo.parada, linha)}
                </div>
              ))
            ) : previsoes[
                criarChavePrevisao(grupo.parada.cp, dadosDoMapa.codigoLinha)
              ] ? (
              renderizarPrevisaoDaLinha(grupo.parada, null)
            ) : (
              <span>Clique para carregar previsões...</span>
            )}
          </Popup>
        </Marker>
      ))}

      {/* Ônibus */}
      {onibusComCoordenadas.map(({ dados: v, linha }) => (
        <Marker
          key={`${linha?.descricao ?? "sem-linha"}-${v.p}`}
          position={[v.py, v.px]}
          icon={criarIconeOnibus(linha?.cor)}
        >
          <Popup>
            🚌 Ônibus {v.p}
            {linha && (
              <>
                <br />
                <span
                  aria-label={`Cor da linha ${linha.descricao}`}
                  style={{
                    backgroundColor: linha.cor,
                    display: "inline-block",
                    height: 10,
                    marginRight: 6,
                    width: 10,
                  }}
                />
                <span>{linha.descricao}</span>
              </>
            )}
            <br />
            Atualizado: {new Date(v.ta).toLocaleTimeString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
