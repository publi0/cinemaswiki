import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterRooms,
  paginate,
  paginationItems,
  parseFilterState,
  serializeFilterState,
  sortRooms,
} from "../assets/catalog-state.js";
import { room } from "./helpers.js";
import { soundValues } from "../assets/display-values.js";
import type { CatalogItem, Cinema } from "../types/catalog.js";

interface ItemOverrides {
  cinema?: Partial<Cinema>;
  room?: Record<string, unknown>;
  searchable?: string;
}

function item(name: string, overrides: ItemOverrides = {}): CatalogItem {
  const cinema = {
    slug: `${name.toLowerCase()}-cinema`,
    name,
    network: { slug: `${name.toLowerCase()}-network`, name: `${name} Network` },
    city: "São Paulo",
    state: "SP",
    neighborhood: "Centro",
    address: "Rua de Teste, 1",
    last_verified: "2026-01-01",
    rooms: [],
    ...overrides.cinema,
  } as Cinema;
  const candidate = room({
    name: `${name} Sala 1`,
    ...overrides.room,
  });
  return {
    cinema,
    room: candidate,
    searchable: overrides.searchable ?? `${name} ${candidate.name}`.toLowerCase(),
    id: `${name}-sala-1`,
  };
}

const rooms: CatalogItem[] = [
  item("Alfa", {
    room: {
      projection: { technology: "Tela LED", resolution: "4K", light_source: "LED" },
      sound: { format: "Dolby Atmos", channel_layout: "7.1" },
      technologies: [{ name: "IMAX", type: "system" }, { name: "3D", type: "experience" }],
    },
  }),
  item("Beta", {
    room: {
      projection: { light_source: "Laser RGB", resolution: "2K" },
      sound: { format: "Multicanal", channel_layout: "5.1" },
      technologies: [{ name: "4DX", type: "experience" }],
    },
    cinema: { last_verified: "2026-03-01" },
  }),
  item("Gama", {
    room: {
      projection: {},
      sound: {},
      technologies: [],
    },
    cinema: { last_verified: "2025-01-01" },
  }),
];

test("filtro vazio retorna todos e não muta a lista", () => {
  const original = [...rooms];
  assert.deepEqual(filterRooms(rooms), rooms);
  assert.deepEqual(rooms, original);
});

test("busca ignora acentos e diferencia texto de campos técnicos", () => {
  const candidates = [
    { ...rooms[0], searchable: "cinépolis são paulo bela vista" },
    { ...rooms[1], searchable: "cinemark laser rgb" },
  ];
  assert.deepEqual(filterRooms(candidates, { query: "Cinepolis Sao" }), [candidates[0]]);
  assert.deepEqual(filterRooms(candidates, { query: "laser" }), [candidates[1]]);
  assert.deepEqual(filterRooms(candidates, { query: "inexistente" }), []);
});

test("filtros de sistema e experiência usam apenas o tipo correspondente", () => {
  assert.deepEqual(filterRooms(rooms, { system: "IMAX" }), [rooms[0]]);
  assert.deepEqual(filterRooms(rooms, { experience: "3D" }), [rooms[0]]);
  assert.deepEqual(filterRooms(rooms, { experience: "4DX" }), [rooms[1]]);
  assert.deepEqual(filterRooms(rooms, { experience: "2D" }), [rooms[2]]);
  assert.deepEqual(filterRooms(rooms, { system: "4DX" }), []);
});

test("filtros de projeção tratam Laser RGB como Laser e Laser RGB", () => {
  assert.deepEqual(filterRooms(rooms, { projection: "Laser" }), [rooms[1]]);
  assert.deepEqual(filterRooms(rooms, { projection: "Laser RGB" }), [rooms[1]]);
  assert.deepEqual(filterRooms(rooms, { projection: "Tela LED" }), [rooms[0]]);
  assert.deepEqual(filterRooms(rooms, { resolution: "4K" }), [rooms[0]]);
});

test("filtros de som exigem formato e layout quando ambos estão selecionados", () => {
  assert.deepEqual(filterRooms(rooms, { sound: "Dolby Atmos" }), [rooms[0]]);
  assert.deepEqual(filterRooms(rooms, { soundLayout: "5.1" }), [rooms[1]]);
  assert.deepEqual(filterRooms(rooms, { sound: "Multicanal", soundLayout: "5.1" }), [rooms[1]]);
  assert.deepEqual(filterRooms(rooms, { sound: "Multicanal", soundLayout: "7.1" }), []);
});

test("filtros combinados aplicam AND em todas as dimensões", () => {
  assert.deepEqual(filterRooms(rooms, {
    query: "beta",
    projection: "Laser",
    resolution: "2K",
    sound: "Multicanal",
    soundLayout: "5.1",
    experience: "4DX",
  }), [rooms[1]]);
  assert.deepEqual(filterRooms(rooms, { query: "beta", system: "IMAX" }), []);
});

test("ordenação por cobertura e atualização usa desempate determinístico", () => {
  const coverage = sortRooms(rooms, "coverage", soundValues);
  assert.deepEqual(coverage.map(({ cinema }) => cinema.name), ["Alfa", "Beta", "Gama"]);

  const updated = sortRooms(rooms, "updated", soundValues);
  assert.deepEqual(updated.map(({ cinema }) => cinema.name), ["Beta", "Alfa", "Gama"]);

  const original = [...rooms];
  sortRooms(rooms, "coverage", soundValues);
  assert.deepEqual(rooms, original);
});

test("ordenação desconhecida preserva a ordem original", () => {
  const original = [...rooms];
  const result = sortRooms(rooms, undefined, soundValues);
  assert.deepEqual(result, original);
  assert.notStrictEqual(result, rooms);
});

test("paginação calcula página, intervalo e total inclusive para limites", () => {
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 1, 2), {
    page: 1,
    totalPages: 3,
    pageStart: 0,
    items: [1, 2],
  });
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 99, 2), {
    page: 3,
    totalPages: 3,
    pageStart: 4,
    items: [5],
  });
  assert.deepEqual(paginate([], 0, 12), {
    page: 1,
    totalPages: 1,
    pageStart: 0,
    items: [],
  });
});

test("itens de paginação cobrem lista curta, início, meio e fim", () => {
  assert.deepEqual(paginationItems(1, 1), [1]);
  assert.deepEqual(paginationItems(7, 4), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(paginationItems(10, 1), [1, 2, 3, 4, 5, "ellipsis", 10]);
  assert.deepEqual(paginationItems(10, 5), [1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  assert.deepEqual(paginationItems(10, 10), [1, "ellipsis", 6, 7, 8, 9, 10]);
});

test("estado de URL decodifica filtros, normaliza página inválida e aplica sort padrão", () => {
  assert.deepEqual(parseFilterState("?q=Caf%C3%A9&sistema=IMAX&layout=7.1&p=-2", "coverage"), {
    query: "Café",
    system: "IMAX",
    experience: "",
    projection: "",
    resolution: "",
    sound: "",
    soundLayout: "7.1",
    sort: "coverage",
    page: 1,
  });
  assert.equal(parseFilterState("?p=abc&ordem=updated", "name").page, 1);
  assert.equal(parseFilterState("", "name").sort, "name");
});

test("serialização omite defaults, preserva todos os filtros e permite round-trip", () => {
  const state = {
    query: "Café & Cinema",
    system: "IMAX",
    experience: "3D",
    projection: "Laser RGB",
    resolution: "4K",
    sound: "Dolby Atmos",
    soundLayout: "7.1",
    sort: "coverage",
    page: 3,
  };
  const query = serializeFilterState(state, "coverage");
  assert.equal(query, "q=Caf%C3%A9+%26+Cinema&sistema=IMAX&experiencia=3D&projecao=Laser+RGB&resolucao=4K&som=Dolby+Atmos&layout=7.1&p=3");
  assert.deepEqual(parseFilterState(`?${query}`, "coverage"), state);
  assert.equal(serializeFilterState({ query: "", sort: "name", page: 1 }, "name"), "");
});
