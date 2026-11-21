# Painel de vídeos da Lozy

Ferramenta interna para subir, cadastrar e organizar os vídeos do site **sem mexer em código**.
Ela roda **só no seu computador** (não existe na internet) e atualiza os arquivos do site. Nada vai ao ar até você revisar e confirmar.

## Como abrir

No Terminal, dentro da pasta do site:

```bash
npm run admin
```

O painel abre no navegador em `http://127.0.0.1:4321`. Para fechar, volte ao Terminal e aperte `Ctrl+C`.
Se a porta estiver ocupada: `PORT=4400 npm run admin`.

Precisa de **Node**, **ffmpeg** e **git** instalados (`brew install ffmpeg` se faltar o ffmpeg). Não precisa de `npm install`.

## Como usar

**Adicionar um vídeo**
1. Clique em **+ Novo vídeo** e arraste o arquivo (MP4, MOV, M4V, MKV, WEBM ou AVI).
2. O painel comprime para a web (H.264, até 1080p, ~5 Mbps), igual aos vídeos atuais.
3. Arraste a barra para escolher o quadro da **capa**.
4. Preencha **Cliente** e **Nicho** (obrigatórios). **Título** aparece ao lado do cliente no carrossel. O **identificador** (nome do arquivo e do link) é gerado sozinho e não muda depois.
5. Marque **Mostrar na home** se for destaque. Clique em **Salvar**.

**Editar / trocar vídeo ou capa**: botão **Editar** na linha do vídeo. Para trocar o vídeo, envie outro arquivo; para trocar só a capa, mexa na barra.

**Ordem**: na aba **Work**, arraste pela alça (⠿) ou use as setas. A ordem é a do carrossel do Work (e do "Todos"). Com um nicho filtrado a ordem fica travada. Na aba **Home**, a ordem é a da página inicial.

**Ocultar / Mostrar**: o botão **Ocultar** tira o vídeo do site (Home, Work e a página própria, que passa a mostrar "Projeto não encontrado") **sem apagar nada**. O cadastro, o vídeo e a capa continuam guardados, e ao clicar em **Mostrar** ele volta exatamente no mesmo lugar da ordem. Na lista, o vídeo oculto aparece esmaecido com o selo "Oculto". Se todos os vídeos de um nicho ficarem ocultos, o botão desse nicho some do seletor do Work. **Atenção:** oculto não é privado. O arquivo continua dentro do site, e quem souber o endereço dele (`assets/videos/projects/...`) consegue abri-lo.

**Remover**: botão **Remover** (pergunta se apaga os arquivos também). Use quando não quiser mais o vídeo; para tirar só por um tempo, prefira **Ocultar**.

## Publicar (com revisão)

1. Clique em **Ver site (prévia)** e confira como ficou (é o site de verdade, rodando no seu computador).
2. Clique em **Revisar e publicar**. A tela mostra o que vai mudar: vídeos novos, alterados, removidos, ordem, tamanho dos arquivos.
3. Marque **"Revisei a prévia e quero publicar"** e clique em **Publicar no site**. O painel cria o registro (commit) e envia para a `main`.
4. O GitHub Pages leva de 1 a 3 minutos para atualizar. Depois use recarregar forçado no navegador (Cmd+Shift+R).

O painel só publica a partir da branch `main` e só inclui: `data/`, `index.html`, `work.html`, `projeto.html` e `assets/videos/`. Qualquer outra mudança na pasta aparece na revisão como "fora do painel" e **não** é publicada.

## Limites importantes

- **100 MB por arquivo**: o GitHub recusa arquivos maiores. Com a compressão padrão isso dá uns 3 a 4 minutos de vídeo. O painel avisa e bloqueia a publicação.
- **~1 GB no total**: o GitHub Pages recomenda sites de até cerca de 1 GB. Hoje os vídeos pesam ~680 MB. O painel mostra o total e avisa quando passa de 900 MB. Quando chegar perto, o próximo passo é mover os vídeos para um armazenamento externo (por exemplo Cloudflare R2 ou Bunny).

## Como funciona por baixo

- Tudo vem de **`data/projects.json`**: lista de projetos (cliente, título, categoria, nicho, ano, entrega, descrição, e `"hidden": true` nos ocultos), a ordem do Work e a ordem da home.
- `admin/build-site.js` gera, a partir dessa lista, as partes das páginas entre os marcadores `projects:...:start` e `projects:...:end` em `index.html`, `work.html` e `projeto.html`. **Não edite à mão o que está entre os marcadores**: a próxima geração sobrescreve.
- Para regerar sem o painel: `npm run build`. Para só conferir se as páginas estão em dia: `npm run check`.
- Vídeos e capas ficam em `assets/videos/projects/<identificador>.mp4` e `<identificador>-poster.jpg`.
- Envios em andamento ficam em `admin/.tmp/` (ignorado pelo git; limpo depois de 1 dia).

## Segurança

O servidor escuta só em `127.0.0.1` (este computador), recusa pedidos de outros endereços ou de outros sites abertos no navegador, e valida os nomes de arquivo. Por isso não precisa de senha. Esta pasta `admin/` também vai ao ar junto com o site, mas a tela não funciona sem o servidor local e não contém senhas.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| "ffmpeg não foi encontrado" | `brew install ffmpeg` |
| "A porta 4321 já está em uso" | O painel já está aberto em outra janela, ou use `PORT=4400 npm run admin` |
| "Você não está na main" | Abra o Terminal na pasta principal do site (branch `main`) |
| O envio falha ("não consegui ler este vídeo") | O arquivo pode estar corrompido; teste abrir no QuickTime |
| A publicação falha no envio | O registro foi criado; rode `git push` na pasta, ou peça ajuda |
