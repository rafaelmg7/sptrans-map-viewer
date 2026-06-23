import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { AUTO_UPDATE_INTERVAL_MS } from "./config";
import {
  autenticarSPTrans,
  buscarLinhas,
  buscarParadasPorLinha,
  buscarPosicaoDosOnibus,
} from "./services/sptransAPI";

vi.mock("./services/sptransAPI", () => ({
  autenticarSPTrans: vi.fn(),
  buscarLinhas: vi.fn(),
  buscarParadasPorLinha: vi.fn(),
  buscarPosicaoDosOnibus: vi.fn(),
}));

vi.mock("./components/MapView", async () => {
  const React = await import("react");
  return {
    default: ({ linhasAtivas }) =>
      React.createElement(
        "div",
        { "data-testid": "map-props" },
        JSON.stringify({ linhasAtivas }),
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

function selecionarCodigos(...codigosLinha) {
  const codigos = codigosLinha.map(String);
  const seletor = screen.getByLabelText("Linha e sentido");

  Array.from(seletor.options).forEach((option) => {
    option.selected = codigos.includes(option.value);
  });

  fireEvent.change(seletor);
}

async function selecionarLinhasEAdicionarAoMapa(...codigosLinha) {
  selecionarCodigos(...codigosLinha);
  fireEvent.click(screen.getByRole("button", { name: "Adicionar ao mapa" }));
  await aguardarPromises();
}

async function avancarTempoParaProximaAtualizacao() {
  await act(async () => {
    vi.advanceTimersByTime(AUTO_UPDATE_INTERVAL_MS);
  });
  await aguardarPromises();
}

function lerLinhasAtivasDoMapa() {
  return JSON.parse(screen.getByTestId("map-props").textContent).linhasAtivas;
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
        screen.getByRole("button", { name: "Adicionar ao mapa" }),
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
      expect(screen.getByRole("listbox")).toBeInTheDocument();
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

      await selecionarLinhasEAdicionarAoMapa(34041);

      expect(buscarParadasPorLinha).toHaveBeenCalledWith(34041);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledWith(34041);
      expect(screen.getByLabelText("Linhas no mapa")).toHaveTextContent(
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

    it("deve permitir selecionar varias linhas e habilitar a adicao ao mapa", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 102, lt: "8001-10", tp: "C", ts: "D" },
      ]);

      render(<App />);
      await buscarPorLinha("8000");

      const seletor = screen.getByLabelText("Linha e sentido");
      expect(seletor).toHaveAttribute("multiple");

      const botaoAdicionar = screen.getByRole("button", {
        name: "Adicionar ao mapa",
      });
      expect(botaoAdicionar).toBeDisabled();

      selecionarCodigos(101, 102);

      expect(botaoAdicionar).toBeEnabled();
    });

    it("deve limitar a adicao a 5 linhas e avisar quando a selecao exceder o limite", async () => {
      const linhasMock = Array.from({ length: 6 }, (_, indice) => ({
        cl: 100 + indice,
        lt: `800${indice}`,
        tp: `Terminal ${indice}`,
        ts: `Bairro ${indice}`,
      }));
      buscarLinhas.mockResolvedValueOnce(linhasMock);
      buscarParadasPorLinha.mockResolvedValue([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("800");
      await selecionarLinhasEAdicionarAoMapa(100, 101, 102, 103, 104, 105);

      expect(buscarParadasPorLinha).toHaveBeenCalledTimes(5);
      expect(buscarParadasPorLinha).toHaveBeenNthCalledWith(1, 100);
      expect(buscarParadasPorLinha).toHaveBeenNthCalledWith(5, 104);
      expect(buscarParadasPorLinha).not.toHaveBeenCalledWith(105);

      const avisoLimite = screen.getByText("Limite de 5 linhas no mapa.");
      expect(avisoLimite).toHaveAttribute("role", "status");
    });

    it("nao deve adicionar novamente linhas que ja estao ativas", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 102, lt: "8001-10", tp: "C", ts: "D" },
      ]);
      buscarParadasPorLinha.mockResolvedValue([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101);
      await selecionarLinhasEAdicionarAoMapa(101, 102);

      expect(buscarParadasPorLinha).toHaveBeenCalledTimes(2);
      expect(buscarParadasPorLinha).toHaveBeenNthCalledWith(1, 101);
      expect(buscarParadasPorLinha).toHaveBeenNthCalledWith(2, 102);
    });
  });

  describe("Integração com Mapa Operacional", () => {
    it("deve carregar paradas e veiculos para cada linha ativa e enviar linhasAtivas ao mapa", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([
        { cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([
        { cp: 20, np: "Parada Centro", py: -23.52, px: -46.62 },
      ]);
      buscarPosicaoDosOnibus.mockResolvedValueOnce([
        { p: "BUS-1", py: -23.51, px: -46.61 },
      ]);
      buscarPosicaoDosOnibus.mockResolvedValueOnce([
        { p: "BUS-2", py: -23.53, px: -46.63 },
      ]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101, 202);

      expect(buscarParadasPorLinha).toHaveBeenCalledWith(101);
      expect(buscarParadasPorLinha).toHaveBeenCalledWith(202);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledWith(101);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledWith(202);

      expect(lerLinhasAtivasDoMapa()).toEqual([
        expect.objectContaining({
          id: "101",
          cor: expect.any(String),
          descricao: "8000-10 | A <-> B | cl 101",
          paradas: [{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }],
          onibus: [{ p: "BUS-1", py: -23.51, px: -46.61 }],
        }),
        expect.objectContaining({
          id: "202",
          cor: expect.any(String),
          descricao: "9000-10 | C <-> D | cl 202",
          paradas: [{ cp: 20, np: "Parada Centro", py: -23.52, px: -46.62 }],
          onibus: [{ p: "BUS-2", py: -23.53, px: -46.63 }],
        }),
      ]);
    });

    it("deve exibir metricas agregadas com linhas ativas, paradas agrupadas e veiculos totais", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([
        { cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 },
        { cp: 11, np: "Parada Augusta", py: -23.51, px: -46.61 },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([
        { cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 },
        { cp: 12, np: "Parada Centro", py: -23.52, px: -46.62 },
      ]);
      buscarPosicaoDosOnibus.mockResolvedValueOnce([
        { p: "BUS-1", py: -23.51, px: -46.61 },
      ]);
      buscarPosicaoDosOnibus.mockResolvedValueOnce([
        { p: "BUS-2", py: -23.53, px: -46.63 },
        { p: "BUS-3", py: -23.54, px: -46.64 },
      ]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101, 202);

      expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("2");
      expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("3");
      expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("linhas");
      expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("paradas");
      expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("onibus");
      expect(screen.getByText("3 paradas · 3 veiculos")).toBeInTheDocument();
    });

    it("deve limpar o painel e o mapa quando a busca for apagada", async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
      ]);
      buscarParadasPorLinha.mockResolvedValueOnce([]);
      buscarPosicaoDosOnibus.mockResolvedValueOnce([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101);

      fireEvent.click(screen.getByRole("button", { name: "Limpar painel" }));

      expect(screen.getByLabelText("Numero ou nome da linha")).toHaveValue("");
      expect(screen.getByLabelText("Linha e sentido")).toBeDisabled();
      expect(screen.getByTestId("map-props")).toHaveTextContent(
        '"linhasAtivas":[]',
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Aguardando carregamento da linha.",
      );
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("deve listar linhas no mapa com cor, descricao, status e acao de remover", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
      ]);
      buscarParadasPorLinha.mockResolvedValue([]);
      buscarPosicaoDosOnibus
        .mockResolvedValueOnce([{ p: "BUS-1" }])
        .mockRejectedValueOnce(new Error("falha"));

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101, 202);

      const painelLinhas = screen.getByLabelText("Linhas no mapa");
      expect(painelLinhas).toHaveTextContent("8000-10 | A <-> B | cl 101");
      expect(painelLinhas).toHaveTextContent("9000-10 | C <-> D | cl 202");
      expect(painelLinhas).toHaveTextContent("Atualizada");
      expect(painelLinhas).toHaveTextContent("Erro ao atualizar linha");
      expect(screen.getByLabelText("Cor da linha 8000-10 | A <-> B | cl 101"))
        .toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "Remover linha 8000-10 | A <-> B | cl 101",
        }),
      ).toBeInTheDocument();
    });

    it("deve remover uma linha do mapa e liberar sua cor", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
        { cl: 303, lt: "7000-10", tp: "E", ts: "F" },
      ]);
      buscarParadasPorLinha.mockResolvedValue([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101, 202);

      const corLiberada = lerLinhasAtivasDoMapa()[0].cor;
      fireEvent.click(
        screen.getByRole("button", {
          name: "Remover linha 8000-10 | A <-> B | cl 101",
        }),
      );

      expect(lerLinhasAtivasDoMapa()).toEqual([
        expect.objectContaining({ id: "202" }),
      ]);
      expect(screen.getByLabelText("Linhas no mapa")).not.toHaveTextContent(
        "8000-10 | A <-> B | cl 101",
      );

      await selecionarLinhasEAdicionarAoMapa(303);

      expect(lerLinhasAtivasDoMapa()).toEqual([
        expect.objectContaining({ id: "202" }),
        expect.objectContaining({ id: "303", cor: corLiberada }),
      ]);
    });

    it("deve manter linhas ativas no mapa ao fazer nova busca", async () => {
      buscarLinhas
        .mockResolvedValueOnce([
          { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
          { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
        ])
        .mockResolvedValueOnce([{ cl: 303, lt: "7000-10", tp: "E", ts: "F" }]);
      buscarParadasPorLinha.mockResolvedValue([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101);
      selecionarCodigos(202);

      await buscarPorLinha("7000");

      expect(lerLinhasAtivasDoMapa()).toEqual([
        expect.objectContaining({ id: "101" }),
      ]);
      expect(screen.queryByRole("option", { name: /9000-10/ })).not.toBeInTheDocument();
      expect(screen.getByRole("option", { name: /7000-10/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adicionar ao mapa" })).toBeDisabled();
    });
  });

  describe("Atualização em Tempo Real (Timers)", () => {
    it("deve atualizar todas as linhas ativas automaticamente com um unico intervalo", async () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
      ]);
      buscarParadasPorLinha.mockResolvedValue([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101, 202);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);

      await avancarTempoParaProximaAtualizacao();
      expect(buscarParadasPorLinha).toHaveBeenCalledTimes(4);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(4);
      expect(buscarPosicaoDosOnibus).toHaveBeenNthCalledWith(3, 101);
      expect(buscarPosicaoDosOnibus).toHaveBeenNthCalledWith(4, 202);

      await avancarTempoParaProximaAtualizacao();
      expect(buscarParadasPorLinha).toHaveBeenCalledTimes(6);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(6);
    });

    it("não deve atualizar a posição se a autoatualização for desligada", async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
      ]);
      buscarParadasPorLinha.mockResolvedValue([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101, 202);

      fireEvent.click(screen.getByLabelText("Autoatualizar a cada 5s"));
      await avancarTempoParaProximaAtualizacao();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);
    });

    it("deve permitir atualizar todas as linhas ativas manualmente", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
      ]);
      buscarParadasPorLinha.mockResolvedValue([]);
      buscarPosicaoDosOnibus.mockResolvedValue([]);

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101, 202);

      fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
      await aguardarPromises();

      expect(buscarParadasPorLinha).toHaveBeenCalledTimes(4);
      expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(4);
      expect(buscarPosicaoDosOnibus).toHaveBeenNthCalledWith(3, 101);
      expect(buscarPosicaoDosOnibus).toHaveBeenNthCalledWith(4, 202);
    });

    it("deve preservar dados anteriores quando uma linha falhar na atualizacao", async () => {
      buscarLinhas.mockResolvedValueOnce([
        { cl: 101, lt: "8000-10", tp: "A", ts: "B" },
        { cl: 202, lt: "9000-10", tp: "C", ts: "D" },
      ]);
      buscarParadasPorLinha
        .mockResolvedValueOnce([{ cp: 10, np: "Parada A" }])
        .mockResolvedValueOnce([{ cp: 20, np: "Parada B" }])
        .mockResolvedValueOnce([{ cp: 11, np: "Parada A atualizada" }])
        .mockResolvedValueOnce([{ cp: 21, np: "Parada B ignorada" }]);
      buscarPosicaoDosOnibus
        .mockResolvedValueOnce([{ p: "BUS-1" }])
        .mockResolvedValueOnce([{ p: "BUS-2" }])
        .mockResolvedValueOnce([{ p: "BUS-3" }])
        .mockRejectedValueOnce(new Error("falha"));

      render(<App />);
      await buscarPorLinha("8000");
      await selecionarLinhasEAdicionarAoMapa(101, 202);

      fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
      await aguardarPromises();

      expect(lerLinhasAtivasDoMapa()).toEqual([
        expect.objectContaining({
          id: "101",
          erro: null,
          paradas: [{ cp: 11, np: "Parada A atualizada" }],
          onibus: [{ p: "BUS-3" }],
        }),
        expect.objectContaining({
          id: "202",
          erro: "Erro ao atualizar linha",
          paradas: [{ cp: 20, np: "Parada B" }],
          onibus: [{ p: "BUS-2" }],
        }),
      ]);
    });
  });
});
