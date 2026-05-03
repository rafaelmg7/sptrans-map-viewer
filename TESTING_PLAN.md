# Plano de Testes: Suíte Robusta de Unidade e Integração

## Resumo

- Fortalecer os testes do frontend e do backend antes de adicionar testes de mutação.
- Buscar pelo menos 90% de cobertura em statements, linhas e funções, e pelo menos 80% em branches.
- Limitar esta fase a testes unitários e de integração com mocks; sem testes de sistema/E2E e sem chamadas reais à API da SPTrans.
- Proteger dois comportamentos importantes: `MapView` deve consumir o formato normalizado de previsão retornado pelo backend, e a rota dedicada `/api/Previsao` do backend não deve ser sombreada pela rota genérica de proxy.

## Mudanças de Infraestrutura

- Adicionar dependências de desenvolvimento no frontend/root:
  - `@testing-library/react`
  - `@testing-library/user-event`
  - `@testing-library/jest-dom`
  - `jsdom`
  - `@vitest/coverage-v8`
- Adicionar dependências de desenvolvimento dentro de `backend`:
  - `vitest`
  - `supertest`
  - `@vitest/coverage-v8`
- Adicionar scripts no root:
  - `test`
  - `test:watch`
  - `coverage`
  - `test:backend`
  - `coverage:backend`
  - `test:all`
  - `coverage:all`
- Adicionar scripts no backend:
  - `test`
  - `test:watch`
  - `coverage`
- Configurar o Vitest:
  - Frontend usando `jsdom`.
  - Backend usando `node`.
  - Thresholds de cobertura em 90/80.
  - Exclusão de entrypoints, assets, CSS, arquivos de teste e arquivos gerados de build da cobertura.
- Atualizar o CI para instalar dependências do root e do backend, e então rodar lint, build, todos os testes e todas as verificações de cobertura.

## Mudanças no Código Para Testabilidade

- Frontend:
  - Manter `sptransAPI` como camada única de acesso à API.
  - Substituir o uso direto de `fetch` em `MapView` por `buscarPrevisao`.
  - Extrair um helper puro de normalização de previsões que aceite tanto payloads brutos da SPTrans quanto payloads normalizados pelo backend.
  - Ajustar `sptransAPI` para usar `VITE_API_URL`, com fallback para `http://localhost:3000/api`.
- Backend:
  - Separar a criação do app Express da chamada a `listen`, exportando uma factory testável.
  - Injetar `client`, `token`, `apiBase`, `logger` e relógio nos testes.
  - Registrar `/api/Previsao` antes da rota genérica de proxy.
  - Extrair a normalização de previsão para uma função pura.
  - Ler o token por `SPTRANS_API_KEY`; token ausente deve gerar uma resposta 500 controlada nas rotas que autenticam.

## Plano de Testes

### Testes Unitários do Frontend

- `sptransAPI`:
  - URLs exatas das requisições.
  - Retornos de sucesso.
  - Fallbacks em erro.
  - Comportamento de logs.
  - Fallback quando `vs` estiver ausente.
  - `buscarPrevisao` retorna `null` em falha.
- Helper de previsão:
  - Formato bruto da SPTrans com `p.l`.
  - Formato normalizado do backend com `linhas`.
  - Payloads vazios.
  - Veículos sem dados de previsão.
  - Campos ausentes.

### Testes de Integração e Componentes do Frontend

- `App`:
  - Autentica ao montar.
  - Busca linhas.
  - Popula o select de linhas.
  - Seleciona uma linha.
  - Carrega paradas e ônibus.
  - Agenda atualização periódica dos ônibus.
  - Limpa o intervalo ao desmontar.
- `MapView`:
  - Renderiza paradas e ônibus com Leaflet mockado.
  - Carrega previsões ao clicar em uma parada.
  - Exibe previsões.
  - Exibe estados vazios/de erro quando não houver previsão disponível.

### Testes Unitários do Backend

- Normalização de previsão:
  - Payload com `p.l`.
  - Payload com `l`.
  - Payload como array direto.
  - Datas válidas e inválidas dos veículos.
  - Fallbacks de descrição.
  - Cálculo de minutos com relógio fixo.

### Testes de Integração do Backend com Supertest

- `POST /api/Login/Autenticar` retorna sucesso.
- `POST /api/Login/Autenticar` trata falha de autenticação com 500 controlado.
- `GET /api/Previsao` retorna 400 quando parâmetros obrigatórios estão ausentes e não chama o client externo.
- `GET /api/Previsao` autentica, chama a URL esperada da SPTrans e retorna dados normalizados.
- Proxy genérico preserva path e query params e retorna os dados externos.
- Falhas do client externo retornam respostas 500 controladas.
- Cache de autenticação chama o endpoint externo de login apenas uma vez em múltiplas requisições na mesma instância do app.

## Critérios de Aceite

A implementação estará completa quando estes comandos passarem:

```bash
npm run lint
npm run build
npm run test:all
npm run coverage:all
```

A cobertura deve atingir:

- Frontend: 90% em statements, linhas e funções; 80% em branches.
- Backend: 90% em statements, linhas e funções; 80% em branches.

## Premissas

- O backend permanece como pacote isolado; o repositório não será convertido para npm workspaces nesta fase.
- Testes de sistema/E2E ficam fora do escopo desta fase e podem ser adicionados depois como smoke tests.
- Testes de mutação devem ser adicionados somente depois que esta suíte estiver verde e com cobertura alta.
