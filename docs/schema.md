# Schema dos dados

Cada cinema fica em `data/cinemas/<slug-do-cinema>.json`. O schema executável
fica em `data/schema.json`, e o catálogo consolidado é gerado em
`dist/data/cinemas.json` por `npm run build`.

Valide os arquivos com:

```sh
npm run validate
```

## Cinema

```json
{
  "slug": "cinema-exemplo",
  "name": "Cinema Exemplo",
  "network": {
    "slug": "rede-exemplo",
    "name": "Rede Exemplo"
  },
  "city": "Sao Paulo",
  "state": "SP",
  "neighborhood": "Bairro",
  "address": "Endereco",
  "ancine_registry": "12345",
  "last_verified": "2026-05-10",
  "rooms": []
}
```

## Sala

```json
{
  "name": "Sala 1",
  "slug": "sala-1",
  "ancine_registry": "5000001",
  "technologies": [
    {
      "name": "IMAX",
      "type": "system"
    }
  ],
  "projection": {
    "resolution": "4K",
    "light_source": "Laser RGB"
  },
  "screen": {
    "geometry": "Plana",
    "aspect_ratio": "2.39:1",
    "width_m": null,
    "height_m": null
  },
  "sound": {
    "format": "Dolby Atmos",
    "processor": null,
    "channels": null,
    "audio_streams": null,
    "power_watts": null
  },
  "seats": null,
  "accessibility": {
    "wheelchair_seats": null,
    "reduced_mobility_seats": null,
    "obese_seats": null,
    "ramp_to_seats": null,
    "ramp_to_room": null,
    "accessible_restrooms": null
  },
  "sources": []
}
```

`ancine_registry` guarda o identificador público do complexo ou da sala na
ANCINE. Em `accessibility`, números e respostas desconhecidos ficam como
`null`; não use zero para significar “não pesquisado”.

## Fonte

```json
{
  "type": "official",
  "url": "https://...",
  "note": "Pagina oficial da sala"
}
```

Tipos sugeridos:

- `official`
- `press`
- `photo`
- `visit`
- `user_report`
- `inferred`
- `placeholder`

## Classificação técnica

Não existe um campo genérico de formato. A sala é descrita diretamente por
`projection`, `screen` e `sound`. `technologies` é uma lista fechada e aceita
somente estas combinações:

- `{"name": "IMAX", "type": "system"}`
- `{"name": "3D", "type": "experience"}`
- `{"name": "4DX", "type": "experience"}`

Cada classificação pode aparecer no máximo uma vez por sala. Qualquer outro
nome, tipo, combinação ou propriedade adicional é rejeitado pelo schema.
Conforto não é tecnologia de projeção ou som e pode ficar em `notes`.

Valores categóricos usam grafia canônica:

- Projeção especial: `Película 70 mm` ou `Tela LED`.
- Fonte de luz: `Laser`, `Laser RGB`, `Xenon` ou `LED`. Laser e Xenon não
  devem ser repetidos em `projection.technology`.
- Resolução: `2K` ou `4K`.
- Formato de som: `Dolby Atmos`, `Dolby Digital 5.1`,
  `Dolby Digital 7.1` ou `IMAX`.
- Layout de canais: `5.1`, `7.1` ou `11.1`.
- Processamento: `Harman Quantum Logic (JBL)`.
- Tela: tecnologia (`LED modular`), superfície (`Perolizada`) e geometria
  (`Plana` ou `Curva`) são campos independentes.
- Sistema: `IMAX`.
- Experiência: `3D` ou `4DX`. O segundo indica efeitos físicos sincronizados.
- Samsung Onyx: `Tela LED` em `projection.technology`, `Samsung` em
  `projection.brand` e `Onyx` em `projection.model`.

`IMAX` é sempre o sistema. `Laser` e `Xenon` ficam em
`projection.light_source`; `Película 70 mm` fica em `projection.technology`.
O antigo valor `IMAX with Laser` é normalizado como sistema `IMAX` com fonte
de luz `Laser`.

`4DX` não é tratado como sistema de projeção. Ele é um item `experience` que
indica efeitos físicos; projeção, resolução e som continuam nos campos próprios.

`Grande Formato` não é aceito como tecnologia porque não define uma
especificação. Decomponha a informação em projeção, resolução, tela e som.
`Digital` e `Multicanal` isolados também são insuficientes e devem ficar como
`A confirmar` até haver uma classificação técnica específica.

`Surround 11.1` não é formato: registre `11.1` em `sound.channel_layout`.
Quantum Logic é processamento e fica em `sound.processor`. Em áudio baseado em
objetos, capacidade de streams fica em `sound.audio_streams`, não em `channels`.

## Convencoes

- Use `null` para numeros desconhecidos.
- Use `"A confirmar"` para texto desconhecido.
- Preserve acentos em nomes oficiais quando possivel.
- Atualize `last_verified` quando uma fonte for revista.
- Não crie novos valores em `technologies`; amplie o schema e os testes apenas
  após uma decisão explícita de taxonomia.
- O nome do arquivo deve corresponder exatamente ao campo `slug`.
- Slugs de cinema e sala devem ser únicos.
- URLs de fontes, quando preenchidas, devem usar HTTP ou HTTPS.
- Toda fonte deve ter URL ou observação; placeholders vazios não são aceitos.
- Execute `npm run normalize` antes de validar uma contribuição extensa.
