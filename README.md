# Catálogo de Pods + Painel Admin

- **`index.html`** (a página inicial do site) é o link que você envia para o cliente: mostra os pods disponíveis com foto, descrição e preço, e cada pod tem um botão "Pedir pelo WhatsApp".
- **`admin.html`** é o painel para cadastrar, editar, ocultar, reordenar e excluir pods, e para enviar fotos.

Dá para mandar o link de um pod específico: abra o pod no catálogo e copie o endereço (termina em `#pod-...`).

## Configuração atual

| Item | Situação |
| --- | --- |
| Site (GitHub Pages) | No ar, publicado automaticamente a cada alteração na `main` |
| Banco de dados | Supabase, projeto `armag-cobranca-2` (`hgrkqkucdtcydpxnrwxg`), já ligado no `config.js` |
| Fotos | Bucket público `pod-images` (até 5 MB por foto) |
| WhatsApp | **Pendente**: preencha `whatsappNumber` no `config.js` quando tiver o número |

O catálogo divide o projeto Supabase com o sistema de cobrança. Por isso tudo dele tem nomes próprios (`pods`, `pods_admins`, `pods_is_admin`, `pod-images`) e as regras só valem para essas peças: nada da cobrança foi alterado.

## Quem pode editar o catálogo

Só entra no painel quem tem **usuário no Supabase** *e* está na tabela **`pods_admins`**. Usuários da cobrança que não estão nessa lista não conseguem alterar nada no catálogo.

Para dar acesso a alguém:

1. No Supabase, vá em **Authentication → Users → Add user → Create new user**, defina e-mail e senha e marque **Auto Confirm User** (se a pessoa já tiver usuário na cobrança, pule este passo e use o mesmo login).
2. Em **SQL Editor**, rode:
   ```sql
   insert into public.pods_admins (email) values ('email-da-pessoa@exemplo.com');
   ```

Para tirar o acesso: `delete from public.pods_admins where email = 'email-da-pessoa@exemplo.com';`

> **Não** desative "Allow new users to sign up" sem checar o sistema de cobrança: a configuração vale para o projeto inteiro. O catálogo não depende disso, porque quem decide é a tabela `pods_admins`.

> A chave *anon* no `config.js` é pública por natureza. Quem protege os dados são as regras do `supabase.sql`. **Nunca** coloque a chave `service_role` no site.

## Modo demonstração

Se `supabaseUrl` e `supabaseAnonKey` ficarem vazios no `config.js`, o site funciona salvando tudo **só no navegador** (útil para testes; o cliente não vê nada).

## Site no ar (GitHub Pages)

O site já está publicado pelo GitHub Pages a partir da branch `gh-pages`.
Você só edita a branch `main`: a automação `.github/workflows/publicar.yml` copia cada alteração da `main` para a `gh-pages`, e o site se atualiza sozinho em 1–2 minutos (acompanhe na aba **Actions**).

Links:
   - Catálogo (para o cliente): `https://armag-software.github.io/Pods/`
   - Painel: `https://armag-software.github.io/Pods/admin.html`

No painel, o botão **"Copiar link do catálogo"** copia o link certo.

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `index.html` + `js/catalogo.js` | Catálogo público |
| `admin.html` + `js/admin.js` | Painel admin |
| `js/store.js` | Leitura e gravação no Supabase (ou no navegador, em modo demonstração) |
| `js/util.js` | Funções auxiliares (preço, redução de fotos, ícones) |
| `css/catalogo.css` | Visual das duas páginas |
| `config.js` | **Suas configurações** |
| `supabase.sql` | Script que cria tabela, regras de acesso e bucket de fotos |

As fotos são reduzidas automaticamente (no máximo 1400px) antes do envio, para o catálogo carregar rápido no celular.

## Identidade visual — Midnight Neon Glass

Direção artística futurista e premium: vidro em camadas, iluminação neon verde-lima, vitrine 3D e base azul-marinho.

- **Fundo em camadas:** gradientes radiais, luz ambiente lime, malha de pontos, linhas luminosas, forma 3D de vidro desfocada e ruído fino.
- **Vidro em 3 níveis** (`.glass-1` discreto, `.glass-2` padrão com borda reflexiva, `.glass-3` elevado para flutuantes e modal).
- **Hero com vitrine 3D:** o 1º pod da ordem do painel aparece numa placa inclinada, com órbitas, cantoneiras técnicas e cartões flutuantes.
- **Hierarquia na coleção:** os 2 primeiros pods (ordem do painel) viram cards em destaque, maiores. Ao buscar, filtrar ou reordenar, todos ficam iguais.
- **Identificadores técnicos:** `P-001` (referência pela ordem), `CAT·01` (categoria), contadores e microtextos em fonte mono.
- **Microinterações:** entrada animada dos cards, inclinação 3D e luz que segue o mouse, reflexo nos botões, chips que acendem. Tudo é desligado para quem ativa "reduzir movimento" no aparelho.

Fontes: **Sora** (títulos e números), **Inter** (textos) e **JetBrains Mono** (microtextos técnicos).

Todas as cores, sombras, desfoques e animações ficam como variáveis no topo de `css/catalogo.css`:

| Variável | Cor | Uso |
| --- | --- | --- |
| `--midnight` | `#101C35` | Base azul-marinho |
| `--ink` | `#101827` | Azul quase preto (profundidade) |
| `--navy` | `#263957` | Superfícies e palcos dos produtos |
| `--white` | `#FFFFFF` | Texto e contraste |
| `--lime` | `#B7F52A` | Ações, preços em destaque e iluminação neon |
| `--glass` | `rgba(255,255,255,0.08)` | Superfícies de vidro |

Dica: a **primeira linha da descrição** aparece no card como sabor/variação (ex: `Menta gelada · 5.000 puffs`). Nos cards em destaque, as linhas seguintes também aparecem.
