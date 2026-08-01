import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCinema } from "../scripts/normalization.js";
import { cinema, clone, room } from "./helpers.js";

function normalizeRoom(overrides = {}) {
  const candidate = cinema({ rooms: [room(overrides)] });
  const result = normalizeCinema(candidate);
  return { candidate: result.cinema.rooms[0], result };
}

test("normaliza tecnologias legadas de projeção, fonte de luz e proporção", () => {
  const { candidate, result } = normalizeRoom({
    name: "Sala 1 4k",
    projection: { technology: "LED", light_source: "laser RGB" },
    screen: { aspect_ratio: "7:3 (aprox. 2,33:1)" },
  });
  assert.equal(candidate.name, "Sala 1 4K");
  assert.equal(candidate.projection.technology, "Tela LED");
  assert.equal(candidate.projection.light_source, "Laser RGB");
  assert.equal(candidate.screen.aspect_ratio, "2.33:1");
  assert.ok(result.changedValues >= 4);
});

test("move tipo legado de tela para o campo correto e remove a chave antiga", () => {
  for (const [legacyType, property, expected] of [
    ["LED modular", "technology", "LED modular"],
    ["Perolizada", "surface", "Perolizada"],
    ["perolizada", "surface", "Perolizada"],
    ["Plana", "geometry", "Plana"],
  ]) {
    const { candidate } = normalizeRoom({ screen: { type: legacyType } });
    const screen = candidate.screen as unknown as Record<string, unknown>;
    assert.equal(screen[property], expected, legacyType);
    assert.equal("type" in candidate.screen, false, legacyType);
  }
});

test("normaliza layouts embutidos em formatos de som", () => {
  const fiveOne = normalizeRoom({ sound: { format: "Dolby 5.1", channels: 6 } }).candidate.sound;
  assert.deepEqual(fiveOne, { format: "Dolby Digital", channels: null, channel_layout: "5.1" });

  const sevenOne = normalizeRoom({ sound: { format: "Surround 7.1" } }).candidate.sound;
  assert.deepEqual(sevenOne, { format: "Multicanal", channel_layout: "7.1" });

  const elevenOne = normalizeRoom({ sound: { format: "Multicanal 11.1", channels: 11 } }).candidate.sound;
  assert.deepEqual(elevenOne, { format: "Multicanal", channels: null, channel_layout: "11.1" });
});

test("normaliza Dolby 7.1 e mantém o formato canônico", () => {
  const candidate = normalizeRoom({ sound: { format: "Dolby Digital 7.1" } }).candidate;
  assert.deepEqual(candidate.sound, { format: "Dolby Digital", channel_layout: "7.1" });
});

test("preserva processador Harman e promove formato quando notas confirmam multicanal", () => {
  const harman = normalizeRoom({ sound: { format: "Harman Quantum Logic (JBL)" } }).candidate.sound;
  assert.equal(harman.format, "A confirmar");
  assert.equal(harman.processor, "Harman Quantum Logic (JBL)");

  const inferred = normalizeRoom({
    sound: {
      format: "A confirmar",
      channel_layout: "5.1",
      notes: "Sistema surround instalado",
    },
  }).candidate.sound;
  assert.equal(inferred.format, "Multicanal");
});

test("separa streams de áudio de canais quando a fonte declara Dolby Atmos 128", () => {
  const { candidate } = normalizeRoom({
    sound: { format: "Dolby Atmos", channels: 128, notes: "128 canais de áudio declarados" },
  });
  assert.deepEqual(candidate.sound, {
    format: "Dolby Atmos",
    channels: null,
    notes: "128 streams de áudio declarados",
    audio_streams: 128,
  });
});

test("normaliza a nota de 128 canais mesmo sem o sufixo declarados", () => {
  const { candidate } = normalizeRoom({
    sound: { audio_streams: 128, notes: "128 canais de áudio" },
  });
  assert.equal(candidate.sound?.notes, "128 streams de áudio declarados");
});

test("remove fontes vazias e mantém fontes com URL ou nota", () => {
  const { candidate, result } = normalizeRoom({
    sources: [
      { type: "placeholder", url: "", note: "" },
      { type: "official", url: "https://example.com", note: "Oficial" },
      { type: "visit", url: "", note: "Visita" },
    ],
  });
  assert.equal(candidate.sources.length, 2);
  assert.equal(result.removedValues, 1);
});

test("normaliza nomes e tipos de tecnologias, remove categorias e duplicatas", () => {
  const { candidate, result } = normalizeRoom({
    technologies: [
      { name: "Imax", type: "system" },
      { name: "Cinemark XD", type: "experience" },
      { name: "XPlus", type: "system" },
      { name: "Grande Formato", type: "system" },
      { name: "XD", type: "system" },
    ],
  });
  assert.deepEqual(candidate.technologies, [
    { name: "IMAX", type: "system" },
    { name: "XD", type: "system" },
    { name: "UCI XPLUS", type: "system" },
  ]);
  assert.equal(result.removedValues, 2);
});

test("migra tecnologias de áudio, projeção e conforto para campos apropriados", () => {
  const { candidate, result } = normalizeRoom({
    technologies: [
      { name: "Harman Quantum Logic (JBL)", type: "audio", notes: "Processamento confirmado" },
      { name: "Samsung Onyx", type: "projection", notes: "Tela autoemissiva" },
      { name: "Projeção Laser", type: "projection" },
      { name: "Poltrona reclinável", type: "seat", notes: "Com apoio de pernas" },
    ],
  });
  assert.deepEqual(candidate.technologies, []);
  assert.equal(candidate.sound.processor, "Harman Quantum Logic (JBL)");
  assert.match(candidate.sound.notes ?? "", /Processamento confirmado/);
  assert.equal(candidate.projection.technology, "Tela LED");
  assert.equal(candidate.projection.brand, "Samsung");
  assert.equal(candidate.projection.model, "Onyx");
  assert.equal(candidate.projection.light_source, "Laser");
  assert.match(candidate.projection.notes ?? "", /Tela autoemissiva/);
  assert.match(candidate.notes ?? "", /Conforto: Poltrona reclinável/);
  assert.equal(result.removedValues, 4);
});

test("migra tecnologia de áudio não-Harman para formato e observação", () => {
  const { candidate, result } = normalizeRoom({
    technologies: [{ name: "Dolby Atmos", type: "audio", notes: "Formato confirmado" }],
  });
  assert.deepEqual(candidate.technologies, []);
  assert.equal(candidate.sound.format, "Dolby Atmos");
  assert.equal(candidate.sound.notes, "Formato confirmado");
  assert.equal(result.removedValues, 1);
});

test("não sobrescreve dado específico já conhecido ao migrar legado", () => {
  const { candidate } = normalizeRoom({
    projection: { technology: "Tela LED", brand: "LG", model: "Cinema LED" },
    technologies: [{ name: "Samsung Onyx", type: "projection" }],
  });
  assert.equal(candidate.projection.technology, "Tela LED");
  assert.equal(candidate.projection.brand, "LG");
  assert.equal(candidate.projection.model, "Cinema LED");
});

test("normalização é idempotente", () => {
  const candidate = cinema({
    rooms: [room({
      projection: { technology: "LED", light_source: "laser" },
      sound: { format: "Dolby 5.1", channels: 6 },
      screen: { type: "Perolizada" },
      sources: [{ type: "official", url: "https://example.com", note: "" }],
      technologies: [{ name: "Imax", type: "system" }],
    })],
  });
  const first = normalizeCinema(candidate);
  const afterFirst = clone(first.cinema);
  const second = normalizeCinema(candidate);
  assert.deepEqual(second.cinema, afterFirst);
  assert.equal(second.changedValues, 0);
  assert.equal(second.removedValues, 0);
});
