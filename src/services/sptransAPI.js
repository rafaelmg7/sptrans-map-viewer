import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE,
});

export async function autenticarSPTrans() {
  try {
    console.log("Autenticando na SPTrans...");
    await api.post("/Login/Autenticar");
    console.log("Autenticacao concluida.");
  } catch (err) {
    console.error("Erro ao autenticar SPTrans:", err.message);
  }
}

export async function buscarLinhas(termo) {
  try {
    const params = new URLSearchParams({ termosBusca: termo });
    const resp = await api.get(`/Linha/Buscar?${params}`);
    return resp.data;
  } catch (err) {
    console.error("Erro ao buscar linhas:", err.message);
    return [];
  }
}

export async function buscarParadasPorLinha(codigoLinha) {
  try {
    const params = new URLSearchParams({ codigoLinha });
    const resp = await api.get(`/Parada/BuscarParadasPorLinha?${params}`);
    return resp.data;
  } catch (err) {
    console.error("Erro ao buscar paradas:", err.message);
    return [];
  }
}

export async function buscarPosicaoDosOnibus(codigoLinha) {
  try {
    const params = new URLSearchParams({ codigoLinha });
    const resp = await api.get(`/Posicao/Linha?${params}`);
    return resp.data?.vs || [];
  } catch (err) {
    console.error("Erro ao buscar posicao dos onibus:", err.message);
    return [];
  }
}

export async function buscarPrevisao(codigoParada, codigoLinha) {
  try {
    const params = new URLSearchParams({ codigoParada, codigoLinha });
    const resp = await api.get(`/Previsao?${params}`);
    return resp.data;
  } catch (err) {
    console.error("Erro ao buscar previsao:", err.message);
    return null;
  }
}

export default api;
