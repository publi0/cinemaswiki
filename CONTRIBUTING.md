# Como contribuir

O CinemasWiki aceita contribuicoes com novos cinemas, novas salas e correcoes de
dados existentes principalmente por GitHub Issues.

Voce tambem pode entrar em contato por:

- Twitter: [@publi0](https://twitter.com/publi0)
- Email: [felipe@publio.dev](mailto:felipe@publio.dev)

## Regra principal

Todo dado tecnico deve ter uma fonte quando possivel. No inicio do catalogo,
tambem aceitamos campos incompletos, desde que fiquem marcados como
`"A confirmar"` ou `null`.

## Issues

Use os modelos em `.github/ISSUE_TEMPLATE/`:

- `Novo cinema ou sala`: para cadastrar uma nova rede, cinema ou sala.
- `Correção de dados`: para corrigir ou completar algo que já existe.

Preencha só o que souber. O importante é identificar rede, cinema, sala e fonte.

## Fontes aceitas

- Pagina oficial do cinema ou da rede.
- Materia de imprensa.
- Foto da sala, cabine, placa tecnica ou material de divulgacao.
- Visita presencial documentada.
- Relato identificado.

## Campos desconhecidos

Use `null` para numero desconhecido e `"A confirmar"` para texto desconhecido.
Nao invente potencia, dimensoes de tela, resolucao ou quantidade de canais.

## Padronizacao dos dados

O campo `format` descreve o que a sala tecnicamente oferece — nao o nome
comercial da rede. Nomes de marketing (XD, XPLUS, Platinum, Macro XE, Laser
Lounge, Bradesco Prime etc.) ficam em `notes` ou na descricao da fonte, nunca
no campo `format`.

Exemplos de por que isso importa: "Cinemark XD" e "UCI XPLUS" sao labels
proprietarios sem especificacao publica; "IMAX" e "Dolby Atmos" tem
especificacoes publicadas e auditadas por entidades independentes.

### Valores aceitos para `format`

| Formato | Quando usar |
| --- | --- |
| `Convencional` | Sala padrao sem recurso premium |
| `Grande Formato` | Tela maior que convencional com projecao aprimorada (XD, XPLUS, Cinepic, Macro XE etc.) |
| `Poltrona Reclinavel` | Sala com poltronas reclinaveis independente do nome comercial (VIP, Platinum, DE LUX etc.) |
| `Poltrona com Movimento` | Poltronas com movimento mecanico sincronizado ao filme (ex.: tecnologia D-Box) |
| `IMAX` | Sala certificada IMAX com especificacao publicada |
| `4DX` | Sala certificada CJ 4DPlex com efeitos fisicos definidos |
| `Tela LED` | Tela autoemissiva LED sem projetor (ex.: Samsung Onyx) |
| `Projecao Laser` | Sala sem outro diferencial alem da projecao laser |
| `3D` | Sala configurada exclusivamente para exibicao 3D |
| `A confirmar` | Formato desconhecido ou a verificar |

### Padronizacao de outros campos

Use o valor padrao no campo principal e deixe nomes de marketing ou detalhes
adicionais em `notes`.

| Campo | Use | Em vez de |
| --- | --- | --- |
| Resolucao | `4K` | `4k`, `4K Ultra HD`, `UHD`, `Ultra HD` |
| Resolucao | `2K` | `2k`, `Digital 2K`, `DCI 2K` |
| Projecao | `laser` | `Laser`, `projecao laser`, `projetor laser` |
| Projecao | `Lâmpada Xenon` | `xenon`, `lamp-xenon`, `lampada xenon`, `lâmpada xenon` |
| Projecao | `LED` | `led`, `tela LED`, `cinema LED` |
| Formato | `IMAX` | `Imax`, `imax`, `IMAX Digital` |
| Formato | `4DX` | `4dx`, `sala 4D`, `4-DX` |
| Som | `Dolby Atmos` | `Atmos`, `dolby atmos`, `DOLBY ATMOS` |
| Som | `Dolby Digital 7.1` | `7.1`, `Dolby 7.1`, `digital 7.1` |
| Tela | `IMAX` | `imax`, `tela imax` |
| Tela | `LED modular` | `LED`, `tela de LED`, `Onyx LED` |
| Texto desconhecido | `A confirmar` | `nao sei`, `n/a`, `desconhecido`, campo vazio |
| Numero desconhecido | `null` | `0`, `-`, `n/a`, `desconhecido` |

## Checklist para pull request

- O cinema tem cidade, estado, rede e pelo menos uma sala.
- A rede esta preenchida em `network.name`, mesmo quando for independente.
- Cada sala tem fonte ou observacao explicando o que falta.
- A data `last_verified` foi atualizada.
