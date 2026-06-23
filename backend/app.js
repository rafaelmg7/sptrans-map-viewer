import express from "express";
import cors from "cors";

export const DEFAULT_API_BASE = "https://api.olhovivo.sptrans.com.br/v2.1";

const defaultLogger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
};

function getNowMs(now) {
  const value = typeof now === "function" ? now() : now;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    return Date.parse(value);
  }

  return Number(value);
}

function buildUrl(apiBase, subpath, query = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    params.append(key, value);
  });

  const queryString = params.toString();
  return `${apiBase}/${subpath}${queryString ? `?${queryString}` : ""}`;
}

function getLinhas(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.linhas)) {
    return payload.linhas;
  }

  if (Array.isArray(payload?.p?.l)) {
    return payload.p.l;
  }

  if (Array.isArray(payload?.l)) {
    return payload.l;
  }

  return [];
}

function getDescricaoLinha(linha) {
  if (linha?.descricao) {
    return linha.descricao;
  }

  if (linha?.lt0 && linha?.lt1) {
    return `${linha.lt0} ⇄ ${linha.lt1}`;
  }

  return linha?.c ?? linha?.cl ?? linha?.codigoLinha ?? "Linha";
}

function normalizeVeiculo(veiculo, nowMs) {
  const dataPrevista = veiculo?.ta ?? veiculo?.dataPrevista;
  const timestamp = dataPrevista ? Date.parse(dataPrevista) : NaN;
  const minutosCalculados = Number.isNaN(timestamp)
    ? null
    : Math.round((timestamp - nowMs) / 60000);

  return {
    placa: veiculo?.placa ?? veiculo?.p ?? null,
    horaPrevista: veiculo?.horaPrevista ?? veiculo?.horario ?? veiculo?.t ?? null,
    minutos: veiculo?.minutos ?? minutosCalculados,
    ativo: veiculo?.ativo ?? veiculo?.a ?? null,
    py: veiculo?.py ?? null,
    px: veiculo?.px ?? null,
  };
}

export function normalizePrevisao(payload, options = {}) {
  const nowMs = getNowMs(options.now ?? Date.now);
  const linhas = getLinhas(payload).map((linha) => {
    const veiculos = linha?.veiculos ?? linha?.vs ?? [];

    return {
      codigoLinha: linha?.codigoLinha ?? linha?.cl ?? linha?.c ?? null,
      descricao: getDescricaoLinha(linha),
      veiculos: Array.isArray(veiculos)
        ? veiculos.map((veiculo) => normalizeVeiculo(veiculo, nowMs))
        : [],
    };
  });

  return {
    parada: {
      codigoParada: payload?.parada?.codigoParada ?? payload?.p?.cp ?? options.codigoParada ?? null,
      nome: payload?.parada?.nome ?? payload?.p?.np ?? null,
    },
    linhas,
    atualizado: payload?.atualizado ?? payload?.hr ?? new Date(nowMs).toISOString(),
  };
}

export function createApp(options = {}) {
  const {
    client,
    token = process.env.SPTRANS_API_KEY,
    apiBase = DEFAULT_API_BASE,
    logger = defaultLogger,
    clock = Date.now,
  } = options;

  const app = express();
  app.use(cors());

  let autenticado = false;

  async function autenticar() {
    if (autenticado) {
      return;
    }

    if (!token) {
      throw new Error("SPTRANS_API_KEY ausente");
    }

    if (!client) {
      throw new Error("Client SPTrans nao configurado");
    }

    logger.info?.("Autenticando na SPTrans...");
    await client.post(
      `${apiBase}/Login/Autenticar?token=${encodeURIComponent(token)}`
    );
    autenticado = true;
    logger.info?.("Autenticacao concluida.");
  }

  app.post("/api/Login/Autenticar", async (req, res) => {
    try {
      await autenticar();
      res.json({ sucesso: true });
    } catch (err) {
      logger.error?.("Erro na autenticacao:", err.message);
      res.status(500).json({ error: "Falha ao autenticar na SPTrans" });
    }
  });

  app.get("/api/Previsao", async (req, res) => {
    const { codigoParada, codigoLinha } = req.query;

    if (!codigoParada || !codigoLinha) {
      return res.status(400).json({
        error: "Parametros codigoParada e codigoLinha sao obrigatorios.",
      });
    }

    try {
      await autenticar();

      const url = buildUrl(apiBase, "Previsao", {
        codigoParada,
        codigoLinha,
      });
      const { data } = await client.get(url);

      res.json(
        normalizePrevisao(data, {
          codigoParada,
          now: clock,
        })
      );
    } catch (err) {
      logger.error?.("Erro ao buscar previsao:", err.message);
      res
        .status(500)
        .json({ error: "Falha ao obter previsao", detalhe: err.message });
    }
  });

  app.get(/^\/api\/(.*)/, async (req, res) => {
    try {
      await autenticar();

      const subpath = req.params[0];
      const url = buildUrl(apiBase, subpath, req.query);
      const response = await client.get(url);

      res.json(response.data);
    } catch (err) {
      logger.error?.("Erro na requisicao:", err.message);
      res.status(500).json({ error: "Erro ao consultar SPTrans" });
    }
  });

  return app;
}
