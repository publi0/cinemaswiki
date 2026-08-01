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

Cada cinema fica em um arquivo próprio:

```txt
data/cinemas/<slug-do-cinema>.json
```

Não edite `dist/data/cinemas.json`: esse arquivo é gerado automaticamente.

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

O catálogo não usa uma categoria genérica de formato. Cada sala é descrita por
especificações verificáveis de projeção, resolução, tela e som. O campo
`technologies` é fechado: aceita somente os sistemas `IMAX`, `Macro XE`, `XD`,
`Cinépic` e `UCI XPLUS`, além de `3D` ou `4DX`
como `experience`.

`Convencional`, VIP e tipos de poltrona não são classificações técnicas.
Informações de conforto podem ficar em `notes`, sem interferir nos filtros.

| Campo | O que registrar |
| --- | --- |
| `projection` | Película/tela direta, marca, modelo, resolução, fonte de luz e configuração |
| `screen` | Tecnologia, superfície, geometria, proporção e dimensões verificáveis |
| `sound` | Formato, layout, processamento, canais, caixas, streams e potência |
| `technologies` | Somente os sistemas e experiências permitidos pelo schema |
| `notes` | Nomes comerciais e contexto sem especificação comprovada |

### Padronizacao de outros campos

Use o valor padrao no campo principal e deixe nomes de marketing ou detalhes
adicionais em `notes`.

| Campo | Use | Em vez de |
| --- | --- | --- |
| Resolucao | `4K` | `4k`, `4K Ultra HD`, `UHD`, `Ultra HD` |
| Resolucao | `2K` | `2k`, `Digital 2K`, `DCI 2K` |
| Fonte de luz | `Laser` | `laser`, `projecao laser`, `projetor laser` |
| Fonte de luz | `Laser RGB` | `laser rgb`, `RGB laser` |
| Fonte de luz | `Xenon` | `xenon`, `lamp-xenon`, `Lâmpada Xenon` |
| Projecao | `Película 70 mm` | `70mm`, `70 mm`, `IMAX 70mm` |
| Projecao | `Tela LED` | `led`, `tela de LED`, `cinema LED` |
| Tecnologia | `IMAX` | `Imax`, `imax`, `IMAX Digital`, `IMAX with Laser` |
| Tecnologia | `XD` | `Cinemark XD`, `Extreme Digital Cinema` |
| Tecnologia | `Cinépic` | `Cinepic`, `CinéPic` |
| Tecnologia | `UCI XPLUS` | `XPLUS`, `XPlus`, `UCI XPlus` |
| Experiencia | `4DX` | `4dx`, `sala 4D`, `4-DX` |
| Marca e modelo | `Samsung` + `Onyx` | `Samsung Onyx` como item em `technologies` |
| Som | `Multicanal` | `surround`, `som multicanal` sem marca identificada |
| Som | `Dolby Digital` | `Dolby 5.1`, `Dolby 7.1`, `digital 7.1` |
| Som | `Dolby Atmos` | `Atmos`, `dolby atmos`, `DOLBY ATMOS` |
| Som | `DTS:X` | `DTS X`, `DTS-X`, `dts:x` |
| Layout de som | `5.1`, `7.1` ou `11.1` | número de canais informado junto ao formato |
| Processamento | `Harman Quantum Logic (JBL)` | `Quantum Logic`, `HQL` |
| Tecnologia da tela | `LED modular` | `LED`, `tela de LED`, `Onyx LED` |
| Superficie da tela | `Perolizada` | `perolizada` |
| Geometria da tela | `Plana` | `tela plana` |
| Texto desconhecido | `A confirmar` | `nao sei`, `n/a`, `desconhecido`, campo vazio |
| Numero desconhecido | `null` | `0`, `-`, `n/a`, `desconhecido` |

`Grande Formato` e combinações como `Grande Formato Laser 4K` não são
tecnologias válidas. Registre `Laser`, `4K`, dimensões da tela e som nos campos
próprios; preserve o nome comercial apenas em `notes` ou no nome da sala.
`Digital` isolado é insuficiente para identificar a projeção. Em som,
`Multicanal` é aceito como família genérica quando a fonte confirma reprodução
por canais, mas não informa uma tecnologia proprietária. Registre 5.1, 7.1 ou
11.1 separadamente em `sound.channel_layout`.

IMAX, Macro XE, XD, Cinépic e UCI XPLUS são sistemas de exibição. Registre `Laser` ou `Xenon` em
`projection.light_source` e `Película 70 mm` em `projection.technology`.
Não crie sistemas separados como `IMAX with Laser` ou `IMAX Digital`.

4DX é uma informação de experiência: use `type: "experience"`. Ele indica
efeitos físicos sincronizados e não substitui os dados de projeção, resolução
ou som. Para IMAX, use `type: "system"`. Samsung Onyx deve ser decomposto em
`projection.technology: "Tela LED"`, marca `Samsung` e modelo `Onyx`.

Não adicione novos nomes ou tipos a `technologies` e não repita uma
classificação na mesma sala. `Laser` e `Xenon` ficam apenas na fonte de luz. Em
som, mantenha formato, layout e processamento separados. Uma fonte só é válida
quando possui URL ou uma observação que identifique sua origem.

## Checklist para pull request

- O cinema tem cidade, estado, rede e pelo menos uma sala.
- A rede esta preenchida em `network.name`, mesmo quando for independente.
- Cada sala tem fonte ou observacao explicando o que falta.
- A data `last_verified` foi atualizada.
- O arquivo se chama exatamente `<cinema.slug>.json`.
- `npm run validate` termina sem erros.
- `npm run build` gera as páginas estáticas sem links quebrados.

## Validacao local

```sh
npm install
npm test
npm run test:taxonomy
npm run build
```

O schema executável fica em `data/schema.json`. O CI repete essas verificações
em todo pull request. `test:taxonomy` também tenta inserir categorias inválidas,
combinações incorretas e duplicatas para confirmar que o schema as rejeita.
