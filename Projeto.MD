# Análise do Projeto - Portal de BI com IA

## 1. Objetivo do Projeto

O projeto é um portal de Business Intelligence (BI) projetado para se conectar a uma fonte de dados no Google BigQuery. Seu principal objetivo é extrair dados brutos, processá-los e utilizar a API da OpenAI para gerar análises e insights automatizados, que são então apresentados ao usuário final em uma interface web interativa.

## 2. Tecnologias Principais

- **Frontend:** [Next.js](https://nextjs.org/) (com React e TypeScript)
- **Backend (API):** [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- **Banco de Dados:** [Google BigQuery](https://cloud.google.com/bigquery)
- **Inteligência Artificial:** [OpenAI API](https://openai.com/api/)
- **Autenticação:** [NextAuth.js](https://next-auth.js.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)

## 3. Estrutura do Projeto

A estrutura do projeto é organizada de forma modular, separando a interface do usuário, a lógica de servidor e as definições de dados.

```
/
├── app/
│   ├── api/                # Endpoints da API (backend)
│   │   └── query/
│   │       └── route.ts    # Endpoint principal para gerar insights
│   └── insights/
│       └── page.tsx        # Página principal da interface do usuário
├── lib/
│   ├── tableMap.ts         # Arquivo central de metadados
│   ├── queryBuilder.ts     # Construtor de consultas SQL
│   └── makeInsightPrompt.ts  # Montagem do prompt para a IA
├── data/
│   └── metadados.ts        # Definições de dados e métricas
└── ...
```

- **`/app`**: Contém a aplicação Next.js.
  - **`/app/api`**: Define os endpoints do backend. O mais importante é o `/api/query/route.ts`, que orquestra a busca de dados e a geração de insights.
  - **`/app/insights`**: Contém a página principal (`page.tsx`) onde os usuários interagem com o sistema para solicitar análises.
- **`/lib`**: Abriga a lógica de negócio principal do projeto.
- **`/data`**: Armazena definições de metadados e presets utilizados pela aplicação.

## 4. Lógica de Negócio e Arquivos-Chave

A inteligência do sistema está concentrada na pasta `lib`.

### `lib/tableMap.ts`

Este é o arquivo mais crítico do projeto. Ele atua como um "mapa" ou "dicionário" que define todas as fontes de dados e os tipos de insights que podem ser gerados. Para cada "origem" (`originKey`), ele especifica:

- **Metadados do BigQuery:** `dataset` e `table` a serem consultados.
- **Métricas (`metrics`):** Uma lista de métricas a serem extraídas, incluindo como devem ser agregadas (`sum`, `avg`, `ratio`) e formatadas.
- **Prompt Base (`prompt`):** Um template de texto que serve como instrução inicial para o modelo da OpenAI.
- **Modo de Agregação (`aggregate`):** Define se os dados devem ser agrupados por data, totalizados ou não agregados.

### `lib/queryBuilder.ts`

Este arquivo é responsável por construir dinamicamente as consultas SQL que serão executadas no BigQuery. A função `buildInsightSQL` recebe a `originKey` e os parâmetros do usuário (como período e cliente) e, com base nas definições do `tableMap.ts`, monta uma consulta SQL completa e parametrizada para buscar os dados necessários.

### `lib/makeInsightPrompt.ts`

Após a execução da consulta no BigQuery, este arquivo entra em ação. A função `makeInsightPrompt` pega os dados retornados (`rows`), formata-os como "fatos" em uma estrutura JSON e os anexa ao `prompt` base definido no `tableMap.ts`. O resultado é um prompt completo e contextualizado, pronto para ser enviado à API da OpenAI.

## 5. Fluxo de Trabalho de Geração de Insight

O processo de ponta a ponta para gerar uma análise é o seguinte:

1.  **Interação do Usuário:** O usuário acessa a página `/insights`, seleciona uma fonte de dados (ex: "Campanha Google Analytics"), um período e filtros opcionais (como cliente).
2.  **Requisição à API:** O frontend envia uma requisição `POST` para o endpoint `/api/query` com os parâmetros selecionados.
3.  **Construção da Consulta:** O endpoint utiliza o `queryBuilder.ts` para criar uma consulta SQL específica para a solicitação.
4.  **Execução no BigQuery:** A consulta é enviada e executada no Google BigQuery.
5.  **Montagem do Prompt:** Os dados retornados do BigQuery são processados pelo `makeInsightPrompt.ts`, que os combina com o prompt base para criar o prompt final.
6.  **Geração do Insight (IA):** O prompt final é enviado para a API da OpenAI, que gera o texto da análise.
7.  **Retorno e Exibição:** O insight gerado pela IA, juntamente com os dados brutos e os "fatos" formatados, é retornado ao frontend e exibido para o usuário, muitas vezes em um formato visual como o componente `InfographicReport`.
# Análise do Projeto - Portal de BI com IA

## 1. Objetivo do Projeto

O projeto é um portal de Business Intelligence (BI) projetado para se conectar a uma fonte de dados no Google BigQuery. Seu principal objetivo é extrair dados brutos, processá-los e utilizar a API da OpenAI para gerar análises e insights automatizados, que são então apresentados ao usuário final em uma interface web interativa.

## 2. Tecnologias Principais

- **Frontend:** [Next.js](https://nextjs.org/) (com React e TypeScript)
- **Backend (API):** [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- **Banco de Dados:** [Google BigQuery](https://cloud.google.com/bigquery)
- **Inteligência Artificial:** [OpenAI API](https://openai.com/api/)
- **Autenticação:** [NextAuth.js](https://next-auth.js.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)

## 3. Estrutura do Projeto

A estrutura do projeto é organizada de forma modular, separando a interface do usuário, a lógica de servidor e as definições de dados.

- **`/app`**: Contém a aplicação Next.js.
  - **`/app/api`**: Define os endpoints do backend. O mais importante é o `/api/query/route.ts`, que orquestra a busca de dados e a geração de insights.
  - **`/app/insights`**: Contém a página principal (`page.tsx`) onde os usuários interagem com o sistema para solicitar análises.
- **`/lib`**: Abriga a lógica de negócio principal do projeto.
- **`/data`**: Armazena definições de metadados e presets utilizados pela aplicação.

## 4. Lógica de Negócio e Arquivos-Chave

A inteligência do sistema está concentrada na pasta `lib`.

### `lib/tableMap.ts`

Este é o arquivo mais crítico do projeto. Ele atua como um "mapa" ou "dicionário" que define todas as fontes de dados e os tipos de insights que podem ser gerados. Para cada "origem" (`originKey`), ele especifica:

- **Metadados do BigQuery:** `dataset` e `table` a serem consultados.
- **Métricas (`metrics`):** Uma lista de métricas a serem extraídas, incluindo como devem ser agregadas (`sum`, `avg`, `ratio`) e formatadas.
- **Prompt Base (`prompt`):** Um template de texto que serve como instrução inicial para o modelo da OpenAI.
- **Modo de Agregação (`aggregate`):** Define se os dados devem ser agrupados por data, totalizados ou não agregados.

### `lib/queryBuilder.ts`

Este arquivo é responsável por construir dinamicamente as consultas SQL que serão executadas no BigQuery. A função `buildInsightSQL` recebe a `originKey` e os parâmetros do usuário (como período e cliente) e, com base nas definições do `tableMap.ts`, monta uma consulta SQL completa e parametrizada para buscar os dados necessários.

### `lib/makeInsightPrompt.ts`

Após a execução da consulta no BigQuery, este arquivo entra em ação. A função `makeInsightPrompt` pega os dados retornados (`rows`), formata-os como "fatos" em uma estrutura JSON e os anexa ao `prompt` base definido no `tableMap.ts`. O resultado é um prompt completo e contextualizado, pronto para ser enviado à API da OpenAI.

## 5. Fluxo de Trabalho de Geração de Insight

O processo de ponta a ponta para gerar uma análise é o seguinte:

1.  **Interação do Usuário:** O usuário acessa a página `/insights`, seleciona uma fonte de dados (ex: "Campanha Google Analytics"), um período e filtros opcionais (como cliente).
2.  **Requisição à API:** O frontend envia uma requisição `POST` para o endpoint `/api/query` com os parâmetros selecionados.
3.  **Construção da Consulta:** O endpoint utiliza o `queryBuilder.ts` para criar uma consulta SQL específica para a solicitação.
4.  **Execução no BigQuery:** A consulta é enviada e executada no Google BigQuery.
5.  **Montagem do Prompt:** Os dados retornados do BigQuery são processados pelo `makeInsightPrompt.ts`, que os combina com o prompt base para criar o prompt final.
6.  **Geração do Insight (IA):** O prompt final é enviado para a API da OpenAI, que gera o texto da análise.
7.  **Retorno e Exibição:** O insight gerado pela IA, juntamente com os dados brutos e os "fatos" formatados, é retornado ao frontend e exibido para o usuário, muitas vezes em um formato visual como o componente `InfographicReport`.