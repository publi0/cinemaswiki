import assert from "node:assert/strict";
import { findRoomNameClassifications, roomNamePolicyMessage } from "./room-name-policy.mjs";

const rejected = [
  [room("Sala 1 – IMAX with Laser", { technologies: [{ name: "IMAX" }], projection: { light_source: "Laser" } }), ["IMAX", "Laser"]],
  [room("Sala 2 – VIP Lounge Laser", { room_type: "VIP Lounge", projection: { light_source: "Laser" } }), ["VIP Lounge", "Laser"]],
  [room("Sala 4 – Dolby Atmos", { sound: { format: "Dolby Atmos" } }), ["Dolby Atmos"]],
  [room("Sala 5 – VIP Samsung Onyx 4K", { room_type: "VIP", projection: { brand: "Samsung", resolution: "4K" } }), ["Samsung", "Onyx", "VIP", "4K"]],
  [room("Sala 1 - Macro XE", { technologies: [{ name: "Macro XE" }] }), ["Macro XE"]],
  [room("Sala 9 – Acme Photon", { projection: { model: "Acme Photon" } }), ["Acme Photon"]],
  [room("Auditório IMAX"), ["IMAX"]],
  [room("Sala 2 Prime"), ["Prime"]],
];

for (const [candidate, expectedTerms] of rejected) {
  const terms = findRoomNameClassifications(candidate);
  for (const term of expectedTerms) {
    assert(terms.includes(term), `${candidate.name}: deveria identificar ${term}`);
  }
  assert(roomNamePolicyMessage(candidate), `${candidate.name}: deveria ser rejeitado`);
}

for (const name of [
  "Sala 1",
  "Sala 1 – Leon Cakoff",
  "Sala 2 – Carmen Miranda",
  "Sala 3 – Rubens Ewald Filho",
  "Sala 4 – Helena Ignez",
  "Sala 5 – Luiz Carlos Merten",
  "Sala 6 – Léo Mendes",
  "Sala 4 (Anexo)",
  "Bradesco Prime 1",
  "Grande Auditório",
]) {
  assert.equal(roomNamePolicyMessage(room(name)), "", `${name}: nome legítimo deveria ser aceito`);
}

for (const name of ["Sala 9 – Formato Novo", "Auditório Azul"]) {
  assert(roomNamePolicyMessage(room(name)), `${name}: formato não aprovado deveria ser rejeitado`);
}

console.log("Política de nomes testada: classificações técnicas são rejeitadas e nomes próprios são preservados.");

function room(name, overrides = {}) {
  return {
    name,
    technologies: overrides.technologies ?? [],
    room_type: overrides.room_type,
    projection: overrides.projection ?? {},
    screen: overrides.screen ?? {},
    sound: overrides.sound ?? {},
  };
}
