# Lozy Creative — Site

Site institucional da Lozy Creative. HTML/CSS/JS puro, sem build, para GitHub Pages.

## Arquivos

- `index.html` — Home
- `work.html` — Portfólio (um carrossel de vídeos por categoria)
- `projeto.html` — Case study dinâmico (`projeto.html?id={slug}`)
- `sobre.html` — Sobre
- `contato.html` — Contato
- `assets/` — Logos e símbolos da marca (JPEG com fundo sólido, requer extração)

## Como rodar localmente

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Servir por HTTP é necessário: o `projeto.html` lê query params (`?id=`) e
carrega os vídeos de `assets/videos/` — isso falha em `file://`.

## Deploy

Push para a branch principal do repo com GitHub Pages ativo.
Domínio: `lozycreative.com.br` (DNS no Registro.br apontando para o GitHub Pages; o `CNAME` do repo é gerenciado pelo Pages).

## Onde editar o quê

| O quê | Onde |
|---|---|
| Dados dos projetos (título, descrição, metadados) | objeto `PROJECTS` no `<script>` do `projeto.html` |
| Projetos do Work | blocos `.showcase-panel` no `work.html` (um carrossel por seção) |
| Projetos do carrossel da home | blocos `.showcase-panel` no `index.html` |
| Comportamento dos carrosséis | `showcase.js` + bloco "Carrossel infinito" do `styles.css` |
| Paleta | bloco `:root` no `<style>` de cada página |

**Atenção:** o CSS está duplicado em cada página. Alterações de paleta ou de
componentes compartilhados (nav, CTA, rodapé, botões) precisam ser replicadas
nos 5 arquivos — ou, melhor, extraídas para um `styles.css` compartilhado.

Ver `BRIEFING.md` para contexto completo, identidade, pendências e decisões.
