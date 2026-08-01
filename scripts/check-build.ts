import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { soundValues } from "../assets/display-values.js";
import type { Cinema } from "../types/catalog.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputRoot = path.join(projectRoot, "dist");
const requiredFiles = [
  "index.html",
  "salas.html",
  "cinemas.html",
  "estatisticas.html",
  "contribuir.html",
  "_headers",
  "assets/app.js",
  "assets/shell.js",
  "assets/statistics.js",
  "assets/catalog-utils.js",
  "assets/catalog-state.js",
  "assets/display-values.js",
  "assets/styles.css",
  "data/cinemas.json",
  "sitemap.xml",
  "robots.txt",
];

for (const filename of requiredFiles) {
  await access(path.join(outputRoot, filename));
}

const cinemas = JSON.parse(await readFile(path.join(outputRoot, "data", "cinemas.json"), "utf8")) as Cinema[];
const expectedRoomCount = cinemas.reduce((total, cinema) => total + cinema.rooms.length, 0);
const expectedNetworkCount = new Set(cinemas.map((cinema) => cinema.network.slug)).size;
const generatedCinemaPages = await jsonCount("cinemas");
const generatedRoomPages = await jsonCount("salas");
const generatedNetworkPages = await jsonCount("redes");

if (generatedCinemaPages !== cinemas.length) {
  throw new Error(`Esperadas ${cinemas.length} páginas de cinema; encontradas ${generatedCinemaPages}.`);
}
if (generatedRoomPages !== expectedRoomCount) {
  throw new Error(`Esperadas ${expectedRoomCount} páginas de sala; encontradas ${generatedRoomPages}.`);
}
if (generatedNetworkPages !== expectedNetworkCount) {
  throw new Error(`Esperadas ${expectedNetworkCount} páginas de rede; encontradas ${generatedNetworkPages}.`);
}

const htmlFiles = await walkHtml(outputRoot);
const missingLinks: string[] = [];
const redundantSoundSummaries = new Set<string>();

for (const cinema of cinemas) {
  for (const room of cinema.rooms) {
    const rawSoundValues = [room.sound?.format, room.sound?.channel_layout].filter(
      (value): value is Exclude<typeof value, null | undefined> =>
        value !== null && value !== undefined && value !== "A confirmar",
    );
    if (rawSoundValues.length > soundValues(room).length) {
      redundantSoundSummaries.add(rawSoundValues.join(" · "));
    }
  }
}

const redundantSoundPages: string[] = [];

for (const htmlPath of htmlFiles) {
  const html = await readFile(htmlPath, "utf8");
  for (const summary of redundantSoundSummaries) {
    if (html.includes(summary)) {
      redundantSoundPages.push(`${path.relative(outputRoot, htmlPath)} -> ${summary}`);
    }
  }
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (
      href.startsWith("http:") ||
      href.startsWith("https:") ||
      href.startsWith("mailto:") ||
      href.startsWith("#")
    ) {
      continue;
    }

    const target = path.resolve(path.dirname(htmlPath), href.split(/[?#]/)[0]);
    try {
      await access(target);
    } catch {
      missingLinks.push(`${path.relative(outputRoot, htmlPath)} -> ${href}`);
    }
  }
}

if (redundantSoundPages.length > 0) {
  throw new Error(`Resumo de som redundante no build:\n- ${redundantSoundPages.join("\n- ")}`);
}

if (missingLinks.length > 0) {
  throw new Error(`Links internos quebrados:\n- ${missingLinks.join("\n- ")}`);
}

console.log(
  `Build válido: ${htmlFiles.length} páginas HTML, ${expectedRoomCount} salas e nenhum link interno quebrado.`,
);

async function jsonCount(directory: string): Promise<number> {
  return (await readdir(path.join(outputRoot, directory))).filter((filename) => filename.endsWith(".html")).length;
}

async function walkHtml(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkHtml(fullPath));
    } else if (entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}
