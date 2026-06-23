import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  autenticarSPTrans,
  buscarLinhas,
  buscarParadasPorLinha,
  buscarPosicaoDosOnibus,
} from "./services/sptransAPI";
import { AUTO_UPDATE_INTERVAL_MS } from "./config";

vi.mock("./services/sptransAPI", () => ({
  autenticarSPTrans: vi.fn(),
  buscarLinhas: vi.fn(),
  buscarParadasPorLinha: vi.fn(),
  buscarPosicaoDosOnibus: vi.fn(),
}));

vi.mock("./components/MapView", async () => {
  const React = await import("react");
  return {
    default: ({ paradas, onibus, codigoLinha }) =>
      React.createElement(
        "div",
        { "data-testid": "map-props" },
        JSON.stringify({ paradas, onibus, codigoLinha }),
      ),
  };
});

async function aguardarPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function buscarPorLinha(termo) {
  fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
    target: { value: termo },
  });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  await aguardarPromises();
}

async function selecionarLinhaEExibirNoMapa(codigoLinha) {
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: String(codigoLinha) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Mostrar no mapa" }));
  await aguardarPromises();
}

async function avancarTempoParaProximaAtualizacao() {
  await act(async () => {
    vi.advanceTimersByTime(AUTO_UPDATE_INTERVAL_MS);
  });
  await aguardarPromises();
}

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});

    autenticarSPTrans.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Renderização e Configuração Inicial", () => {
    it("deve autenticar na SPTrans ao montar o componente", () => {
      render(<App />);
      expect(autenticarSPTrans).toHaveBeenCalledTimes(1);
    });

    it("deve renderizar o layout principal com controles desabilitados inicialmente", () => {
      render(<App />);

      expect(
        screen.getByRole("heading", { name: "Painel SPTrans em tempo real" }),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Numero ou nome da linha"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Linha e sentido")).toBeDisabled();
      expect(screen.getByRole("button", { name: "Buscar" })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Mostrar no mapa" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Atualizar agora" }),
      ).toBeDisabled();
      expect(screen.getByLabelText("Autoatualizar a cada 5s")).toBeChecked();
    });
  });

  describe("Busca e Seleção de Linhas", () => {
    it("deve buscar linhas e popular o menu de seleção", async () => {
      const linhasMock = [
        { cl: 101, lt: "8000-10", tp: "Terminal A", ts: "Terminal B" },
      ];
      buscarLinhas.mockResolvedValueOnce(linhasMock);

      render(<App />);
      await buscarPorLinha("8000");

      expect(buscarLinhas).toHaveBeenCalledWith("8000");
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /8000-10/ }),
      ).toBeInTheDocument();
    });

    it("deve diferenciar linhas com mesmo letreiro por sentido e codigo unico", async () => {
      buscarLinhas.mockResolvedValueOnce([
        {
          cl: 1273,
          lt: "8000",
          tl: 10,
          sl: 1,
          tp: "PCA.RAMOS DE AZEVEDO",
          ts: "TERMINAL LAPA",
        },
        {
          cl: 34041,
          lt: "8000",
          tl: 10,
          sl: 2,
          tp: "PCA.RAMOS DE AZEVEDO",
          ts: "TERMINAL LAPA",
        },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([]);
      buscarPosicaoDosOnibus.mockResolvedValueOnce([]);

      render(<App />);
      await buscarPorLinha("8000");

      expect(
        screen.getByRole("option", {
          name: "8000-10 | ida | PCA.RAMOS DE AZEVEDO -> TERMINAL LAPA | cl 1273",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", {
          name: "8000-10 | volta | TERMINAL LAPA -> PCA.RAMOS DE AZEVEDO | cl 34041",
        }),
      ).toBeInTheDocument();

      await selecionarLinhaEExibirNoMapa(34041);

      expect(buscarParadasPorLinha).toHaveBeenCalledWith(34041);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledWith(34041);
      expect(screen.getByLabelText("Linha ativa")).toHaveTextContent(
        "8000-10 | volta | TERMINAL LAPA -> PCA.RAMOS DE AZEVEDO | cl 34041",
      );
    });

    it("deve avisar o usuário quando a busca não encontrar resultados", async () => {
      buscarLinhas.mockResolvedValueOnce([]);

      render(<App />);
      await buscarPorLinha("inexistente");

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Nenhuma linha encontrada para esse termo.",
      );
    });

    it("deve manter o histórico de buscas e permitir repetir uma busca recente", async () => {
      buscarLinhas.mockResolvedValue([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
      ]);

      render(<App />);
      await buscarPorLinha("8000");
      expect(screen.getByLabelText("Historico de buscas")).toHaveTextContent(
        "8000",
      );

      await buscarPorLinha("9000");

      fireEvent.click(screen.getByRole("button", { name: "8000" }));
      await aguardarPromises();

      expect(buscarLinhas).toHaveBeenLastCalledWith("8000");
    });
  });

  describe("Integração com Mapa Operacional", () => {
    it("deve carregar paradas e veículos no mapa ao selecionar uma linha", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([
        { cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 },
      ]);
      buscarPosicaoDosOnibus.mockResolvedValueOnce([
        { p: "BUS-1", py: -23.51, px: -46.61 },
      ]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhaEExibirNoMapa(101);

      expect(buscarParadasPorLinha).toHaveBeenCalledWith(101);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(1);

      expect(screen.getByTestId("map-props")).toHaveTextContent(
        '"codigoLinha":101',
      );
      expect(screen.getByTestId("map-props")).toHaveTextContent(
        "Parada Paulista",
      );
      expect(screen.getByTestId("map-props")).toHaveTextContent("BUS-1");
    });

    it("deve limpar o painel e o mapa quando a busca for apagada", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([]);
      buscarPosicaoDosOnibus.mockResolvedValueOnce([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhaEExibirNoMapa(101);

      fireEvent.click(screen.getByRole("button", { name: "Limpar painel" }));

      expect(screen.getByLabelText("Numero ou nome da linha")).toHaveValue("");
      expect(screen.getByLabelText("Linha e sentido")).toBeDisabled();
      expect(screen.getByTestId("map-props")).toHaveTextContent('"paradas":[]');
      expect(screen.getByTestId("map-props")).toHaveTextContent('"onibus":[]');
    });
  });

  describe("Atualização em Tempo Real (Timers)", () => {
    it("deve atualizar a posição dos ônibus automaticamente conforme o intervalo definido", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhaEExibirNoMapa(101);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(1);

      await avancarTempoParaProximaAtualizacao();
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);

      await avancarTempoParaProximaAtualizacao();
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(3);
    });

    it("não deve atualizar a posição se a autoatualização for desligada", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhaEExibirNoMapa(101);

      fireEvent.click(screen.getByLabelText("Autoatualizar a cada 5s"));
      await avancarTempoParaProximaAtualizacao();

      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(1);
    });

    it("deve permitir atualizar os dados manualmente clicando no botão", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhaEExibirNoMapa(101);

      fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
      await aguardarPromises();

      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);
    });
  });
});
