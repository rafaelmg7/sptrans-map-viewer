# SPTrans Map Viewer

Aplicação web para buscar linhas de ônibus de São Paulo, visualizar paradas no mapa e consultar previsão/posição de veículos usando a API Olho Vivo da SPTrans por meio de um backend próprio.

## Membros do Grupo

- Diogo Tuler Chaves
- Hector Soares
- João Marcos Tomaz
- Rafael Martins Gomes

## Sistema

O sistema possui:

- frontend em React com mapa Leaflet;
- backend em Node.js/Express para autenticar e consultar a SPTrans;
- normalização de respostas da SPTrans para formatos mais simples de usar na interface;
- visualização de até 5 linhas simultâneas com cores por linha;
- histórico de buscas recentes;
- atualização manual e autoatualização dos veículos;
- ação para limpar o painel e reiniciar a exploração;
- testes automatizados com cobertura e execução em CI.

A chave da SPTrans fica apenas no backend, em `backend/.env`, para não ser exposta no navegador.

## Tecnologias

- React, Vite e Leaflet
- Node.js e Express
- Axios
- Vitest
- Testing Library
- Supertest
- jsdom
- Coverage V8/Istanbul
- GitHub Actions
- Codecov

## Configuracao

Instale as dependencias do frontend e do backend:

```bash
npm install
npm --prefix backend install
```

Crie os arquivos de ambiente a partir dos exemplos versionados:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Preencha `backend/.env` com sua chave da SPTrans:

```env
SPTRANS_API_KEY=sua_chave_sptrans
FRONTEND_ORIGINS=http://localhost:5173
PORT=3000
```

`FRONTEND_ORIGINS` aceita uma lista separada por vírgulas. Em desenvolvimento, origens `localhost` e `127.0.0.1` são aceitas por padrão; em produção, configure explicitamente a origem pública do frontend.

O arquivo `.env` do frontend pode manter o valor padrão quando o backend estiver rodando em `http://localhost:3000`.

## Como Rodar

Em um terminal, rode o backend:

```bash
cd backend
npm start
```

Em outro terminal, rode o frontend:

```bash
npm run dev
```

A aplicação fica disponível em:

```text
http://localhost:5173
```

## Como Executar os Testes

Todos os testes:

```bash
npm run test:all
```

Todos os testes com cobertura:

```bash
npm run coverage:all
```

Relatórios HTML:

- `coverage/index.html`
- `backend/coverage/index.html`

## Cobertura Atual

Total atual: 94 testes automatizados.

O requisito da disciplina é cobertura maior ou igual a 80%. O projeto também configura thresholds mínimos no Vitest: 90% para statements, lines e functions, e 80% para branches. Os valores atuais podem ser regenerados com `npm run coverage:all`.

## Testes Implementados

| Arquivo | Quantidade | Tipo | O que verifica |
| --- | ---: | --- | --- |
| `src/App.spec.jsx` | 20 | Componente/comportamento | autenticação inicial, layout principal, busca de linhas, seleção múltipla, limite de linhas, erros de busca, carregamento do mapa, histórico, atualização manual, limpeza, remoção e autoatualização |
| `src/components/MapView.spec.jsx` | 13 | Componente/comportamento | renderização com Leaflet mockado, ícones coloridos, paradas agrupadas, clique em parada, previsão normalizada, previsão bruta, cache por linha, erro e estado vazio |
| `src/services/sptransAPI.spec.js` | 15 | Unidade/API pública | chamadas Axios, propagação de erros, retornos vazios seguros em payloads válidos e encoding de parâmetros especiais |
| `src/services/normalizarPrevisao.spec.js` | 13 | Unidade/normalização | formatos da SPTrans, payloads vazios, fallbacks, ordem dos veículos, tabela de prioridade de descrição e valores falsy |
| `backend/app.spec.js` | 33 | Unidade e integração | normalização do backend, rotas Express, autenticação, CORS, allowlist de proxy, ausência de token, cache, erros controlados, encoding, query params repetidos e casos de borda de tempo |

## Estratégias de Teste

- Testes de unidade por API pública: funções de serviço e normalizadores são testados pelo comportamento exportado.
- Testes de componente: telas React são testadas por interação observável, não por detalhes internos.
- Testes de integração: rotas Express são testadas via Supertest, simulando requisições HTTP.
- Testes orientados a mutação: há casos para capturar trocas comuns como `??` por `||`, remoção de encoding, mudança de ordem de fallback, remoção de cache, alteração de arredondamento de minutos e perda de valores falsy como `0`, `false` e string vazia.
- Testes de erro: falhas externas são simuladas para garantir respostas controladas e retornos seguros.
- Testes parametrizados: tabelas com `it.each` cobrem variações de descrição, parâmetros obrigatórios e limites de tempo.

## CI/CD e Codecov

O workflow fica em:

```text
.github/workflows/node.js.yml
```

Ele executa automaticamente em push e pull request:

- instalação de dependências;
- lint;
- build;
- testes com cobertura;
- upload dos relatórios para o Codecov.

O workflow roda em:

- Linux
- macOS
- Windows

Para habilitar o Codecov, crie o projeto em `https://codecov.io` e configure no GitHub o secret:

```text
CODECOV_TOKEN
```
