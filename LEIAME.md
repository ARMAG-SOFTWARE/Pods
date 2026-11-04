# Catálogo de Pods + Painel Admin

- **`catalogo/`** é o link que você envia para o cliente: mostra os pods disponíveis com foto, descrição e preço, e cada pod tem um botão "Pedir pelo WhatsApp".
- **`catalogo/admin.html`** é o painel para cadastrar, editar, ocultar, reordenar e excluir pods, e para enviar fotos.

Dá para mandar o link de um pod específico: abra o pod no catálogo e copie o endereço (termina em `#pod-...`).

## Testar agora (modo demonstração)

Com `supabaseUrl` e `supabaseAnonKey` vazios em `config.js`, tudo funciona, mas os dados ficam salvos **só no seu navegador**. Serve para testar o painel. O cliente não vai ver nada. Para uso real, siga os passos abaixo.

## Colocar no ar (gratuito)

### 1. Criar o banco no Supabase

1. Crie uma conta em <https://supabase.com> e um novo projeto (o plano gratuito basta).
2. No projeto, abra **SQL Editor → New query** e cole o conteúdo de `catalogo/supabase.sql`.
3. **Na última linha do SQL, troque `seu-email@exemplo.com` pelo seu e-mail** e clique em **Run**.

### 2. Criar seu usuário de admin

1. Vá em **Authentication → Users → Add user → Create new user**.
2. Use **o mesmo e-mail** do passo anterior, defina uma senha e marque **Auto Confirm User**.
3. Em **Authentication → Sign In / Providers**, **desative "Allow new users to sign up"**, para ninguém mais conseguir criar conta.

> Para dar acesso a outra pessoa: crie o usuário dela (passo 2) e rode no SQL Editor:
> `insert into public.admins (email) values ('email-da-pessoa@exemplo.com');`

### 3. Ligar o site ao Supabase

Em **Project Settings → API** (ou **Data API**), copie:

- **Project URL** → `supabaseUrl`
- chave **anon public** → `supabaseAnonKey`

Cole os dois em `catalogo/config.js`. Configure também `whatsappNumber` (ex: `5547999999999`) e o nome da loja.

> A chave *anon* é pública por natureza e pode ficar no código. Quem protege os dados são as regras do `supabase.sql`. **Nunca** coloque a chave `service_role` no site.

### 4. Publicar o site (GitHub Pages)

1. No GitHub, abra o repositório e vá em **Settings → Pages**.
2. Em *Source*, escolha **Deploy from a branch**, depois a branch `main` e a pasta `/ (root)`, e clique em **Save**.
3. Depois de alguns minutos, os links ficam assim:
   - Catálogo (para o cliente): `https://SEU-USUARIO.github.io/Projeto-Senai/catalogo/`
   - Painel: `https://SEU-USUARIO.github.io/Projeto-Senai/catalogo/admin.html`

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
