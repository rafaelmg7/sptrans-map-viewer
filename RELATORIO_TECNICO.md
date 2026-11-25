# Relatório técnico do repositório `sptrans-map-viewer`

## 1. Visão geral

O repositório implementa uma aplicação web para consulta e visualização operacional de linhas de ônibus de São Paulo usando dados da API Olho Vivo da SPTrans. A solução é dividida em dois processos:

- um frontend React/Vite que roda no navegador, renderiza controles de busca e um mapa Leaflet;
- um backend Node.js/Express que atua como proxy autenticado para a SPTrans, protegendo o token de API e normalizando parte das respostas.

O fluxo principal é:

1. O usuário pesquisa uma linha por número, nome, terminal ou outro termo.
2. O frontend chama o backend em `/api/Linha/Buscar`.
3. O usuário seleciona até cinco linhas/sentidos.
4. Para cada linha selecionada, o frontend busca paradas e posições de veículos.
5. O mapa agrupa paradas compartilhadas, renderiza veículos por cor de linha e permite consultar previsões por parada/linha.
6. O backend autentica na SPTrans quando necessário, reaproveita a sessão na mesma instância e restringe os endpoints que podem ser chamados pelo proxy.

A aplicação não expõe a chave SPTrans no bundle do navegador. A chave fica em `backend/.env`, lida pelo backend no script de produção/desenvolvimento.

## 2. Estrutura do repositório

```text
.
├── .env.example
├── .github/workflows/node.js.yml
├── .gitignore
├── README.md
├── RELATORIO_TECNICO.md
├── backend/
│   ├── .env.example
│   ├── app.js
│   ├── app.spec.js
│   ├── package-lock.json
│   ├── package.json
│   ├── server.js
│   └── vitest.config.js
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── public/vite.svg
├── reports/mutation/mutation.html
├── src/
│   ├── App.css
│   ├── App.jsx
│   ├── App.spec.jsx
│   ├── assets/
│   │   ├── bus-stop.svg
│   │   └── bus3.svg
│   ├── components/
│   │   ├── MapView.jsx
│   │   └── MapView.spec.jsx
│   ├── config.js
│   ├── index.css
│   ├── linhasAtivas.js
│   ├── main.jsx
│   ├── services/
│   │   ├── normalizarPrevisao.js
│   │   ├── normalizarPrevisao.spec.js
│   │   ├── sptransAPI.js
│   │   └── sptransAPI.spec.js
│   └── test/setup.js
├── stryker.config.json
└── vite.config.js
```

Não há `TESTING_PLAN.md` no estado atual rastreado pelo Git. O último commit local observado removeu esse arquivo como arquivo obsoleto.

## 3. Tecnologias e versões

### 3.1 Ambiente JavaScript

O projeto usa módulos ES nativos em frontend e backend por meio de `"type": "module"` nos dois `package.json`.

O workflow de CI usa Node.js `22.x` em Linux, macOS e Windows. Na análise local, o ambiente disponível era Node `v20.9.0` e npm `10.1.0`, mas a referência operacional versionada do projeto é o CI em Node 22.x.

Os lockfiles usam `lockfileVersion: 3`, formato atual do npm para instalações reproduzíveis com `npm ci`.

### 3.2 Frontend: dependências principais resolvidas

| Pacote | Versão declarada | Versão resolvida no lockfile | Papel |
| --- | --- | --- | --- |
| `react` | `^19.1.1` | `19.2.0` | Biblioteca de UI e estado declarativo |
| `react-dom` | `^19.1.1` | `19.2.0` | Montagem do React no DOM |
| `vite` | `^7.1.7` | `7.1.12` | Dev server, build e integração com Vitest |
| `@vitejs/plugin-react` | `^5.0.4` | `5.1.0` | Plugin Vite para React |
| `leaflet` | `^1.9.4` | `1.9.4` | Motor de mapa e marcadores |
| `react-leaflet` | `^5.0.0` | `5.0.0` | Bindings React para Leaflet |
| `axios` | `^1.13.2` | `1.13.2` | Cliente HTTP no frontend |
| `vitest` | `^4.1.9` | `4.1.9` | Test runner |
| `jsdom` | `^27.2.0` | `27.4.0` | Ambiente DOM para testes React |
| `@testing-library/react` | `^16.3.0` | `16.3.2` | Testes de componentes por comportamento |
| `@testing-library/jest-dom` | `^6.9.1` | `6.9.1` | Matchers DOM adicionais |
| `@testing-library/user-event` | `^14.6.1` | `14.6.1` | Simulação de interação de usuário |
| `eslint` | `^9.36.0` | `9.39.1` | Linting |
| `@eslint/js` | `^9.36.0` | `9.39.1` | Regras JavaScript recomendadas |
| `eslint-plugin-react-hooks` | `^5.2.0` | `5.2.0` | Regras de hooks |
| `eslint-plugin-react-refresh` | `^0.4.22` | `0.4.24` | Compatibilidade com React Refresh |
| `@vitest/coverage-v8` | `^4.1.9` | `4.1.9` | Cobertura via V8 |
| `@stryker-mutator/core` | `^9.6.1` | `9.6.1` | Testes de mutação |
| `@stryker-mutator/vitest-runner` | `^9.6.1` | `9.6.1` | Runner Stryker para Vitest |

### 3.3 Backend: dependências principais resolvidas

| Pacote | Versão declarada | Versão resolvida no lockfile | Papel |
| --- | --- | --- | --- |
| `express` | `^5.1.0` | `5.1.0` | Servidor HTTP e roteamento |
| `cors` | `^2.8.5` | `2.8.5` | Cabeçalhos CORS |
| `axios` | `^1.13.2` | `1.13.2` | Cliente HTTP para SPTrans |
| `axios-cookiejar-support` | `^6.0.4` | `6.0.4` | Integração Axios com jar de cookies |
| `tough-cookie` | `^6.0.0` | `6.0.0` | Armazenamento de cookies da sessão SPTrans |
| `vitest` | `^4.1.9` | `4.1.9` | Test runner do backend |
| `supertest` | `^7.1.4` | `7.2.2` | Testes HTTP de rotas Express |
| `@vitest/coverage-v8` | `^4.1.9` | `4.1.9` | Cobertura via V8 |

## 4. Scripts e comandos

### 4.1 Frontend/root `package.json`

| Script | Comando | Função |
| --- | --- | --- |
| `dev` | `vite` | Sobe o dev server do frontend |
| `build` | `vite build` | Gera build estático |
| `preview` | `vite preview` | Serve o build localmente |
| `lint` | `eslint .` | Roda ESLint no repositório |
| `test` | `vitest run` | Executa testes do frontend uma vez |
| `test:watch` | `vitest` | Executa testes em modo watch |
| `coverage` | `vitest run --coverage` | Executa testes do frontend com cobertura |
| `test:backend` | `npm --prefix backend run test` | Delegação para testes do backend |
| `coverage:backend` | `npm --prefix backend run coverage` | Delegação para cobertura do backend |
| `test:all` | `npm run test && npm run test:backend` | Testa frontend e backend |
| `coverage:all` | `npm run coverage && npm run coverage:backend` | Cobertura completa |
| `test:mutation` | `stryker run` | Executa testes de mutação |

### 4.2 Backend `backend/package.json`

| Script | Comando | Função |
| --- | --- | --- |
| `start` | `node --env-file=.env server.js` | Sobe o backend lendo variáveis de `.env` |
| `test` | `vitest run` | Executa testes do backend |
| `test:watch` | `vitest` | Modo watch |
| `coverage` | `vitest run --coverage` | Cobertura do backend |

## 5. Configuração e variáveis de ambiente

### 5.1 Frontend

`.env.example` contém:

```env
VITE_API_URL=http://localhost:3000/api
```

`src/services/sptransAPI.js` usa `import.meta.env.VITE_API_URL` como base da API. Se a variável não existir, o fallback é:

```text
http://localhost:3000/api
```

Como o prefixo é `VITE_`, essa variável pode ser exposta no bundle do navegador. Ela não contém segredo, apenas a URL pública do backend.

### 5.2 Backend

`backend/.env.example` contém:

```env
SPTRANS_API_KEY=sua_chave_sptrans
PORT=3000
```

O backend também suporta, pelo código e README, `FRONTEND_ORIGINS` ou `FRONTEND_ORIGIN` para restringir origens permitidas em produção. O exemplo versionado do backend é minimalista e não inclui `FRONTEND_ORIGINS`, mas `backend/app.js` lê essas variáveis quando presentes.

Variáveis relevantes:

- `SPTRANS_API_KEY`: token usado na rota de autenticação da SPTrans.
- `PORT`: porta do servidor Express, com fallback para `3000`.
- `FRONTEND_ORIGINS`: lista de origens permitidas separada por vírgula.
- `FRONTEND_ORIGIN`: alternativa singular mantida por compatibilidade.
- `NODE_ENV`: quando diferente de `production`, o backend permite origens localhost/127.0.0.1 com porta.

## 6. Arquitetura em tempo de execução

### 6.1 Fronteira navegador/backend

O navegador não chama diretamente a SPTrans. Ele chama URLs relativas ao backend configurado:

- `POST /api/Login/Autenticar`
- `GET /api/Linha/Buscar?termosBusca=...`
- `GET /api/Parada/BuscarParadasPorLinha?codigoLinha=...`
- `GET /api/Posicao/Linha?codigoLinha=...`
- `GET /api/Previsao?codigoParada=...&codigoLinha=...`

O backend então chama `https://api.olhovivo.sptrans.com.br/v2.1`, preservando a sessão autenticada por cookie.

### 6.2 Contratos de dados usados

Campos SPTrans usados para linhas:

- `cl`: código único da linha/sentido usado como identificador interno.
- `lt`: letreiro base da linha.
- `tl`: complemento do letreiro.
- `sl`: sentido, interpretado como `1` para ida e `2` para volta.
- `lc`: circularidade.
- `tp` e `ts`: terminais/pontas da linha.

Campos usados para paradas:

- `cp`: código da parada.
- `np`: nome da parada.
- `py`: latitude.
- `px`: longitude.

Campos usados para veículos:

- `p`: prefixo/placa operacional do ônibus no payload bruto.
- `py`: latitude.
- `px`: longitude.
- `ta`: timestamp de atualização.
- `vs`: lista de veículos em respostas de posição/previsão.

Campos de previsão normalizada:

- `parada.codigoParada`
- `parada.nome`
- `linhas[].codigoLinha`
- `linhas[].descricao`
- `linhas[].veiculos[].placa`
- `linhas[].veiculos[].horaPrevista`
- `linhas[].veiculos[].minutos`
- `linhas[].veiculos[].ativo`
- `linhas[].veiculos[].py`
- `linhas[].veiculos[].px`
- `atualizado`

## 7. Frontend em detalhe

### 7.1 Entrada HTML: `index.html`

O arquivo HTML é o shell padrão do Vite:

- define `charset=UTF-8`;
- usa viewport responsivo;
- carrega o favicon padrão `/vite.svg`;
- cria `<div id="root"></div>`;
- importa `/src/main.jsx` como módulo.

O `lang` está como `en`, embora a interface seja majoritariamente em português. Tecnicamente isso não impede a execução, mas é um detalhe de acessibilidade/localização a revisar se o projeto for endurecido para produção.

### 7.2 Bootstrap React: `src/main.jsx`

`main.jsx` monta a aplicação com:

- `createRoot(document.getElementById("root"))`;
- `<StrictMode>`;
- import global de `src/index.css`;
- import do CSS do Leaflet: `leaflet/dist/leaflet.css`;
- renderização do componente `App`.

A escolha por `StrictMode` ajuda a detectar efeitos colaterais incorretos durante desenvolvimento. Isso é relevante porque a aplicação usa `useEffect`, timers e chamadas assíncronas.

### 7.3 Configuração global: `src/config.js`

Exporta:

```js
export const AUTO_UPDATE_INTERVAL_MS = 5000;
```

Esse valor controla o intervalo de autoatualização das linhas ativas. A UI mostra esse mesmo contrato para o usuário como "Autoatualizar a cada 5s".

### 7.4 Estado e orquestração: `src/App.jsx`

`App.jsx` é o coordenador principal do frontend. Ele não renderiza diretamente marcadores Leaflet; ele organiza busca, seleção, carregamento e status das linhas, e passa `linhasAtivas` para `MapView`.

Estados principais:

| Estado/ref | Função |
| --- | --- |
| `termo` | Texto digitado na busca |
| `linhas` | Resultado de `buscarLinhas` |
| `codigosSelecionados` | Valores selecionados no `<select multiple>` |
| `linhasAtivas` | Linhas adicionadas ao mapa, com cor, paradas, veículos e status |
| `buscandoLinhas` | Estado de loading da busca |
| `historicoBuscas` | Últimos 5 termos buscados, sem duplicar |
| `autoAtualizar` | Liga/desliga timer de atualização |
| `buscaRealizada` | Diferencia estado inicial de busca vazia |
| `erroBusca` | Mensagem de erro da busca de linhas |
| `mensagemSelecao` | Avisos de seleção, especialmente limite de linhas |
| `intervalRef` | Guarda o `setInterval` ativo |
| `linhasAtivasRef` | Mantém a versão mais recente de `linhasAtivas` para callbacks de timer |

#### Formatação de linhas

As funções auxiliares `formatarCodigoLinha`, `formatarSentidoLinha`, `formatarTrajetoLinha` e `formatarLinhaEncontrada` transformam o payload da SPTrans em descrições legíveis:

- se `lt` já contém hífen ou não há `tl`, usa `lt` diretamente;
- caso contrário monta `lt-tl`;
- `lc === true` vira `circular`;
- `sl === 1` vira `ida`;
- `sl === 2` vira `volta`;
- outros sentidos viram `sentido X`;
- `tp` e `ts` são montados como origem/destino de acordo com o sentido;
- o `cl` é incluído na descrição para diferenciar linhas com mesmo letreiro e sentidos diferentes.

Essa decisão evita ambiguidade entre linhas como `8000-10` ida e volta, que podem compartilhar letreiro mas ter códigos `cl` distintos.

#### Busca de linhas

`executarBusca`:

- remove espaços das pontas do termo;
- se o termo fica vazio, limpa resultados, seleção, linhas ativas e timers;
- marca loading;
- chama `buscarLinhas`;
- atualiza `linhas`;
- marca `buscaRealizada`;
- registra histórico de até 5 termos;
- em erro, mostra mensagem controlada.

Uma nova busca não apaga linhas já ativas no mapa, exceto quando o termo é explicitamente esvaziado/limpo. Isso permite pesquisar outra linha e adicioná-la ao conjunto atual.

#### Adição de linhas ao mapa

`handleAdicionarLinhasAoMapa`:

1. Lê códigos ativos.
2. Chama `calcularCodigosParaAdicionar`.
3. Mostra `MENSAGEM_LIMITE_LINHAS` se o usuário excedeu o limite.
4. Monta uma `Map` de linhas por `cl`.
5. Cria objetos `linhaAtiva` com `montarLinhaAtivaInicial`.
6. Atribui cores com `obterCorDisponivel`.
7. Sincroniza estado e ref.
8. Busca paradas e veículos das novas linhas.
9. Configura autoatualização.

As novas linhas são carregadas com `Promise.all` por linha:

- `buscarParadasPorLinha(linha.cl)`;
- `buscarPosicaoDosOnibus(linha.cl)`.

Em caso de falha, a linha recebe `erro: "Erro ao atualizar linha"` e mantém dados anteriores. Essa preservação é importante para atualizações manuais ou automáticas: uma falha temporária não apaga marcadores que já estavam visíveis.

#### Remoção e limpeza

`removerLinhaAtiva` remove uma linha pelo `id` (`String(cl)`) e reconfigura o timer. Se a última linha é removida, o intervalo é limpo.

`limparPainel`:

- limpa timer;
- zera termo, resultados e seleção;
- remove todas as linhas ativas;
- limpa mensagens;
- volta ao estado inicial.

#### Atualização automática

A autoatualização usa `setInterval` com `AUTO_UPDATE_INTERVAL_MS`. A ref `linhasAtivasRef` evita o problema clássico de closure obsoleta em timers React: o callback do intervalo sempre lê a lista atual de linhas.

Há também atualização manual pelo botão "Atualizar agora", que chama `atualizarTodasLinhasAtivas`.

#### Métricas

`App` mostra métricas agregadas:

- quantidade de linhas ativas;
- quantidade de paradas únicas, agrupadas por `cp`;
- quantidade total de veículos;
- última atualização mais recente entre as linhas.

### 7.5 Regras de linhas ativas: `src/linhasAtivas.js`

Este módulo extrai regras de domínio que seriam fáceis de duplicar dentro do componente:

- paleta fixa de cinco cores para linhas;
- cor especial para parada compartilhada;
- limite máximo de cinco linhas ativas;
- cálculo de códigos novos a adicionar;
- criação do objeto inicial de linha ativa;
- contagem de paradas únicas;
- soma de veículos;
- detecção de loading.

Constantes:

```js
export const PALETA_CORES_LINHAS = [
  "#0f766e",
  "#0369a1",
  "#b45309",
  "#b91c1c",
  "#4338ca",
];
export const COR_PARADA_COMPARTILHADA = "#111827";
export const MAX_ACTIVE_LINES = 5;
```

Decisões importantes:

- o limite de cinco linhas corresponde à quantidade de cores disponíveis;
- códigos duplicados são removidos antes de adicionar;
- linhas já ativas não são adicionadas novamente;
- cores liberadas por remoção podem ser reutilizadas;
- paradas são agrupadas por `cp`, não por coordenada ou nome.

### 7.6 Cliente HTTP do frontend: `src/services/sptransAPI.js`

Cria uma instância Axios com `baseURL` configurável:

```js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
```

Funções exportadas:

- `autenticarSPTrans()`: chama `POST /Login/Autenticar`; registra erro, mas não propaga exceção.
- `buscarLinhas(termo)`: chama `GET /Linha/Buscar` com `termosBusca`.
- `buscarParadasPorLinha(codigoLinha)`: chama `GET /Parada/BuscarParadasPorLinha`.
- `buscarPosicaoDosOnibus(codigoLinha)`: chama `GET /Posicao/Linha` e retorna `resp.data?.vs || []`.
- `buscarPrevisao(codigoParada, codigoLinha)`: chama `GET /Previsao`.

Todas as queries são montadas com `URLSearchParams`. Essa decisão evita concatenação manual de query string e garante encoding correto de espaços, barras e acentos.

### 7.7 Normalização de previsão no frontend: `src/services/normalizarPrevisao.js`

Apesar do backend já normalizar `/api/Previsao`, o frontend mantém um normalizador próprio. Isso deixa `MapView` resiliente a payloads:

- já normalizados pelo backend (`payload.linhas`);
- brutos da SPTrans (`payload.p.l`);
- com lista em `payload.l`;
- arrays diretos.

`normalizarPrevisoes(payload)` retorna uma lista achatada de veículos, não uma árvore por parada/linha. Cada item contém:

- `placa`;
- `horario`;
- `minutos`;
- `ativo`;
- `py`;
- `px`;
- `linha`;
- `descricaoLinha`.

A função usa `??` para preservar valores falsy válidos, como `0`, `false` e string vazia em campos onde isso é esperado. Os testes protegem especificamente contra mutações que trocariam `??` por `||`.

### 7.8 Mapa e marcadores: `src/components/MapView.jsx`

`MapView` é o componente de visualização geográfica. Ele usa:

- `MapContainer`, `TileLayer`, `Marker` e `Popup` de `react-leaflet`;
- `L.Icon` do Leaflet;
- tiles do OpenStreetMap: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`;
- centro inicial em São Paulo: `[-23.55052, -46.633308]`;
- zoom inicial `12`.

#### Compatibilidade de props

O componente aceita dois modos:

1. modo novo, com `linhasAtivas`;
2. modo legado/testável, com `paradas`, `onibus` e `codigoLinha`.

Quando `linhasAtivas.length > 0`, ele ignora `paradas/onibus` diretos e extrai tudo das linhas ativas. Quando não há linhas ativas, ele usa os arrays diretos.

#### Ícones

Os ícones de ônibus e parada são SVGs inline gerados dinamicamente, convertidos para data URLs:

- ônibus: círculo colorido com símbolo de ônibus;
- parada: pin colorido com símbolo de ônibus;
- parada compartilhada: pin maior, classe `shared-stop-marker` e cor `COR_PARADA_COMPARTILHADA`.

Há cache de ícones em `iconesPorChave`, uma `Map` indexada por tipo/cor. Isso evita recriar `L.Icon` para a mesma cor.

`normalizarCor` aceita apenas cores hex válidas. Se a cor é inválida ou não string, aplica fallback:

- parada: `#0369a1`;
- ônibus: `#b91c1c`.

Os arquivos `src/assets/bus3.svg` e `src/assets/bus-stop.svg` existem no repositório, mas o mapa atual não os importa. A implementação atual prefere SVG inline para poder colorir os marcadores por linha.

#### Agrupamento de paradas

`agruparParadas`:

- ignora paradas sem coordenadas numéricas finitas;
- ignora paradas sem `cp`;
- agrupa por `String(cp)`;
- mescla linhas atendidas evitando duplicar a mesma linha;
- calcula `quantidadeLinhas`.

Paradas atendidas por mais de uma linha usam o ícone especial de parada compartilhada e exibem a lista de linhas no popup.

#### Filtro de veículos

Veículos sem `py` e `px` numéricos são ignorados. Isso evita marcadores inválidos no Leaflet.

#### Previsão por parada e linha

`MapView` mantém estado local:

```js
const [previsoes, setPrevisoes] = useState({});
```

A chave de cache é:

```text
codigoParada:codigoLinha
```

Para paradas compartilhadas, o popup mostra um botão por linha. Cada botão busca previsão apenas para aquela combinação parada/linha. Se a previsão já está no estado, a API não é chamada novamente.

Estados de previsão renderizados:

- carregando: `Carregando previsão...`;
- erro: `Erro ao carregar previsão`;
- vazio: `Sem previsão disponível`;
- sucesso: linha, horário e minutos.

Se não há linha associada a uma parada, o componente não chama a API e marca a previsão como vazia. Essa decisão evita requisições incompletas para `/api/Previsao`, que exige `codigoParada` e `codigoLinha`.

### 7.9 Estilos globais: `src/index.css`

Define a base visual:

- fonte `Inter` com fallbacks do sistema;
- `color: #0f172a`;
- fundo `#eef7f1`;
- `box-sizing: border-box`;
- suavização de fontes;
- `body` com `min-width: 320px` e `min-height: 100vh`.

### 7.10 Estilos da aplicação: `src/App.css`

O CSS organiza a interface em:

- `app-shell`: área de página com fundo em gradiente;
- `app-frame`: largura máxima de `1180px`;
- `hero-panel`: título e métricas;
- `control-panel`: busca, seleção, histórico, botões e linhas ativas;
- `map-panel`: container visual do mapa;
- `map-toolbar`: resumo flutuante sobre o mapa.

Há responsividade em `@media (max-width: 820px)`:

- hero, busca, ação e ferramentas viram uma coluna;
- botões ocupam largura total;
- histórico quebra em coluna;
- mapa reduz altura mínima.

Os estilos favorecem uma interface operacional: controles claros, botões com estados, mensagens de erro/limite e painel de mapa grande.

## 8. Backend em detalhe

### 8.1 Ponto de entrada: `backend/server.js`

`server.js` exporta:

- `createApp`;
- `normalizePrevisao`;
- `createDefaultClient`.

`createDefaultClient` cria:

```js
const jar = new CookieJar();
return wrapper(axios.create({ jar, withCredentials: true }));
```

Essa decisão é central para a SPTrans: a autenticação do Olho Vivo usa sessão/cookies. O backend mantém um jar de cookies no cliente Axios, preservando a sessão entre login e consultas.

O servidor só chama `listen` quando executado diretamente. Isso é feito comparando `import.meta.url` com `pathToFileURL(process.argv[1]).href`. Esse padrão permite importar o módulo em testes sem subir porta.

### 8.2 Aplicação Express: `backend/app.js`

`app.js` contém a maior parte do backend.

Constantes:

```js
export const DEFAULT_API_BASE = "https://api.olhovivo.sptrans.com.br/v2.1";
export const DEFAULT_ALLOWED_PROXY_ENDPOINTS = [
  "Linha/Buscar",
  "Parada/BuscarParadasPorLinha",
  "Posicao/Linha",
];
```

`Previsao` não está na allowlist genérica porque tem rota própria com validação e normalização.

#### Injeção de dependências

`createApp(options = {})` aceita:

- `client`;
- `token`;
- `apiBase`;
- `logger`;
- `clock`;
- `allowedOrigins`;
- `allowedProxyEndpoints`;
- `allowLocalhostDev`.

Essa arquitetura facilita testes: `backend/app.spec.js` injeta cliente falso, logger falso, relógio fixo e base de API fake.

#### CORS e bloqueio de origem

Antes do middleware `cors`, há um middleware próprio que lê `Origin` e bloqueia origem não permitida com:

```json
{ "error": "Origem nao permitida" }
```

O bloqueio acontece antes de autenticar ou chamar a SPTrans. Isso reduz superfície de abuso.

Regras:

- requisições sem `Origin` são aceitas;
- origens listadas em `FRONTEND_ORIGINS`/`FRONTEND_ORIGIN` são aceitas;
- em desenvolvimento, `localhost` e `127.0.0.1` com porta são aceitos;
- em produção, localhost automático é desligado, salvo configuração explícita.

Depois, o middleware `cors` define o cabeçalho `Access-Control-Allow-Origin` quando a origem é permitida.

#### Autenticação SPTrans

Dentro de `createApp`, há um booleano privado:

```js
let autenticado = false;
```

`autenticar()`:

- retorna imediatamente se `autenticado` já for `true`;
- falha se não houver token;
- falha se não houver client;
- chama `POST {apiBase}/Login/Autenticar?token={token}`;
- usa `encodeURIComponent(token)`;
- marca `autenticado = true`.

O cache de autenticação é por instância da aplicação Express. Reiniciar o processo limpa o cache.

#### Montagem segura de URL

`buildUrl(apiBase, subpath, query)` usa `URLSearchParams`, incluindo suporte a arrays:

- valores `undefined` e `null` são ignorados;
- arrays geram query params repetidos;
- espaços, acentos e barras são codificados corretamente.

Essa função é usada tanto pela rota especial de previsão quanto pelo proxy genérico.

### 8.3 Normalização de previsão no backend

`normalizePrevisao(payload, options = {})` transforma diferentes formatos em um contrato único.

Formatos aceitos:

- payload bruto com `p.l`;
- payload com `l`;
- array direto;
- payload já normalizado com `linhas`;
- payload nulo/vazio.

`getNowMs` aceita relógio como:

- função;
- `Date`;
- string parseável;
- número.

Para cada veículo, `normalizeVeiculo` calcula `minutos` quando não há valor explícito:

```js
Math.round((timestamp - nowMs) / 60000)
```

Se a data prevista é inválida, `minutos` vira `null`.

Campos de veículo preservam valores falsy válidos com `??`:

- `placa`;
- `horaPrevista`;
- `minutos`;
- `ativo`;
- `py`;
- `px`.

`descricao` da linha segue prioridade:

1. `linha.descricao`, se truthy;
2. `lt0 ⇄ lt1`, se ambos existirem;
3. `c`;
4. `cl`;
5. `codigoLinha`;
6. `"Linha"`.

Um detalhe técnico: string vazia em `descricao` não é tratada como descrição válida; nesses casos o código cai para `c`, `cl` ou `codigoLinha`. Os testes cobrem esse comportamento.

### 8.4 Rotas HTTP

#### `POST /api/Login/Autenticar`

Força autenticação com a SPTrans.

Resposta de sucesso:

```json
{ "sucesso": true }
```

Erro controlado:

```json
{ "error": "Falha ao autenticar na SPTrans" }
```

#### `GET /api/Previsao`

Exige:

- `codigoParada`;
- `codigoLinha`.

Se faltar qualquer parâmetro, retorna `400` e não chama o client externo.

Se válido:

1. autentica;
2. monta URL `/Previsao`;
3. chama SPTrans;
4. normaliza resposta;
5. retorna JSON normalizado.

Em falha externa, retorna:

```json
{
  "error": "Falha ao obter previsao",
  "detalhe": "mensagem original"
}
```

#### Proxy genérico `GET /^\/api\/(.*)/`

Aceita apenas subpaths presentes em `allowedProxyEndpoints`:

- `Linha/Buscar`;
- `Parada/BuscarParadasPorLinha`;
- `Posicao/Linha`.

Se o endpoint não estiver permitido:

```json
{ "error": "Endpoint nao permitido" }
```

com status `404`, sem autenticar e sem chamar a SPTrans.

Para endpoints permitidos:

1. autentica;
2. monta URL com query;
3. chama SPTrans;
4. retorna `response.data` sem normalizar.

## 9. Testes e qualidade

### 9.1 Vitest frontend

`vite.config.js` configura:

- ambiente `jsdom`;
- inclusão de `src/**/*.{spec,test}.{js,jsx}`;
- setup em `src/test/setup.js`;
- cobertura V8;
- reporters `text`, `html`, `lcov`;
- thresholds:
  - statements: `90`;
  - lines: `90`;
  - functions: `90`;
  - branches: `80`;
- exclusões de cobertura para build, specs, setup, assets e CSS.

`src/test/setup.js` importa `@testing-library/jest-dom/vitest` e executa `cleanup()` após cada teste.

### 9.2 Vitest backend

`backend/vitest.config.js` configura:

- ambiente `node`;
- cobertura V8;
- cobertura focada em `app.js`;
- exclusões para `server.js`, config, specs e coverage;
- mesmos thresholds de 90/90/90/80.

### 9.3 Suíte atual

O README informa 94 testes automatizados, e a contagem dos specs atuais confirma esse total quando se expandem os `it.each`.

| Arquivo | Quantidade efetiva | Escopo |
| --- | ---: | --- |
| `src/App.spec.jsx` | 20 | Comportamento do app, busca, seleção, histórico, métricas, limite, timers |
| `src/components/MapView.spec.jsx` | 13 | Renderização de mapa mockado, agrupamento, ícones, previsão e cache |
| `src/services/sptransAPI.spec.js` | 15 | Cliente Axios, URLs, encoding, erros e fallbacks |
| `src/services/normalizarPrevisao.spec.js` | 13 | Normalização frontend e preservação de valores falsy |
| `backend/app.spec.js` | 33 | Normalização backend, rotas Express, CORS, allowlist, autenticação e erros |

Total: 94.

### 9.4 Estratégia dos testes

Os testes seguem uma linha comportamental:

- componentes React são testados por texto, roles, labels e interações observáveis;
- `MapView` mocka Leaflet e React Leaflet para testar lógica sem depender de mapa real;
- `App` mocka serviços e `MapView`, validando a orquestração de estado;
- backend é testado com `supertest`, simulando requisições HTTP;
- cliente SPTrans é substituído por mock injetado;
- relógio é fixado nos testes de previsão para cálculo determinístico de minutos;
- timers são controlados com fake timers;
- encoding de query string é testado explicitamente;
- falhas externas são simuladas para garantir respostas controladas;
- valores falsy válidos são protegidos para evitar regressões por troca indevida de `??` por `||`.

### 9.5 Testes de mutação

`stryker.config.json` configura StrykerJS:

- `packageManager: npm`;
- runner `vitest`;
- `coverageAnalysis: perTest`;
- reporters `html`, `clear-text`, `progress`;
- arquivos mutados:
  - `src/components/**/*.jsx`;
  - `src/services/**/*.js`;
- exclusões:
  - `src/main.jsx`;
  - `src/test/setup.js`;
- timeout atual configurado: `6000` ms.

Há um relatório HTML versionado em `reports/mutation/mutation.html`. Ele é um artefato gerado e grande. Durante a análise, ele indicava StrykerJS `9.6.1`, mas embutia timeout `5000` ms, diferente do `stryker.config.json` atual. Portanto, a configuração fonte de verdade é `stryker.config.json`; o HTML pode representar uma execução anterior.

### 9.6 ESLint

`eslint.config.js` usa a configuração flat do ESLint 9:

- `@eslint/js` recomendado;
- regras recomendadas recentes de `eslint-plugin-react-hooks`;
- configuração Vite de `eslint-plugin-react-refresh`;
- `globals.browser` para código frontend;
- `globals.node` para backend e configs;
- specs recebem browser + node globals;
- regra customizada:

```js
"no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }]
```

Essa exceção permite constantes em caixa alta sem serem tratadas como variáveis comuns.

## 10. CI/CD

O workflow `.github/workflows/node.js.yml` roda em:

- `push`;
- `pull_request`.

Matriz:

- `ubuntu-latest`;
- `macos-latest`;
- `windows-latest`;
- Node `22.x`.

Passos:

1. checkout;
2. setup Node com cache npm;
3. `npm ci` na raiz;
4. `npm ci` em `backend`;
5. `npm run lint`;
6. `npm run build`;
7. `npm run coverage:all`;
8. upload Codecov apenas no job Ubuntu.

O upload usa:

```text
./coverage/lcov.info
./backend/coverage/lcov.info
```

e exige secret:

```text
CODECOV_TOKEN
```

`fail_ci_if_error: true` torna falha de upload do Codecov uma falha do CI no job Ubuntu.

## 11. Documentação existente

### 11.1 `README.md`

O README cobre:

- objetivo do sistema;
- membros do grupo;
- tecnologias;
- configuração de ambiente;
- como instalar dependências;
- como rodar frontend/backend;
- como executar testes e cobertura;
- cobertura atual;
- lista de testes;
- estratégia de testes;
- CI/CD e Codecov.

Ele é coerente com a maior parte do código atual. Os pontos de atenção são:

- menciona `FRONTEND_ORIGINS`, que o backend suporta, mas `backend/.env.example` não lista;
- informa o workflow `.github/workflows/node.js.yml`, que existe;
- informa 94 testes, número confirmado pelos specs atuais;
- descreve relatórios de cobertura que são gerados em execução, mas não estão versionados porque `coverage` e `backend/coverage` são ignorados.

### 11.2 `.gitignore`

Ignora:

- logs;
- `node_modules`;
- builds (`dist`, `dist-ssr`);
- cobertura (`coverage`, `backend/coverage`);
- arquivos `.env`;
- diretórios de editor;
- metadados de sistema.

Como `.env.example` e `backend/.env.example` não terminam em `.env`, eles permanecem versionados.

## 12. Decisões de desenvolvimento identificadas

As decisões abaixo foram inferidas do código, dos testes, do README e do histórico de commits.

### 12.1 Backend como proxy obrigatório

O projeto escolheu não chamar a SPTrans diretamente do browser. Isso resolve três problemas:

- protege `SPTRANS_API_KEY`;
- mantém cookies de sessão da SPTrans no servidor;
- cria um ponto central para CORS, allowlist e normalização.

### 12.2 Autenticação cacheada por instância

`autenticado` evita chamar `/Login/Autenticar` antes de cada consulta. Isso reduz latência e tráfego. O cache fica em memória e é simples: se a sessão expirar no provedor, uma requisição pode falhar e retornar erro controlado, mas não há retry automático com relogin.

### 12.3 Allowlist de endpoints

O proxy genérico aceita apenas três endpoints. Previsão recebe rota própria. Essa decisão reduz risco de transformar o backend em proxy aberto para toda a API SPTrans.

### 12.4 Normalização em duas camadas

Há normalização no backend e no frontend. Isso parece redundante, mas tem função prática:

- backend entrega um contrato mais amigável para `/Previsao`;
- frontend continua aceitando formatos brutos em `MapView`, facilitando testes e tolerância a variações.

### 12.5 Uso de `URLSearchParams`

Tanto frontend quanto backend montam queries com `URLSearchParams`. Os testes cobrem espaços, barras, acentos e parâmetros repetidos. Essa escolha evita bugs de encoding e injeções acidentais por concatenação manual.

### 12.6 Suporte multilinha com limite explícito

O mapa suporta até cinco linhas ativas. O limite é coerente com:

- a paleta de cinco cores;
- legibilidade visual do mapa;
- redução de carga na API por atualização automática.

### 12.7 Identidade de linha baseada em `cl`

O código usa `cl` como identificador de linha ativa. Isso é importante porque o letreiro (`lt`/`tl`) pode ser igual em sentidos diferentes, enquanto `cl` diferencia o cadastro usado pela API.

### 12.8 Agrupamento por código de parada

Paradas são agrupadas por `cp`, não por proximidade geográfica. Essa decisão usa o identificador oficial da SPTrans, evita mesclar paradas distintas com coordenadas próximas e permite detectar paradas compartilhadas por múltiplas linhas.

### 12.9 Ref para estado usado em timer

`linhasAtivasRef` existe para que o callback de `setInterval` leia a lista atual de linhas. Sem isso, o timer poderia capturar uma versão antiga do estado. Essa é uma decisão correta para React com timers assíncronos.

### 12.10 Preservação de dados em falha de atualização

Quando uma atualização falha, o código seta erro, mas não limpa `paradas` nem `onibus`. Isso preserva contexto visual e evita que uma instabilidade temporária apague o mapa.

### 12.11 Testes orientados a comportamento e mutação

A suíte não testa detalhes internos desnecessários dos componentes. Ela testa comportamento observado, contratos HTTP, encoding, valores falsy e timers. O uso de Stryker indica uma preocupação adicional: garantir que os testes detectem mudanças sutis e não apenas executem linhas.

### 12.12 Injeção de dependências no backend

`createApp` aceita client, logger, clock e opções de CORS. Isso torna o backend testável sem rede real, sem porta real e sem depender de tempo do sistema.

### 12.13 Marcadores SVG gerados em runtime

Em vez de depender dos SVGs estáticos em `src/assets`, `MapView` gera SVGs inline com cor dinâmica. Isso permite associar visualmente paradas e ônibus à cor da linha sem manter múltiplos arquivos de imagem.

## 13. Pontos técnicos de atenção

1. `index.html` usa `lang="en"` apesar da interface em português.
2. `backend/.env.example` não inclui `FRONTEND_ORIGINS`, embora o backend e README suportem/recomendem essa variável.
3. `reports/mutation/mutation.html` parece ser artefato de execução anterior e não deve ser tratado como fonte de configuração.
4. `src/assets/bus3.svg` e `src/assets/bus-stop.svg` estão versionados, mas não são usados pela implementação atual do mapa.
5. O backend não implementa retry de autenticação se a sessão SPTrans expirar depois de `autenticado = true`.
6. O frontend chama `autenticarSPTrans()` ao montar, mas as rotas do backend também autenticam sob demanda. A chamada inicial funciona como aquecimento, não como requisito funcional absoluto.
7. O projeto não usa TypeScript; contratos de dados são protegidos por testes e normalizadores, não por tipos estáticos.

## 14. Como executar localmente

Instalação:

```bash
npm install
npm --prefix backend install
```

Ambiente:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Editar `backend/.env`:

```env
SPTRANS_API_KEY=sua_chave_sptrans
PORT=3000
FRONTEND_ORIGINS=http://localhost:5173
```

Backend:

```bash
cd backend
npm start
```

Frontend:

```bash
npm run dev
```

URL padrão:

```text
http://localhost:5173
```

Testes:

```bash
npm run test:all
```

Cobertura:

```bash
npm run coverage:all
```

Mutação:

```bash
npm run test:mutation
```

## 15. Resumo técnico final

`sptrans-map-viewer` é uma aplicação React/Vite com backend Express que integra dados públicos autenticados da SPTrans em um mapa Leaflet. A arquitetura privilegia segurança simples e pragmática: segredo no backend, proxy com allowlist, cookies no servidor, queries codificadas, CORS configurável e normalização defensiva.

No frontend, a complexidade principal está na orquestração de múltiplas linhas ativas, atualização periódica, preservação de estado em falhas e renderização geográfica com agrupamento de paradas. No backend, a complexidade está na autenticação cacheada, no proxy controlado e na normalização de previsão.

A base de testes é extensa para o tamanho do projeto. Ela cobre componentes, serviços, rotas, encoding, timers, CORS, casos de borda e normalização. O CI executa lint, build, cobertura e upload para Codecov em três sistemas operacionais usando Node 22.x.
