import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findRoomNameClassifications,
  roomNamePolicyMessage,
} from "../scripts/room-name-policy.js";

test("classifica termos técnicos declarados nos campos estruturados", () => {
  const classifications = findRoomNameClassifications({
    name: "Sala 12 Dolby Atmos",
    sound: { format: "Dolby Atmos" },
  });
  assert.deepEqual(classifications, ["Dolby Atmos"]);
  assert.match(roomNamePolicyMessage({ name: "Sala 12 Dolby Atmos" }), /Dolby Atmos/);
});

test("aceita nomes próprios numerados e nomes de auditório aprovados", () => {
  assert.equal(roomNamePolicyMessage({ name: "Sala 1 – Léo Mendes" }), "");
  assert.equal(roomNamePolicyMessage({ name: "Grande Auditório" }), "");
  assert.equal(roomNamePolicyMessage({ name: "Sala 2 (Anexo)" }), "");
});

test("ignora valores desconhecidos ao procurar classificações no nome", () => {
  assert.deepEqual(
    findRoomNameClassifications({
      name: "Sala 3",
      room_type: "A confirmar",
      technologies: [{ name: "A confirmar" }],
      projection: { technology: "A confirmar" },
    }),
    [],
  );
});
