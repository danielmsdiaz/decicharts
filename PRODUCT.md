# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React + Vite + TypeScript, Tailwind, shadcn/ui, ECharts, Firebase Auth. API Node serverless, Prisma ORM/Migrate e PostgreSQL Neon. Hospedagem prevista: Vercel.

## Users
Engenheiro que prepara relatórios ambientais a partir de medições de decibelímetros.

## Product Purpose
Importar, conferir, visualizar e exportar medições acústicas sem enviar arquivos a servidores.

## Operating Context
Uso desktop e consulta mobile; vários pontos por arquivo/aba, um gráfico por vez, até 20 MiB e 250 mil medições válidas somadas na aba. Horários e valores precisam ser verificáveis.

## Capabilities and Constraints
Google exclusivamente; CSV/XLS/XLSX; fuso selecionável; preservar duplicados; PNG/SVG. Perfil e preferências no Neon; salvar/reabrir/excluir análises normalizadas por ação explícita. Sem armazenamento de planilhas originais ou cálculos normativos. Escopo completo em docs/implementation-plan.md.

## Brand Commitments
Decicharts. Interface profissional e minimalista em português; temas claro/escuro. Construção diretamente em código aprovada.

## Evidence on Hand
EXEMPLO.xlsx recebido e conferido localmente em 25/11/2026: dez pontos e 600 leituras, localização por ID e tempo em segundos. O usuário confirmou origem em leituras instantâneas de campo; não há Leq integrado nem ponderação comprovada no arquivo. Usuário configurou Firebase e Neon; migração e integração real do banco verificadas. Testes de navegador usam identidade sintética; aceite com Google real permanece manual.

## Product Principles
Precisão antes de conveniência. Processamento local. Diagnósticos explícitos. Gráfico como foco do trabalho.

## Preferências de usabilidade confirmadas — 2026-11-23

O usuário pediu menos campos e linguagem simples. A importação deve reconhecer o arquivo, mostrar seu estado, gerar prévia automaticamente e oferecer uma ação clara para gerar o gráfico. Campos técnicos ficam sob demanda; cancelamento tem destaque. Não exibir “Seu próximo gráfico começa aqui”.

## Persistência aprovada — 2026-11-23

Neon escolhido pelo usuário. API verifica tokens Firebase, isola os dados por UID e salva medições em blocos de até 5 mil pontos. A conta oferece perfil, preferências e histórico. O usuário confirma salvar e excluir; leitura e gráficos continuam no navegador. Migração explícita com npm run db:migrate.

## Evolução de monitoramento — 2026-11-25

Pontos e durações variáveis; dados e ajustes por ponto preservados na sessão. Salvamento individual explícito, reabrindo apenas o ponto salvo. Gráfico responsivo com tempo absoluto ou decorrido, sem datas fictícias. Mínimo, média aritmética, máximo e Leq estimado nas condições de amostragem regular, sem equivalência normativa. Figura PNG/SVG completa com localização, identificação e logotipo opcional. Compatibilidade com metadados antigos sem alterar tabelas Prisma. Integração de escrita exige TEST_DATABASE_URL separado do banco da aplicação.
