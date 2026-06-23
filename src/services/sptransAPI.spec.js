import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api, {
  autenticarSPTrans,
  buscarLinhas,
  buscarParadasPorLinha,
  buscarPosicaoDosOnibus,
  buscarPrevisao,
} from "./sptransAPI";

describe("sptransAPI", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("usa VITE_API_URL com fallback para localhost", () => {
    expect(api.defaults.baseURL).toBe("http://localhost:3000/api");
  });

  describe("autenticarSPTrans", () => {
    it("chama a rota de autenticacao do backend e registra sucesso", async () => {
      const post = vi.spyOn(api, "post").mockResolvedValueOnce({ data: true });

      await autenticarSPTrans();

      expect(post).toHaveBeenCalledWith("/Login/Autenticar");
      expect(console.log).toHaveBeenCalledWith("Autenticacao concluida.");
    });

    it("registra erro de autenticacao sem propagar excecao", async () => {
      const erro = new Error("Token invalido");
      vi.spyOn(api, "post").mockRejectedValueOnce(erro);

      await autenticarSPTrans();

      expect(console.error).toHaveBeenCalledWith(
        "Erro ao autenticar SPTrans:",
        "Token invalido"
      );
    });
  });

  describe("buscarLinhas", () => {
    it("retorna linhas e usa a URL esperada", async () => {
      const linhas = [{ cl: 101, lt: "8000-10" }];
      const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: linhas });

      await expect(buscarLinhas("8000")).resolves.toEqual(linhas);

      expect(get).toHaveBeenCalledWith("/Linha/Buscar?termosBusca=8000");
    });

    it("codifica termos de busca com espacos e caracteres especiais", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: [] });

      await buscarLinhas("Terminal A/B");

      expect(get).toHaveBeenCalledWith(
        "/Linha/Buscar?termosBusca=Terminal+A%2FB"
      );
    });

    it("propaga erro e registra falha", async () => {
      vi.spyOn(api, "get").mockRejectedValueOnce(new Error("Network Error"));

      await expect(buscarLinhas("8000")).rejects.toThrow("Network Error");
      expect(console.error).toHaveBeenCalledWith(
        "Erro ao buscar linhas:",
        "Network Error"
      );
    });
  });

  describe("buscarParadasPorLinha", () => {
    it("retorna paradas e usa a URL esperada", async () => {
      const paradas = [{ cp: 1, np: "Av Paulista" }];
      const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: paradas });

      await expect(buscarParadasPorLinha(101)).resolves.toEqual(paradas);

      expect(get).toHaveBeenCalledWith(
        "/Parada/BuscarParadasPorLinha?codigoLinha=101"
      );
    });

    it("codifica codigo de linha textual sem montar query manualmente", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: [] });

      await buscarParadasPorLinha("8000-10 A/B");

      expect(get).toHaveBeenCalledWith(
        "/Parada/BuscarParadasPorLinha?codigoLinha=8000-10+A%2FB"
      );
    });

    it("propaga erro em falha", async () => {
      vi.spyOn(api, "get").mockRejectedValueOnce(new Error("Erro no servidor"));

      await expect(buscarParadasPorLinha(101)).rejects.toThrow(
        "Erro no servidor"
      );
      expect(console.error).toHaveBeenCalledWith(
        "Erro ao buscar paradas:",
        "Erro no servidor"
      );
    });
  });

  describe("buscarPosicaoDosOnibus", () => {
    it("retorna a lista vs da resposta", async () => {
      const veiculos = [{ p: "BUS-1", px: -46.6, py: -23.5 }];
      const get = vi
        .spyOn(api, "get")
        .mockResolvedValueOnce({ data: { vs: veiculos } });

      await expect(buscarPosicaoDosOnibus(101)).resolves.toEqual(veiculos);

      expect(get).toHaveBeenCalledWith("/Posicao/Linha?codigoLinha=101");
    });

    it("retorna array vazio quando vs esta ausente", async () => {
      vi.spyOn(api, "get").mockResolvedValueOnce({ data: {} });

      await expect(buscarPosicaoDosOnibus(101)).resolves.toEqual([]);
    });

    it("propaga erro e registra falha", async () => {
      vi.spyOn(api, "get").mockRejectedValueOnce(new Error("Timeout"));

      await expect(buscarPosicaoDosOnibus(101)).rejects.toThrow("Timeout");
      expect(console.error).toHaveBeenCalledWith(
        "Erro ao buscar posicao dos onibus:",
        "Timeout"
      );
    });
  });

  describe("buscarPrevisao", () => {
    it("retorna previsao e usa a URL esperada", async () => {
      const previsao = { linhas: [] };
      const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: previsao });

      await expect(buscarPrevisao(10, 101)).resolves.toEqual(previsao);

      expect(get).toHaveBeenCalledWith(
        "/Previsao?codigoParada=10&codigoLinha=101"
      );
    });

    it("codifica parametros de previsao independentemente", async () => {
      const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: {} });

      await buscarPrevisao("parada 10", "linha/101");

      expect(get).toHaveBeenCalledWith(
        "/Previsao?codigoParada=parada+10&codigoLinha=linha%2F101"
      );
    });

    it("propaga erro e registra falha", async () => {
      vi.spyOn(api, "get").mockRejectedValueOnce(
        new Error("Parada nao encontrada")
      );

      await expect(buscarPrevisao(10, 101)).rejects.toThrow(
        "Parada nao encontrada"
      );
      expect(console.error).toHaveBeenCalledWith(
        "Erro ao buscar previsao:",
        "Parada nao encontrada"
      );
    });
  });
});
