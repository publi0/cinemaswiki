import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRooms,
  compact,
  coverageCount,
  coverageValues,
  exhibitionSystems,
  isKnown,
  networkId,
  networkName,
  normalize,
  projectionDisplay,
  projectionValues,
  roomExperienceNames,
  roomId,
  roomTechnologyBrands,
  roomText,
  screenValues,
  slugify,
  technicalTechnologies,
  technologyBrandKey,
  usefulSources,
} from "../assets/catalog-utils.js";
import { soundValues } from "../assets/display-values.js";
import { readJson, room } from "./helpers.js";
import type { Cinema } from "../types/catalog.js";

test("normalização é case-insensitive e remove acentos", () => {
  assert.equal(normalize("  Dolby Atmos  "), "  dolby atmos  ");
  assert.equal(normalize("São Paulo — IMAX"), "sao paulo — imax");
  assert.equal(normalize(null), "");
  assert.equal(normalize(undefined), "");
});

test("valores desconhecidos não contam como conhecidos", () => {
  assert.equal(isKnown("4K"), true);
  assert.equal(isKnown(0), true);
  assert.equal(isKnown(false), true);
  assert.equal(isKnown("A confirmar"), false);
  assert.equal(isKnown(""), false);
  assert.equal(isKnown(null), false);
  assert.equal(compact(["4K", "A confirmar", null, "Laser"]), "4K · Laser");
  assert.equal(compact([null, "A confirmar"]), "A confirmar");
});

test("projeção prioriza tecnologia e trata Laser RGB como dois filtros", () => {
  assert.deepEqual(
    projectionValues({ projection: { technology: "Tela LED", light_source: "Laser" } }),
    ["Tela LED"],
  );
  assert.deepEqual(
    projectionValues({ projection: { technology: "A confirmar", light_source: "Laser RGB" } }),
    ["Laser", "Laser RGB"],
  );
  assert.deepEqual(
    projectionValues({ projection: { light_source: "Xenon" } }),
    ["Xenon"],
  );
  assert.deepEqual(projectionValues({ projection: {} }), []);
  assert.equal(projectionDisplay({ projection: {} }), "A confirmar");
  assert.equal(projectionDisplay({ projection: { light_source: "Laser RGB" } }), "Laser RGB");
});

test("valores de tela e som mantêm dimensões independentes", () => {
  assert.deepEqual(
    screenValues({ screen: { technology: "LED modular", surface: "Perolizada", geometry: "Plana", aspect_ratio: "1.90:1" } }),
    ["LED modular", "Perolizada", "Plana", "1.90:1"],
  );
  assert.deepEqual(soundValues({ sound: { format: "Dolby Digital", channel_layout: "7.1" } }), ["Dolby Digital", "7.1"]);
  assert.deepEqual(soundValues({ sound: { format: "A confirmar", channel_layout: "5.1" } }), ["5.1"]);
  assert.deepEqual(soundValues({}), []);
});

test("fontes úteis ignoram placeholders vazios e preservam observações sem URL", () => {
  const sources = [
    { type: "placeholder", url: "", note: "" },
    { type: "official", url: " https://example.com ", note: "Página oficial" },
    { type: "visit", url: "", note: "Confirmado em visita" },
    { type: "press", url: "   ", note: "   " },
  ];
  assert.deepEqual(usefulSources(sources), [sources[1], sources[2]]);
  assert.notStrictEqual(usefulSources(sources), sources);
});

test("slugificação é estável para links e identifica sala sem slug", () => {
  assert.equal(slugify("Cinépolis — JK Iguatemi"), "cinepolis-jk-iguatemi");
  assert.equal(slugify("  Sala 4 / Anexo  "), "sala-4-anexo");
  assert.equal(slugify(""), "");
  assert.equal(roomId({ slug: "cine" }, { slug: "sala-1", name: "Sala 1" }), "cine-sala-1");
  assert.equal(roomId({ slug: "cine" }, { name: "Sala 4 / Anexo" }), "cine-sala-4-anexo");
});

test("rede tem fallback para operador e para independente", () => {
  assert.equal(networkName({ network: { name: "Cinemark" } }), "Cinemark");
  assert.equal(networkName({ operator: "Operador" }), "Operador");
  assert.equal(networkName({}), "Rede independente");
  assert.equal(networkId({ network: { slug: "cinemark", name: "Cinemark" } }), "cinemark");
  assert.equal(networkId({ operator: "Operador" }), "operador");
});

test("tecnologias são separadas por tipo e experiência padrão é 2D", () => {
  const candidate = room({
    technologies: [
      { name: "IMAX", type: "system" },
      { name: "3D", type: "experience" },
      { name: "4DX", type: "experience" },
    ],
  });
  assert.deepEqual(technicalTechnologies(candidate), candidate.technologies);
  assert.deepEqual(exhibitionSystems(candidate).map(({ name }) => name), ["IMAX"]);
  assert.deepEqual(roomExperienceNames(candidate), ["3D", "4DX"]);
  assert.deepEqual(roomExperienceNames(room()), ["2D"]);
});

test("marcas conhecem aliases, ignoram valores desconhecidos e deduplicam aliases", () => {
  assert.equal(technologyBrandKey("IMAX"), "imax");
  assert.equal(technologyBrandKey("Cinemark XD"), "xd");
  assert.equal(technologyBrandKey("UCI XPLUS"), "xplus");
  assert.equal(technologyBrandKey("dolby atmos"), "dolby-atmos");
  assert.equal(technologyBrandKey("Multicanal"), "");
  assert.equal(technologyBrandKey("sem marca"), "");

  assert.deepEqual(
    roomTechnologyBrands(room({
      technologies: [
        { name: "Cinemark XD", type: "system" },
        { name: "XD", type: "system" },
        { name: "IMAX", type: "system" },
      ],
      sound: { format: "Dolby Atmos" },
    })),
    ["Cinemark XD", "IMAX", "Dolby Atmos"],
  );
  assert.deepEqual(
    roomTechnologyBrands(room({ sound: { format: "Multicanal" } })),
    [],
  );
});

test("texto pesquisável agrega cinema, sala, especificações, tecnologia e notas", () => {
  const cinema = {
    name: "Cinema Central",
    network: { name: "Rede Central" },
    city: "São Paulo",
    neighborhood: "Bela Vista",
    notes: "Atualizado na visita",
  };
  const candidate = room({
    name: "Sala 1",
    projection: { resolution: "4K", brand: "Barco" },
    sound: { format: "Dolby Atmos", channel_layout: "7.1" },
    technologies: [{ name: "IMAX", type: "system", notes: "Tela grande" }],
    notes: "Entrada lateral",
  });
  const text = normalize(roomText({ cinema, room: candidate }));
  for (const term of ["cinema central", "rede central", "bela vista", "4k", "barco", "dolby atmos", "imax", "tela grande", "entrada lateral", "atualizado na visita"]) {
    assert.match(text, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("buildRooms produz registros ordenados, ids e índice de busca", async () => {
  const data = await readJson<Cinema[]>("data/cinemas.json").catch(() => null);
  const cinemas: Cinema[] = data ?? [await readJson<Cinema>("data/cinemas/cine-marquise.json")];
  const rooms = buildRooms(cinemas);
  assert.ok(rooms.length > 0);
  assert.equal(new Set(rooms.map(({ id }) => id)).size, rooms.length);
  assert.ok(rooms.every(({ searchable }) => searchable === searchable.toLowerCase()));
  for (let index = 1; index < rooms.length; index += 1) {
    const previous = rooms[index - 1];
    const current = rooms[index];
    const order = previous.cinema.name.localeCompare(current.cinema.name, "pt-BR")
      || previous.room.name.localeCompare(current.room.name, "pt-BR");
    assert.ok(order <= 0, `${previous.id} deveria vir antes de ${current.id}`);
  }
});

test("cobertura conta quatro dimensões sem contar placeholders", () => {
  const candidate = room({
    projection: { light_source: "Laser" },
    sound: { format: "Dolby Digital", channel_layout: "5.1" },
    screen: { geometry: "Plana" },
  });
  assert.deepEqual(coverageValues(candidate, soundValues), ["Laser", undefined, "Dolby Digital · 5.1", "Plana"]);
  assert.equal(coverageCount(candidate, soundValues), 3);
});
