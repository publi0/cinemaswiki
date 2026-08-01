import assert from "node:assert/strict";
import { test } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import * as addFormatsModule from "ajv-formats";
import { clone, readJson } from "./helpers.js";

interface TestRoom {
  [key: string]: unknown;
  projection: Record<string, unknown>;
  screen: Record<string, unknown>;
  sound: Record<string, unknown>;
  technologies?: unknown[];
  sources: Array<Record<string, unknown>>;
}

interface TestCinema {
  [key: string]: unknown;
  rooms: TestRoom[];
}

const schema = await readJson<Record<string, unknown>>("data/schema.json");
const baseline = await readJson<TestCinema>("data/cinemas/cine-marquise.json");
const ajv = new Ajv2020({ allErrors: true, strict: true });
const addFormats = (addFormatsModule as unknown as {
  default: (validator: InstanceType<typeof Ajv2020>) => void;
}).default;
addFormats(ajv);
const validate = ajv.compile(schema);

function assertValid(label: string, candidate: unknown): void {
  assert.equal(validate(candidate), true, `${label}: ${ajv.errorsText(validate.errors)}`);
}

function assertInvalid(label: string, mutate: (candidate: TestCinema) => void): void {
  const candidate = clone(baseline);
  mutate(candidate);
  assert.equal(validate(candidate), false, `${label}: deveria ser inválido`);
}

test("schema aceita um registro existente completo", () => {
  assertValid("cine-marquise", baseline);
});

test("schema exige todos os campos de cinema", () => {
  for (const property of ["slug", "name", "network", "city", "state", "neighborhood", "address", "last_verified", "rooms"]) {
    assertInvalid(`campo obrigatório ${property}`, (candidate) => {
      delete candidate[property];
    });
  }
});

test("schema exige os campos estruturais de sala", () => {
  for (const property of ["name", "slug", "projection", "screen", "sound", "seats", "sources"]) {
    assertInvalid(`campo de sala ${property}`, (candidate) => {
      delete candidate.rooms[0][property];
    });
  }
});

test("schema restringe slugs, estado, data e registros ANCINE", () => {
  assertInvalid("slug com maiúscula", (candidate) => { candidate.slug = "Cinema-Invalido"; });
  assertInvalid("slug com hífen inicial", (candidate) => { candidate.slug = "-invalido"; });
  assertInvalid("estado fora de duas letras maiúsculas", (candidate) => { candidate.state = "São"; });
  assertInvalid("data inválida", (candidate) => { candidate.last_verified = "2026-02-30"; });
  assertInvalid("registro ANCINE não numérico", (candidate) => { candidate.ancine_registry = "ANCINE-1"; });
});

test("schema aceita nulos nos campos desconhecidos, mas rejeita negativos", () => {
  const candidate = clone(baseline);
  const candidateRoom = candidate.rooms[0];
  candidateRoom.seats = null;
  candidateRoom.projection.watts_each = null;
  candidateRoom.screen.width_m = null;
  candidateRoom.sound.channels = null;
  candidateRoom.accessibility = {
    wheelchair_seats: null,
    reduced_mobility_seats: null,
    obese_seats: null,
    ramp_to_seats: null,
    ramp_to_room: null,
    accessible_restrooms: null,
  };
  assertValid("campos desconhecidos nulos", candidate);
  assertInvalid("assentos negativos", (value) => { value.rooms[0].seats = -1; });
  assertInvalid("largura negativa", (value) => { value.rooms[0].screen.width_m = -0.1; });
});

test("schema aceita a taxonomia de tecnologias permitida", () => {
  for (const technology of [
    ["IMAX", "system"],
    ["Macro XE", "system"],
    ["XD", "system"],
    ["Cinépic", "system"],
    ["UCI XPLUS", "system"],
    ["3D", "experience"],
    ["4DX", "experience"],
  ]) {
    const candidate = clone(baseline);
    candidate.rooms[0].technologies = [{ name: technology[0], type: technology[1] }];
    assertValid(`${technology[0]}/${technology[1]}`, candidate);
  }
});

test("schema rejeita nome/tipo de tecnologia inválido e excesso de itens", () => {
  assertInvalid("tecnologia desconhecida", (candidate) => {
    candidate.rooms[0].technologies = [{ name: "ScreenX", type: "system" }];
  });
  assertInvalid("tipo incompatível", (candidate) => {
    candidate.rooms[0].technologies = [{ name: "IMAX", type: "experience" }];
  });
  assertInvalid("tecnologia com propriedade extra", (candidate) => {
    candidate.rooms[0].technologies = [{ name: "IMAX", type: "system", vendor: "Acme" }];
  });
  assertInvalid("mais de três tecnologias", (candidate) => {
    candidate.rooms[0].technologies = [
      { name: "IMAX", type: "system" },
      { name: "Macro XE", type: "system" },
      { name: "3D", type: "experience" },
      { name: "4DX", type: "experience" },
    ];
  });
});

test("schema restringe enums de projeção, tela e som", () => {
  const mutations: Array<(candidate: TestCinema) => void> = [
    (candidate) => { candidate.rooms[0].projection.technology = "Digital"; },
    (candidate) => { candidate.rooms[0].projection.resolution = "8K"; },
    (candidate) => { candidate.rooms[0].projection.light_source = "Lâmpada"; },
    (candidate) => { candidate.rooms[0].screen.technology = "OLED"; },
    (candidate) => { candidate.rooms[0].screen.aspect_ratio = "7:3"; },
    (candidate) => { candidate.rooms[0].sound.format = "DTS"; },
    (candidate) => { candidate.rooms[0].sound.channel_layout = "9.1"; },
    (candidate) => { candidate.rooms[0].sound.processor = "Genérico"; },
  ];
  for (const mutate of mutations) {
    assertInvalid("enum técnico fora da lista", mutate);
  }
});

test("schema aceita URL HTTP(S) e rejeita protocolos não web", () => {
  const candidate = clone(baseline);
  candidate.external_url = "https://cinema.example/agenda?x=1";
  candidate.rooms[0].sources = [
    { type: "official", url: "", note: "Sem link" },
    { type: "press", url: "http://press.example/report", note: "Imprensa" },
  ];
  assertValid("URLs web", candidate);
  assertInvalid("external_url ftp", (value) => { value.external_url = "ftp://example.com"; });
  assertInvalid("source javascript", (value) => { value.rooms[0].sources[0].url = "javascript:alert(1)"; });
  assertInvalid("tipo de fonte desconhecido", (value) => { value.rooms[0].sources[0].type = "blog"; });
});

test("schema restringe notas não vazias e propriedades extras", () => {
  assertInvalid("nota de cinema vazia", (candidate) => { candidate.notes = ""; });
  assertInvalid("nota de tecnologia vazia", (candidate) => {
    candidate.rooms[0].technologies = [{ name: "IMAX", type: "system", notes: "" }];
  });
  assertInvalid("propriedade extra no cinema", (candidate) => { candidate.extra = true; });
  assertInvalid("propriedade extra na sala", (candidate) => { candidate.rooms[0].extra = true; });
  assertInvalid("propriedade extra na fonte", (candidate) => { candidate.rooms[0].sources[0].extra = true; });
});
