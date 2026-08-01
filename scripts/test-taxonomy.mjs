import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cinemaDirectory = path.join(projectRoot, "data", "cinemas");
const schema = JSON.parse(
  await readFile(path.join(projectRoot, "data", "schema.json"), "utf8"),
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const firstFilename = (await readdir(cinemaDirectory))
  .filter((filename) => filename.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b, "pt-BR"))
  .at(0);

if (!firstFilename) throw new Error("Nenhum cinema disponível para testar o contrato.");

const baseline = JSON.parse(
  await readFile(path.join(cinemaDirectory, firstFilename), "utf8"),
);

assertAccepted("registro existente", baseline);

const validTaxonomy = copy(baseline);
validTaxonomy.rooms[0].technologies = [
  { name: "IMAX", type: "system" },
  { name: "3D", type: "experience" },
  { name: "4DX", type: "experience", notes: "Efeitos físicos sincronizados." },
];
assertAccepted("taxonomia completa permitida", validTaxonomy);

const macroXeSystem = copy(baseline);
macroXeSystem.rooms[0].technologies = [{ name: "Macro XE", type: "system" }];
assertAccepted("sistema Macro XE permitido", macroXeSystem);

const vipRoom = copy(baseline);
vipRoom.rooms[0].room_type = "VIP";
assertAccepted("tipo de sala VIP permitido", vipRoom);

assertRejected("classificação desconhecida", baseline, (room) => {
  room.technologies = [{ name: "ScreenX", type: "system" }];
});

assertRejected("tipo de sala desconhecido", baseline, (room) => {
  room.room_type = "Premium";
});

assertRejected("tipo inesperado", baseline, (room) => {
  room.technologies = [{ name: "Dolby Atmos", type: "audio" }];
});

assertRejected("combinação nome/tipo incorreta", baseline, (room) => {
  room.technologies = [{ name: "IMAX", type: "experience" }];
});

assertRejected("classificação repetida", baseline, (room) => {
  room.technologies = [
    { name: "3D", type: "experience" },
    { name: "3D", type: "experience", notes: "Mesmo item com outra nota." },
  ];
});

assertRejected("subtipo inesperado em IMAX", baseline, (room) => {
  room.technologies = [{ name: "IMAX", type: "system", subtype: "Laser" }];
});

assertRejected("projeção fora da lista", baseline, (room) => {
  room.projection.technology = "Digital";
});

assertRejected("proporção fora da lista", baseline, (room) => {
  room.screen.aspect_ratio = "7:3 aproximado";
});

assertRejected("processador fora da lista", baseline, (room) => {
  room.sound.processor = "Processador genérico";
});

console.log("Contrato da taxonomia testado: valores inesperados e repetidos são rejeitados.");

function assertAccepted(label, value) {
  if (validate(value)) return;
  throw new Error(
    `${label}: deveria ser aceito\n${ajv.errorsText(validate.errors, { separator: "\n" })}`,
  );
}

function assertRejected(label, original, mutateRoom) {
  const candidate = copy(original);
  mutateRoom(candidate.rooms[0]);
  if (!validate(candidate)) return;
  throw new Error(`${label}: deveria ser rejeitado pelo schema`);
}

function copy(value) {
  return structuredClone(value);
}
