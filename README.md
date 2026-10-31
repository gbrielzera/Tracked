# Tracked

Aplicativo de reviews de músicas, inspirado no Letterboxd. Você pesquisa qualquer música, álbum ou
artista, dá uma nota de 0,5 a 5 estrelas, escreve sua review e acompanha o que outras pessoas
estão ouvindo. Não toca músicas.

Projeto acadêmico (8º semestre), feito com React Native (Expo), TypeScript e Supabase, usando só
serviços gratuitos.

## O que o app faz

- **Pesquisa** de músicas, álbuns, artistas e pessoas. Os resultados aparecem enquanto você digita,
  a aba *Tudo* mostra um pouco de cada tipo e há um histórico das últimas buscas.
- **Reviews** com nota de 0,5 a 5 estrelas (meias estrelas) e texto opcional. Uma por item,
  editável e excluível. Um interruptor deixa todas as suas reviews privadas.
- **Trending** com dois rankings: *Em alta* (global ou por país, a partir do Deezer) e *Mais bem
  avaliados* (a comunidade do Tracked, pela média bayesiana).
- **Perfil** com foto, nome, @, país com bandeira, Top 5 de artistas e contadores.
- **Social:** seguir pessoas, feed com as reviews de quem você segue, curtidas, comentários e
  denúncias.
- **Notificações** dentro do app em tempo real e **push** no Android.
- **Visitantes:** dá para explorar e comentar (até 3 vezes por dia) sem criar conta.
- **Conta:** login por e-mail ou Google, recuperação de senha e exclusão da conta com todos os dados.

## Tecnologias

| Camada | O que usa |
|---|---|
| App | Expo SDK 58, React Native 0.88, TypeScript, Expo Router |
| Estado e formulários | TanStack Query, Zustand, react-hook-form e zod |
| Backend | Supabase: Postgres com RLS, Auth, Storage, Realtime e Edge Functions |
| Catálogo de música | [Deezer](https://developers.deezer.com/api) (busca, capas, charts) |
| Descrições | [Last.fm](https://www.last.fm/api), pela Edge Function `music-info` |
| Push | Expo Push, Firebase Cloud Messaging e Database Webhooks do Supabase |
| Build | EAS Build (APK Android) |

As regras de privacidade e segurança ficam **no banco** (RLS, triggers e funções), não só na tela:
por exemplo, reviews privadas não aparecem nem por consulta direta à API, e o limite de comentários
dos visitantes é imposto pelo Postgres.

## Como rodar

O passo a passo completo está em **[docs/como-rodar.md](docs/como-rodar.md)**: requisitos, `.env`,
instalar o app no celular, APK de demonstração, backend, push e problemas comuns.

Resumo, para quem já tem o app de desenvolvimento instalado no Android (para rodar **sem APK**, só com o
Expo Go, troque a última linha por `npx expo start --go`; veja o atalho no guia):

```bash
git clone https://github.com/gbrielzera/Tracked.git
cd Tracked
npm install
cp .env.example .env   # preencha as duas variáveis do Supabase
npx expo start --dev-client
```

## Testes

```bash
npm test
```

Roda três conjuntos, sem Docker e sem conta no Supabase (os detalhes estão em
[docs/como-rodar.md](docs/como-rodar.md#4-comandos-úteis)):

| Comando | Cobre | Testes |
|---|---|---|
| `npm run test:db` | Regras de acesso (RLS), triggers, feed, limites e rankings, rodando as migrations reais num Postgres em memória | 119 |
| `npm run test:functions` | Lógica das mensagens de push | 15 |
| `npm run test:app` | Formatação, validação, filtro de palavrões, países, histórico e o provedor do Deezer | 50 |

Não há teste automatizado das telas: a interface foi validada à mão num Android.

## Estrutura do projeto

```
app/              Telas. No Expo Router, cada arquivo vira uma rota.
  (auth)/           Entrada: boas-vindas, login, cadastro, recuperar senha
  (tabs)/           Barra inferior: feed, trending, pesquisa, perfil
  track/ album/ artist/ user/ review/   Telas de detalhe
  settings/ notifications.tsx           Editar perfil, favoritos, avisos
src/
  components/       Componentes de interface (botões, estrelas, listas, seletor de país)
  features/         Lógica por assunto: auth, music, reviews, social, rankings, search, profile, notifications
  services/
    music/            Catálogo (Deezer) por trás de uma interface trocável
    supabase/         Cliente do Supabase e tipos gerados do banco
  stores/           Estado da sessão (Zustand)
  lib/ theme.ts     Formatação, validação, países e o tema visual
supabase/
  migrations/       Banco de dados: tabelas, regras de acesso, funções e rankings
  functions/        Edge Functions: music-info (Last.fm), delete-account e send-push
tests/              db/ (banco), functions/ (push) e app/ (lógica do app)
docs/               Como rodar e roteiro de apresentação
```

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/como-rodar.md](docs/como-rodar.md) | Instalar, rodar, configurar o Supabase e o push, resolver problemas |
| [docs/roteiro-demo.md](docs/roteiro-demo.md) | Roteiro de apresentação de 8 a 10 minutos e plano B |
| [plan.md](plan.md) | Plano do projeto: arquitetura, modelagem, fases e critérios de aceite |

## Antes de publicar

Estas escolhas valem para a fase acadêmica. Se o app virar um produto de verdade:

- **Ligue `Confirm email`** no Supabase (Authentication > Sign In / Providers > Email). Hoje ele está
  desligado de propósito, para cadastrar contas de teste sem depender de e-mail, e qualquer pessoa
  cria conta com um e-mail que não é dela.
- **Tire o Google Cloud do modo de teste** (ele limita o login a e-mails cadastrados) e revise a
  tela de consentimento.
- **Troque a fonte das descrições**: a chave do Last.fm é só para uso não comercial.
- **Conta Apple paga** para distribuir no iPhone (US$ 99 por ano); sem ela só dá para tentar o Expo Go.

## Créditos e termos

- Catálogo, capas e charts: [API do Deezer](https://developers.deezer.com/api), de uso gratuito sem
  chave.
- Descrições de artistas, álbuns e faixas: [Last.fm](https://www.last.fm/api). A chave gratuita é
  para uso **não comercial**; se o projeto virar um produto comercial, troque a fonte (a interface
  `MusicProvider` em `src/services/music` existe para isso).
