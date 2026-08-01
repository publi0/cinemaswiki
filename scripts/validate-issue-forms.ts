import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRoomNameClassifications, type RoomNameInput } from "./room-name-policy.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const templateDirectory = path.join(projectRoot, ".github", "ISSUE_TEMPLATE");
interface SchemaDefinition {
  enum?: unknown[];
  oneOf?: SchemaVariant[];
}

interface SchemaVariant {
  properties: {
    type: { const: string };
    name: { const?: string; enum?: string[] };
  };
}

interface SchemaDocument {
  $defs: Record<string, SchemaDefinition> & {
    technology: { oneOf: SchemaVariant[] };
  };
}

interface ParsedForm {
  dropdowns: Map<string, string[]>;
}

const schema = JSON.parse(await readFile(path.join(projectRoot, "data", "schema.json"), "utf8")) as SchemaDocument;

const newEntrySource = await readFile(path.join(templateDirectory, "novo-cinema-ou-sala.yml"), "utf8");
const correctionSource = await readFile(path.join(templateDirectory, "correcao-de-dados.yml"), "utf8");
const newEntry = parseForm(newEntrySource);
const correction = parseForm(correctionSource);

assertRoomNameExamples(newEntrySource, "novo-cinema-ou-sala.yml");
assertRoomNameExamples(correctionSource, "correcao-de-dados.yml");

const knownValues = (definition: string): string[] =>
  (schema.$defs[definition].enum ?? []).filter((value): value is string => typeof value === "string");

const technologyNames = (type: string): string[] =>
  schema.$defs.technology.oneOf
    .filter((variant) => variant.properties.type.const === type)
    .flatMap((variant) => {
      const name = variant.properties.name;
      return name.const ? [name.const] : name.enum ?? [];
    });

const canonical = {
  sistema: [...technologyNames("system"), "A confirmar"],
  tipo_sala: [...knownValues("roomType"), "A confirmar"],
  experiencia: [
    ...technologyNames("experience").map((value) =>
      value === "4DX" ? "4DX — efeitos físicos" : value
    ),
    "A confirmar",
  ],
  tecnologia_projecao: [
    ...knownValues("projectionLightSource").filter(isKnown),
    ...knownValues("projectionTechnology").filter(isKnown),
    "A confirmar",
  ],
  resolucao: knownValues("projectionResolution"),
  formato_som: knownValues("soundFormat"),
  layout_som: knownValues("soundChannelLayout"),
  processador_som: knownValues("soundProcessor"),
  tecnologia_tela: knownValues("screenTechnology"),
  superficie_tela: knownValues("screenSurface"),
  geometria_tela: knownValues("screenGeometry"),
};

for (const [id, options] of Object.entries(canonical)) {
  assertOptions(newEntry, id, options, "novo-cinema-ou-sala.yml");
}

const correctionRoomOptions = [
  ...canonical.tipo_sala.filter(isKnown).map((value) => `Tipo de sala — ${value}`),
  ...canonical.sistema.filter(isKnown).map((value) => `Sistema — ${value}`),
  ...canonical.experiencia.filter(isKnown).map((value) => `Experiência — ${value}`),
  "A confirmar",
];

assertOptions(
  correction,
  "classificacao_sala",
  correctionRoomOptions,
  "correcao-de-dados.yml",
);

const correctionOptions = [
  ...canonical.tecnologia_projecao.filter(isKnown).map((value) => `Projeção — ${value}`),
  ...canonical.resolucao.filter(isKnown).map((value) => `Resolução — ${value}`),
  ...canonical.formato_som.filter(isKnown).map((value) => `Som — ${value}`),
  ...canonical.layout_som.filter(isKnown).map((value) => `Layout de som — ${value}`),
  ...canonical.processador_som.filter(isKnown).map((value) => `Processamento — ${value}`),
  ...canonical.tecnologia_tela.filter(isKnown).map((value) => `Tecnologia da tela — ${value}`),
  ...canonical.superficie_tela.filter(isKnown).map((value) => `Superfície da tela — ${value}`),
  ...canonical.geometria_tela.filter(isKnown).map((value) => `Geometria da tela — ${value}`),
  "A confirmar",
];

assertOptions(
  correction,
  "classificacao_padronizada",
  correctionOptions,
  "correcao-de-dados.yml",
);

console.log("Formulários de issue válidos e alinhados à taxonomia técnica.");

function isKnown(value: string): boolean {
  return value !== "A confirmar";
}

function assertOptions(form: ParsedForm, id: string, expected: string[], filename: string): void {
  const actual = form.dropdowns.get(id);
  if (!actual) {
    throw new Error(`${filename}: dropdown obrigatório ausente (${id})`);
  }

  if (actual.length < 2 || actual.length > 25) {
    throw new Error(`${filename}: ${id} deve ter entre 2 e 25 opções`);
  }

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${filename}: opções de ${id} divergiram da taxonomia\n` +
      `Esperado: ${expected.join(" | ")}\n` +
      `Atual: ${actual.join(" | ")}`,
    );
  }
}

function assertRoomNameExamples(source: string, filename: string): void {
  const placeholders = [...source.matchAll(/placeholder:\s*["']([^"']*Sala[^"']*)["']/g)]
    .map((match) => (match[1] ?? "").split("/").at(-1)?.trim() ?? "")
    .filter(Boolean);

  for (const name of placeholders) {
    const classifications = findRoomNameClassifications({ name } satisfies RoomNameInput);
    if (classifications.length > 0) {
      throw new Error(`${filename}: exemplo de nome de sala contém classificação técnica (${name}): ${classifications.join(", ")}`);
    }
  }
}

function parseForm(source: string): ParsedForm {
  const lines = source.split(/\r?\n/);
  const ids: string[] = [];
  const dropdowns = new Map<string, string[]>();

  for (const line of lines) {
    const id = line.match(/^    id:\s*(.+)\s*$/)?.[1];
    if (id) ids.push(id);
  }

  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`IDs duplicados no formulário: ${[...new Set(duplicateIds)].join(", ")}`);
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== "  - type: dropdown") continue;

    const end = lines.findIndex(
      (line, candidate) => candidate > index && line.startsWith("  - type: "),
    );
    const block = lines.slice(index, end === -1 ? lines.length : end);
    const id = block.find((line) => line.startsWith("    id: "))?.slice(8).trim();
    const optionsIndex = block.findIndex((line) => line === "      options:");
    const options = optionsIndex === -1
      ? []
      : block
        .slice(optionsIndex + 1)
        .filter((line) => line.startsWith("        - "))
        .map((line) => unquote(line.slice(10).trim()));

    if (!id) throw new Error("Dropdown sem id");
    dropdowns.set(id, options);
  }

  return { dropdowns };
}

function unquote(value: string): string {
  const quote = value[0];
  return quote && quote === value.at(-1) && ['"', "'"].includes(quote)
    ? value.slice(1, -1)
    : value;
}
