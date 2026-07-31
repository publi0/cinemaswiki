# CinemasWiki

Catálogo técnico colaborativo de cinemas e salas paulistas, publicado como site
estático em Cloudflare Pages.

O projeto documenta projeção, resolução, tela, som, capacidade, tecnologias e
fontes. Não há banco de dados ou servidor em produção: os dados versionados no
repositório geram o site completo durante o build.

## Arquitetura

- Interface em HTML, CSS e JavaScript.
- Um arquivo de autoria por cinema em `data/cinemas/`.
- Schema executável em `data/schema.json`.
- Validação com Ajv, incluindo enums, tipos, URLs, datas e slugs únicos.
- Build estático em `dist/`.
- Catálogo consolidado gerado em `dist/data/cinemas.json`.
- Páginas pré-renderizadas para redes, cinemas e salas.
- Sitemap e robots.txt gerados automaticamente.
- Contribuições revisadas por pull request.

## Desenvolvimento local

Instale as dependências:

```sh
npm install
```

Valide os dados e o JavaScript:

```sh
npm test
```

Gere o site:

```sh
npm run build
```

Veja a cobertura atual dos campos:

```sh
npm run coverage
```

Sirva a pasta gerada:

```sh
python3 -m http.server 8080 --directory dist
```

Depois acesse `http://localhost:8080`.

## Como os dados são publicados

1. Edite ou crie `data/cinemas/<slug-do-cinema>.json`.
2. Execute `npm run validate`.
3. Execute `npm run build`.
4. Revise a página gerada e abra o pull request.

O arquivo consolidado não deve ser editado manualmente: ele existe somente em
`dist/` e é recriado em cada build.

## Atualização pela ANCINE

O importador reproduz o cruzamento sala a sala com o cadastro mensal público da
ANCINE. Ele preenche capacidade, registros e acessibilidade sem substituir uma
capacidade divergente que já tenha uma fonte mais específica:

```sh
node scripts/import-ancine-rooms.mjs /caminho/salas-de-exibicao-e-complexos.csv
```

A fonte oficial pode ser baixada em
[Salas de Exibição e Complexos Registrados](https://www.gov.br/ancine/pt-br/oca/cinema/arquivos.csv/salas-de-exibicao-e-complexos.csv/@@download/file).
Como cadastros regulatórios podem ficar atrás da operação real, mudanças de
numeração e fechamento também devem ser conferidos na programação atual e em
fontes recentes.

## Cloudflare Pages

Configure o projeto com:

- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: 22

O domínio esperado é `https://cinemaswiki.publio.dev`.

## Qualidade e segurança

- O workflow `.github/workflows/validate.yml` executa testes e build em pushes e
  pull requests.
- Textos do catálogo são escapados antes de entrar no HTML.
- URLs externas aceitam apenas HTTP ou HTTPS.
- Assets sem hash são revalidados em vez de receber cache imutável.
- Dados consolidados podem ficar em cache por uma hora com revalidação em
  segundo plano.

## Próximos passos

- Ampliar a cobertura e a qualidade das fontes.
- Adicionar mais cidades.
- Adicionar mapa quando houver dados geográficos suficientes.
- Automatizar relatórios de registros desatualizados.
