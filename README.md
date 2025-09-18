# 🛰️ Radar de Preços

[![Tela do Radar de Preços](https://github.com/anandxrfeu/radar-de-precos/blob/main/public/assets/app-screenshot.png)](http://radar-de-precos.netlify.app)


Aplicativo web que compara preços de produtos em tempo real usando o SerpApi (Google Shopping). Construído com React + TailwindCSS + Netlify.

---

## 📖 Visão Geral

O **Radar de Preços** permite inserir produtos, selecionar cidades e obter preços atualizados em poucos segundos.
Foi criado como um projeto de demonstração para mostrar como desenvolver aplicações usando o [SerpApi](https://serpapi.com).

---

## 🚀 Funcionalidades

- Adicionar produtos para monitoramento.
- Escolher múltiplas cidades para pesquisa.
- Exibir preços em tempo real retornados pelo Google Shopping via SerpApi.
- Interface simples, rápida e responsiva (React + TailwindCSS).

---

## 🛠️ Tecnologias Utilizadas

- **React** — Frontend SPA
- **TailwindCSS** — Estilização
- **SerpApi** — API de dados estruturados do Google Shopping
- **Netlify** — Hospedagem e deploy contínuo

---

## 🔑 Como Usar

1. **Obtenha uma chave de API do SerpApi**
   - Crie uma conta em [SerpApi.com](https://serpapi.com)
   - Copie sua chave privada no painel

2. **Configure no App**
   - Acesse [Radar de Preços](http://radar-de-precos.netlify.app)
   - Clique no ícone de configurações
   - Cole sua chave de API

3. **Execute uma Busca de Preços**
   - Adicione os produtos
   - Escolha as cidades
   - Clique em **Buscar Preços**
   - Veja os resultados em tempo real

---

## 📦 Instalação Local (opcional para desenvolvedores)

Clone este repositório e instale as dependências:

```bash
git clone https://github.com/anandxrfeu/radar-de-precos.git
cd radar-de-precos
npm install
npm run dev
