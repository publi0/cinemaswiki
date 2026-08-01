import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Cinema, Room, Source } from "../types/catalog.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cinemaDirectory = path.join(projectRoot, "data", "cinemas");
const sourceUrl =
  "https://www.gov.br/ancine/pt-br/oca/cinema/arquivos.csv/salas-de-exibicao-e-complexos.csv/@@download/file";
const verifiedAt = "2026-07-31";

interface CsvRow extends Record<string, string> {}

interface CinemaMapping {
  registry: string;
  roomName?: (number: number, row?: CsvRow) => string;
  forceRoomName?: boolean;
  overwriteSeats?: boolean;
  canonicalNumber?: (number: number) => number;
  ancineRoomNumber?: (row: CsvRow) => number | null;
  include?: (number: number, row: CsvRow) => boolean;
  inheritTemplateForNewRooms?: boolean;
}

interface IngressoObservation {
  numbers: number[];
  url: string;
}

interface ImportStats {
  cinemas: number;
  rooms: number;
  roomsAdded: number;
  roomsRemoved: number;
  seatsFilled: number;
  seatConflictsPreserved: number;
  ingressoSources: number;
  seatConflicts: string[];
  removedRooms: string[];
}

const mappings: Record<string, CinemaMapping> = {
  "cine-araujo-campo-limpo": { registry: "6395" },
  "cinema-belas-artes": { registry: "49176" },
  "cine-marquise": { registry: "47736" },
  "cineflix-cantareira": { registry: "32844" },
  "cinema-reserva-cultural-sp": { registry: "6665" },
  "instituto-moreira-salles-sp": { registry: "37080" },
  "cinemark-aricanduva": { registry: "897" },
  "cinemark-boulevard-tatuape": { registry: "12974" },
  "cinemark-center-norte": { registry: "2528" },
  "cinemark-central-plaza": { registry: "902" },
  "cinemark-cidade-jardim-vip": {
    registry: "14628",
    roomName(number) {
      return number <= 4 ? `Bradesco Prime ${number}` : `Sala ${number}`;
    },
  },
  "cinemark-eldorado": { registry: "11840" },
  "cinemark-lar-center": { registry: "30596" },
  "cinemark-market-place": { registry: "908" },
  "cinemark-metro-tatauape": { registry: "895" },
  "cinemark-mooca": { registry: "20598" },
  "cinemark-paulista": { registry: "15598" },
  "cinemark-patio-higienopolis": { registry: "2536" },
  "cinemark-raposo": { registry: "20591" },
  "cinemark-shopping-cidade-sao-paulo": { registry: "30581" },
  "cinemark-shopping-d": { registry: "907" },
  "cinemark-shopping-iguatemi-sp": { registry: "40182" },
  "cinemark-shopping-interlagos": { registry: "2533" },
  "cinemark-shopping-metro-santa-cruz": {
    registry: "2524",
    forceRoomName: true,
    overwriteSeats: true,
    canonicalNumber(number) {
      return number === 10 ? 9 : number;
    },
  },
  "cinemark-sp-market": { registry: "898" },
  "cinemark-tiete-plaza": { registry: "30582" },
  "cinemark-tucuruvi": { registry: "25602" },
  "cinemark-villa-lobos": { registry: "2540" },
  "cinemark-west-plaza": { registry: "36652" },
  "cinepolis-itaquera": { registry: "30012" },
  "cinepolis-jardim-pamplona": { registry: "44537" },
  "cinepolis-jk-iguatemi": { registry: "21667" },
  "cinepolis-mais-shopping": { registry: "17949" },
  "cinesystem-belas-artes-frei-caneca": { registry: "6636" },
  "cinesystem-morumbi-town": { registry: "34941" },
  "cinesystem-pompeia": {
    registry: "42213",
    ancineRoomNumber(row) {
      return row.NOME_SALA.includes("IMAX") ? 11 : roomNumber(row.NOME_SALA);
    },
  },
  "espaco-petrobras": {
    registry: "31112",
    include(number) {
      return number <= 3;
    },
  },
  "kinoplex-itaim": { registry: "2391" },
  "kinoplex-parque-da-cidade": {
    registry: "43321",
    inheritTemplateForNewRooms: true,
  },
  "kinoplex-vila-olimpia": { registry: "17204" },
  "moviecom-boavista": { registry: "4846" },
  "moviecom-penha": { registry: "2919" },
  "playarte-maraba": { registry: "40652" },
  "uci-analia-franco": { registry: "2622" },
  "uci-jardim-sul": { registry: "2621" },
  "uci-plaza-sul": { registry: "52086" },
  "uci-santana": { registry: "14653" },
};

const ingressoObserved: Record<string, IngressoObservation> = {
  "cinemark-cidade-jardim-vip": {
    numbers: [1, 2, 3, 4, 5, 6, 7],
    url: "https://www.ingresso.com/cinema/cinemark-cidade-jardim-vip",
  },
  "cinemark-patio-higienopolis": {
    numbers: [1, 2, 3, 4, 5, 6],
    url: "https://www.ingresso.com/cinema/cinemark-patio-higienopolis",
  },
  "cinemark-shopping-metro-santa-cruz": {
    numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    url: "https://www.ingresso.com/cinema/cinemark-shopping-metro-santa-cruz",
  },
  "cinepolis-jk-iguatemi": {
    numbers: [1, 2, 3, 4, 5, 6, 7, 8],
    url: "https://www.ingresso.com/cinema/cinepolis-jk-iguatemi",
  },
  "cinepolis-mais-shopping": {
    numbers: [1, 4, 5, 6, 7, 8],
    url: "https://www.ingresso.com/cinema/cinepolis-mais-shopping",
  },
  "cinesystem-belas-artes-frei-caneca": {
    numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    url: "https://www.ingresso.com/cinema/cinesystem-belas-artes-frei-caneca",
  },
  "cinesystem-morumbi-town": {
    numbers: [1, 2, 3, 4, 5, 8, 9],
    url: "https://www.ingresso.com/cinema/cinesystem-morumbi-town",
  },
  "cinesystem-pompeia": {
    numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    url: "https://www.ingresso.com/cinema/cinesystem-pompeia",
  },
  "espaco-petrobras": {
    numbers: [1, 2, 3],
    url: "https://www.ingresso.com/cinema/espaco-petrobras-de-cinema",
  },
  "kinoplex-parque-da-cidade": {
    numbers: [1, 2, 3, 4, 5],
    url: "https://www.ingresso.com/cinema/kinoplex-parque-da-cidade",
  },
  "moviecom-boavista": {
    numbers: [1, 2, 3, 4, 5],
    url: "https://www.ingresso.com/cinema/moviecom-boavista",
  },
  "playarte-maraba": {
    numbers: [1, 4, 5],
    url: "https://www.ingresso.com/cinema/playarte-multiplex-maraba",
  },
};

const csvPath = process.argv[2];
if (!csvPath) {
  throw new Error(
    "Uso: npm run import:ancine -- /caminho/salas-de-exibicao-e-complexos.csv",
  );
}

const records: CsvRow[] = parseCsv(await readFile(csvPath, "utf8")).filter(
  (record) =>
    record.UF_COMPLEXO === "SP" &&
    record.MUNICIPIO_COMPLEXO === "SÃO PAULO" &&
    record.SITUACAO_SALA === "EM FUNCIONAMENTO" &&
    record.SITUACAO_COMPLEXO === "EM FUNCIONAMENTO",
);

const recordsByRegistry = Map.groupBy(records, (record) => record.REGISTRO_COMPLEXO);
const stats: ImportStats = {
  cinemas: 0,
  rooms: 0,
  roomsAdded: 0,
  roomsRemoved: 0,
  seatsFilled: 0,
  seatConflictsPreserved: 0,
  ingressoSources: 0,
  seatConflicts: [],
  removedRooms: [],
};

for (const [slug, mapping] of Object.entries(mappings)) {
  const rows = recordsByRegistry.get(mapping.registry);
  if (!rows?.length) {
    throw new Error(`${slug}: complexo ANCINE ${mapping.registry} não encontrado`);
  }

  const filePath = path.join(cinemaDirectory, `${slug}.json`);
  const cinema = JSON.parse(await readFile(filePath, "utf8")) as Cinema;
  const existingRooms = new Map<number, Room>();

  for (const room of cinema.rooms) {
    let number = catalogRoomNumber(room);
    if (slug === "cinemark-shopping-metro-santa-cruz" && number === 10) number = 9;
    if (number !== null && !existingRooms.has(number)) existingRooms.set(number, room);
  }

  const template =
    mapping.inheritTemplateForNewRooms && cinema.rooms.length > 0
      ? structuredClone(cinema.rooms[0])
      : null;
  const importedRooms: Array<{ number: number; room: Room }> = [];

  for (const row of rows) {
    const rawNumber = mapping.ancineRoomNumber?.(row) ?? roomNumber(row.NOME_SALA);
    if (rawNumber === null) {
      if (rows.length !== 1) {
        throw new Error(`${slug}: não foi possível numerar "${row.NOME_SALA}"`);
      }
    }

    const number = mapping.canonicalNumber?.(rawNumber ?? 1) ?? rawNumber ?? 1;
    if (mapping.include && !mapping.include(number, row)) continue;

    const existing = existingRooms.get(number);
    const room = existing
      ? structuredClone(existing)
      : template
        ? structuredClone(template)
        : emptyRoom(mapping.roomName?.(number, row) ?? `Sala ${number}`);

    if (!existing || mapping.forceRoomName) {
      room.name = mapping.roomName?.(number, row) ?? `Sala ${number}`;
      room.slug = slugify(room.name);
    }
    if (!existing) {
      room.sources = [];
      room.seats = null;
      stats.roomsAdded += 1;
    }

    room.ancine_registry = row.REGISTRO_SALA;
    room.accessibility = {
      wheelchair_seats: parseNumber(row.ASSENTOS_CADEIRANTES),
      reduced_mobility_seats: parseNumber(row.ASSENTOS_MOBILIDADE_REDUZIDA),
      obese_seats: parseNumber(row.ASSENTOS_OBESIDADE),
      ramp_to_seats: parseYesNo(row.ACESSO_ASSENTOS_COM_RAMPA),
      ramp_to_room: parseYesNo(row.ACESSO_SALA_COM_RAMPA),
      accessible_restrooms: parseYesNo(row.BANHEIROS_ACESSIVEIS),
    };

    const registeredSeats = parseNumber(row.ASSENTOS_SALA);
    if (mapping.overwriteSeats && registeredSeats !== null) {
      if (room.seats !== registeredSeats) stats.seatsFilled += 1;
      room.seats = registeredSeats;
    } else if (room.seats === null || room.seats === undefined) {
      room.seats = registeredSeats;
      stats.seatsFilled += 1;
    } else if (registeredSeats !== null && room.seats !== registeredSeats) {
      stats.seatConflictsPreserved += 1;
      stats.seatConflicts.push(
        `${slug}/${room.slug}: catálogo ${room.seats}, ANCINE ${registeredSeats}`,
      );
    }

    room.sources = appendSource(room.sources, {
      type: "official",
      url: sourceUrl,
      note: ancineSourceNote(row),
    });

    const ingresso = ingressoObserved[slug];
    if (ingresso?.numbers.includes(number)) {
      room.sources = appendSource(room.sources, {
        type: "metadata",
        url: ingresso.url,
        note: `Sala ${number} observada na programação do Ingresso.com em 31/07/2026.`,
      });
      stats.ingressoSources += 1;
    }

    importedRooms.push({ number, room });
  }

  const importedNumbers = new Set(importedRooms.map(({ number }) => number));
  for (const [number, room] of existingRooms) {
    if (importedNumbers.has(number)) continue;
    stats.roomsRemoved += 1;
    stats.removedRooms.push(`${slug}/${room.slug} (número interpretado: ${number})`);
  }

  cinema.ancine_registry = mapping.registry;
  cinema.last_verified = verifiedAt;
  cinema.rooms = importedRooms
    .sort((a, b) => a.number - b.number)
    .map(({ room }) => orderRoom(room));

  await writeFile(filePath, `${JSON.stringify(orderCinema(cinema), null, 2)}\n`);
  stats.cinemas += 1;
  stats.rooms += cinema.rooms.length;
}

console.log(
  [
    `${stats.cinemas} cinemas cruzados com a ANCINE; ${stats.rooms} salas resultantes.`,
    `${stats.roomsAdded} salas adicionadas; ${stats.roomsRemoved} registros locais sem correspondência removidos.`,
    `${stats.seatsFilled} capacidades preenchidas; ${stats.seatConflictsPreserved} divergências preservaram a fonte mais específica já existente.`,
    `${stats.ingressoSources} confirmações de programação atual adicionadas.`,
  ].join("\n"),
);
if (stats.seatConflicts.length > 0) {
  console.log(`Divergências de capacidade preservadas:\n- ${stats.seatConflicts.join("\n- ")}`);
}
if (stats.removedRooms.length > 0) {
  console.log(`Salas locais sem correspondência:\n- ${stats.removedRooms.join("\n- ")}`);
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = lines.shift()?.split(";") ?? [];
  return lines.map((line) =>
    Object.fromEntries(headers.map((header, index) => [header, line.split(";")[index] ?? ""])),
  );
}

function roomNumber(name: string): number | null {
  const numbers = [...name.matchAll(/\d+/g)];
  const lastNumber = numbers.at(-1)?.[0];
  if (lastNumber) return Number(lastNumber);

  const roman = name.match(/\b(X|IX|VIII|VII|VI|V|IV|III|II|I)\b[^A-Z]*$/i)?.[1];
  if (!roman) return null;
  return {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
  }[roman.toUpperCase()] ?? null;
}

function catalogRoomNumber(room: Room): number | null {
  const slugNumber = room.slug.match(/(?:^|-)sala-(\d+)(?:-|$)/)?.[1];
  if (slugNumber) return Number(slugNumber);
  return roomNumber(room.name);
}

function parseNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function parseYesNo(value: string): boolean | null {
  if (value === "SIM") return true;
  if (value === "NÃO") return false;
  return null;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function emptyRoom(name: string): Room {
  return {
    name,
    slug: slugify(name),
    technologies: [],
    projection: {
      technology: "A confirmar",
      resolution: "A confirmar",
      light_source: "A confirmar",
    },
    screen: {
      aspect_ratio: "A confirmar",
      width_m: null,
      height_m: null,
    },
    sound: {
      format: "A confirmar",
      channels: null,
      speakers: null,
      power_watts: null,
    },
    seats: null,
    sources: [],
  };
}

function ancineSourceNote(row: CsvRow): string {
  const details = [`${row.ASSENTOS_SALA} assentos`];
  if (row.ASSENTOS_CADEIRANTES !== "") {
    details.push(
      `${row.ASSENTOS_CADEIRANTES} ${plural(row.ASSENTOS_CADEIRANTES, "espaço", "espaços")} para cadeirantes`,
    );
  }
  if (row.ASSENTOS_MOBILIDADE_REDUZIDA !== "") {
    details.push(
      `${row.ASSENTOS_MOBILIDADE_REDUZIDA} ${plural(row.ASSENTOS_MOBILIDADE_REDUZIDA, "assento", "assentos")} de mobilidade reduzida`,
    );
  }
  if (row.ASSENTOS_OBESIDADE !== "") {
    details.push(
      `${row.ASSENTOS_OBESIDADE} ${plural(row.ASSENTOS_OBESIDADE, "assento", "assentos")} para pessoas obesas`,
    );
  }
  return `Cadastro mensal da ANCINE: "${row.NOME_SALA}", registro ${row.REGISTRO_SALA}, em funcionamento; ${details.join(", ")}.`;
}

function plural(value: string, singular: string, pluralForm: string): string {
  return Number(value) === 1 ? singular : pluralForm;
}

function appendSource(sources: Source[] = [], source: Source): Source[] {
  const withoutSameSource = sources.filter(
    (item) => !(item.url === source.url && item.type === source.type),
  );
  return [...withoutSameSource, source];
}

function orderCinema(cinema: Cinema): Cinema {
  const {
    slug,
    name,
    network,
    city,
    state,
    neighborhood,
    address,
    ancine_registry,
    last_verified,
    notes,
    external_url,
    rooms,
  } = cinema;
  return removeUndefined({
    slug,
    name,
    network,
    city,
    state,
    neighborhood,
    address,
    ancine_registry,
    last_verified,
    notes,
    external_url,
    rooms,
  }) as Cinema;
}

function orderRoom(room: Room): Room {
  const {
    name,
    slug,
    ancine_registry,
    technologies,
    projection,
    screen,
    sound,
    seats,
    accessibility,
    sources,
    notes,
  } = room;
  return removeUndefined({
    name,
    slug,
    ancine_registry,
    technologies,
    projection,
    screen,
    sound,
    seats,
    accessibility,
    sources,
    notes,
  }) as Room;
}

function removeUndefined<T extends Record<string, unknown>>(object: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
