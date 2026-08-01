import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { roomNamePolicyMessage } from "./room-name-policy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cinemaDirectory = path.join(projectRoot, "data", "cinemas");
const schemaPath = path.join(projectRoot, "data", "schema.json");

export async function loadAndValidateCinemas() {
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const filenames = (await readdir(cinemaDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (filenames.length === 0) {
    throw new Error("Nenhum cinema encontrado em data/cinemas.");
  }

  const cinemas = [];
  const errors = [];

  for (const filename of filenames) {
    const filePath = path.join(cinemaDirectory, filename);
    let cinema;

    try {
      cinema = JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
      errors.push(`${filename}: JSON inválido (${error.message})`);
      continue;
    }

    if (!validate(cinema)) {
      for (const issue of validate.errors ?? []) {
        errors.push(`${filename}${issue.instancePath || "/"}: ${issue.message}`);
      }
      continue;
    }

    if (filename !== `${cinema.slug}.json`) {
      errors.push(`${filename}: o arquivo deve se chamar ${cinema.slug}.json`);
    }

    cinemas.push(cinema);
  }

  validateCrossReferences(cinemas, errors);

  if (errors.length > 0) {
    throw new Error(`Falha na validação dos dados:\n- ${errors.join("\n- ")}`);
  }

  return cinemas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function validateCrossReferences(cinemas, errors) {
  const cinemaSlugs = new Set();
  const roomIds = new Set();
  const networkNames = new Map();
  const allowedTechnologies = new Map([
    ["IMAX", "system"],
    ["Macro XE", "system"],
    ["3D", "experience"],
    ["4DX", "experience"],
  ]);

  for (const cinema of cinemas) {
    if (cinemaSlugs.has(cinema.slug)) {
      errors.push(`${cinema.slug}: slug de cinema duplicado`);
    }
    cinemaSlugs.add(cinema.slug);

    const knownNetworkName = networkNames.get(cinema.network.slug);
    if (knownNetworkName && knownNetworkName !== cinema.network.name) {
      errors.push(
        `${cinema.slug}: a rede ${cinema.network.slug} aparece como "${knownNetworkName}" e "${cinema.network.name}"`,
      );
    }
    networkNames.set(cinema.network.slug, cinema.network.name);

    const localRoomSlugs = new Set();
    const localRoomNames = new Set();
    for (const room of cinema.rooms) {
      const normalizedRoomName = room.name.trim().toLocaleLowerCase("pt-BR");
      if (localRoomNames.has(normalizedRoomName)) {
        errors.push(`${cinema.slug}: nome de sala duplicado (${room.name})`);
      }
      localRoomNames.add(normalizedRoomName);

      if (localRoomSlugs.has(room.slug)) {
        errors.push(`${cinema.slug}: slug de sala duplicado (${room.slug})`);
      }
      localRoomSlugs.add(room.slug);

      const roomId = `${cinema.slug}-${room.slug}`;
      if (roomIds.has(roomId)) {
        errors.push(`${roomId}: identificador global de sala duplicado`);
      }
      roomIds.add(roomId);

      const roomNameIssue = roomNamePolicyMessage(room);
      if (roomNameIssue) errors.push(`${roomId}: ${roomNameIssue}`);

      const technologies = new Set();
      for (const technology of room.technologies ?? []) {
        if (technologies.has(technology.name)) {
          errors.push(`${roomId}: tecnologia duplicada (${technology.name})`);
        }
        technologies.add(technology.name);

        const allowedType = allowedTechnologies.get(technology.name);
        if (!allowedType) {
          errors.push(
            `${roomId}: "${technology.name}" não é uma classificação permitida`,
          );
        } else if (technology.type !== allowedType) {
          errors.push(
            `${roomId}: "${technology.name}" deve usar o tipo "${allowedType}", não "${technology.type}"`,
          );
        }
      }

      for (const source of room.sources ?? []) {
        if (!source.url.trim() && !source.note.trim()) {
          errors.push(`${roomId}: fonte vazia; informe URL ou observação`);
        }
      }
    }
  }
}

async function run() {
  const cinemas = await loadAndValidateCinemas();
  const roomCount = cinemas.reduce((total, cinema) => total + cinema.rooms.length, 0);
  console.log(`Dados válidos: ${cinemas.length} cinemas e ${roomCount} salas.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
