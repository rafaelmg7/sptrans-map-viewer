import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  autenticarSPTrans,
  buscarLinhas,
  buscarParadasPorLinha,
  buscarPosicaoDosOnibus,
} from "./services/sptransAPI";

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

  it("busca linhas, popula o select, seleciona uma linha e carrega mapa", async () => {
    const linhas = [{ cl: 101, lt: "8000-10", tp: "Terminal A", ts: "Terminal B" }];
    const paradas = [{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }];
    const veiculos = [{ p: "BUS-1", py: -23.51, px: -46.61 }];

    buscarLinhas.mockResolvedValueOnce(linhas);
    buscarParadasPorLinha.mockResolvedValueOnce(paradas);
    buscarPosicaoDosOnibus.mockResolvedValue(veiculos);

    const { unmount } = render(<App />);

    fireEvent.change(
      screen.getByPlaceholderText("Digite o número ou nome da linha..."),
      { target: { value: "8000" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await flushAsync();

    expect(buscarLinhas).toHaveBeenCalledWith("8000");
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /8000-10/ })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar no mapa" }));

    await flushAsync();

    expect(buscarParadasPorLinha).toHaveBeenCalledWith(101);
    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("map-props")).toHaveTextContent('"codigoLinha":101');
    expect(screen.getByTestId("map-props")).toHaveTextContent("Parada Paulista");
    expect(screen.getByTestId("map-props")).toHaveTextContent("BUS-1");

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenCalledTimes(2);
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

    fireEvent.change(
      screen.getByPlaceholderText("Digite o número ou nome da linha..."),
      { target: { value: "linha" } }
    );
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
      vi.advanceTimersByTime(5000);
    });
    await flushAsync();

    expect(buscarPosicaoDosOnibus).toHaveBeenLastCalledWith(202);
  });
});
