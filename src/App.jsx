import { useEffect, useRef, useState } from "react";
import "./App.css";
import MapView from "./components/MapView";
import { AUTO_UPDATE_INTERVAL_MS } from "./config";
import {
  autenticarSPTrans,
  buscarLinhas,
  buscarParadasPorLinha,
  buscarPosicaoDosOnibus,
} from "./services/sptransAPI";

function temValor(value) {
  return value !== undefined && value !== null && value !== "";
}

function formatarCodigoLinha(linha) {
  const codigoBase = temValor(linha?.lt)
    ? String(linha.lt)
    : String(linha?.c ?? linha?.cl ?? "Linha");

  if (codigoBase.includes("-") || !temValor(linha?.tl)) {
    return codigoBase;
  }

  return `${codigoBase}-${linha.tl}`;
}

function formatarSentidoLinha(linha) {
  if (linha?.lc === true) {
    return "circular";
  }

  if (!temValor(linha?.sl)) {
    return "";
  }

  const sentido = Number(linha.sl);

  if (sentido === 1) {
    return "ida";
  }

  if (sentido === 2) {
    return "volta";
  }

  return `sentido ${linha.sl}`;
}

function formatarTrajetoLinha(linha) {
  const terminalPrincipal = temValor(linha?.tp)
    ? linha.tp
    : "Origem nao informada";
  const terminalSecundario = temValor(linha?.ts)
    ? linha.ts
    : "Destino nao informado";
  const sentido = Number(linha?.sl);

  if (sentido === 1) {
    return `${terminalPrincipal} -> ${terminalSecundario}`;
  }

  if (sentido === 2) {
    return `${terminalSecundario} -> ${terminalPrincipal}`;
  }

  return `${terminalPrincipal} <-> ${terminalSecundario}`;
}

function formatarLinhaEncontrada(linha) {
  return [
    formatarCodigoLinha(linha),
    formatarSentidoLinha(linha),
    formatarTrajetoLinha(linha),
    temValor(linha?.cl) ? `cl ${linha.cl}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

const MAX_ACTIVE_LINES = 5;
const MENSAGEM_LIMITE_LINHAS = `Limite de ${MAX_ACTIVE_LINES} linhas no mapa.`;

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

function calcularCodigosParaAdicionar({
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

function App() {
  const [termo, setTermo] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [codigosSelecionados, setCodigosSelecionados] = useState([]);
  const [linhasAtivas, setLinhasAtivas] = useState([]);
  const [paradas, setParadas] = useState([]);
  const [onibus, setOnibus] = useState([]);
  const [buscandoLinhas, setBuscandoLinhas] = useState(false);
  const [carregandoMapa, setCarregandoMapa] = useState(false);
  const [historicoBuscas, setHistoricoBuscas] = useState([]);
  const [autoAtualizar, setAutoAtualizar] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [mensagemSelecao, setMensagemSelecao] = useState("");
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
    setHistoricoBuscas((atual) =>
      [termoBusca, ...atual.filter((item) => item !== termoBusca)].slice(0, 5),
    );
  };

  const executarBusca = async (termoBusca) => {
    const termoNormalizado = termoBusca.trim();

    if (!termoNormalizado) {
      setLinhas([]);
      setCodigosSelecionados([]);
      setLinhasAtivas([]);
      setParadas([]);
      setOnibus([]);
      setUltimaAtualizacao(null);
      setMensagemSelecao("");
      setBuscaRealizada(false);
      limparIntervalo();
      return;
    }

    setBuscandoLinhas(true);
    setCodigosSelecionados([]);
    setMensagemSelecao("");
    setBuscaRealizada(false);

    try {
      const data = await buscarLinhas(termoNormalizado);
      setLinhas(data);
      setBuscaRealizada(true);
      registrarBusca(termoNormalizado);
    } finally {
      setBuscandoLinhas(false);
    }
  };

  const handleBuscarLinhas = async (event) => {
    event?.preventDefault();
    await executarBusca(termo);
  };

  const handleSelecionarCodigos = (event) => {
    setCodigosSelecionados(
      Array.from(event.target.selectedOptions, (option) => option.value),
    );
    setMensagemSelecao("");
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
        AUTO_UPDATE_INTERVAL_MS,
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

    const ultimaLinhaAtiva = linhasAtivas[linhasAtivas.length - 1];

    if (ligado && ultimaLinhaAtiva) {
      intervalRef.current = setInterval(
        () => atualizarOnibusDaLinha(ultimaLinhaAtiva),
        AUTO_UPDATE_INTERVAL_MS,
      );
    }
  };

  const handleAdicionarLinhasAoMapa = async () => {
    const codigosAtivos = linhasAtivas.map((linha) => linha.cl);
    const { codigosParaAdicionar, limiteAtingido } =
      calcularCodigosParaAdicionar({
        codigosSelecionados,
        codigosAtivos,
      });

    setMensagemSelecao(limiteAtingido ? MENSAGEM_LIMITE_LINHAS : "");

    if (codigosParaAdicionar.length === 0) {
      return;
    }

    const linhasPorCodigo = new Map(
      linhas.map((linha) => [String(linha.cl), linha]),
    );
    const linhasParaAdicionar = codigosParaAdicionar
      .map((codigo) => linhasPorCodigo.get(codigo))
      .filter(Boolean);

    setLinhasAtivas((linhasAtuais) => [
      ...linhasAtuais,
      ...linhasParaAdicionar,
    ]);
    setCodigosSelecionados([]);

    for (const linha of linhasParaAdicionar) {
      await buscarParadasELocalizacao(linha);
    }
  };

  const limparPainel = () => {
    limparIntervalo();
    setTermo("");
    setLinhas([]);
    setCodigosSelecionados([]);
    setLinhasAtivas([]);
    setParadas([]);
    setOnibus([]);
    setUltimaAtualizacao(null);
    setMensagemSelecao("");
    setBuscaRealizada(false);
  };

  useEffect(() => {
    return () => {
      limparIntervalo();
    };
  }, []);

  const podeLimpar =
    termo ||
    linhas.length > 0 ||
    codigosSelecionados.length > 0 ||
    linhasAtivas.length > 0 ||
    paradas.length > 0 ||
    onibus.length > 0 ||
    mensagemSelecao;
  const ultimaLinhaAtiva = linhasAtivas[linhasAtivas.length - 1] ?? null;
  const descricaoUltimaLinhaAtiva = ultimaLinhaAtiva
    ? formatarLinhaEncontrada(ultimaLinhaAtiva)
    : null;
  const tamanhoSeletor = linhas.length > 0 ? Math.min(linhas.length, 6) : 1;

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
              <span>opcoes</span>
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
                  <button
                    key={item}
                    type="button"
                    onClick={() => repetirBusca(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {buscaRealizada && linhas.length === 0 && (
            <p className="empty-message" role="alert">
              Nenhuma linha encontrada para esse termo.
            </p>
          )}

          <div className="action-row">
            <label className="field select-field">
              <span>Linha e sentido</span>
              <select
                multiple
                size={tamanhoSeletor}
                value={codigosSelecionados}
                disabled={linhas.length === 0}
                onChange={handleSelecionarCodigos}
              >
                {linhas.length === 0 ? (
                  <option value="" disabled>
                    Busque para selecionar
                  </option>
                ) : (
                  linhas.map((l) => (
                    <option key={l.cl} value={l.cl}>
                      {formatarLinhaEncontrada(l)}
                    </option>
                  ))
                )}
              </select>
            </label>

            <button
              className="secondary-button"
              type="button"
              disabled={codigosSelecionados.length === 0 || carregandoMapa}
              onClick={handleAdicionarLinhasAoMapa}
            >
              {carregandoMapa ? "Carregando..." : "Adicionar ao mapa"}
            </button>
          </div>

          {mensagemSelecao && (
            <p className="limit-message" role="status">
              {mensagemSelecao}
            </p>
          )}

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
                disabled={!ultimaLinhaAtiva || carregandoMapa}
                onClick={() => atualizarOnibusDaLinha(ultimaLinhaAtiva)}
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

          {descricaoUltimaLinhaAtiva && (
            <div className="selected-line" aria-label="Linha ativa">
              <span>
                {linhasAtivas.length === 1
                  ? "Linha ativa"
                  : `${linhasAtivas.length} linhas no mapa`}
              </span>
              <strong>{descricaoUltimaLinhaAtiva}</strong>
            </div>
          )}

          <p className="status-line" role="status">
            {ultimaAtualizacao
              ? `Ultima atualizacao: ${ultimaAtualizacao.toLocaleTimeString()}`
              : "Aguardando carregamento da linha."}
          </p>
        </section>

        <section className="map-panel" aria-label="Mapa de paradas e onibus">
          <div className="map-toolbar">
            <span>Mapa operacional</span>
            <strong>
              {paradas.length} paradas · {onibus.length} veiculos
            </strong>
          </div>
          <MapView
            paradas={paradas}
            onibus={onibus}
            codigoLinha={ultimaLinhaAtiva?.cl ?? null}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
