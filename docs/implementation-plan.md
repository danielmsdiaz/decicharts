# Plano de implementação — Plataforma de Análise de Ruído

## 1. Objetivo

Desenvolver uma aplicação web para importar, visualizar e exportar séries temporais de medições acústicas realizadas por decibelímetros.

O público-alvo inicial é um engenheiro que utiliza os dados das medições na elaboração de relatórios ambientais.

O MVP deve oferecer:

- Autenticação exclusivamente com Google.
- Importação de planilhas Excel e arquivos CSV.
- Identificação e normalização das medições.
- Visualização de séries temporais interativas.
- Filtragem dos dados por intervalo de tempo.
- Exportação dos gráficos em formatos adequados para relatórios técnicos.

Priorizar simplicidade, qualidade visual, precisão dos dados e manutenção do código.

## 2. Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | React + Vite |
| Linguagem | TypeScript (strict) |
| Estilização | Tailwind CSS |
| Componentes | shadcn/ui |
| Autenticação | Firebase Authentication |
| Gráficos | Apache ECharts |
| Planilhas Excel | SheetJS |
| Arquivos CSV | Papa Parse |
| Rotas | React Router |
| Testes | Vitest |
| Hospedagem | Vercel |

Utilizar versões estáveis e compatíveis das dependências.

### Restrições

- Não utilizar Next.js.
- Não criar backend próprio.
- Não utilizar banco de dados inicialmente.
- Não implementar Docker ou microsserviços.
- Processar as planilhas localmente no navegador.
- Não adicionar dependências ou abstrações desnecessárias.

## 3. Autenticação com Google

Utilizar Firebase Authentication com o provedor Google.

Implementar:

- Página de login.
- Botão "Continuar com Google".
- Autenticação por popup.
- Persistência de sessão.
- Proteção de rotas com `ProtectedRoute`.
- Estado de carregamento durante a recuperação da sessão.
- Exibição de nome, foto e e-mail do usuário.
- Logout.
- Tratamento de erros.

Não implementar autenticação por senha.

Inicialmente, qualquer conta Google autenticada poderá acessar a aplicação.

Não utilizar Firestore ou Firebase Storage.

Centralizar a configuração em `lib/firebase.ts`, utilizando variáveis de ambiente.

Criar `.env.example` e documentar no README como configurar o Firebase.

Não incluir credenciais reais no repositório.

Caso faltem configurações externas, implementar o código necessário, documentar a pendência e continuar as fases independentes. Não simular autenticação em produção.

## 4. Interface

Criar uma interface profissional, moderna e minimalista.

### Diretrizes

- Desktop-first e responsiva.
- Light/dark mode.
- Tailwind CSS e shadcn/ui.
- Tipografia e espaçamento consistentes.
- Componentes reutilizáveis.
- Estados de loading, erro e ausência de dados.
- Feedback visual para ações.

### Páginas

**Login**

- Identidade visual simples.
- Descrição resumida da aplicação.
- Botão de login Google.

**Dashboard**

- Header com usuário e logout.
- Área de importação de arquivos.
- Visualização dos gráficos.
- Filtros temporais.
- Indicadores das medições.
- Controles de exportação.

Não criar páginas adicionais sem necessidade funcional.

## 5. Importação de arquivos

Permitir importação por seleção de arquivo e drag-and-drop.

Formatos:

- `.xlsx`
- `.xls`, quando adequadamente suportado
- `.csv`

### Funcionalidades

1. Validar formato e tamanho.
2. Ler os arquivos localmente.
3. Identificar abas de planilhas.
4. Detectar possíveis colunas de data, hora e nível sonoro.
5. Permitir mapeamento manual das colunas.
6. Normalizar os dados.
7. Identificar registros inválidos.
8. Ordenar cronologicamente.
9. Disponibilizar os dados para o módulo de gráficos.

### Modelo inicial

```ts
interface Measurement {
  timestamp: number;
  value: number;
}

interface MeasurementDataset {
  fileName: string;
  measurements: Measurement[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  unit: string;
}
```

Adaptar o modelo caso a estrutura real das planilhas exija.

Tratar corretamente:

- Datas serializadas do Excel.
- Datas em formato brasileiro.
- Colunas separadas de data e hora.
- Vírgulas e pontos decimais.
- Registros vazios ou inválidos.
- Timestamps duplicados.
- Intervalos irregulares entre medições.

Não inventar nem interpolar medições ausentes.

## 6. Séries temporais

Utilizar Apache ECharts.

### Gráfico principal

- Eixo X: data/hora da medição.
- Eixo Y: nível sonoro, com unidade adequada.
- Tooltip com data, hora e valor.
- Zoom horizontal.
- Controle de intervalo visível.
- Restauração de zoom.
- Formatação de datas e unidades.
- Suporte a grandes conjuntos de registros.

Os pontos devem ser posicionados conforme seus timestamps reais.

Não aplicar suavização artificial.

### Filtros

- Data/hora inicial.
- Data/hora final.
- Restaurar intervalo.

### Indicadores

- Quantidade de medições válidas.
- Valor mínimo.
- Valor máximo.
- Início e fim do período analisado.

Não implementar LAeq, L10, L90 ou cálculos normativos no MVP.

## 7. Exportação

Implementar exportação em:

- PNG.
- SVG, quando compatível.

Os gráficos exportados devem conter:

- Título.
- Eixos identificados.
- Unidades.
- Séries visíveis.
- Intervalo temporal selecionado.

Garantir legibilidade para utilização em relatórios ambientais.

Não implementar geração automática de laudos.

## 8. Arquitetura

Adotar organização por funcionalidades (*feature-based*).

Estrutura sugerida:

```text
project/
├── docs/
│   ├── implementation-plan.md
│   └── progress.md
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── router.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── features/
│   │   ├── auth/
│   │   ├── file-import/
│   │   ├── measurements/
│   │   └── charts/
│   ├── lib/
│   │   └── firebase.ts
│   ├── hooks/
│   ├── types/
│   └── main.tsx
│
├── .env.example
├── package.json
└── README.md
```

### Princípios arquiteturais

- Separar parsing, normalização e visualização.
- Manter a lógica de negócio independente dos componentes.
- Criar funções puras e testáveis quando possível.
- Evitar dependências circulares.
- Utilizar TypeScript estrito.
- Não introduzir gerenciamento global de estado sem necessidade.
- Evitar abstrações prematuras.

## 9. Fases de implementação

### Fase 1 — Setup e estrutura

- [x] Inicializar React + Vite + TypeScript.
- [x] Configurar Tailwind CSS.
- [x] Configurar shadcn/ui.
- [x] Configurar ESLint e TypeScript strict.
- [x] Criar estrutura de diretórios.
- [x] Configurar React Router.
- [x] Implementar layout inicial.
- [x] Configurar light/dark mode.

**Critério de conclusão:** aplicação inicial executando e build sem erros.

### Fase 2 — Autenticação

- [x] Configurar Firebase Authentication.
- [x] Criar página de login.
- [x] Implementar login Google.
- [x] Implementar persistência de sessão.
- [x] Criar `ProtectedRoute`.
- [x] Implementar logout.
- [x] Tratar erros de autenticação.
- [x] Documentar configuração do Firebase.

**Critério de conclusão:** fluxo de autenticação implementado e validado quando houver configuração real disponível.

### Fase 3 — Importação

- [ ] Criar componente de upload.
- [ ] Implementar leitura de Excel/CSV.
- [ ] Criar seleção de abas.
- [ ] Implementar identificação de colunas.
- [ ] Permitir mapeamento manual.
- [ ] Normalizar datas e valores.
- [ ] Validar registros.
- [ ] Exibir prévia dos dados importados.
- [ ] Criar testes do parser.

**Critério de conclusão:** importar arquivos válidos e produzir um conjunto de medições corretamente normalizadas.

### Fase 4 — Gráficos

- [ ] Integrar Apache ECharts.
- [ ] Criar gráfico temporal.
- [ ] Implementar tooltip.
- [ ] Implementar zoom.
- [ ] Adicionar filtros temporais.
- [ ] Exibir indicadores.
- [ ] Implementar exportação PNG/SVG.
- [ ] Testar fluxo completo de importação e visualização.

**Critério de conclusão:** importar dados, visualizá-los e exportar corretamente o gráfico.

### Fase 5 — Testes e finalização

- [ ] Revisar responsividade.
- [ ] Validar estados de erro.
- [ ] Executar testes unitários.
- [ ] Validar tipagem.
- [ ] Executar lint.
- [ ] Executar build.
- [ ] Preparar configuração da Vercel.
- [ ] Documentar instalação e execução no README.
- [ ] Registrar limitações e pendências.

**Critério de conclusão:** aplicação funcional, testes automatizados passando e build de produção concluído.

## 10. Critérios gerais de aceitação

O MVP estará concluído quando:

1. O login Google estiver implementado e validado com configuração real.
2. O dashboard exigir sessão autenticada.
3. O usuário conseguir importar Excel/CSV.
4. A aplicação identificar ou mapear as colunas.
5. Os dados forem normalizados corretamente.
6. O gráfico representar timestamps reais.
7. Filtros e zoom funcionarem.
8. O gráfico puder ser exportado.
9. As planilhas forem processadas localmente.
10. Testes e build passarem.

## 11. Fora do escopo

Não implementar:

- Backend próprio.
- Banco de dados.
- Armazenamento de arquivos na nuvem.
- Integração direta com o decibelímetro.
- Google Drive.
- Geração automática de laudos.
- Análises acústicas normativas.
- Pagamentos.
- Controle complexo de usuários.

## 12. Documentação obrigatória do desenvolvimento

Antes de implementar as funcionalidades, criar os seguintes arquivos:

### `docs/implementation-plan.md`

Este arquivo deverá conter o plano completo de implementação, incluindo:

- Objetivo do projeto.
- Stack tecnológica.
- Arquitetura.
- Estrutura de diretórios.
- Funcionalidades.
- Fases de implementação.
- Tarefas de cada fase.
- Critérios de aceitação.
- Restrições técnicas.

O documento será a **fonte principal de referência para o escopo do projeto**.

Regras:

1. Criar o arquivo antes de iniciar a implementação.
2. Organizar as tarefas utilizando checklists.
3. Atualizar os checklists conforme as tarefas forem realmente concluídas.
4. Registrar alterações relevantes nas decisões técnicas.
5. Não marcar tarefas como concluídas sem implementação e validação adequadas.
6. Não remover requisitos pendentes para aparentar conclusão.
7. Evitar reescrever o plano inteiro sem necessidade.
8. Manter consistência com o código efetivamente implementado.

### `docs/progress.md`

Criar um segundo documento responsável por acompanhar o andamento real do projeto.

Utilizar a seguinte estrutura inicial:

```md
# Progresso do projeto

## Estado atual

- Fase atual: 1 — Setup e estrutura
- Status: Não iniciado
- Última atualização: YYYY-MM-DD

## Resumo das fases

| Fase | Status |
|------|--------|
| 1. Setup | Pendente |
| 2. Autenticação | Pendente |
| 3. Importação | Pendente |
| 4. Gráficos | Pendente |
| 5. Finalização | Pendente |

## Trabalho concluído

Nenhuma tarefa concluída.

## Trabalho em andamento

Nenhuma tarefa iniciada.

## Próximas tarefas

- Inicializar o projeto.
- Configurar as dependências.
- Criar a estrutura inicial.

## Decisões técnicas

Nenhuma decisão adicional registrada.

## Bloqueios e pendências

Nenhum bloqueio identificado.

## Validações

Nenhum teste executado.

## Histórico de progresso

Nenhuma atualização registrada.
```

### Regras de atualização do progresso

**O arquivo `progress.md` deve ser atualizado continuamente durante o desenvolvimento, e não apenas no encerramento da execução.**

Atualizar obrigatoriamente:

1. Ao iniciar uma nova fase.
2. Ao concluir uma tarefa relevante.
3. Ao encontrar um bloqueio.
4. Ao tomar uma decisão técnica importante.
5. Ao finalizar os testes de uma fase.
6. Antes de encerrar a sessão de desenvolvimento.

Cada atualização deve refletir o estado real do projeto.

Utilizar os estados:

- `Pendente`
- `Em andamento`
- `Concluído`
- `Bloqueado`

Não registrar funcionalidades como concluídas quando apenas parcialmente implementadas.

### Histórico de progresso

Manter um registro cronológico resumido, por exemplo:

```md
### YYYY-MM-DD — Fase 1

Implementado:
- Inicialização do projeto React + Vite.
- Configuração do Tailwind CSS.
- Configuração do TypeScript strict.

Validações:
- TypeScript: aprovado.
- Build: aprovado.
- ESLint: aprovado.

Pendências:
- Configurar shadcn/ui.
- Implementar layout inicial.

Próxima ação:
- Continuar a Fase 1.
```

Não é necessário registrar cada pequena alteração. Priorizar marcos relevantes.

## 13. Continuidade entre sessões

O projeto poderá ser desenvolvido em múltiplas sessões de um agente de programação.

Para evitar perda de contexto, seguir este protocolo:

### No início de cada sessão

1. Ler `docs/implementation-plan.md`.
2. Ler `docs/progress.md`.
3. Inspecionar o estado atual do repositório.
4. Comparar a documentação com os arquivos realmente existentes.
5. Identificar tarefas concluídas, parcialmente implementadas e pendentes.
6. Continuar a partir da primeira tarefa pendente ou bloqueada que possa ser executada.

**Não reiniciar o projeto nem repetir implementações já concluídas.**

Se a documentação estiver desatualizada em relação ao código, verificar o estado real, corrigir a documentação e continuar.

### Durante a execução

- Manter os documentos sincronizados com o desenvolvimento.
- Não sobrescrever informações relevantes de progresso.
- Registrar dependências externas ou decisões pendentes.
- Continuar automaticamente entre as fases sempre que possível.

### Antes de encerrar a sessão

Atualizar `progress.md` com:

- Estado atual.
- Última fase trabalhada.
- Funcionalidades concluídas.
- Funcionalidades parcialmente implementadas.
- Testes executados e respectivos resultados.
- Erros conhecidos.
- Bloqueios.
- Próxima ação recomendada.

A próxima sessão deve conseguir continuar o desenvolvimento apenas lendo os documentos e inspecionando o repositório.

## 14. Instruções de execução para o agente

### Preparação

1. Inspecione o repositório.
2. Verifique se já existem arquivos e funcionalidades.
3. Crie `docs/implementation-plan.md` com base neste documento, preservando os requisitos e critérios de aceitação.
4. Crie `docs/progress.md` com a estrutura de acompanhamento especificada.
5. Defina a ordem de execução das tarefas.
6. Inicie a implementação.

Se os arquivos de documentação já existirem, atualize-os preservando o histórico relevante.

### Execução

**Execute todas as cinco fases sequencialmente, sem exigir aprovação manual entre elas.**

Para cada fase:

1. Identifique as tarefas pendentes.
2. Atualize o status no `progress.md`.
3. Implemente as funcionalidades.
4. Execute os testes e validações pertinentes.
5. Corrija os problemas encontrados.
6. Atualize os checklists do `implementation-plan.md`.
7. Registre os resultados no `progress.md`.
8. Prossiga automaticamente para a próxima fase.

Não interrompa a implementação apenas para apresentar relatórios intermediários.

### Autonomia

- Não solicitar confirmação para decisões técnicas triviais.
- Não adicionar funcionalidades fora do escopo.
- Não realizar deploy sem autorização explícita.
- Não criar commits automaticamente, salvo quando solicitado.
- Não modificar arquivos não relacionados ao projeto.
- Não utilizar credenciais inventadas.
- Não mascarar funcionalidades incompletas com mocks em produção.
- Não declarar testes como aprovados quando não foram executados.

### Bloqueios externos

Quando uma etapa depender de intervenção humana, como configurar credenciais do Firebase:

1. Implemente o código que puder ser desenvolvido sem essa intervenção.
2. Documente a configuração pendente.
3. Marque a validação correspondente como bloqueada.
4. Continue as tarefas independentes.
5. Não considere a funcionalidade totalmente validada.

Interrompa somente quando houver um bloqueio que realmente impeça a continuação do trabalho.

### Entrega final

Ao concluir a execução, apresente:

- Fases implementadas.
- Funcionalidades concluídas.
- Estrutura final do projeto.
- Testes executados e resultados.
- Pendências e bloqueios.
- Configurações externas necessárias.
- Instruções para executar localmente.
- Estado final do `docs/implementation-plan.md`.
- Estado final do `docs/progress.md`.

## 15. Instrução final

**Inicie a implementação agora.**

Primeiro, crie os arquivos:

- `docs/implementation-plan.md`
- `docs/progress.md`

Em seguida, implemente as funcionalidades seguindo as cinco fases.

Atualize ambos os documentos durante o desenvolvimento.

Não pare ao terminar uma fase. Continue automaticamente até concluir todas as etapas tecnicamente possíveis.

Se a execução for interrompida, deixe o `progress.md` suficientemente atualizado para que outra sessão consiga retomar exatamente de onde o projeto parou.

Priorize uma aplicação simples, moderna, confiável e bem estruturada.


## 16. Decisões aprovadas — 2026-11-23

- Uma série, um arquivo, uma aba e uma coluna sonora por vez. Nova importação só substitui a anterior após confirmação.
- Limites: 20 MiB por arquivo e 250.000 linhas não vazias de dados.
- Fuso IANA selecionável; padrão America/Recife. Offsets explícitos prevalecem.
- Preservar timestamps repetidos e informar ocorrências adicionais.
- Parsing e normalização em Web Worker. Luxon para datas e fusos.
- Interface em português, construída diretamente em código, com superfícies neutras e destaque verde-petróleo.
- Indicadores, zoom, filtros e exportação compartilham o intervalo inclusivo aplicado.
- PNG em alta resolução e SVG com fundo claro para relatórios.
- Sem configuração Firebase, login desabilitado com orientação; nunca simular autenticação.
- Dados exclusivamente na memória; nenhuma persistência de medições.
- Fonte do escopo: requisitos acima e decisões desta seção.

### Autorização posterior

Em 2026-11-23, o usuário autorizou commits por parte implementada. Deploy continua sem autorização.

### Validação da autenticação

Código e testes locais implementados. Login, persistência e logout com Google real continuam bloqueados por configuração externa. Checklists de implementação não representam validação externa concluída.
