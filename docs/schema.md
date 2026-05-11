# Schema dos dados

Os dados iniciais ficam em `data/cinemas.json`.

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
  "last_verified": "2026-05-10",
  "rooms": []
}
```

## Sala

```json
{
  "name": "Sala 1",
  "slug": "sala-1",
  "format": "Convencional",
  "projection": {
    "technology": "Digital",
    "resolution": "4K",
    "light_source": "Laser"
  },
  "screen": {
    "type": "Plana",
    "aspect_ratio": "2.39:1",
    "width_m": null,
    "height_m": null
  },
  "sound": {
    "format": "Dolby Atmos",
    "channels": null,
    "power_watts": null
  },
  "seats": null,
  "sources": []
}
```

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

## Valores aceitos para `format`

O campo `format` descreve a categoria técnica da sala — não o nome comercial
da rede. Nomes de marketing (XD, XPLUS, Platinum, Macro XE, Laser Lounge,
Bradesco Prime etc.) não são valores válidos para `format`; vão em `notes`.

| Valor | Quando usar |
| --- | --- |
| `Convencional` | Sala padrão sem recurso premium |
| `Grande Formato` | Tela maior com projeção aprimorada — XD, XPLUS, Cinépic, Macro XE etc. |
| `Poltrona Reclinável` | Poltronas reclináveis — VIP, Platinum, DE LUX, Bradesco Prime etc. |
| `Poltrona com Movimento` | Movimento mecânico sincronizado ao filme (ex.: D-Box) |
| `IMAX` | Sala certificada IMAX |
| `4DX` | Sala certificada CJ 4DPlex |
| `Tela LED` | Tela autoemissiva sem projetor (ex.: Samsung Onyx) |
| `Projeção Laser` | Sala cujo único diferencial é a projeção laser |
| `3D` | Sala configurada exclusivamente para exibição 3D |
| `A confirmar` | Formato desconhecido ou a verificar |

## Convencoes

- Use `null` para numeros desconhecidos.
- Use `"A confirmar"` para texto desconhecido.
- Preserve acentos em nomes oficiais quando possivel.
- Atualize `last_verified` quando uma fonte for revista.
- Nomes de marca em `technologies[].name` sao aceitos como referencia, mas
  sempre acompanhados de uma descricao tecnica em `notes`.
