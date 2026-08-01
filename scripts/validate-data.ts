import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import * as addFormatsModule from "ajv-formats";
import type { Cinema, Technology } from "../types/catalog.js";
import { roomNamePolicyMessage } from "./room-name-policy.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cinemaDirectory = path.join(projectRoot, "data", "cinemas");
const schemaPath = path.join(projectRoot, "data", "schema.json");
const addFormats = (addFormatsModule as unknown as {
  default: (ajv: InstanceType<typeof Ajv2020>) => void;
}).default;

export interface ValidationPaths {
  directory?: string;
  schemaPath?: string;
}

export async function loadAndValidateCinemas(options: ValidationPaths = {}): Promise<Cinema[]> {
  const dataDirectory = options.directory ?? cinemaDirectory;
  const dataSchemaPath = options.schemaPath ?? schemaPath;
  const schema = JSON.parse(await readFile(dataSchemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile<Cinema>(schema);

  const filenames = (await readdir(dataDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (filenames.length === 0) {
    throw new Error("Nenhum cinema encontrado em data/cinemas.");
  }

  const cinemas: Cinema[] = [];
  const errors: string[] = [];

  for (const filename of filenames) {
    const filePath = path.join(dataDirectory, filename);
    let cinema: unknown;

    try {
      cinema = JSON.parse(await readFile(filePath, "utf8"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${filename}: JSON inválido (${message})`);
      continue;
    }

    if (!validate(cinema)) {
      for (const issue of validate.errors ?? []) {
        errors.push(`${filename}${issue.instancePath || "/"}: ${issue.message}`);
      }
      continue;
    }

    const validatedCinema = cinema as Cinema;

    if (filename !== `${validatedCinema.slug}.json`) {
      errors.push(`${filename}: o arquivo deve se chamar ${validatedCinema.slug}.json`);
    }

    cinemas.push(validatedCinema);
  }

  validateCrossReferences(cinemas, errors);

  if (errors.length > 0) {
    throw new Error(`Falha na validação dos dados:\n- ${errors.join("\n- ")}`);
  }

  return cinemas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function validateCrossReferences(cinemas: Cinema[], errors: string[]): void {
  const cinemaSlugs = new Set<string>();
  const roomIds = new Set<string>();
  const networkNames = new Map<string, string>();
  const allowedTechnologies = new Map<string, Technology["type"]>([
    ["IMAX", "system"],
    ["Macro XE", "system"],
    ["XD", "system"],
    ["Cinépic", "system"],
    ["UCI XPLUS", "system"],
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

    const localRoomSlugs = new Set<string>();
    const localRoomNames = new Set<string>();
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

      const technologies = new Set<string>();
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

async function run(): Promise<void> {
  const cinemas = await loadAndValidateCinemas();
  const roomCount = cinemas.reduce((total, cinema) => total + cinema.rooms.length, 0);
  console.log(`Dados válidos: ${cinemas.length} cinemas e ${roomCount} salas.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
