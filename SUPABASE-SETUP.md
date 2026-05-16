## Objetivo

Criar o projeto no Supabase e conectar este catalogo sem usar mais planilha.

## O que eu ja deixei pronto no projeto

- esquema do banco: [supabase/schema.sql](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\supabase\schema.sql)
- dados iniciais: [supabase/seed-local-data.sql](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\supabase\seed-local-data.sql)
- modelagem explicada: [SUPABASE-MODELAGEM.md](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\SUPABASE-MODELAGEM.md)
- configuracao do site: [app-config.js](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\app-config.js)

## Passo 1. Criar o projeto

No Supabase:

1. Clique em `New project`
2. Escolha sua organization
3. Nome do projeto:
   `vw-couros`
4. Escolha uma senha forte para o banco
5. Escolha a regiao mais proxima
6. Clique em `Create new project`

## Passo 2. Rodar o banco

Quando o projeto abrir:

1. Va em `SQL Editor`
2. Crie uma nova query
3. Cole todo o arquivo [supabase/schema.sql](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\supabase\schema.sql)
4. Execute
5. Crie outra query
6. Cole [supabase/seed-local-data.sql](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\supabase\seed-local-data.sql)
7. Execute

## Passo 3. Criar o primeiro acesso do painel

1. Va em `Authentication`
2. Clique em `Add user`
3. Crie seu usuario com email e senha
4. Copie o `user id` desse usuario
5. Volte ao `SQL Editor`
6. Execute:

```sql
insert into public.panel_users (user_id, full_name, is_active)
values ('SEU-USER-ID-AQUI', 'Virna Rocha', true)
on conflict (user_id) do update
set
  full_name = excluded.full_name,
  is_active = excluded.is_active;
```

## Passo 4. Pegar as chaves do projeto

No Supabase:

1. Va em `Project Settings`
2. Va em `API`
3. Copie:
   - `Project URL`
   - `anon public key`

## Passo 5. Colar no projeto local

Abra [app-config.js](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\app-config.js) e preencha:

```js
supabaseUrl: "SUA_PROJECT_URL",
supabaseAnonKey: "SUA_ANON_KEY",
```

## Passo 6. Testar

1. Abra [index.html](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\index.html)
2. Abra [admin.html](C:\Users\Virna Rocha\OneDrive\Documentos\Claude\Projects\Landing page wvcouros\admin.html)
3. Entre com o usuario criado no Supabase Auth

## Quando terminar

Me envie estes 2 valores:

- `supabaseUrl`
- `supabaseAnonKey`

ou me diga apenas:

`Projeto criado e SQL rodado`

Que eu sigo com a conexao final, reviso o painel e depois removo o legado da planilha do projeto.
