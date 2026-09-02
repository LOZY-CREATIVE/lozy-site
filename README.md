# Lozy Creative — Site

Site institucional da Lozy Creative. HTML/CSS/JS puro, sem build, para GitHub Pages.

## Arquivos

- `index.html` — Home
- `work.html` — Portfólio (grid selado, hover video)
- `projeto.html` — Case study dinâmico (`projeto.html?id={vimeoId}`)
- `sobre.html` — Sobre
- `contato.html` — Contato
- `assets/` — Logos e símbolos da marca (JPEG com fundo sólido, requer extração)

## Como rodar localmente

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Servir por HTTP é necessário: o `work.html` faz `fetch` na API do Vimeo e
o `projeto.html` lê query params — ambos falham em `file://`.

## Deploy

Push para a branch principal do repo com GitHub Pages ativo.
Domínio: `lozycreative.com`

## Onde editar o quê

| O quê | Onde |
|---|---|
| Dados dos projetos (título, descrição, metadados) | objeto `PROJECTS` no `<script>` do `projeto.html` |
| Projetos do grid | blocos `.w-card` no `work.html` |
| Projetos do acordeão da home | blocos `.showcase-panel` no `index.html` |
| Paleta | bloco `:root` no `<style>` de cada página |

**Atenção:** o CSS está duplicado em cada página. Alterações de paleta ou de
componentes compartilhados (nav, CTA, rodapé, botões) precisam ser replicadas
nos 5 arquivos — ou, melhor, extraídas para um `styles.css` compartilhado.

Ver `BRIEFING.md` para contexto completo, identidade, pendências e decisões.
