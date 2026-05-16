## Objetivo

Sair da planilha e levar o catalogo da VW Couros para o Supabase com:

- catalogo publico sem login
- painel privado com login
- upload real de imagens
- estoque por cor
- status por cor
- produto arquivado sem excluir historico
- ordem manual no catalogo
- selo visual no card

## O que ja existe hoje e sera aproveitado

Campos ja usados pelo site atual:

- `id`
- `ativo`
- `ordem`
- `nome`
- `preco`
- `imagem`
- `imagens`
- `variacoes`
- `descricao`
- `cores`
- `detalhes`
- `pagamento`
- `entrega`

O que muda no novo desenho:

- `ativo` sai da ideia de planilha e vira `catalog_status`
- `pagamento` e `entrega` viram configuracao global do site
- imagem deixa de ser link colado manualmente e passa a usar upload no Storage
- estoque passa a existir por cor
- cada cor pode ter imagem propria

## Decisoes fechadas

- site publico sem login
- painel privado com login
- um unico tipo de usuario do painel
- produto nao e apagado; ele e inativado ou arquivado
- status operacional separado de selo visual
- produto continua aparecendo se alguma cor estiver esgotada
- cor esgotada mostra selo, foto mais suave e botao de compra desabilitado
- CTA da cor indisponivel: `Sob consulta`

## Estados do sistema

### Status do produto

Usado para controlar se o produto entra ou nao no catalogo:

- `ativo`
- `inativo`
- `arquivado`

### Status da cor

Usado para comportamento comercial da variacao:

- `disponivel`
- `esgotado`
- `sob_encomenda`

### Selos visuais

Usados como destaque de marketing:

- `lancamento`
- `mais_vendida`
- `edicao_limitada`
- `promocao`

## Estrutura recomendada

### 1. `panel_users`

Usuarios autorizados a entrar no painel.

Campos:

- `user_id` UUID PK, referencia `auth.users.id`
- `full_name` TEXT
- `is_active` BOOLEAN
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

Observacao:
- o login real fica no Supabase Auth
- esta tabela guarda quem pode usar o painel
- o primeiro usuario do painel deve ser liberado manualmente no inicio

### 2. `badge_options`

Lista controlada de selos que podem aparecer no site.

Campos:

- `code` TEXT PK
- `label` TEXT
- `sort_order` INT
- `is_active` BOOLEAN
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

Exemplos:

- `lancamento`
- `mais_vendida`
- `edicao_limitada`
- `promocao`

### 3. `site_settings`

Configuracoes globais do catalogo.

Campos:

- `id` BOOLEAN PK fixo em `true`
- `whatsapp_number` TEXT
- `default_payment_text` TEXT
- `default_delivery_text` TEXT
- `updated_by` UUID
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

Uso:

- centralizar o texto de pagamento
- centralizar o texto de entrega
- permitir trocar numero de WhatsApp sem editar produto por produto

### 4. `products`

Tabela principal das bolsas.

Campos:

- `id` UUID PK
- `slug` TEXT UNIQUE
- `sku` TEXT UNIQUE
- `name` TEXT
- `description` TEXT
- `features` TEXT[] ou JSON
- `material` TEXT NULL
- `dimensions` TEXT NULL
- `price` NUMERIC(10,2)
- `catalog_status` TEXT
- `badge_code` TEXT NULL
- `sort_order` INT
- `created_by` UUID NULL
- `updated_by` UUID NULL
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

Regras:

- `catalog_status = ativo`: aparece no site
- `catalog_status = inativo`: some do site, continua no painel
- `catalog_status = arquivado`: some do site e fica como historico interno

### 5. `product_colors`

Tabela de variacoes por cor.

Campos:

- `id` UUID PK
- `product_id` UUID FK -> `products.id`
- `color_name` TEXT
- `color_slug` TEXT
- `stock_quantity` INT NULL
- `color_status` TEXT
- `primary_image_path` TEXT NULL
- `primary_image_url` TEXT NULL
- `sort_order` INT
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

Regras:

- cada produto pode ter varias cores
- cada cor pode ter estoque proprio
- cada cor pode ter imagem principal propria
- `stock_quantity` pode nascer nulo na migracao para evitar travar o cadastro inicial

Comportamento visual:

- `disponivel`: foto normal, botao normal
- `esgotado`: selo, foto transparente, botao desabilitado
- `sob_encomenda`: selo proprio, botao `Sob consulta`

### 6. `product_images`

Galeria geral do produto e galeria opcional por cor.

Campos:

- `id` UUID PK
- `product_id` UUID FK -> `products.id`
- `product_color_id` UUID NULL FK -> `product_colors.id`
- `storage_path` TEXT
- `public_url` TEXT
- `alt_text` TEXT NULL
- `is_primary` BOOLEAN
- `sort_order` INT
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

Como usar:

- se `product_color_id` for `NULL`, a imagem e da galeria geral do produto
- se `product_color_id` tiver valor, a imagem pertence a uma cor especifica

## Bucket de imagens

Criar bucket publico:

- `product-images`

Motivo:

- o site publico precisa exibir as imagens sem autenticar
- o upload continua restrito a usuarios do painel

Padrao recomendado de caminho:

- `products/{product_id}/cover.jpg`
- `products/{product_id}/gallery-01.jpg`
- `products/{product_id}/colors/{color_id}/primary.jpg`
- `products/{product_id}/colors/{color_id}/detail-01.jpg`

## Leitura publica e escrita privada

### Leitura publica

O site publico pode:

- ler `site_settings`
- ler `badge_options`
- ler produtos com `catalog_status = ativo`
- ler cores ligadas a produtos ativos
- ler imagens ligadas a produtos ativos

### Escrita privada

So usuarios logados e aprovados em `panel_users` podem:

- criar produtos
- editar produtos
- subir imagens
- ajustar estoque
- alterar status
- mudar ordem do catalogo
- gerenciar configuracoes do site

## Comportamento recomendado no frontend

### Card do catalogo

- usa imagem principal da cor padrao ou a principal do produto
- mostra selo se houver `badge_code`
- se a cor selecionada estiver `esgotado`, aplicar opacidade na foto

### Modal do produto

- listar cores
- ao trocar a cor, trocar imagem principal se existir
- se a cor estiver `esgotado`, desabilitar compra
- CTA vira `Sob consulta`
- se a cor estiver `sob_encomenda`, CTA tambem pode usar `Sob consulta`

## Mapeamento da planilha atual para o banco

### Colunas que entram direto

- `id` -> pode virar `slug` se estiver consistente
- `nome` -> `products.name`
- `preco` -> `products.price`
- `descricao` -> `products.description`
- `ordem` -> `products.sort_order`
- `detalhes` -> `products.features`

### Colunas que mudam de formato

- `ativo` -> `products.catalog_status`
- `cores` -> vira varias linhas em `product_colors`
- `imagem` -> vira imagem principal do produto
- `imagens` -> vira linhas em `product_images`
- `variacoes` -> vira `product_colors.primary_image_url` ou imagens ligadas a cor

### Colunas que deixam de ser por produto

- `pagamento` -> `site_settings.default_payment_text`
- `entrega` -> `site_settings.default_delivery_text`

### Campos novos a preencher

- `sku`
- `material`
- `dimensions`
- `features`
- `stock_quantity`
- `color_status`
- `badge_code`

## Estrategia de migracao

### Fase 1

- criar projeto Supabase
- criar tabelas
- criar bucket `product-images`
- cadastrar primeiro usuario do painel manualmente

### Fase 2

- importar produtos atuais
- subir imagens existentes
- ligar imagens aos produtos e cores
- preencher SKU, material e dimensoes
- revisar estoque por cor

### Fase 3

- adaptar o LP para ler do Supabase
- usar `site_settings` para WhatsApp, pagamento e entrega
- aplicar selo, opacidade e bloqueio de compra por cor

### Fase 4

- construir painel privado
- cadastro e edicao de produto
- upload de imagem
- edicao de cor, estoque e status
- ordenacao manual

## Forma mais pratica de implementar

### Primeiro release

Fazer o minimo seguro e util:

- banco pronto
- leitura no site
- painel simples de produtos
- upload de imagem
- controle de cores
- estoque por cor

### Depois

Adicionar sem pressa:

- historico de alteracoes
- filtros no painel
- duplicar produto
- rascunho visual mais sofisticado

## Proximo passo recomendado

Implementar a base em 3 entregas:

1. SQL do Supabase + politicas de acesso
2. migracao do LP para ler o banco
3. painel privado para cadastro e estoque
