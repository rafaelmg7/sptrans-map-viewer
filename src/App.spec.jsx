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

async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

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
        JSON.stringify({
          paradas,
          onibus,
          codigoLinha,
        })
      ),
  };
});

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    autenticarSPTrans.mockResolvedValue(undefined);
    buscarLinhas.mockResolvedValue([]);
    buscarParadasPorLinha.mockResolvedValue([]);
    buscarPosicaoDosOnibus.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("autentica ao montar", () => {
    render(<App />);

    expect(autenticarSPTrans).toHaveBeenCalledTimes(1);
  });

  it("renderiza o layout principal com controles centralizados", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Painel SPTrans em tempo real" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Numero ou nome da linha")).toBeInTheDocument();
    expect(screen.getByLabelText("Linha encontrada")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Buscar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mostrar no mapa" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Atualizar agora" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Limpar painel" })).toBeDisabled();
    expect(screen.getByLabelText("Autoatualizar a cada 5s")).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Aguardando carregamento da linha."
    );
    expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("0linhas");
    expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("0paradas");
    expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("0onibus");
  });

  it("busca linhas, popula o select, seleciona uma linha e carrega mapa", async () => {
    const linhas = [{ cl: 101, lt: "8000-10", tp: "Terminal A", ts: "Terminal B" }];
    const paradas = [{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }];
    const veiculos = [{ p: "BUS-1", py: -23.51, px: -46.61 }];

    buscarLinhas.mockResolvedValueOnce(linhas);
    buscarParadasPorLinha.mockResolvedValueOnce(paradas);
    buscarPosicaoDosOnibus.mockResolvedValue(veiculos);

    const { unmount } = render(<App />);

    fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
      target: { value: "8000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await flushAsync();

    expect(buscarLinhas).toHaveBeenCalledWith("8000");
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /8000-10/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar no mapa" }));

    await flushAsync();

    expect(screen.getByLabelText("Linha ativa")).toHaveTextContent(
      "8000-10 - Terminal A ⇄ Terminal B"
    );
    expect(buscarParadasPorLinha).toHaveBeenCalledWith(101);
    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("map-props")).toHaveTextContent('"codigoLinha":101');
    expect(screen.getByTestId("map-props")).toHaveTextContent("Parada Paulista");
    expect(screen.getByTestId("map-props")).toHaveTextContent("BUS-1");
    expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("1paradas");
    expect(screen.getByLabelText("Resumo do mapa")).toHaveTextContent("1onibus");

    await act(async () => {
      vi.advanceTimersByTime(AUTO_UPDATE_INTERVAL_MS);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(AUTO_UPDATE_INTERVAL_MS);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);
  });

  it("limpa dados carregados quando a busca fica vazia", async () => {
    const linhas = [{ cl: 101, lt: "8000-10", tp: "Terminal A", ts: "Terminal B" }];
    const paradas = [{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }];
    const veiculos = [{ p: "BUS-1", py: -23.51, px: -46.61 }];

    buscarLinhas.mockResolvedValueOnce(linhas);
    buscarParadasPorLinha.mockResolvedValueOnce(paradas);
    buscarPosicaoDosOnibus.mockResolvedValue(veiculos);

    render(<App />);

    fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
      target: { value: "8000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await flushAsync();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar no mapa" }));
    await flushAsync();

    expect(screen.getByTestId("map-props")).toHaveTextContent("Parada Paulista");
    expect(screen.getByTestId("map-props")).toHaveTextContent("BUS-1");

    fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form"));
    await flushAsync();

    expect(screen.getByLabelText("Linha encontrada")).toBeDisabled();
    expect(screen.getByTestId("map-props")).toHaveTextContent('"paradas":[]');
    expect(screen.getByTestId("map-props")).toHaveTextContent('"onibus":[]');
    expect(screen.getByRole("status")).toHaveTextContent(
      "Aguardando carregamento da linha."
    );

    await act(async () => {
      vi.advanceTimersByTime(AUTO_UPDATE_INTERVAL_MS);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(1);
  });

  it("substitui o intervalo anterior ao carregar outra linha", async () => {
    const linhas = [
      { cl: 101, lt: "8000-10", tp: "Terminal A", ts: "Terminal B" },
      { cl: 202, lt: "9000-10", tp: "Terminal C", ts: "Terminal D" },
    ];

    buscarLinhas.mockResolvedValueOnce(linhas);
    buscarParadasPorLinha.mockResolvedValue([]);
    buscarPosicaoDosOnibus.mockResolvedValue([]);

    render(<App />);

    fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
      target: { value: "linha" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await flushAsync();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "101" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar no mapa" }));

    await flushAsync();

    expect(buscarParadasPorLinha).toHaveBeenCalledWith(101);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "202" } });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar no mapa" }));

    await flushAsync();

    expect(buscarParadasPorLinha).toHaveBeenCalledWith(202);

    await act(async () => {
      vi.advanceTimersByTime(AUTO_UPDATE_INTERVAL_MS);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenLastCalledWith(202);
  });

  it("mantem historico de buscas e permite repetir uma busca recente", async () => {
    buscarLinhas
      .mockResolvedValueOnce([{ cl: 101, lt: "8000-10", tp: "A", ts: "B" }])
      .mockResolvedValueOnce([{ cl: 202, lt: "9000-10", tp: "C", ts: "D" }])
      .mockResolvedValueOnce([{ cl: 101, lt: "8000-10", tp: "A", ts: "B" }]);

    render(<App />);

    fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
      target: { value: "8000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await flushAsync();

    expect(screen.getByLabelText("Historico de buscas")).toHaveTextContent("8000");

    fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
      target: { value: "9000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await flushAsync();

    fireEvent.click(screen.getByRole("button", { name: "8000" }));

    await flushAsync();

    expect(buscarLinhas).toHaveBeenLastCalledWith("8000");
    expect(screen.getByLabelText("Numero ou nome da linha")).toHaveValue("8000");
  });

  it("atualiza onibus manualmente e limpa o painel", async () => {
    const linhas = [{ cl: 101, lt: "8000-10", tp: "Terminal A", ts: "Terminal B" }];
    const paradas = [{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }];

    buscarLinhas.mockResolvedValueOnce(linhas);
    buscarParadasPorLinha.mockResolvedValueOnce(paradas);
    buscarPosicaoDosOnibus
      .mockResolvedValueOnce([{ p: "BUS-1", py: -23.51, px: -46.61 }])
      .mockResolvedValueOnce([{ p: "BUS-2", py: -23.52, px: -46.62 }]);

    render(<App />);

    fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
      target: { value: "8000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await flushAsync();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar no mapa" }));
    await flushAsync();

    fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("map-props")).toHaveTextContent("BUS-2");
    expect(screen.getByRole("status")).toHaveTextContent("Ultima atualizacao:");

    fireEvent.click(screen.getByRole("button", { name: "Limpar painel" }));

    expect(screen.getByLabelText("Numero ou nome da linha")).toHaveValue("");
    expect(screen.getByLabelText("Linha encontrada")).toBeDisabled();
    expect(screen.getByTestId("map-props")).toHaveTextContent('"paradas":[]');
    expect(screen.getByTestId("map-props")).toHaveTextContent('"onibus":[]');
    expect(screen.getByRole("status")).toHaveTextContent(
      "Aguardando carregamento da linha."
    );
  });

  it("desliga e religa a autoatualizacao dos onibus", async () => {
    const linhas = [{ cl: 101, lt: "8000-10", tp: "Terminal A", ts: "Terminal B" }];

    buscarLinhas.mockResolvedValueOnce(linhas);
    buscarParadasPorLinha.mockResolvedValue([]);
    buscarPosicaoDosOnibus.mockResolvedValue([]);

    render(<App />);

    fireEvent.change(screen.getByLabelText("Numero ou nome da linha"), {
      target: { value: "8000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await flushAsync();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar no mapa" }));
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Autoatualizar a cada 5s"));

    await act(async () => {
      vi.advanceTimersByTime(AUTO_UPDATE_INTERVAL_MS);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Autoatualizar a cada 5s"));

    await act(async () => {
      vi.advanceTimersByTime(AUTO_UPDATE_INTERVAL_MS);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);
  });
});
