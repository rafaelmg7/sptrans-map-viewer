import { describe, expect, it } from "vitest";
import { normalizarPrevisoes } from "./normalizarPrevisao";

describe("normalizarPrevisoes", () => {
  it("normaliza o formato bruto da SPTrans com p.l", () => {
    const resultado = normalizarPrevisoes({
      p: {
        l: [
          {
            cl: 101,
            c: "8000-10",
            lt0: "Terminal A",
            lt1: "Terminal B",
            vs: [
              {
                p: "BUS-1",
                t: "12:10",
                a: true,
                py: -23.5,
                px: -46.6,
              },
            ],
          },
        ],
      },
    });

    expect(resultado).toEqual([
      {
        placa: "BUS-1",
        horario: "12:10",
        minutos: null,
        ativo: true,
        py: -23.5,
        px: -46.6,
        linha: 101,
        descricaoLinha: "Terminal A ⇄ Terminal B",
      },
    ]);
  });

  it("normaliza o formato normalizado do backend com linhas", () => {
    const resultado = normalizarPrevisoes({
      linhas: [
        {
          codigoLinha: 202,
          descricao: "Linha pronta",
          veiculos: [
            {
              placa: "BUS-2",
              horaPrevista: "13:20",
              minutos: 7,
              ativo: false,
              py: -23.6,
              px: -46.7,
            },
          ],
        },
      ],
    });

    expect(resultado).toEqual([
      {
        placa: "BUS-2",
        horario: "13:20",
        minutos: 7,
        ativo: false,
        py: -23.6,
        px: -46.7,
        linha: 202,
        descricaoLinha: "Linha pronta",
      },
    ]);
  });

  it("aceita payload com l e array direto", () => {
    expect(
      normalizarPrevisoes({
        l: [{ c: "9000-10", vs: [{ p: "BUS-3", t: "14:00" }] }],
      })
    ).toEqual([
      {
        placa: "BUS-3",
        horario: "14:00",
        minutos: null,
        ativo: null,
        py: null,
        px: null,
        linha: "9000-10",
        descricaoLinha: "9000-10",
      },
    ]);

    expect(
      normalizarPrevisoes([
        {
          codigoLinha: 303,
          veiculos: [{ placa: "BUS-4", horario: "15:00" }],
        },
      ])
    ).toEqual([
      {
        placa: "BUS-4",
        horario: "15:00",
        minutos: null,
        ativo: null,
        py: null,
        px: null,
        linha: 303,
        descricaoLinha: 303,
      },
    ]);
  });

  it("retorna vazio para payloads vazios, sem veiculos ou com veiculos invalidos", () => {
    expect(normalizarPrevisoes(null)).toEqual([]);
    expect(normalizarPrevisoes({})).toEqual([]);
    expect(normalizarPrevisoes({ p: { l: [{ cl: 1 }] } })).toEqual([]);
    expect(normalizarPrevisoes({ linhas: [{ veiculos: "indisponivel" }] })).toEqual(
      []
    );
  });

  it("aplica fallback para campos ausentes em veiculos", () => {
    expect(normalizarPrevisoes({ p: { l: [{ vs: [{}] }] } })).toEqual([
      {
        placa: null,
        horario: null,
        minutos: null,
        ativo: null,
        py: null,
        px: null,
        linha: null,
        descricaoLinha: "Linha",
      },
    ]);
  });

  it("preserva valores falsy validos para resistir a mutacoes de coalescencia", () => {
    const resultado = normalizarPrevisoes({
      linhas: [
        {
          codigoLinha: 0,
          descricao: "",
          veiculos: [
            {
              placa: "",
              horario: "",
              minutos: 0,
              ativo: false,
              py: 0,
              px: 0,
            },
          ],
        },
      ],
    });

    expect(resultado).toEqual([
      {
        placa: "",
        horario: "",
        minutos: 0,
        ativo: false,
        py: 0,
        px: 0,
        linha: 0,
        descricaoLinha: 0,
      },
    ]);
  });

  it.each([
    ["descricao explicita", { descricao: "Circular Centro" }, "Circular Centro"],
    ["terminais lt0 e lt1", { lt0: "Terminal A", lt1: "Terminal B" }, "Terminal A ⇄ Terminal B"],
    ["codigo c", { c: "8000-10" }, "8000-10"],
    ["codigo cl", { cl: 101 }, 101],
    ["codigoLinha", { codigoLinha: 202 }, 202],
    ["sem identificadores", {}, "Linha"],
  ])("aplica prioridade de descricao: %s", (_caso, linha, descricaoLinha) => {
    expect(normalizarPrevisoes([{ ...linha, veiculos: [{}] }])[0].descricaoLinha).toBe(
      descricaoLinha
    );
  });

  it("mantem a ordem dos veiculos ao achatar varias linhas", () => {
    const resultado = normalizarPrevisoes({
      linhas: [
        { codigoLinha: 1, veiculos: [{ placa: "A" }, { placa: "B" }] },
        { codigoLinha: 2, veiculos: [{ placa: "C" }] },
      ],
    });

    expect(resultado.map((veiculo) => `${veiculo.linha}:${veiculo.placa}`)).toEqual([
      "1:A",
      "1:B",
      "2:C",
    ]);
  });
});
