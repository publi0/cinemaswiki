# CinemasWiki

Catalogo tecnico colaborativo de cinemas paulistas, pensado para publicar no
GitHub Pages.

O projeto documenta cinemas e salas com dados como tecnologia de projecao,
resolucao, tipo e tamanho de tela, sistema de som, quantidade de canais,
potencia, capacidade e fontes.

## Direcao tecnica

- Site estatico em HTML, CSS e JavaScript.
- Dados em `data/cinemas.json`.
- Estrutura de dados em rede, cinema e salas.
- Hospedagem via Cloudflare Pages em `cinemaswiki.publio.dev`.
- Contribuicoes por pull request.
- Dados tecnicos acompanhados de fonte sempre que disponivel.

## Como ver localmente

Como o site usa `fetch()` para carregar `data/cinemas.json`, rode um servidor
estatico simples na raiz do projeto:

```sh
python3 -m http.server 8080
```

Depois acesse:

```txt
http://localhost:8080
```

## Publicacao no Cloudflare Pages

1. Crie o repositorio `cinemaswiki` no GitHub e envie os arquivos.
2. No Cloudflare Pages, conecte o repositorio (sem configuracao de build).
3. Adicione o dominio customizado `cinemaswiki.publio.dev`.

O site sera publicado em:

```txt
https://cinemaswiki.publio.dev
```

## Proximos passos

- Trocar o registro de exemplo por cinemas reais.
- Separar dados por arquivo quando o catalogo crescer.
- Criar paginas individuais por cinema, alem das paginas de sala.
- Adicionar mapa e filtros por cidade, formato, som e projecao.
- Adicionar validacao automatica do schema.
