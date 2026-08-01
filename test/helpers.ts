import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Cinema, Room } from "../types/catalog.js";

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export async function readJson<T = unknown>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8")) as T;
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function room(overrides: Record<string, unknown> = {}): Room {
  return {
    name: "Sala 1",
    slug: "sala-1",
    projection: {},
    screen: {},
    sound: {},
    seats: null,
    technologies: [],
    sources: [{ type: "official", url: "https://example.com", note: "" }],
    ...overrides,
  } as Room;
}

export function cinema(overrides: Record<string, unknown> = {}): Cinema {
  return {
    slug: "cinema-teste",
    name: "Cinema Teste",
    network: { slug: "rede-teste", name: "Rede Teste" },
    city: "São Paulo",
    state: "SP",
    neighborhood: "Centro",
    address: "Rua de Teste, 1",
    last_verified: "2026-01-01",
    rooms: [room()],
    ...overrides,
  } as Cinema;
}
