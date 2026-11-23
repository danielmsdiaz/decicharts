# Decicharts

Importe medições acústicas, confira os dados e exporte gráficos para relatórios ambientais. CSV e Excel são processados localmente em Web Worker; medições não são enviadas ao Firebase ou a outro servidor.

## Executar

Requisitos: Node.js **22.12+** e npm.

```bash
npm ci
cp .env.example .env.local
# Preencha .env.local com a configuração Firebase do seu projeto.
npm run dev
```

Abra a URL informada pelo Vite. Sem configuração Firebase, a página explica a pendência e mantém o login desabilitado. Não há autenticação simulada na aplicação de produção.

## Firebase Authentication

1. Crie ou selecione um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Registre um aplicativo **Web** em Configurações do projeto. Copie `apiKey`, `authDomain`, `projectId` e `appId` para as variáveis correspondentes de `.env.local`:

   ```dotenv
   VITE_FIREBASE_API_KEY=valor-do-seu-projeto
   VITE_FIREBASE_AUTH_DOMAIN=dominio-do-seu-projeto
   VITE_FIREBASE_PROJECT_ID=id-do-seu-projeto
   VITE_FIREBASE_APP_ID=id-do-seu-aplicativo-web
   ```

3. Em **Authentication → Sign-in method**, habilite **Google** e configure o e-mail de suporte.
4. Em **Authentication → Settings → Authorized domains**, autorize `localhost` e o domínio da hospedagem. Projetos recentes podem não incluir localhost automaticamente.
5. Reinicie o Vite. Permita popups e armazenamento local no navegador.

Qualquer conta Google autenticada pode acessar. A aplicação usa somente Authentication, sem Firestore ou Storage. Nunca coloque chaves privadas de service accounts no frontend. `.env.local` é ignorado pelo Git; `.env.example` contém variáveis vazias.

Validação real: entrar com Google, conferir nome/foto/e-mail, recarregar e verificar persistência, sair e confirmar redirecionamento, tentar acessar `/` sem sessão. Esses passos exigem configuração e conta reais; mocks dos testes não os substituem.

## Importação e precisão

- Uma série, um arquivo, uma aba e uma coluna sonora por vez. A próxima importação só substitui a atual após confirmação.
- CSV, XLSX e XLS binário genuíno; até **20 MiB** e **250.000 registros não vazios**. Cabeçalho selecionável nas primeiras 100 linhas. A área física de uma aba Excel também fica limitada a 250.100 linhas para impedir leituras truncadas.
- Arquivos HTML/XML renomeados como `.xls` devem ser salvos novamente como XLSX ou CSV.
- CSV: delimitador detectado automaticamente, UTF-8/BOM e alternativa Windows-1252. Valores com vírgula decimal em arquivos delimitados por vírgulas devem estar entre aspas.
- Confira aba, cabeçalho, colunas, formato de data, decimal, unidade e fuso antes de confirmar. Colunas ambíguas permanecem sem seleção automática.
- Datas brasileiras, ISO, segundos/milissegundos e datas seriais Excel 1900/1904. Horários separados aceitam `HH:mm[:ss[.SSS]]` ou fração numérica Excel.
- Para arquivos só com horários, informe uma data de referência. Todas as linhas usam essa data; não se deduz mudança de dia. Para vários dias, forneça datas nas linhas.
- Fuso IANA selecionável, inicialmente `America/Recife`. Offsets ISO explícitos preservam o instante; os demais horários usam o fuso escolhido. Mudanças históricas são respeitadas. Horários ambíguos/inexistentes exigem correção ou offset explícito.
- Valores usam o separador decimal escolhido, sem separador de milhar. Zero e negativos não são descartados automaticamente. Células numéricas Excel preservam seu valor.
- Unidade inicial `dB`; informe outra identificação somente se corresponder ao arquivo. Não se infere ponderação acústica.
- Linhas vazias são ignoradas; inválidas são contadas e diagnosticadas com a linha original, até 100 exemplos. A prévia mostra até 10 registros.
- Duplicados permanecem em ordem original no mesmo instante. A contagem informa ocorrências adicionais, não grupos.
- Não há médias, cálculos normativos, interpolação, preenchimento de lacunas ou suavização. Segmentos retos unem os pontos existentes, sem criar medições.

Medições ficam apenas na memória. Recarregar, sair ou fechar a aba remove o conjunto. Somente sessão Firebase e preferência de tema persistem no navegador.

## Gráfico e exportação

Filtros são inclusivos e usam o fuso da série. Ajuste a faixa inferior ou use **Ctrl + rolagem** para zoom; **Restaurar** retorna à série completa. Indicadores e exportação acompanham o intervalo aplicado.

Exporte **PNG de 3200 × 1800 pixels** ou **SVG vetorial**, com título, eixos, unidade, fuso e intervalo, sempre com fundo branco. Intervalos sem medições não podem ser exportados.

## Validação

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
```

Os testes Playwright usam Chrome em `/usr/bin/google-chrome`. Em outro ambiente, defina `CHROME_PATH` com o executável instalado. O runner inicia Vite em `127.0.0.1:4173` e encerra o servidor ao terminar. Resultados e screenshots ficam em `/tmp/decicharts-*`.

A entrada autenticada `tests/browser/fixture.html` é exclusiva dos testes e não integra `dist`. A aplicação de produção continua exigindo Firebase. Os testes do provedor usam mocks apenas nos testes.

As fixtures são sintéticas: compatibilidade com exportações específicas de equipamentos depende de arquivos reais. O teste de capacidade cobre 250 mil registros no navegador desktop; tempos dependem da máquina e não garantem desempenho equivalente em celulares.

## Estrutura

```text
docs/                        escopo, checklists e progresso
src/app/                     aplicação e rotas
src/components/              layout e componentes shadcn/ui
src/features/auth/           Google e proteção de rotas
src/features/file-import/    parsing, worker e prévia
src/features/measurements/   modelos, intervalos e dashboard
src/features/charts/         ECharts e exportação
src/hooks/                   preferência de tema
src/lib/                     Firebase e utilitários
tests/                       testes unitários e de navegador
```

Leia `docs/implementation-plan.md` e `docs/progress.md` antes de continuar o desenvolvimento. O plano é a fonte principal do escopo; atualize checklists somente após implementação e validação.

## Vercel e dependências

Build estático: `npm run build`, saída `dist`, fallback SPA em `vercel.json`. Configure as mesmas variáveis no ambiente de build da Vercel e autorize o domínio no Firebase. Variáveis Vite são incorporadas no build; alterações exigem novo build. **Nenhum deploy foi realizado.** Publicação depende de autorização explícita.

SheetJS usa a distribuição oficial mantida `xlsx@0.20.3` em `cdn.sheetjs.com`. O lockfile registra versões instaladas. Um override compatível de `@grpc/grpc-js` corrige advisories na árvore transitiva Firebase; Firestore não é importado pelo aplicativo.

Não há backend, banco de dados, armazenamento de arquivos, geração de laudos ou cálculos normativos.
