import type {
  CatalogItem,
  Cinema,
  ExperienceTechnology,
  Room,
  RoomTextItem,
  Source,
  SoundValuesFunction,
  SystemTechnology,
  Technology,
} from "../types/catalog.js";

type RoomWithProjection = Pick<Room, "projection">;
type RoomWithScreen = Pick<Room, "screen">;
type RoomWithTechnologies = Pick<Room, "technologies">;
type RoomWithSound = Pick<Room, "sound">;
type CinemaIdentity = {
  network?: { slug?: string; name?: string };
  operator?: string;
};

export const UNKNOWN_VALUE = "A confirmar" as const;

export type TechnologyBrandKey =
  | "imax"
  | "dolby-digital"
  | "dolby-atmos"
  | "dts-x"
  | "4dx"
  | "macro-xe"
  | "xd"
  | "cinepic"
  | "xplus"
  | "d-box";

export function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isKnown(value: unknown): value is string | number {
  return value !== null
    && value !== undefined
    && value !== ""
    && value !== UNKNOWN_VALUE;
}

export function compact(values: readonly unknown[]): string {
  return values.filter(isKnown).join(" · ") || UNKNOWN_VALUE;
}

export function projectionValues(room: RoomWithProjection): string[] {
  const technology = room.projection?.technology;
  const lightSource = room.projection?.light_source;

  if (isKnown(technology)) return [technology];
  if (lightSource === "Laser RGB") return ["Laser", "Laser RGB"];
  return isKnown(lightSource) ? [lightSource] : [];
}

export function projectionDisplay(room: RoomWithProjection): string {
  return projectionValues(room).at(-1) || UNKNOWN_VALUE;
}

export function screenValues(room: RoomWithScreen): unknown[] {
  return [
    room.screen?.technology,
    room.screen?.surface,
    room.screen?.geometry,
    room.screen?.aspect_ratio,
  ];
}

export function usefulSources<T extends { url?: string; note?: string }>(sources: T[] = []): T[] {
  return sources.filter((source) => source.url?.trim() || source.note?.trim());
}

export function coverageValues(room: Room, soundValues: SoundValuesFunction): unknown[] {
  return [
    projectionDisplay(room),
    room.projection?.resolution,
    compact(soundValues(room)),
    compact(screenValues(room)),
  ];
}

export function coverageCount(room: Room, soundValues: SoundValuesFunction): number {
  return coverageValues(room, soundValues).filter(isKnown).length;
}

export function slugify(value: unknown): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function roomId(cinema: Pick<Cinema, "slug">, room: { slug?: string; name: string }): string {
  return `${cinema.slug}-${room.slug || slugify(room.name)}`;
}

export function networkName(cinema: CinemaIdentity): string {
  return cinema.network?.name || cinema.operator || "Rede independente";
}

export function networkId(cinema: CinemaIdentity): string {
  return cinema.network?.slug || slugify(networkName(cinema));
}

export function technicalTechnologies(room: RoomWithTechnologies): Technology[] {
  return room.technologies ?? [];
}

export function exhibitionSystems(room: RoomWithTechnologies): SystemTechnology[] {
  return technicalTechnologies(room)
    .filter((technology): technology is SystemTechnology => technology.type === "system");
}

export function roomExperiences(room: RoomWithTechnologies): ExperienceTechnology[] {
  return technicalTechnologies(room)
    .filter((technology): technology is ExperienceTechnology => technology.type === "experience");
}

export function roomExperienceNames(room: RoomWithTechnologies): string[] {
  const experiences = roomExperiences(room).map(({ name }) => name);
  return experiences.length > 0 ? experiences : ["2D"];
}

export function technologyBrandKey(value: unknown): TechnologyBrandKey | "" {
  const brands: Record<string, TechnologyBrandKey> = {
    imax: "imax",
    "dolby digital": "dolby-digital",
    "dolby atmos": "dolby-atmos",
    "dts:x": "dts-x",
    "4dx": "4dx",
    "macro xe": "macro-xe",
    xd: "xd",
    "cinemark xd": "xd",
    cinepic: "cinepic",
    xplus: "xplus",
    "uci xplus": "xplus",
    "d-box": "d-box",
  };
  return brands[normalize(value)] ?? "";
}

export function roomTechnologyBrands(room: RoomWithTechnologies & RoomWithSound): string[] {
  const candidates = [
    ...technicalTechnologies(room).map(({ name }) => name),
    room.sound?.format,
  ];
  const unique = new Map();

  for (const value of candidates) {
    const key = technologyBrandKey(value);
    if (key && !unique.has(key)) unique.set(key, value);
  }

  return [...unique.values()];
}

export function roomText(item: RoomTextItem): string {
  const { cinema, room } = item;

  return [
    cinema.name,
    networkName(cinema),
    cinema.city,
    cinema.neighborhood,
    room.name,
    room.projection?.technology,
    room.projection?.brand,
    room.projection?.model,
    room.projection?.resolution,
    room.projection?.light_source,
    room.screen?.technology,
    room.screen?.surface,
    room.screen?.geometry,
    room.screen?.area_m2,
    room.screen?.aspect_ratio,
    room.sound?.format,
    room.sound?.channel_layout,
    room.sound?.processor,
    room.sound?.channels,
    room.sound?.audio_streams,
    room.sound?.speakers,
    room.sound?.power_watts,
    technicalTechnologies(room)
      .map((technology) => `${technology.name} ${technology.type} ${technology.notes ?? ""}`)
      .join(" "),
    room.notes,
    cinema.notes,
  ].join(" ");
}

export function buildRooms(data: Cinema[]): CatalogItem[] {
  return data.flatMap((cinema) =>
    cinema.rooms.map((room) => ({
      cinema,
      room,
      id: roomId(cinema, room),
      searchable: normalize(roomText({ cinema, room })),
    })),
  ).sort((a, b) =>
    a.cinema.name.localeCompare(b.cinema.name, "pt-BR") ||
    a.room.name.localeCompare(b.room.name, "pt-BR"),
  );
}
