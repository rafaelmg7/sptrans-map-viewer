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
});
