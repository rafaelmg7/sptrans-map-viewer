import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useState } from "react";
import busIcon from "../assets/bus3.svg";
import busStopIcon from "../assets/bus-stop.svg";
import { buscarPrevisao } from "../services/sptransAPI";
import { normalizarPrevisoes } from "../services/normalizarPrevisao";

// Ícones customizados
const iconeOnibus = new L.Icon({
  iconUrl: busIcon,
  iconSize: [30, 30],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const iconeParada = new L.Icon({
  iconUrl: busStopIcon,
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const iconeParadaCompartilhada = new L.Icon({
  iconUrl: busStopIcon,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -42],
  className: "shared-stop-marker",
});

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
    temCoordenadasValidas(veiculoComLinha.dados)
  );

  async function handleClickParada(parada) {
    if (!dadosDoMapa.codigoLinha) {
      setPrevisoes((prev) => ({
        ...prev,
        [parada.cp]: [],
      }));
      return;
    }

    try {
      const data = await buscarPrevisao(parada.cp, dadosDoMapa.codigoLinha);
      const veiculos = normalizarPrevisoes(data);

      setPrevisoes((prev) => ({
        ...prev,
        [parada.cp]: veiculos,
      }));
    } catch (err) {
      console.error("Erro ao buscar previsão:", err);
      setPrevisoes((prev) => ({
        ...prev,
        [parada.cp]: [],
      }));
    }
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

      {/* Paradas (azul) */}
      {paradasAgrupadas.map((grupo) => (
        <Marker
          key={grupo.parada.cp}
          position={[grupo.parada.py, grupo.parada.px]}
          icon={
            grupo.quantidadeLinhas > 1 ? iconeParadaCompartilhada : iconeParada
          }
          eventHandlers={{
            click: () => handleClickParada(grupo.parada),
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
            {previsoes[grupo.parada.cp] ? (
              previsoes[grupo.parada.cp].length > 0 ? (
                previsoes[grupo.parada.cp].map((v, i) => (
                  <div key={i}>
                    Previsão: <br /> 🚌 <b>{v.linha}</b> — {v.horario}
                    {v.minutos !== null && v.minutos !== undefined
                      ? ` (${v.minutos} min)`
                      : ""}
                  </div>
                ))
              ) : (
                <span>Sem previsão disponível</span>
              )
            ) : (
              <span>Clique para carregar previsões...</span>
            )}
          </Popup>
        </Marker>
      ))}

      {/* Ônibus (vermelho) */}
      {onibusComCoordenadas.map(({ dados: v, linha }) => (
        <Marker
          key={`${linha?.descricao ?? "sem-linha"}-${v.p}`}
          position={[v.py, v.px]}
          icon={iconeOnibus}
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
