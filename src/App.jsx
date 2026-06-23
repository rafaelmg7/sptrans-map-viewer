import { useEffect, useRef, useState } from "react";
import "./App.css";
import MapView from "./components/MapView";
import { AUTO_UPDATE_INTERVAL_MS } from "./config";
import {
  algumaLinhaCarregando,
  calcularCodigosParaAdicionar,
  contarParadasAgrupadas,
  MENSAGEM_LIMITE_LINHAS,
  montarLinhaAtivaInicial,
  obterCorDisponivel,
  somarVeiculos,
} from "./linhasAtivas";
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

function App() {
  const [termo, setTermo] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [codigosSelecionados, setCodigosSelecionados] = useState([]);
  const [linhasAtivas, setLinhasAtivas] = useState([]);
  const [buscandoLinhas, setBuscandoLinhas] = useState(false);
  const [historicoBuscas, setHistoricoBuscas] = useState([]);
  const [autoAtualizar, setAutoAtualizar] = useState(true);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [mensagemSelecao, setMensagemSelecao] = useState("");
  const intervalRef = useRef(null);
  const linhasAtivasRef = useRef([]);

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
      linhasAtivasRef.current = [];
      setLinhasAtivas([]);
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

  const atualizarLinhaAtiva = (id, transformador) => {
    setLinhasAtivas((linhasAtuais) =>
      linhasAtuais.map((linhaAtiva) =>
        linhaAtiva.id === id ? transformador(linhaAtiva) : linhaAtiva,
      ),
    );
  };

  const atualizarDadosDaLinha = async (linhaAtiva) => {
    atualizarLinhaAtiva(linhaAtiva.id, (linhaAtual) => ({
      ...linhaAtual,
      carregando: true,
      erro: null,
    }));

    try {
      const [paradas, onibus] = await Promise.all([
        buscarParadasPorLinha(linhaAtiva.linha.cl),
        buscarPosicaoDosOnibus(linhaAtiva.linha.cl),
      ]);

      atualizarLinhaAtiva(linhaAtiva.id, (linhaAtual) => ({
        ...linhaAtual,
        paradas,
        onibus,
        carregando: false,
        erro: null,
        ultimaAtualizacao: new Date(),
      }));
      console.log(`Atualizada linha ${linhaAtiva.id}`);
    } catch {
      atualizarLinhaAtiva(linhaAtiva.id, (linhaAtual) => ({
        ...linhaAtual,
        carregando: false,
        erro: "Erro ao atualizar linha",
      }));
    }
  };

  const atualizarTodasLinhasAtivas = async (
    linhasParaAtualizar = linhasAtivasRef.current,
  ) => {
    await Promise.all(linhasParaAtualizar.map(atualizarDadosDaLinha));
  };

  const configurarAutoAtualizacao = () => {
    limparIntervalo();

    if (autoAtualizar && linhasAtivasRef.current.length > 0) {
      intervalRef.current = setInterval(
        () => atualizarTodasLinhasAtivas(),
        AUTO_UPDATE_INTERVAL_MS,
      );
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

    if (ligado && linhasAtivasRef.current.length > 0) {
      intervalRef.current = setInterval(
        () => atualizarTodasLinhasAtivas(),
        AUTO_UPDATE_INTERVAL_MS,
      );
    }
  };

  const handleAdicionarLinhasAoMapa = async () => {
    const codigosAtivos = linhasAtivas.map((linhaAtiva) => linhaAtiva.id);
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

    const novasLinhasAtivas = [];

    linhasParaAdicionar.forEach((linha) => {
      novasLinhasAtivas.push(
        montarLinhaAtivaInicial({
          linha,
          descricao: formatarLinhaEncontrada(linha),
          cor: obterCorDisponivel([...linhasAtivas, ...novasLinhasAtivas]),
        }),
      );
    });

    const proximasLinhasAtivas = [...linhasAtivas, ...novasLinhasAtivas];
    linhasAtivasRef.current = proximasLinhasAtivas;
    setLinhasAtivas(proximasLinhasAtivas);
    setCodigosSelecionados([]);

    await atualizarTodasLinhasAtivas(novasLinhasAtivas);
    configurarAutoAtualizacao();
  };

  const limparPainel = () => {
    limparIntervalo();
    setTermo("");
    setLinhas([]);
    setCodigosSelecionados([]);
    linhasAtivasRef.current = [];
    setLinhasAtivas([]);
    setMensagemSelecao("");
    setBuscaRealizada(false);
  };

  useEffect(() => {
    linhasAtivasRef.current = linhasAtivas;
  }, [linhasAtivas]);

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
    mensagemSelecao;
  const carregandoMapa = algumaLinhaCarregando(linhasAtivas);
  const totalParadas = contarParadasAgrupadas(linhasAtivas);
  const totalOnibus = somarVeiculos(linhasAtivas);
  const ultimaLinhaAtiva = linhasAtivas[linhasAtivas.length - 1] ?? null;
  const descricaoUltimaLinhaAtiva = ultimaLinhaAtiva?.descricao ?? null;
  const ultimaAtualizacao = linhasAtivas.reduce((maisRecente, linhaAtiva) => {
    if (!linhaAtiva.ultimaAtualizacao) {
      return maisRecente;
    }

    if (!maisRecente || linhaAtiva.ultimaAtualizacao > maisRecente) {
      return linhaAtiva.ultimaAtualizacao;
    }

    return maisRecente;
  }, null);
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
              <strong>{linhasAtivas.length}</strong>
              <span>linhas</span>
            </div>
            <div>
              <strong>{totalParadas}</strong>
              <span>paradas</span>
            </div>
            <div>
              <strong>{totalOnibus}</strong>
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
                onClick={() => atualizarTodasLinhasAtivas()}
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
              {totalParadas} paradas · {totalOnibus} veiculos
            </strong>
          </div>
          <MapView linhasAtivas={linhasAtivas} />
        </section>
      </main>
    </div>
  );
}

export default App;
