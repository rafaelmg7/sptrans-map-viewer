# 🚌 Projeto SPTrans Map Viewer

Este projeto é uma aplicação web que exibe, em um mapa interativo, as **linhas de ônibus de São Paulo**, seus **pontos de parada** e a **posição em tempo real dos veículos**.  
A aplicação utiliza a **API pública da SPTrans (Olho Vivo)** através de um **backend em Node.js**, que atua como intermediário para proteger a chave de acesso e facilitar a integração com o frontend em React.


![Imagem do WhatsApp de 2025-11-05 à(s) 21 29 02_ca2aa89d](https://github.com/user-attachments/assets/1bca2d5c-8b4c-43bf-90f2-939ba4a9ac36)


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
- **Estilo:** TailwindCSS (opcional)

---

## 🧠 Pré-requisitos

Antes de rodar o projeto, você precisará ter instalado:

- [Node.js 18+](https://nodejs.org/)
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

| Rota                                                      | Método | Descrição                              |
| --------------------------------------------------------- | ------ | -------------------------------------- |
| `/api/Linha?busca=term`                                   | GET    | Busca linhas de ônibus pelo nome       |
| `/api/Paradas/Linha?codigoLinha=XXXX`                     | GET    | Retorna paradas de uma linha           |
| `/api/Previsao/Parada?codigoParada=XXXX&codigoLinha=YYYY` | GET    | Retorna previsão de chegada dos ônibus |
| `/api/Posicao/Linha?codigoLinha=XXXX`                     | GET    | Retorna posição atual dos ônibus       |

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
- `npm run dev` → inicia com nodemon (se configurado)

### Frontend

- `npm run dev` → roda o Vite em modo de desenvolvimento
- `npm run build` → gera build para produção
