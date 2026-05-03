import { useState, useEffect, useRef } from "react";
import MapView from "./components/MapView";
import {
  autenticarSPTrans,
  buscarLinhas,
  buscarParadasPorLinha,
  buscarPosicaoDosOnibus,
} from "./services/sptransAPI";

function App() {
  const [termo, setTermo] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);
  const [paradas, setParadas] = useState([]);
  const [onibus, setOnibus] = useState([]);
  const intervalRef = useRef(null);

  // Autentica ao iniciar
  useEffect(() => {
    autenticarSPTrans();
  }, []);

  const handleBuscarLinhas = async () => {
    const data = await buscarLinhas(termo);
    setLinhas(data);
  };

  const buscarParadasELocalizacao = async (linha) => {
    const paradasData = await buscarParadasPorLinha(linha.cl);
    setParadas(paradasData);

    const atualizarOnibus = async () => {
      const veiculos = await buscarPosicaoDosOnibus(linha.cl);
      setOnibus(veiculos);
      console.log(`🚌 Atualizado: ${veiculos.length} veículos`);
    };

    await atualizarOnibus();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(atualizarOnibus, 5000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🚌 Mapa SPTrans</h1>

      <div>
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Digite o número ou nome da linha..."
          style={{ padding: "0.5rem", width: "300px" }}
        />
        <button onClick={handleBuscarLinhas} style={{ marginLeft: "1rem" }}>
          Buscar
        </button>
      </div>

      {linhas.length > 0 && (
        <select
          onChange={(e) =>
            setLinhaSelecionada(
              linhas.find((l) => l.cl === Number(e.target.value)),
            )
          }
          style={{ marginTop: "1rem", padding: "0.5rem" }}
        >
          <option value="">Selecione uma linha...</option>
          {linhas.map((l) => (
            <option key={l.cl} value={l.cl}>
              {l.lt} - {l.tp} ⇄ {l.ts}
            </option>
          ))}
        </select>
      )}

      {linhaSelecionada && (
        <button
          onClick={() => buscarParadasELocalizacao(linhaSelecionada)}
          style={{ marginLeft: "1rem" }}
        >
          Mostrar no mapa
        </button>
      )}

      <div style={{ marginTop: "2rem" }}>
        <MapView
          paradas={paradas}
          onibus={onibus}
          codigoLinha={linhaSelecionada?.cl || null}
        />
      </div>
    </div>
  );
}

export default App;
