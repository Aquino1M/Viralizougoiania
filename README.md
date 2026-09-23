# Viralizougoiania 📰

Portal de notícias com foco em **Goiânia**, pronto para desenvolvimento local, GitHub e deploy na Vercel.

## Abrir no Windows com 1 clique

Na pasta principal do projeto, execute **`ABRIR_SITE.bat`**. Ele:

1. verifica se o Node.js e o npm estão instalados;
2. cria um `.env.local` seguro para desenvolvimento local, **sem Supabase falso**;
3. instala as dependências automaticamente se necessário;
4. inicia o servidor do Next.js;
5. abre `http://localhost:3000` no navegador.

O painel fica em `http://localhost:3000/admin`. Para encerrar o servidor, feche a janela do BAT ou pressione `Ctrl+C`.

Também há o **`ATUALIZAR_DEPENDENCIAS.bat`** caso queira executar apenas o `npm install`.

Se aparecer **`fetch failed` / `ENOTFOUND seu-projeto.supabase.co`**, feche o servidor e execute **`CORRIGIR_ERRO_SUPABASE.bat`**. As versões atuais também corrigem esse placeholder automaticamente ao abrir pelo `ABRIR_SITE.bat`.

## Abas/editorias editáveis no painel

No painel administrativo, abra **Abas / editorias**. Nessa tela é possível:

- criar uma editoria nova;
- mudar o nome e a URL da aba;
- reordenar as abas do menu;
- ocultar e reativar uma aba sem apagar as notícias;
- excluir uma aba vazia.

Quando uma aba é renomeada, as notícias cadastradas naquela editoria são atualizadas automaticamente para o novo nome. Uma aba que ainda possui notícias não pode ser excluída; nesse caso, mova/renomeie o conteúdo ou use **Ocultar**.

As abas ficam em `data/categories.json` no modo local. Na Vercel, elas são salvas na tabela `categories` do Supabase. Se você já configurou o banco usando uma versão anterior do projeto, execute **novamente** `supabase/schema.sql` no SQL Editor do Supabase para criar a nova tabela sem apagar as notícias existentes.


## O que já vem pronto

- Design responsivo próprio do **Viralizougoiania**.
- Home com manchete principal, destaques, faixa **Goiânia Agora**, últimas notícias e mais lidas.
- Editorias locais: Goiânia, Bairros, Trânsito, Segurança, Política, Empregos, Esportes, Eventos, Economia e Serviços.
- Página individual de cada matéria.
- Página automática por editoria.
- Painel administrativo protegido por senha.
- Criar, editar e excluir notícias.
- Publicar na hora, salvar como rascunho ou **programar data e horário**.
- Marcar uma matéria como destaque da home.
- Importar uma matéria externa pelo link para preencher título, resumo, imagem e fonte.
- Ler RSS/Atom e escolher notícias para levar ao editor.
- Fonte original registrada nas matérias importadas.
- SEO/Open Graph básico.
- Persistência local em desenvolvimento e suporte a Supabase em produção.

> O importador não copia automaticamente o texto integral de outras reportagens. Ele traz metadados e cria uma base de rascunho para a equipe redigir e revisar a publicação, mantendo a fonte original.

## Rodar no computador

```bash
npm install
npm run dev
```

Abra:

- Portal: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

Se `ADMIN_PASSWORD` não estiver definido no ambiente local, a senha temporária é:

```text
admin123
```

## Variáveis de ambiente

Para testar no computador, **não é necessário configurar Supabase**. O `ABRIR_SITE.bat` cria um ambiente local com senha `admin123` e usa os arquivos da pasta `data/`.

Se quiser usar o Supabase localmente, adicione manualmente ao `.env.local` apenas os dados **reais** do seu projeto:

```env
ADMIN_PASSWORD=sua-senha-forte
SESSION_SECRET=uma-chave-grande-e-aleatoria
SUPABASE_URL=https://SEU-ID-REAL.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_REAL
```

Valores de exemplo como `SEU-PROJETO` são ignorados automaticamente. Sem Supabase, o projeto usa `data/posts.json` e `data/categories.json` em desenvolvimento. Na Vercel, configure o Supabase para as publicações ficarem persistentes.

## Banco Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute `supabase/schema.sql`.
4. Copie `Project URL` para `SUPABASE_URL`.
5. Copie a `service_role key` para `SUPABASE_SERVICE_ROLE_KEY`.
6. Cadastre as mesmas variáveis na Vercel.

A `service_role key` deve existir somente no servidor. Nunca coloque essa chave em código de navegador ou variável `NEXT_PUBLIC_*`.

## GitHub

Dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "Viralizougoiania"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/viralizougoiania.git
git push -u origin main
```

## Vercel

1. Importe o repositório do GitHub na Vercel.
2. Framework: **Next.js**.
3. Cadastre `ADMIN_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Faça o deploy.

## Agendamento

Uma matéria com status `scheduled` e data futura não aparece no portal. Quando o horário chega, o backend a libera na próxima consulta ao site/API e atualiza o status para `published`.

## Importação de notícias

No painel, abra **Importar notícias**. Você pode:

- Colar o link direto de uma matéria e usar **Importar matéria**.
- Colar um feed RSS/Atom e usar **Carregar RSS**.
- Selecionar o item desejado e abrir no editor como rascunho.

O importador tenta obter título, descrição, imagem, nome da fonte e link original. Alguns sites podem bloquear robôs ou renderizar dados apenas via JavaScript; nesses casos, use RSS quando houver ou preencha os campos manualmente.

## Identidade do portal

Nome: **Viralizougoiania**  
Foco: **notícias locais de Goiânia**  
Estilo visual: portal moderno, rápido, forte em manchetes e leitura móvel.
