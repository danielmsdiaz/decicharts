# Decicharts

Importe medições acústicas, confira os dados e exporte gráficos para relatórios ambientais. CSV e Excel são lidos localmente em Web Worker. O salvamento opcional guarda as medições normalizadas no PostgreSQL Neon, vinculadas à sua conta Google.

## Executar

Requisitos: Node.js **22.12+** e npm.

```bash
npm ci
cp .env.example .env.local
# Preencha Firebase e DATABASE_URL do Neon. Preserve .env.local se já existir.
npm run db:migrate
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

## Como usar

1. Selecione ou arraste um Excel ou CSV. O nome e o estado do arquivo aparecem imediatamente.
2. Quando as colunas forem reconhecidas, a prévia é gerada automaticamente. Em planilhas com blocos Tempo (s)/dB, confira os pontos detectados e clique em **Gerar gráfico**. Quantidade de pontos e duração são variáveis.
3. Use **Cancelar importação** para descartar o arquivo pendente. Se já houver uma série no gráfico, ela será mantida.
4. Depois de gerar, o painel **Arquivo em análise** mostra qual arquivo está ativo. **Trocar arquivo** inicia outra importação e **Remover arquivo** limpa a série da sessão.

A escolha de aba só aparece para planilhas com várias abas. Quando uma coluna não é reconhecida, a tela pede somente essa escolha. Os demais campos ficam em **Ajustar leitura do arquivo**; a data de referência aparece apenas para arquivos com horários sem data.

No gráfico, escolha **Ponto de medição** quando houver vários pontos. Cada um mantém título, período e informações da figura ao alternar. O período e o título podem ser alterados em **Ajustar período e título**; dados de localização, data inicial e logotipo ficam em **Informações da figura**. **Exportar figura**, no painel do gráfico, abre as opções de download. **Salvar análise** fica na faixa do arquivo e abrange todos os pontos.

As setas ao lado do seletor avançam/voltam entre pontos e param nas extremidades. Explicações ficam nos ícones de ajuda: passe o cursor, use foco pelo teclado ou toque no celular; Escape ou toque fora fecha a ajuda.

## Perfil e análises salvas

- **Meu perfil:** nome/foto/e-mail do Google e preferências de fuso/unidade para novas importações. Alterar preferências não reinterpreta medições já abertas ou salvas.
- **Salvar análise:** salva todos os pontos da aba importada como um conjunto. Cada ponto preserva medições completas, título, intervalo, identificação, cores e logomarca. **Nome da análise** identifica o conjunto no histórico e é independente dos títulos dos gráficos. **Salvar alterações** atualiza os ajustes de todos os pontos, sem reenviar medições.
- **Minhas análises:** uma entrada por importação, com arquivo, aba e contagem de pontos/medições. Abrir recupera todos os pontos na ordem original. Excluir remove o conjunto inteiro, incluindo blocos e tentativas, após confirmação. Análises antigas continuam disponíveis como conjuntos unitários; arquivos de mesmo nome não são agrupados.
- **Fechar arquivo/análise:** remove apenas a cópia do workspace; a versão salva continua no histórico. Reimportar, mesmo com o mesmo nome, cria outra análise. Salvar é sempre uma ação explícita; outras abas do Excel e o arquivo original não são incluídos.
- O arquivo original Excel/CSV e as células originais dos diagnósticos não são enviados ao Neon. Guardamos somente os dados necessários para reabrir a análise, incluindo razões e números de linhas inválidas. Um logotipo opcional é normalizado localmente para PNG de até 512 px/128 KiB e enviado somente ao salvar.

## Criar documento dentro da análise

Com uma análise aberta, use **Criar documento**. Clique nos pontos de inserção para adicionar título, subtítulo, texto, tabela, foto ou gráfico. Os gráficos são escolhidos entre os pontos dessa análise, na ordem desejada, com opção de dois lado a lado. Legendas acompanham as figuras; cada trecho pode ter uma ou duas colunas. As ações de mover, excluir e desfazer permitem reorganizar o conteúdo.

A **prévia em tempo real** aparece ao lado da edição em telas largas. **Ver prévia** amplia a folha e permite conferi-la também no celular. As folhas usam proporção A4 e margens de 20 mm; trechos maiores que uma página recebem indicação de prévia contínua. O motor do Word pode distribuir linhas e páginas de outra maneira.

**Exportar Word** gera `.docx` com textos, listas e tabelas editáveis e imagens incorporadas. As figuras preservam os dados e os ajustes capturados ao inserir; editar a análise não altera a cópia existente. Use **Atualizar gráfico** para substituí-la, mantendo legenda e posição. **Voltar à análise** e **Editar documento** alternam entre os dois trabalhos.

Esta primeira entrega mantém o documento **somente na sessão da aba**, inclusive ao navegar para perfil/histórico; salvar a análise ainda não salva o documento. Exporte o Word antes de fechar/recarregar a aba ou sair da conta. Substituir, fechar ou excluir a análise pede confirmação e descarta o documento local após consentimento. O salvamento remoto de documentos é uma etapa futura, ainda sem API ou migração. Também não há importação de um `.docx` existente.

Fotos PNG/JPEG de até 10 MiB e 12 mil pixels por dimensão são normalizadas localmente para JPEG de até 2 mil pixels, preservando orientação/proporção e removendo metadados. Até 500 elementos/trechos, 50 imagens distintas e 20 MiB de mídia mantida em memória, incluindo o histórico de desfazer. Tiptap 3.35 e docx 9.16 são carregados sob demanda, com licença MIT; JSZip é usado nos testes para verificar o conteúdo OOXML. Nenhuma foto ou documento é enviada ao servidor nesta entrega.

## Neon, Prisma e criação das tabelas

1. Crie o projeto no Neon. Ele normalmente já contém um banco padrão; use a conexão mostrada em **Connect**.
2. Preencha `DATABASE_URL` em `.env.local`. A variável é exclusiva do servidor: **não use prefixo VITE_** e não versione seu valor.
3. Em um **banco novo**, execute `npm run db:migrate`. Este é o gatilho explícito da criação das tabelas. Login, importação e build não executam migrações.
4. Reinicie `npm run dev` depois de alterar variáveis.

O projeto usa **Prisma ORM 7** com adaptador Neon. Os modelos estão em `prisma/schema.prisma`, as migrações SQL versionadas em `prisma/migrations/` e a configuração da CLI em `prisma.config.ts`. O comando `db:migrate` chama `prisma migrate deploy`: aplica somente migrações pendentes e pode ser repetido. A migração inicial cria o schema **decicharts**, com `profiles`, `analyses`, `analysis_chunks` e o histórico legado `schema_migrations`. O histórico atual é controlado por `_prisma_migrations` no mesmo schema.

**Banco da versão anterior, com tabelas/dados existentes:** execute `npm run db:baseline` uma vez, antes de `db:migrate`. Esse comando compara a estrutura histórica de `prisma/baseline.prisma` ao banco, registra a migração inicial como já aplicada e confere contagens e fingerprints antes/depois, sem recriar tabelas. Isso **já foi realizado no Neon configurado durante esta implementação**; os dados existentes foram preservados. A baseline exige um banco compatível e não serve para inicializar um banco vazio.

Comandos disponíveis:

| Comando | Finalidade |
|---------|------------|
| `npm run db:generate` | Gerar o Prisma Client tipado a partir dos modelos |
| `npm run db:migrate` | Aplicar migrações pendentes no banco configurado |
| `npm run db:status` | Conferir o histórico de migrações |
| `npm run db:check` | Comparar estrutura do banco e modelos, sem alterar dados |
| `npm run db:studio` | Abrir o Prisma Studio para consultar e editar dados |

O Client é gerado automaticamente na instalação e no build, em `server/generated/prisma/`, que não é versionado. **Gerar o Client não cria tabelas.** A aplicação usa `DATABASE_URL`; a CLI usa `DATABASE_URL_UNPOOLED` quando informada. Em Neon, quando a conexão direta não é informada, a CLI deriva o host direto removendo `-pooler` do host da conexão. As duas URLs devem apontar para o mesmo banco/branch.

Para futuras alterações de estrutura, use um **banco ou branch Neon de desenvolvimento**: altere `prisma/schema.prisma`, execute `npm run db:migrate:dev -- --name nome_da_alteracao`, revise e versione o SQL gerado. O comando de desenvolvimento pode pedir reset ao detectar divergências; não o execute no banco que contém os dados do usuário. Em produção, aplique o SQL revisado com `npm run db:migrate`. Restrições PostgreSQL `CHECK` são mantidas no SQL das migrações, pois não são representadas pelos modelos Prisma.

O repositório usa consultas tipadas do Prisma e transações para salvar/publicar blocos. A consulta SQL da aplicação é uma trava de linha parametrizada (`SELECT ... FOR UPDATE`) para proteger gravações simultâneas. As verificações administrativas da baseline também usam SQL parametrizado.

A API valida a assinatura RS256, emissor, audiência, expiração e provedor Google dos tokens Firebase usando as chaves públicas do Google. `FIREBASE_PROJECT_ID` é opcional; quando vazio, o servidor usa `VITE_FIREBASE_PROJECT_ID`. Não é necessário baixar uma chave privada de service account. O UID é extraído do token verificado e filtra todas as consultas.

O salvamento agrupa metadados, ajustes e medições dos pontos pequenos em lotes de até 100 pontos e 480 KiB, calculados em UTF-8. Até 5.000 medições por ponto podem seguir no próprio lote; pontos maiores ou que excedam esse corpo usam blocos de até 5.000 medições. A API mantém o limite de 512 KiB por requisição. Cada lote grava pontos, blocos e ajustes em uma transação; quando um único lote contém o conjunto completo, a publicação ocorre na mesma transação. Dez pontos pequenos que caibam em um lote usam três chamadas no primeiro salvamento e duas na atualização de ajustes, que não reenvia medições. Não há mudança de schema para essa otimização.

Uma análise só aparece no histórico depois de conferir todos os pontos, blocos, ordem, duplicados e contagens. Até três requisições são executadas simultaneamente no conjunto inteiro; a fila inicia outro envio assim que uma vaga é liberada. Após falha, interrompe novos trabalhos e aguarda os envios em andamento antes de permitir a repetição. Repetir o salvamento na mesma sessão usa os mesmos IDs e a mesma fotografia dos ajustes, sem duplicação. Edições feitas durante o envio ficam pendentes para o próximo salvamento. Atualizações publicam uma nova fotografia inteira; a versão anterior permanece disponível até a conclusão. Conflitos entre sessões não sobrescrevem dados e permitem reabrir a versão salva mediante confirmação. Rascunhos e fotografias inativas com mais de 24 horas são removidos na próxima criação de importação do mesmo usuário; a fotografia publicada nunca é removida por essa limpeza. Não há recuperação automática de trabalho local após recarga.

API do conjunto: `GET/POST /api/imports`, `GET/DELETE /api/imports/:id`, `POST /api/imports/:id/saves`, lotes em `PUT /api/imports/:id/saves/:saveId/batch` (`points`, `publish`), envio individual de pontos/blocos em `/api/imports/:id/saves/:saveId/points/:pointId`, conclusão de ponto e tentativa com `/complete`, leitura paginada por versão em `/api/imports/:id/points?saveId=...` e blocos em `/api/imports/:id/points/:pointId/chunks/:index`. O lote retorna a prontidão de cada ponto e, quando publicado, a confirmação da versão. Metadados paginam por quantidade e bytes, para acomodar logomarcas sem exceder 512 KiB.

Rotas legadas para conjuntos unitários: `GET/PUT /api/profile`, `GET/POST /api/analyses`, `GET/PATCH/DELETE /api/analyses/:id`, `GET/PUT /api/analyses/:id/chunks/:index`, `POST /api/analyses/:id/complete`. Campos de identidade enviados pelo cliente não determinam propriedade.

## Importação e precisão

- Um arquivo e uma aba selecionada, com vários pontos e um gráfico ativo por vez. A próxima importação só substitui a coleção atual após confirmação quando houver trabalho não salvo.
- CSV, XLSX e XLS binário genuíno; até **20 MiB** e **250.000 medições válidas somadas entre os pontos da aba selecionada**. Cada série mantém o limite de 250 mil registros não vazios. Cabeçalho selecionável nas primeiras 100 linhas. A área física de uma aba Excel também fica limitada a 250.100 linhas para impedir leituras truncadas.
- Blocos adjacentes Tempo (s)/dB são reconhecidos dinamicamente; os IDs nos cabeçalhos são associados à tabela de localização pelo ID, independentemente da ordem. Células mescladas, colunas vazias e extensões diferentes são preservadas. IDs duplicados ou ausentes em vários blocos exigem revisão do arquivo. Não há regra fixa P1–P10 ou duração de 60 segundos.
- Tempo decorrido usa segundos, inclusive frações com precisão máxima de 1 ms. Não é convertido em datas Excel nem ganha uma data fictícia. Data/hora inicial opcional aparece somente como informação da figura.
- Arquivos HTML/XML renomeados como `.xls` devem ser salvos novamente como XLSX ou CSV.
- CSV: delimitador detectado automaticamente, UTF-8/BOM e alternativa Windows-1252. Valores com vírgula decimal em arquivos delimitados por vírgulas devem estar entre aspas.
- Pontos sem nenhuma leitura válida bloqueiam a conclusão da importação e permanecem identificados na prévia; corrija o arquivo ou o mapeamento. CSV com coluna de identificação por linha não ganha agrupamento automático nesta entrega.
- Confira aba, cabeçalho, colunas, formato de data, decimal, unidade e fuso antes de confirmar. Colunas ambíguas permanecem sem seleção automática.
- Datas brasileiras, ISO, segundos/milissegundos e datas seriais Excel 1900/1904. Horários separados aceitam `HH:mm[:ss[.SSS]]` ou fração numérica Excel.
- Para arquivos só com horários, informe uma data de referência. Todas as linhas usam essa data; não se deduz mudança de dia. Para vários dias, forneça datas nas linhas.
- Fuso IANA selecionável, inicialmente `America/Recife` ou a preferência salva no perfil. Offsets ISO explícitos preservam o instante; os demais horários usam o fuso escolhido. Mudanças históricas são respeitadas. Horários ambíguos/inexistentes exigem correção ou offset explícito.
- Valores usam o separador decimal escolhido, sem separador de milhar. Zero e negativos não são descartados automaticamente. Células numéricas Excel preservam seu valor.
- Unidade inicial `dB` ou a preferência salva no perfil para a leitura genérica; blocos explícitos dB mantêm essa unidade. Confirme a ponderação em **Ajustar leitura do arquivo** para usar dB(A/C/Z). Uma preferência escrita como dB(A) não comprova ponderação A.
- Linhas vazias são ignoradas; inválidas são contadas e diagnosticadas com a linha original, até 100 exemplos. A prévia visível mostra até 5 registros.
- Duplicados permanecem em ordem original no mesmo instante. A contagem informa ocorrências adicionais, não grupos.
- Mínimo, média aritmética, máximo e Leq estimado são calculados sobre o período selecionado. Não há cálculos normativos, interpolação, preenchimento de lacunas ou suavização. Segmentos retos unem os pontos existentes, sem criar medições.

Medições não salvas ficam apenas na memória. Navegar entre Análise, Minhas análises e Meu perfil preserva o trabalho; recarregar ou sair limpa a cópia local. As ações internas de substituir/fechar arquivo, abrir outra análise, começar uma nova análise, excluir e sair da conta usam confirmações próprias, com cancelamento por Escape e retorno do foco. Apenas fechar ou recarregar a aba mantém o aviso nativo do navegador, quando suportado, conforme preferência confirmada. Esses avisos não protegem contra encerramento forçado do processo. As análises salvas podem ser reabertas pela sua conta. A preferência de tema permanece local; fuso/unidade preferidos ficam no Neon.

### Leq estimado

Origem confirmada pelo usuário: leituras instantâneas de campo feitas com decibelímetro. O aplicativo calcula a média energética dessas amostras, com pesos iguais, e identifica o resultado como **Leq estimado**, sem equipará-lo ao Leq integrado pelo equipamento. 50, 60 e 70 dB com pesos iguais resultam em aproximadamente 65,68 dB, enquanto a média aritmética é 60 dB.

A estimativa exige pelo menos duas leituras selecionadas, série completa igualmente espaçada, sem duplicados ou registros inválidos e unidade em decibéis. Se essas condições não forem atendidas, o indicador fica indisponível com o motivo; gráfico e demais estatísticas continuam disponíveis. Não se inventam durações, não se calcula ponderação temporal a partir de lacunas e não se presume integração de 60 segundos porque existem registros de 1 a 60.

## Interface

Header com navegação integrada, controle de tema e menu da conta. Login, importação, histórico e perfil compartilham a mesma tipografia DM Sans, incluída no bundle sem requisições a serviços de fontes. Explicações de funcionamento ficam nos ícones de ajuda; erros, progresso e resultados de ações continuam visíveis. Histórico, preferências, recuperação da sessão e páginas/gráfico sob demanda usam skeletons com suporte a movimento reduzido. A paginação preserva os resultados já carregados.

## Gráfico e exportação

Filtros são inclusivos: segundos para tempo decorrido, data/hora e fuso para séries absolutas. Ajuste a faixa inferior ou use **Ctrl + rolagem** para zoom; **Restaurar** retorna à série completa. Indicadores e exportação acompanham o intervalo aplicado. A largura permanece responsiva; o eixo X adapta sua escala à duração real, sem descartar dados ou comprimir lacunas.

O gráfico inclui grade principal/secundária, marcações de mínimo/máximo e linha do Leq estimado quando disponível. Séries curtas mostram os pontos; a consulta por cursor usa guias nos eixos e a faixa de zoom inclui uma visão geral. O eixo em decibéis vai de 0 a 110 dB na tela e na exportação. Leituras fora da escala ficam nos dados e nos indicadores, com um aviso no gráfico e na figura.

Em **Exportar figura**, escolha **PNG** ou **SVG** e selecione **Retrato (8:9)** para colocar duas figuras lado a lado, **Quadrada (1:1)** ou **Paisagem (8:5)** para uma figura mais larga. O modal mostra a prévia do arquivo a baixar. O retrato é o padrão, e o navegador lembra a última proporção escolhida. As dimensões do PNG são 1920 × 2160, 2240 × 2240 e 3200 × 2000 pixels, respectivamente.

A figura reúne título, empreendimento, ponto, endereço e coordenadas disponíveis, data inicial quando informada, indicadores, gráfico e nota do Leq estimado. Campos vazios são omitidos. Intervalos sem medições não podem ser exportados.

Metadados novos usam versão 2 e tipo temporal explícito. Análises antigas sem versão continuam sendo interpretadas como datas absolutas. As tabelas Prisma e a migração inicial permanecem intactas; essa evolução usa os campos JSON existentes.

## Validação

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
npm run test:neon  # Exige TEST_DATABASE_URL exclusivo e diferente da aplicação
npm run test:postgres:local  # PostgreSQL descartável local; requer pg_virtualenv (Linux/Debian)
```

`npm run dev` serve frontend e API local. `npm run preview` serve apenas o frontend estático e não substitui o servidor da API.

Os testes de banco são separados dos testes comuns: cobrem o fluxo legado de 5.001 medições e conjuntos de dez pontos, falha no último, repetição, atualização atômica, versões concorrentes, paginação de logomarcas, isolamento e exclusão. Incluem rollback transacional de lote e comparação do protocolo individual com o envio em lote; no PostgreSQL local, contam consultas sem registrar SQL ou parâmetros. Tempos locais não representam a latência Neon. Os testes removem seus usuários sintéticos ao final. Requer migração aplicada e conexão de rede. **TEST_DATABASE_URL é obrigatório**; não há alternativa automática para DATABASE_URL. O teste bloqueia o mesmo host/banco da aplicação, incluindo URLs pooled/diretas.

`test:postgres:local` cria e destrói um PostgreSQL 17 local com `pg_virtualenv`, aplica as migrações somente nesse destino, compara fingerprints de dados/configurações/datas legados e confere os schemas anterior e atual contra Prisma. O adaptador `@prisma/adapter-pg` é usado apenas nos testes de loopback; a aplicação continua com o adaptador Neon. O comando exige o marcador do cluster descartável e não usa a conexão da aplicação como destino.

Para preparar o ambiente separado:

1. No dashboard Neon, crie manualmente um branch de desenvolvimento, por exemplo `decicharts-dev`.
2. Copie a conexão desse branch para `TEST_DATABASE_URL` em `.env.local`; mantenha as URLs da aplicação apontando para seu ambiente atual enquanto roda a integração.
3. Se o branch copiar o esquema atual, confira-o; em banco vazio, aplique migrações com uma configuração explícita dedicada ao branch de desenvolvimento.
4. Execute `npm run test:neon`. Nunca use `db:migrate:dev` ou reset no banco com dados reais. Para desenvolvimento cotidiano, use configuração/arquivo de ambiente próprio do branch dev; mantenha as variáveis de produção na hospedagem correspondente.

**Atualização para salvamento por importação:** aplicar a migração revisada `0002_import_collections` antes de disponibilizar o novo backend/frontend. Ela foi ensaiada no banco local descartável e aplicada ao Neon configurado, mediante autorização, em 26/11/2026. A consulta do histórico e a estrutura foram conferidas; não havia análises salvas antes da migração. Os endpoints antigos continuam atendendo conjuntos unitários. Não realizar rollback para o backend antigo sem uma estratégia de retorno compatível com as novas relações; não excluir tabelas para reverter.

Nenhum branch é provisionado automaticamente pelo aplicativo. Na entrega de 25/11/2026, a integração de escrita não foi repetida porque não havia TEST_DATABASE_URL separado.

Os testes Playwright usam Chrome em `/usr/bin/google-chrome`. Em outro ambiente, defina `CHROME_PATH` com o executável instalado. O runner inicia Vite em `127.0.0.1:4173` e encerra o servidor ao terminar. Resultados e screenshots dos fluxos ficam em `/tmp/decicharts-*`. A matriz de interface em `tests/browser/interface.spec.ts` captura desktop claro e celular escuro em `.impeccable/review/`, ignorado pelo Git.

A entrada autenticada `tests/browser/fixture.html` é exclusiva dos testes e não integra `dist`. A aplicação de produção continua exigindo Firebase. Os testes do provedor usam mocks apenas nos testes. Os fluxos de conta no navegador usam uma API simulada restrita ao token sintético da fixture; o teste Neon separado verifica o banco real. O login Google real até a API deve ser validado manualmente com uma conta real.

As fixtures versionadas são sintéticas. EXEMPLO.xlsx foi validado localmente em 25/11/2026: dez pontos, 600 medições, nenhum registro inválido e localização associada por ID; o arquivo e seus endereços não foram versionados. Outros layouts específicos de equipamentos ainda podem exigir revisão de leitura. O teste de capacidade cobre 250 mil registros no navegador desktop; tempos dependem da máquina e não garantem desempenho equivalente em celulares.

## Estrutura

```text
api/                         entrada serverless Vercel
server/                      autenticação, validação e repositório Prisma
shared/                      contratos entre frontend e API
prisma/schema.prisma         modelos mapeados às tabelas do Neon
prisma/migrations/           migrações SQL controladas pelo Prisma Migrate
prisma.config.ts             configuração de migrações e conexão direta
scripts/                     CLI Prisma e baseline do banco existente
docs/                        escopo, checklists e progresso
src/app/                     aplicação e rotas
src/components/              layout e componentes shadcn/ui
src/features/auth/           Google e proteção de rotas
src/features/account/        perfil e preferências
src/features/analyses/       workspace e histórico salvo
src/features/file-import/    parsing, worker e prévia
src/features/measurements/   modelos, intervalos e dashboard
src/features/charts/         ECharts e exportação
src/hooks/                   preferência de tema
src/lib/                     Firebase e utilitários
tests/                       testes unitários e de navegador
```

Leia `docs/implementation-plan.md` e `docs/progress.md` antes de continuar o desenvolvimento. O plano é a fonte principal do escopo; atualize checklists somente após implementação e validação.

## Vercel e dependências

Frontend: `npm run build`, saída `dist`. A Vercel também executa a função Node em `api/[...path].ts`; o roteamento preserva arquivos/API antes do fallback SPA. Configure as variáveis Firebase e `DATABASE_URL` nos ambientes correspondentes da Vercel, aplique a migração ao banco escolhido e autorize o domínio no Firebase. Variáveis Vite são incorporadas no build; alterações exigem novo build. **Nenhum deploy foi realizado.** Publicação depende de autorização explícita.

SheetJS usa a distribuição oficial mantida `xlsx@0.20.3` em `cdn.sheetjs.com`. O lockfile registra versões instaladas. Overrides compatíveis de `@grpc/grpc-js` e `effect` corrigem advisories nas árvores transitivas Firebase e Prisma, respectivamente; Firestore não é importado pelo aplicativo.

A API é serverless; o banco é PostgreSQL Neon. Não há armazenamento dos arquivos originais, geração de laudos ou cálculos normativos. Custos e retenção de backups dependem do plano Neon contratado.
