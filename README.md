# 🚌 Projeto SPTrans Map Viewer

Este projeto é uma aplicação web que exibe, em um mapa interativo, as **linhas de ônibus de São Paulo**, seus **pontos de parada** e a **posição em tempo real dos veículos**.  
A aplicação utiliza a **API pública da SPTrans (Olho Vivo)** através de um **backend em Node.js**, que atua como intermediário para proteger a chave de acesso e facilitar a integração com o frontend em React.


![Imagem do WhatsApp de 2025-11-05 à(s) 21 29 02_ca2aa89d](https://github.com/user-attachments/assets/1bca2d5c-8b4c-43bf-90f2-939ba4a9ac36)


---

## 👥 Membros do Grupo

- Diogo Tuler Chaves

---

## 📌 Sobre o Sistema

O SPTrans Map Viewer permite buscar linhas de ônibus de São Paulo, selecionar uma linha, visualizar suas paradas no mapa, consultar previsões de chegada e acompanhar posições de veículos em tempo real quando a API da SPTrans retorna esses dados.

O sistema foi estruturado com um frontend React para a interação do usuário e um backend Express que funciona como proxy autenticado para a API Olho Vivo. Essa separação evita expor a chave da SPTrans no navegador e facilita a criação de testes unitários e de integração.

---

## 🚀 Funcionalidades

- Exibe o mapa com base no Leaflet.
- Mostra todas as **paradas** de uma linha de ônibus selecionada.
- Ao clicar em uma parada, exibe a **previsão de chegada dos ônibus**.
- Mostra **ícones personalizados** para ônibus e paradas.
- Atualiza a **posição dos veículos em tempo real**.

---

## 🧩 Tecnologias Utilizadas

- **Frontend:** React + Vite + Leaflet
- **Backend:** Node.js + Express
- **API:** SPTrans Olho Vivo
- **Testes:** Vitest, Testing Library, Supertest e jsdom
- **Cobertura:** Vitest Coverage com provider V8/Istanbul
- **CI/CD:** GitHub Actions com execução em Linux, macOS e Windows
- **Relatórios:** Codecov para publicação dos relatórios de cobertura

---

## 🧠 Pré-requisitos

Antes de rodar o projeto, você precisará ter instalado:

- [Node.js 20.6+](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [SPTrans API Key](http://www.sptrans.com.br/desenvolvedores/)

---

## 💻 Configuração do Frontend

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` com o conteúdo:

   ```bash
   VITE_API_URL=http://localhost:3000/api
   ```

3. Execute o projeto:
   ```bash
   npm run dev
   ```

O frontend estará disponível em:  
👉 [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Configuração do Backend

1. Entre na pasta do backend:

   ```bash
   cd backend
   ```

2. Crie o arquivo `.env` com o conteúdo:

   ```bash
   SPTRANS_API_KEY=coloque_sua_chave_aqui
   PORT=3000
   ```

3. Instale as dependências:

   ```bash
   npm install
   ```

4. Inicie o servidor:
   ```bash
   npm start
   ```

O backend será iniciado em:  
👉 [http://localhost:3000](http://localhost:3000)

---

## 🌍 Rotas da API do Backend

| Rota                                                         | Método | Descrição                              |
| ------------------------------------------------------------ | ------ | -------------------------------------- |
| `/api/Linha/Buscar?termosBusca=term`                         | GET    | Busca linhas de ônibus pelo nome       |
| `/api/Parada/BuscarParadasPorLinha?codigoLinha=XXXX`         | GET    | Retorna paradas de uma linha           |
| `/api/Previsao?codigoParada=XXXX&codigoLinha=YYYY`           | GET    | Retorna previsão de chegada dos ônibus |
| `/api/Posicao/Linha?codigoLinha=XXXX`                        | GET    | Retorna posição atual dos ônibus       |

---

## 🗺️ Funcionalidade do Mapa

- O mapa é renderizado usando **Leaflet**.
- Cada **parada** é marcada com um ícone específico.
- Cada **ônibus** tem um ícone de ônibus.
- Ao clicar em uma parada:
  - É feita uma requisição ao endpoint `/api/Previsao/Parada`.
  - Um **popup** é aberto exibindo a previsão de chegada.

---

## 🧹 Scripts Disponíveis

### Backend

- `npm start` → inicia o servidor Express
- `npm test` → executa os testes do backend
- `npm run coverage` → executa os testes do backend com cobertura

### Frontend

- `npm run dev` → roda o Vite em modo de desenvolvimento
- `npm run build` → gera build para produção
- `npm test` → executa os testes do frontend
- `npm run coverage` → executa os testes do frontend com cobertura
- `npm run test:all` → executa testes de frontend e backend
- `npm run coverage:all` → executa cobertura de frontend e backend

---

## ✅ Como Executar os Testes Localmente

Instale as dependências do frontend e do backend:

```bash
npm install
npm --prefix backend install
```

Execute todos os testes:

```bash
npm run test:all
```

Execute a cobertura completa:

```bash
npm run coverage:all
```

Os relatórios HTML são gerados em:

- `coverage/index.html`
- `backend/coverage/index.html`

O projeto exige cobertura mínima de 90% em statements, lines e functions, e 80% em branches.

A suíte atual contém mais de 30 testes de unidade/componente e mais de 5 testes de integração do backend, cobrindo normalização de dados, chamadas da API pública do frontend, renderização de mapa e comportamento das rotas Express.

---

## 🔁 Integração Contínua e Codecov

O workflow em `.github/workflows/node.js.yml` executa instalação, lint, build e cobertura automaticamente em Linux, macOS e Windows a cada push ou pull request para `main`.

O upload dos relatórios `coverage/lcov.info` e `backend/coverage/lcov.info` é feito pelo `codecov/codecov-action`. Para repositórios privados ou quando o Codecov exigir autenticação, configure o segredo `CODECOV_TOKEN` nas configurações do repositório no GitHub.
