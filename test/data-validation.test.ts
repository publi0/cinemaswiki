import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import os from "node:os";
import path from "node:path";
import { loadAndValidateCinemas, validateCrossReferences } from "../scripts/validate-data.js";
import { cinema, clone, room } from "./helpers.js";
import type { Cinema } from "../types/catalog.js";

function errorsFor(cinemas: Cinema[]): string[] {
  const errors: string[] = [];
  validateCrossReferences(cinemas, errors);
  return errors;
}

test("catálogo atual valida e mantém a dimensão publicada", async () => {
  const cinemas = await loadAndValidateCinemas();
  const roomCount = cinemas.reduce((total, candidate) => total + candidate.rooms.length, 0);
  assert.equal(cinemas.length, 49);
  assert.equal(roomCount, 328);
  assert.ok(cinemas.every((candidate) => candidate.state === "SP"));
});

test("catálogo não tem slugs, ids de sala ou redes conflitantes", async () => {
  const cinemas = await loadAndValidateCinemas();
  const cinemaSlugs = new Set(cinemas.map(({ slug }) => slug));
  const roomIds = new Set<string>();
  const networks = new Map<string, string>();

  assert.equal(cinemaSlugs.size, cinemas.length);
  for (const candidate of cinemas) {
    const knownNetwork = networks.get(candidate.network.slug);
    assert.ok(!knownNetwork || knownNetwork === candidate.network.name);
    networks.set(candidate.network.slug, candidate.network.name);

    for (const candidateRoom of candidate.rooms) {
      const id = `${candidate.slug}-${candidateRoom.slug}`;
      assert.equal(roomIds.has(id), false, `id repetido: ${id}`);
      roomIds.add(id);
      assert.ok(candidateRoom.sources.every((source) => source.url.trim() || source.note.trim()));
      assert.match(candidateRoom.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  }
  assert.equal(roomIds.size, 328);
});

test("referências cruzadas aceitam taxonomia completa permitida", () => {
  const candidate = cinema({
    rooms: [room({
      technologies: [
        { name: "IMAX", type: "system" },
        { name: "Macro XE", type: "system" },
        { name: "3D", type: "experience" },
      ],
    })],
  });
  assert.deepEqual(errorsFor([candidate]), []);
});

test("referências cruzadas detectam slug de cinema duplicado", () => {
  const first = cinema();
  const second = cinema({ name: "Outro Cinema", rooms: [room({ slug: "sala-2" })] });
  const errors = errorsFor([first, second]);
  assert.ok(errors.some((error) => error.includes("slug de cinema duplicado")));
});

test("referências cruzadas detectam nomes divergentes para a mesma rede", () => {
  const first = cinema();
  const second = cinema({
    slug: "outro-cinema",
    name: "Outro Cinema",
    network: { slug: "rede-teste", name: "Nome Divergente" },
  });
  assert.match(errorsFor([first, second]).join("\n"), /aparece como/);
});

test("referências cruzadas detectam nome e slug de sala duplicados", () => {
  const candidate = cinema({
    rooms: [
      room({ name: "Sala 1", slug: "sala-1" }),
      room({ name: "sala 1", slug: "sala-1" }),
    ],
  });
  const errors = errorsFor([candidate]).join("\n");
  assert.match(errors, /nome de sala duplicado/);
  assert.match(errors, /slug de sala duplicado/);
  assert.match(errors, /identificador global de sala duplicado/);
});

test("referências cruzadas rejeitam tecnologia desconhecida e tipo incompatível", () => {
  const unknown = cinema({ rooms: [room({ technologies: [{ name: "ScreenX", type: "system" }] })] });
  assert.match(errorsFor([unknown]).join("\n"), /não é uma classificação permitida/);

  const wrongType = cinema({ rooms: [room({ technologies: [{ name: "IMAX", type: "experience" }] })] });
  assert.match(errorsFor([wrongType]).join("\n"), /deve usar o tipo "system"/);
});

test("referências cruzadas rejeitam tecnologia repetida e fonte vazia", () => {
  const candidate = cinema({
    rooms: [room({
      technologies: [
        { name: "3D", type: "experience" },
        { name: "3D", type: "experience", notes: "duplicada" },
      ],
      sources: [{ type: "placeholder", url: "", note: "" }],
    })],
  });
  const errors = errorsFor([candidate]).join("\n");
  assert.match(errors, /tecnologia duplicada/);
  assert.match(errors, /fonte vazia/);
});

test("política de nomes participa da validação de referências cruzadas", () => {
  const invalid = cinema({ rooms: [room({ name: "Sala 1 - IMAX" })] });
  assert.match(errorsFor([invalid]).join("\n"), /nome da sala mistura identificação/);

  const valid = cinema({ rooms: [room({ name: "Sala 1 – Leon Cakoff" })] });
  assert.deepEqual(errorsFor([valid]), []);
});

test("validação não altera objetos de entrada", () => {
  const candidate = cinema();
  const before = clone(candidate);
  const errors: string[] = [];
  validateCrossReferences([candidate], errors);
  assert.deepEqual(candidate, before);
});

test("carregador agrega JSON inválido, schema inválido e nome de arquivo divergente", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cinemaswiki-validation-"));
  try {
    const invalidSchema = clone(cinema());
    delete (invalidSchema as unknown as Record<string, unknown>).name;

    await writeFile(path.join(directory, "broken.json"), "{\n");
    await writeFile(path.join(directory, "invalid-schema.json"), JSON.stringify(invalidSchema));
    await writeFile(path.join(directory, "wrong-name.json"), JSON.stringify(cinema()));

    await assert.rejects(
      () => loadAndValidateCinemas({ directory }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /broken\.json: JSON inválido/);
        assert.match(error.message, /invalid-schema\.json.*must have required property 'name'/s);
        assert.match(error.message, /wrong-name\.json: o arquivo deve se chamar cinema-teste\.json/);
        return true;
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("carregador rejeita diretório sem cinemas", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cinemaswiki-empty-"));
  try {
    await assert.rejects(
      () => loadAndValidateCinemas({ directory }),
      /Nenhum cinema encontrado em data\/cinemas\./,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
