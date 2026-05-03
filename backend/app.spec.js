import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, normalizePrevisao } from "./app.js";

const apiBase = "http://sptrans.test/v2.1";
const fixedNow = new Date("2026-06-22T12:00:00.000Z");

function makeClient() {
  return {
    post: vi.fn().mockResolvedValue({ data: true }),
    get: vi.fn(),
  };
}

function makeLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

function makeApp(options = {}) {
  const client = "client" in options ? options.client : makeClient();
  const logger = "logger" in options ? options.logger : makeLogger();
  const app = createApp({
    client,
    logger,
    apiBase,
    token: options.token ?? "token teste",
    clock: options.clock ?? (() => fixedNow),
  });

  return { app, client, logger };
}

describe("normalizePrevisao", () => {
  it("normaliza payload com p.l e calcula minutos com relogio fixo", () => {
    const resultado = normalizePrevisao(
      {
        hr: "12:00",
        p: {
          cp: 10,
          np: "Parada Paulista",
          l: [
            {
              cl: 101,
              lt0: "Terminal A",
              lt1: "Terminal B",
              vs: [
                {
                  p: "BUS-1",
                  t: "12:10",
                  ta: "2026-06-22T12:10:00.000Z",
                  a: true,
                  py: -23.5,
                  px: -46.6,
                },
              ],
            },
          ],
        },
      },
      { now: fixedNow }
    );

    expect(resultado).toEqual({
      parada: { codigoParada: 10, nome: "Parada Paulista" },
      linhas: [
        {
          codigoLinha: 101,
          descricao: "Terminal A ⇄ Terminal B",
          veiculos: [
            {
              placa: "BUS-1",
              horaPrevista: "12:10",
              minutos: 10,
              ativo: true,
              py: -23.5,
              px: -46.6,
            },
          ],
        },
      ],
      atualizado: "12:00",
    });
  });

  it("normaliza payload com l e datas invalidas", () => {
    const resultado = normalizePrevisao(
      {
        l: [{ c: "8000-10", vs: [{ p: "BUS-2", ta: "data invalida" }] }],
      },
      { codigoParada: "20", now: fixedNow.toISOString() }
    );

    expect(resultado.parada).toEqual({ codigoParada: "20", nome: null });
    expect(resultado.linhas[0]).toMatchObject({
      codigoLinha: "8000-10",
      descricao: "8000-10",
      veiculos: [{ placa: "BUS-2", minutos: null }],
    });
  });

  it("normaliza array direto e preserva payload ja normalizado", () => {
    const resultado = normalizePrevisao(
      [
        {
          codigoLinha: 202,
          descricao: "Linha pronta",
          veiculos: [
            {
              placa: "BUS-3",
              horaPrevista: "13:00",
              minutos: 5,
              ativo: false,
            },
          ],
        },
      ],
      { codigoParada: 30, now: 1782130200000 }
    );

    expect(resultado).toMatchObject({
      parada: { codigoParada: 30, nome: null },
      linhas: [
        {
          codigoLinha: 202,
          descricao: "Linha pronta",
          veiculos: [
            {
              placa: "BUS-3",
              horaPrevista: "13:00",
              minutos: 5,
              ativo: false,
            },
          ],
        },
      ],
    });
  });

  it("normaliza payload ja normalizado dentro de linhas", () => {
    const resultado = normalizePrevisao(
      {
        parada: { codigoParada: 40, nome: "Parada Backend" },
        atualizado: "2026-06-22T12:30:00.000Z",
        linhas: [
          {
            codigoLinha: 404,
            descricao: "Linha backend",
            veiculos: [{ placa: "BUS-4", horario: "12:40" }],
          },
        ],
      },
      { now: fixedNow }
    );

    expect(resultado).toEqual({
      parada: { codigoParada: 40, nome: "Parada Backend" },
      linhas: [
        {
          codigoLinha: 404,
          descricao: "Linha backend",
          veiculos: [
            {
              placa: "BUS-4",
              horaPrevista: "12:40",
              minutos: null,
              ativo: null,
              py: null,
              px: null,
            },
          ],
        },
      ],
      atualizado: "2026-06-22T12:30:00.000Z",
    });
  });

  it("aplica fallbacks para payload vazio, veiculos ausentes e campos ausentes", () => {
    expect(normalizePrevisao(null, { now: fixedNow })).toEqual({
      parada: { codigoParada: null, nome: null },
      linhas: [],
      atualizado: fixedNow.toISOString(),
    });

    expect(
      normalizePrevisao(
        { p: { l: [{ vs: "indisponivel" }, { vs: [{}] }] } },
        { now: fixedNow }
      ).linhas
    ).toEqual([
      {
        codigoLinha: null,
        descricao: "Linha",
        veiculos: [],
      },
      {
        codigoLinha: null,
        descricao: "Linha",
        veiculos: [
          {
            placa: null,
            horaPrevista: null,
            minutos: null,
            ativo: null,
            py: null,
            px: null,
          },
        ],
      },
    ]);
  });
});

describe("createApp", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /api/Login/Autenticar retorna sucesso", async () => {
    const { app, client } = makeApp();

    const response = await request(app).post("/api/Login/Autenticar");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sucesso: true });
    expect(client.post).toHaveBeenCalledWith(
      `${apiBase}/Login/Autenticar?token=token%20teste`
    );
  });

  it("usa logger padrao quando nenhum logger e injetado", async () => {
    const client = makeClient();
    const app = createApp({ client, apiBase, token: "token teste" });

    const response = await request(app).post("/api/Login/Autenticar");

    expect(response.status).toBe(200);
    expect(console.log).toHaveBeenCalledWith("Autenticando na SPTrans...");
    expect(console.log).toHaveBeenCalledWith("Autenticacao concluida.");
  });

  it("POST /api/Login/Autenticar trata falha de autenticacao com 500 controlado", async () => {
    const client = makeClient();
    client.post.mockRejectedValueOnce(new Error("credencial rejeitada"));
    const { app, logger } = makeApp({ client });

    const response = await request(app).post("/api/Login/Autenticar");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Falha ao autenticar na SPTrans" });
    expect(logger.error).toHaveBeenCalledWith(
      "Erro na autenticacao:",
      "credencial rejeitada"
    );
  });

  it("usa logger padrao em falhas quando nenhum logger e injetado", async () => {
    const client = makeClient();
    client.post.mockRejectedValueOnce(new Error("falha externa"));
    const app = createApp({ client, apiBase, token: "token teste" });

    const response = await request(app).post("/api/Login/Autenticar");

    expect(response.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith(
      "Erro na autenticacao:",
      "falha externa"
    );
  });

  it("retorna 500 controlado quando o token esta ausente em rota autenticada", async () => {
    const client = makeClient();
    const { app } = makeApp({ client, token: "" });

    const response = await request(app).post("/api/Login/Autenticar");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Falha ao autenticar na SPTrans" });
    expect(client.post).not.toHaveBeenCalled();
  });

  it("retorna 500 controlado quando o client nao foi configurado", async () => {
    const { app } = makeApp({ client: null });

    const response = await request(app).post("/api/Login/Autenticar");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Falha ao autenticar na SPTrans" });
  });

  it("GET /api/Previsao retorna 400 sem parametros obrigatorios e nao chama client externo", async () => {
    const { app, client } = makeApp();

    const response = await request(app).get("/api/Previsao?codigoParada=10");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Parametros codigoParada e codigoLinha sao obrigatorios.",
    });
    expect(client.post).not.toHaveBeenCalled();
    expect(client.get).not.toHaveBeenCalled();
  });

  it("GET /api/Previsao autentica, chama a URL esperada e retorna dados normalizados", async () => {
    const client = makeClient();
    client.get.mockResolvedValueOnce({
      data: {
        p: {
          cp: 10,
          np: "Parada Paulista",
          l: [
            {
              cl: 101,
              lt0: "Terminal A",
              lt1: "Terminal B",
              vs: [
                {
                  p: "BUS-1",
                  t: "12:15",
                  ta: "2026-06-22T12:15:00.000Z",
                },
              ],
            },
          ],
        },
      },
    });
    const { app } = makeApp({ client });

    const response = await request(app).get(
      "/api/Previsao?codigoParada=10&codigoLinha=101"
    );

    expect(response.status).toBe(200);
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledWith(
      `${apiBase}/Previsao?codigoParada=10&codigoLinha=101`
    );
    expect(response.body).toMatchObject({
      parada: { codigoParada: 10, nome: "Parada Paulista" },
      linhas: [
        {
          codigoLinha: 101,
          descricao: "Terminal A ⇄ Terminal B",
          veiculos: [{ placa: "BUS-1", horaPrevista: "12:15", minutos: 15 }],
        },
      ],
    });
  });

  it("GET /api/Previsao retorna 500 controlado em falha do client externo", async () => {
    const client = makeClient();
    client.get.mockRejectedValueOnce(new Error("previsao indisponivel"));
    const { app, logger } = makeApp({ client });

    const response = await request(app).get(
      "/api/Previsao?codigoParada=10&codigoLinha=101"
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Falha ao obter previsao",
      detalhe: "previsao indisponivel",
    });
    expect(logger.error).toHaveBeenCalledWith(
      "Erro ao buscar previsao:",
      "previsao indisponivel"
    );
  });

  it("proxy generico preserva path e query params e retorna dados externos", async () => {
    const client = makeClient();
    client.get.mockResolvedValueOnce({ data: [{ cl: 101 }] });
    const { app } = makeApp({ client });

    const response = await request(app).get(
      "/api/Linha/Buscar?termosBusca=8000&sentido=1"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ cl: 101 }]);
    expect(client.get).toHaveBeenCalledWith(
      `${apiBase}/Linha/Buscar?termosBusca=8000&sentido=1`
    );
  });

  it("proxy generico preserva query params repetidos", async () => {
    const client = makeClient();
    client.get.mockResolvedValueOnce({ data: { ok: true } });
    const { app } = makeApp({ client });

    const response = await request(app).get(
      "/api/Posicao?codigoLinha=101&codigoLinha=202"
    );

    expect(response.status).toBe(200);
    expect(client.get).toHaveBeenCalledWith(
      `${apiBase}/Posicao?codigoLinha=101&codigoLinha=202`
    );
  });

  it("falhas do client externo retornam respostas 500 controladas", async () => {
    const client = makeClient();
    client.get.mockRejectedValueOnce(new Error("SPTrans fora"));
    const { app, logger } = makeApp({ client });

    const response = await request(app).get("/api/Linha/Buscar?termosBusca=8000");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Erro ao consultar SPTrans" });
    expect(logger.error).toHaveBeenCalledWith(
      "Erro na requisicao:",
      "SPTrans fora"
    );
  });

  it("cache de autenticacao chama login externo apenas uma vez na mesma instancia", async () => {
    const client = makeClient();
    client.get
      .mockResolvedValueOnce({ data: [{ cl: 101 }] })
      .mockResolvedValueOnce({ data: { vs: [] } });
    const { app } = makeApp({ client });

    await request(app).get("/api/Linha/Buscar?termosBusca=8000");
    await request(app).get("/api/Posicao/Linha?codigoLinha=101");

    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledTimes(2);
  });
});
