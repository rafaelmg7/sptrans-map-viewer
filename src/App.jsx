import { useState, useEffect, useRef } from "react";
import MapView from "./components/MapView";
import "./App.css";
import {
  autenticarSPTrans,
  buscarLinhas,
  buscarParadasPorLinha,
  buscarPosicaoDosOnibus,
} from "./services/sptransAPI";
import { AUTO_UPDATE_INTERVAL_MS } from "./config";

function App() {
  const [termo, setTermo] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);
  const [paradas, setParadas] = useState([]);
  const [onibus, setOnibus] = useState([]);
  const [buscandoLinhas, setBuscandoLinhas] = useState(false);
  const [carregandoMapa, setCarregandoMapa] = useState(false);
  const [historicoBuscas, setHistoricoBuscas] = useState([]);
  const [autoAtualizar, setAutoAtualizar] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const intervalRef = useRef(null);

  // Autentica ao iniciar
  useEffect(() => {
    autenticarSPTrans();
  }, []);

  const limparIntervalo = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const registrarBusca = (termoBusca) => {
    setHistoricoBuscas((atual) => [
      termoBusca,
      ...atual.filter((item) => item !== termoBusca),
    ].slice(0, 5));
  };

  const executarBusca = async (termoBusca) => {
    const termoNormalizado = termoBusca.trim();

    if (!termoNormalizado) {
      setLinhas([]);
      setLinhaSelecionada(null);
      setParadas([]);
      setOnibus([]);
      setUltimaAtualizacao(null);
      limparIntervalo();
      return;
    }

    setBuscandoLinhas(true);
    setLinhaSelecionada(null);

    try {
      const data = await buscarLinhas(termoNormalizado);
      setLinhas(data);
      registrarBusca(termoNormalizado);
    } finally {
      setBuscandoLinhas(false);
    }
  };

  const handleBuscarLinhas = async (event) => {
    event?.preventDefault();
    await executarBusca(termo);
  };

  const atualizarOnibusDaLinha = async (linha) => {
    const veiculos = await buscarPosicaoDosOnibus(linha.cl);
    setOnibus(veiculos);
    setUltimaAtualizacao(new Date());
    console.log(`Atualizado: ${veiculos.length} veiculos`);
  };

  const configurarAutoAtualizacao = (linha) => {
    limparIntervalo();

    if (autoAtualizar) {
      intervalRef.current = setInterval(
        () => atualizarOnibusDaLinha(linha),
        AUTO_UPDATE_INTERVAL_MS
      );
    }
  };

  const buscarParadasELocalizacao = async (linha) => {
    setCarregandoMapa(true);

    try {
      const paradasData = await buscarParadasPorLinha(linha.cl);
      setParadas(paradasData);

      await atualizarOnibusDaLinha(linha);
      configurarAutoAtualizacao(linha);
    } finally {
      setCarregandoMapa(false);
    }
  };

  const repetirBusca = async (termoBusca) => {
    setTermo(termoBusca);
    await executarBusca(termoBusca);
  };

  const handleAutoAtualizar = (event) => {
    const ligado = event.target.checked;
    setAutoAtualizar(ligado);

    limparIntervalo();

    if (ligado && linhaSelecionada) {
      intervalRef.current = setInterval(
        () => atualizarOnibusDaLinha(linhaSelecionada),
        AUTO_UPDATE_INTERVAL_MS
      );
    }
  };

  const limparPainel = () => {
    limparIntervalo();
    setTermo("");
    setLinhas([]);
    setLinhaSelecionada(null);
    setParadas([]);
    setOnibus([]);
    setUltimaAtualizacao(null);
  };

  useEffect(() => {
    return () => {
      limparIntervalo();
    };
  }, []);

  const podeLimpar =
    termo || linhas.length > 0 || paradas.length > 0 || onibus.length > 0;
  const descricaoLinhaSelecionada = linhaSelecionada
    ? `${linhaSelecionada.lt} - ${linhaSelecionada.tp} ⇄ ${linhaSelecionada.ts}`
    : null;

  return (
    <div className="app-shell">
      <main className="app-frame">
        <section className="hero-panel" aria-labelledby="app-title">
          <div>
            <p className="eyebrow">Olho Vivo SPTrans</p>
            <h1 id="app-title">Painel SPTrans em tempo real</h1>
            <p className="subtitle">
              Busque uma linha, selecione o trajeto e acompanhe paradas,
              previsoes e veiculos em um mapa interativo.
            </p>
          </div>

          <div className="metric-row" aria-label="Resumo do mapa">
            <div>
              <strong>{linhas.length}</strong>
              <span>linhas</span>
            </div>
            <div>
              <strong>{paradas.length}</strong>
              <span>paradas</span>
            </div>
            <div>
              <strong>{onibus.length}</strong>
              <span>onibus</span>
            </div>
          </div>
        </section>

        <section className="control-panel" aria-label="Busca de linhas">
          <form className="search-row" onSubmit={handleBuscarLinhas}>
            <label className="field">
              <span>Numero ou nome da linha</span>
              <input
                type="text"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Ex: 8000, Paulista, Terminal"
              />
            </label>
            <button
              className="primary-button"
              type="submit"
              disabled={buscandoLinhas || !termo.trim()}
            >
              {buscandoLinhas ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {historicoBuscas.length > 0 && (
            <div className="history-row" aria-label="Historico de buscas">
              <span>Recentes</span>
              <div>
                {historicoBuscas.map((item) => (
                  <button key={item} type="button" onClick={() => repetirBusca(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="action-row">
            <label className="field select-field">
              <span>Linha encontrada</span>
              <select
                value={linhaSelecionada?.cl ?? ""}
                disabled={linhas.length === 0}
                onChange={(e) =>
                  setLinhaSelecionada(
                    linhas.find((l) => l.cl === Number(e.target.value)) ?? null
                  )
                }
              >
                <option value="">
                  {linhas.length > 0 ? "Selecione uma linha..." : "Busque para selecionar"}
                </option>
                {linhas.map((l) => (
                  <option key={l.cl} value={l.cl}>
                    {l.lt} - {l.tp} ⇄ {l.ts}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="secondary-button"
              type="button"
              disabled={!linhaSelecionada || carregandoMapa}
              onClick={() => buscarParadasELocalizacao(linhaSelecionada)}
            >
              {carregandoMapa ? "Carregando..." : "Mostrar no mapa"}
            </button>
          </div>

          <div className="tool-row">
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={autoAtualizar}
                onChange={handleAutoAtualizar}
              />
              <span>Autoatualizar a cada 5s</span>
            </label>

            <div className="tool-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={!linhaSelecionada || carregandoMapa}
                onClick={() => atualizarOnibusDaLinha(linhaSelecionada)}
              >
                Atualizar agora
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!podeLimpar}
                onClick={limparPainel}
              >
                Limpar painel
              </button>
            </div>
          </div>

          {descricaoLinhaSelecionada && (
            <div className="selected-line" aria-label="Linha ativa">
              <span>Linha ativa</span>
              <strong>{descricaoLinhaSelecionada}</strong>
            </div>
          )}

          <p className="status-line" role="status">
            {ultimaAtualizacao
              ? `Ultima atualizacao: ${ultimaAtualizacao.toLocaleTimeString()}`
              : "Aguardando carregamento da linha."}
          </p>
        </section>

        <section className="map-panel" aria-label="Mapa de paradas e onibus">
          <MapView
            paradas={paradas}
            onibus={onibus}
            codigoLinha={linhaSelecionada?.cl ?? null}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
