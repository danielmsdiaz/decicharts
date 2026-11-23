# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React + Vite + TypeScript, Tailwind, shadcn/ui, ECharts, Firebase Auth. Hospedagem prevista: Vercel.

## Users
Engenheiro que prepara relatórios ambientais a partir de medições de decibelímetros.

## Product Purpose
Importar, conferir, visualizar e exportar medições acústicas sem enviar arquivos a servidores.

## Operating Context
Uso desktop, uma série por vez, até 20 MiB e 250 mil registros. Horários e valores precisam ser verificáveis.

## Capabilities and Constraints
Google exclusivamente; CSV/XLS/XLSX; fuso selecionável; preservar duplicados; PNG/SVG. Sem backend, banco ou cálculos normativos. Escopo completo em docs/implementation-plan.md.

## Brand Commitments
Decicharts. Interface profissional e minimalista em português; temas claro/escuro. Construção diretamente em código aprovada.

## Evidence on Hand
Sem planilhas reais ou configuração Firebase fornecidas. Não fabricar validações.

## Product Principles
Precisão antes de conveniência. Processamento local. Diagnósticos explícitos. Gráfico como foco do trabalho.

## Preferências de usabilidade confirmadas — 2026-11-23

O usuário pediu menos campos e linguagem simples. A importação deve reconhecer o arquivo, mostrar seu estado, gerar prévia automaticamente e oferecer uma ação clara para gerar o gráfico. Campos técnicos ficam sob demanda; cancelamento tem destaque. Não exibir “Seu próximo gráfico começa aqui”.
