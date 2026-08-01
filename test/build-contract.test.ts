import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { before, test } from "node:test";
import { loadAndValidateCinemas } from "../scripts/validate-data.js";
import type { Cinema } from "../types/catalog.js";
import { projectRoot } from "./helpers.js";

const execFileAsync = promisify(execFile);
const outputRoot = path.join(projectRoot, "dist");

before(async () => {
  await execFileAsync(process.execPath, [".tsbuild/scripts/build.js"], { cwd: projectRoot });
});

async function listHtml(directory: string = outputRoot): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listHtml(fullPath));
    else if (entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files;
}

test("build gera arquivos públicos essenciais e catálogo consistente", async () => {
  for (const relativePath of [
    "index.html",
    "salas.html",
    "cinemas.html",
    "formatos.html",
    "estatisticas.html",
    "contribuir.html",
    "assets/app.js",
    "assets/statistics.js",
    "assets/catalog-utils.js",
    "assets/catalog-state.js",
    "data/cinemas.json",
    "sitemap.xml",
    "robots.txt",
    "_headers",
  ]) {
    await access(path.join(outputRoot, relativePath));
  }

  const sourceCatalog = await loadAndValidateCinemas();
  const builtCatalog = JSON.parse(await readFile(path.join(outputRoot, "data/cinemas.json"), "utf8"));
  assert.deepEqual(builtCatalog, sourceCatalog);
});

test("build gera exatamente uma página por cinema, sala e rede", async () => {
  const cinemas = JSON.parse(await readFile(path.join(outputRoot, "data/cinemas.json"), "utf8")) as Cinema[];
  const roomCount = cinemas.reduce((total, cinema) => total + cinema.rooms.length, 0);
  const networkCount = new Set(cinemas.map((cinema) => cinema.network.slug)).size;
  const count = async (directory: string): Promise<number> => (await readdir(path.join(outputRoot, directory)))
    .filter((filename) => filename.endsWith(".html")).length;

  assert.equal(await count("cinemas"), cinemas.length);
  assert.equal(await count("salas"), roomCount);
  assert.equal(await count("redes"), networkCount);
});

test("páginas HTML têm identidade, metadados e assets locais", async () => {
  const htmlFiles = await listHtml();
  assert.equal(htmlFiles.length, 398);

  for (const htmlPath of htmlFiles) {
    const html = await readFile(htmlPath, "utf8");
    const relativePath = path.relative(outputRoot, htmlPath);
    assert.match(html, /^<!doctype html>/i, relativePath);
    assert.match(html, /<html lang="pt-BR">/, relativePath);
    assert.match(html, /<meta name="viewport"/, relativePath);
    assert.match(html, /<title>[^<]+<\/title>/, relativePath);
    assert.match(html, /styles\.css\?v=7/, relativePath);
    assert.match(html, /lab-theme\.css\?v=5/, relativePath);
    assert.match(html, /type="module"[^>]+shell\.js/, relativePath);
  }
});

test("páginas de detalhe têm canonical e conteúdo do registro correspondente", async () => {
  const cinemas = JSON.parse(await readFile(path.join(outputRoot, "data", "cinemas.json"), "utf8")) as Cinema[];

  for (const cinema of cinemas) {
    const cinemaPath = path.join(outputRoot, "cinemas", `${cinema.slug}.html`);
    const cinemaHtml = await readFile(cinemaPath, "utf8");
    assert.match(cinemaHtml, new RegExp(`<link rel="canonical" href="https://cinemaswiki\\.publio\\.dev/cinemas/${cinema.slug}\\.html">`));
    assert.match(cinemaHtml, new RegExp(`<script type="application/ld\\+json">`));
    assert.match(cinemaHtml, new RegExp(cinema.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    for (const room of cinema.rooms) {
      const roomId = `${cinema.slug}-${room.slug}`;
      const roomPath = path.join(outputRoot, "salas", `${roomId}.html`);
      const roomHtml = await readFile(roomPath, "utf8");
      assert.match(roomHtml, new RegExp(`<link rel="canonical" href="https://cinemaswiki\\.publio\\.dev/salas/${roomId}\\.html">`));
      assert.match(roomHtml, new RegExp(room.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
});

test("sitemap e robots cobrem todos os destinos públicos sem duplicatas", async () => {
  const cinemas = JSON.parse(await readFile(path.join(outputRoot, "data", "cinemas.json"), "utf8")) as Cinema[];
  const roomCount = cinemas.reduce((total, cinema) => total + cinema.rooms.length, 0);
  const networkCount = new Set(cinemas.map((cinema) => cinema.network.slug)).size;
  const sitemap = await readFile(path.join(outputRoot, "sitemap.xml"), "utf8");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedCount = 6 + cinemas.length + roomCount + networkCount;

  assert.equal(locations.length, expectedCount);
  assert.equal(new Set(locations).size, locations.length);
  assert.ok(locations.includes("https://cinemaswiki.publio.dev/"));
  assert.ok(locations.includes("https://cinemaswiki.publio.dev/formatos.html"));
  assert.match(await readFile(path.join(outputRoot, "robots.txt"), "utf8"), /Sitemap: https:\/\/cinemaswiki\.publio\.dev\/sitemap\.xml/);
});

test("nenhum link ou asset relativo aponta para caminho inexistente", async () => {
  const missing: string[] = [];
  for (const htmlPath of await listHtml()) {
    const html = await readFile(htmlPath, "utf8");
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = match[1];
      if (/^(?:https?:|mailto:|#)/.test(href)) continue;
      const target = path.resolve(path.dirname(htmlPath), href.split(/[?#]/)[0]);
      try {
        await access(target);
      } catch {
        missing.push(`${path.relative(outputRoot, htmlPath)} -> ${href}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});
