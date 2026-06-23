import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COR_PARADA_COMPARTILHADA, PALETA_CORES_LINHAS } from "../linhasAtivas";
import { buscarPrevisao } from "../services/sptransAPI";
import MapView from "./MapView";

vi.mock("leaflet", () => ({
  default: {
    Icon: vi.fn(function Icon(options) {
      this.options = options;
    }),
  },
}));

vi.mock("react-leaflet", async () => {
  const React = await import("react");

  return {
    MapContainer: ({ children }) =>
      React.createElement("div", { "data-testid": "map-container" }, children),
    TileLayer: () =>
      React.createElement("div", { "data-testid": "tile-layer" }),
    Marker: ({ children, eventHandlers, icon, position }) =>
      React.createElement(
        "div",
        {
          "data-testid": "marker",
          "data-icon-class": icon?.options?.className ?? "",
          "data-icon-url": icon?.options?.iconUrl ?? "",
          "data-marker-color": icon?.options?.markerColor ?? "",
          "data-position": JSON.stringify(position),
        },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => eventHandlers?.click?.(),
          },
          "marker",
        ),
        children,
      ),
    Popup: ({ children }) =>
      React.createElement("div", { "data-testid": "popup" }, children),
  };
});

vi.mock("../services/sptransAPI", () => ({
  buscarPrevisao: vi.fn(),
}));

describe("MapView", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza paradas e onibus com Leaflet mockado", () => {
    render(
      <MapView
        codigoLinha={101}
        paradas={[{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }]}
        onibus={[
          { p: "BUS-1", py: -23.51, px: -46.61, ta: "2026-06-22T12:00:00Z" },
        ]}
      />,
    );

    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByText("Parada Paulista")).toBeInTheDocument();
    expect(screen.getByText(/Codigo:|Código:/)).toBeInTheDocument();
    expect(screen.getByText(/Onibus|Ônibus/)).toBeInTheDocument();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("ignora paradas e onibus sem coordenadas validas", () => {
    render(
      <MapView
        codigoLinha={101}
        paradas={[
          { cp: 10, np: "Parada Valida", py: -23.5, px: -46.6 },
          { cp: 11, np: "Parada Sem Latitude", py: null, px: -46.61 },
          { cp: 12, np: "Parada Sem Longitude", py: -23.52, px: undefined },
        ]}
        onibus={[
          { p: "BUS-1", py: -23.51, px: -46.61, ta: "2026-06-22T12:00:00Z" },
          { p: "BUS-2", py: "23", px: -46.62, ta: "2026-06-22T12:01:00Z" },
        ]}
      />,
    );

    expect(screen.getByText("Parada Valida")).toBeInTheDocument();
    expect(screen.queryByText("Parada Sem Latitude")).not.toBeInTheDocument();
    expect(screen.queryByText("Parada Sem Longitude")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("carrega e exibe previsoes normalizadas pelo backend ao clicar na parada", async () => {
    const user = userEvent.setup();
    buscarPrevisao.mockResolvedValueOnce({
      linhas: [
        {
          codigoLinha: 101,
          descricao: "Linha 101",
          veiculos: [{ placa: "BUS-1", horaPrevista: "12:10", minutos: 10 }],
        },
      ],
    });

    render(
      <MapView
        codigoLinha={101}
        paradas={[{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "marker" }));

    await waitFor(() => {
      expect(buscarPrevisao).toHaveBeenCalledWith(10, 101);
    });
    expect(screen.getByText("101")).toBeInTheDocument();
    expect(screen.getByText(/12:10/)).toBeInTheDocument();
    expect(screen.getByText(/10 min/)).toBeInTheDocument();
  });

  it("exibe previsoes recebidas no formato bruto da SPTrans", async () => {
    const user = userEvent.setup();
    buscarPrevisao.mockResolvedValueOnce({
      p: {
        l: [{ c: "8000-10", vs: [{ p: "BUS-2", t: "12:30" }] }],
      },
    });

    render(
      <MapView
        codigoLinha={101}
        paradas={[{ cp: 20, np: "Parada Centro", py: -23.52, px: -46.62 }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "marker" }));

    expect(await screen.findByText("8000-10")).toBeInTheDocument();
    expect(screen.getByText(/12:30/)).toBeInTheDocument();
  });

  it("exibe estado vazio quando nao houver previsao disponivel", async () => {
    const user = userEvent.setup();
    buscarPrevisao.mockResolvedValueOnce(null);

    render(
      <MapView
        codigoLinha={101}
        paradas={[{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "marker" }));

    expect(
      await screen.findByText("Sem previsão disponível"),
    ).toBeInTheDocument();
  });

  it("exibe erro quando a previsao falhar", async () => {
    const user = userEvent.setup();
    buscarPrevisao.mockRejectedValueOnce(new Error("indisponivel"));

    render(
      <MapView
        codigoLinha={101}
        paradas={[{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "marker" }));

    expect(
      await screen.findByText("Erro ao carregar previsão"),
    ).toBeInTheDocument();
  });

  it("nao chama a API e mostra vazio quando a linha nao foi selecionada", async () => {
    const user = userEvent.setup();

    render(
      <MapView
        paradas={[{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "marker" }));

    expect(buscarPrevisao).not.toHaveBeenCalled();
    expect(screen.getByText("Sem previsão disponível")).toBeInTheDocument();
  });

  it("agrupa paradas com mesmo codigo em linhas diferentes", () => {
    render(
      <MapView
        linhasAtivas={[
          {
            id: "101",
            descricao: "Linha 101",
            cor: "#0f766e",
            linha: { cl: 101 },
            paradas: [
              { cp: 10, np: "Parada Compartilhada", py: -23.5, px: -46.6 },
            ],
            onibus: [
              {
                p: "BUS-1",
                py: -23.51,
                px: -46.61,
                ta: "2026-06-22T12:00:00Z",
              },
            ],
          },
          {
            id: "202",
            descricao: "Linha 202",
            cor: "#0369a1",
            linha: { cl: 202 },
            paradas: [
              { cp: 10, np: "Parada Compartilhada", py: -23.5, px: -46.6 },
            ],
            onibus: [
              {
                p: "BUS-2",
                py: -23.52,
                px: -46.62,
                ta: "2026-06-22T12:01:00Z",
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getAllByText("Parada Compartilhada")).toHaveLength(1);
    expect(screen.getAllByTestId("marker")).toHaveLength(3);
    const popupParada = screen.getAllByTestId("popup")[0];
    expect(
      within(popupParada).getByText("Linhas atendidas"),
    ).toBeInTheDocument();
    expect(
      within(popupParada).getAllByText("Linha 101").length,
    ).toBeGreaterThan(0);
    expect(
      within(popupParada).getAllByText("Linha 202").length,
    ).toBeGreaterThan(0);
    expect(
      within(popupParada).getByText("2 linhas nesta parada"),
    ).toBeInTheDocument();

    const marcadorParada = screen.getAllByTestId("marker")[0];
    expect(marcadorParada).toHaveAttribute(
      "data-icon-class",
      "shared-stop-marker",
    );
    expect(marcadorParada).toHaveAttribute(
      "data-marker-color",
      COR_PARADA_COMPARTILHADA,
    );
    expect(PALETA_CORES_LINHAS).not.toContain(COR_PARADA_COMPARTILHADA);
  });

  it("usa a cor da linha nos icones de parada simples e onibus", () => {
    render(
      <MapView
        linhasAtivas={[
          {
            id: "101",
            descricao: "Linha 101",
            cor: "#0f766e",
            linha: { cl: 101 },
            paradas: [{ cp: 10, np: "Parada Paulista", py: -23.5, px: -46.6 }],
            onibus: [
              {
                p: "BUS-1",
                py: -23.51,
                px: -46.61,
                ta: "2026-06-22T12:00:00Z",
              },
            ],
          },
        ]}
      />,
    );

    const [marcadorParada, marcadorOnibus] = screen.getAllByTestId("marker");
    const corCodificada = encodeURIComponent("#0f766e");

    expect(marcadorParada).toHaveAttribute("data-marker-color", "#0f766e");
    expect(marcadorOnibus).toHaveAttribute("data-marker-color", "#0f766e");
    expect(marcadorParada).toHaveAttribute(
      "data-icon-url",
      expect.stringContaining(corCodificada),
    );
    expect(marcadorOnibus).toHaveAttribute(
      "data-icon-url",
      expect.stringContaining(corCodificada),
    );
  });

  it("renderiza veiculos por linha com a cor da linha no popup", () => {
    render(
      <MapView
        linhasAtivas={[
          {
            id: "101",
            descricao: "Linha 101",
            cor: "#0f766e",
            linha: { cl: 101 },
            paradas: [],
            onibus: [
              {
                p: "BUS-1",
                py: -23.51,
                px: -46.61,
                ta: "2026-06-22T12:00:00Z",
              },
            ],
          },
          {
            id: "202",
            descricao: "Linha 202",
            cor: "#0369a1",
            linha: { cl: 202 },
            paradas: [],
            onibus: [
              {
                p: "BUS-2",
                py: -23.52,
                px: -46.62,
                ta: "2026-06-22T12:01:00Z",
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText(/Onibus BUS-1|Ônibus BUS-1/)).toBeInTheDocument();
    expect(screen.getByText(/Onibus BUS-2|Ônibus BUS-2/)).toBeInTheDocument();
    expect(screen.getByText("Linha 101")).toBeInTheDocument();
    expect(screen.getByText("Linha 202")).toBeInTheDocument();
    expect(screen.getByLabelText("Cor da linha Linha 101")).toHaveStyle({
      backgroundColor: "#0f766e",
    });
  });

  it("carrega previsao por linha em parada compartilhada", async () => {
    const user = userEvent.setup();
    buscarPrevisao.mockResolvedValueOnce({
      linhas: [
        {
          codigoLinha: 101,
          veiculos: [{ placa: "BUS-1", horaPrevista: "12:10", minutos: 10 }],
        },
      ],
    });

    render(
      <MapView
        linhasAtivas={[
          {
            id: "101",
            descricao: "Linha 101",
            cor: "#0f766e",
            linha: { cl: 101 },
            paradas: [
              { cp: 10, np: "Parada Compartilhada", py: -23.5, px: -46.6 },
            ],
            onibus: [],
          },
          {
            id: "202",
            descricao: "Linha 202",
            cor: "#0369a1",
            linha: { cl: 202 },
            paradas: [
              { cp: 10, np: "Parada Compartilhada", py: -23.5, px: -46.6 },
            ],
            onibus: [],
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Carregar previsao Linha 101" }),
    );

    await waitFor(() => {
      expect(buscarPrevisao).toHaveBeenCalledWith(10, 101);
    });
    expect(screen.getByText(/12:10/)).toBeInTheDocument();
    expect(screen.getByText(/10 min/)).toBeInTheDocument();
  });

  it("cacheia previsoes separadas por parada e linha", async () => {
    const user = userEvent.setup();
    buscarPrevisao
      .mockResolvedValueOnce({
        linhas: [
          {
            codigoLinha: 101,
            veiculos: [{ placa: "BUS-1", horaPrevista: "12:10" }],
          },
        ],
      })
      .mockResolvedValueOnce({
        linhas: [
          {
            codigoLinha: 202,
            veiculos: [{ placa: "BUS-2", horaPrevista: "12:20" }],
          },
        ],
      });

    render(
      <MapView
        linhasAtivas={[
          {
            id: "101",
            descricao: "Linha 101",
            cor: "#0f766e",
            linha: { cl: 101 },
            paradas: [
              { cp: 10, np: "Parada Compartilhada", py: -23.5, px: -46.6 },
            ],
            onibus: [],
          },
          {
            id: "202",
            descricao: "Linha 202",
            cor: "#0369a1",
            linha: { cl: 202 },
            paradas: [
              { cp: 10, np: "Parada Compartilhada", py: -23.5, px: -46.6 },
            ],
            onibus: [],
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Carregar previsao Linha 101" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Carregar previsao Linha 202" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Carregar previsao Linha 101" }),
    );

    await waitFor(() => {
      expect(buscarPrevisao).toHaveBeenCalledTimes(2);
    });
    expect(buscarPrevisao).toHaveBeenNthCalledWith(1, 10, 101);
    expect(buscarPrevisao).toHaveBeenNthCalledWith(2, 10, 202);
    expect(screen.getByText(/12:10/)).toBeInTheDocument();
    expect(screen.getByText(/12:20/)).toBeInTheDocument();
  });

  it("mostra vazio apenas para a linha sem previsao", async () => {
    const user = userEvent.setup();
    buscarPrevisao.mockResolvedValueOnce(null).mockResolvedValueOnce({
      linhas: [
        {
          codigoLinha: 202,
          veiculos: [{ placa: "BUS-2", horaPrevista: "12:20" }],
        },
      ],
    });

    render(
      <MapView
        linhasAtivas={[
          {
            id: "101",
            descricao: "Linha 101",
            cor: "#0f766e",
            linha: { cl: 101 },
            paradas: [
              { cp: 10, np: "Parada Compartilhada", py: -23.5, px: -46.6 },
            ],
            onibus: [],
          },
          {
            id: "202",
            descricao: "Linha 202",
            cor: "#0369a1",
            linha: { cl: 202 },
            paradas: [
              { cp: 10, np: "Parada Compartilhada", py: -23.5, px: -46.6 },
            ],
            onibus: [],
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Carregar previsao Linha 101" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Carregar previsao Linha 202" }),
    );

    expect(
      await screen.findByText("Sem previsão disponível"),
    ).toBeInTheDocument();
    expect(screen.getByText(/12:20/)).toBeInTheDocument();
  });
});
