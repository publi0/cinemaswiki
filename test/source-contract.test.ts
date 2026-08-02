import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { projectRoot, readJson } from "./helpers.js";

const read = (relativePath: string): Promise<string> =>
  readFile(`${projectRoot}/${relativePath}`, "utf8");

test("páginas de catálogo mantêm os controles técnicos sincronizados", async () => {
  for (const page of ["index.html", "salas.html"]) {
    const html = await read(page);
    for (const id of [
      "search",
      "system",
      "experience",
      "projection",
      "resolution",
      "sound",
      "sound-layout",
      "sort",
      "clear-filters",
      "room-list",
      "pagination",
    ]) {
      assert.match(html, new RegExp(`id="${id}"`), `${page}: ${id}`);
    }
    assert.match(html, /type="module" src="assets\/shell\.js"/);
    assert.match(html, /type="module" src="assets\/app\.js"/);
    assert.match(html, /<form class="filter-form" role="search">/);
  }
});

test("páginas estáticas e estados interativos mantêm contratos de acessibilidade", async () => {
  const canonicalPages: Record<string, string> = {
    "index.html": "https://cinemaswiki.publio.dev/",
    "salas.html": "https://cinemaswiki.publio.dev/salas.html",
    "cinemas.html": "https://cinemaswiki.publio.dev/cinemas.html",
    "formatos.html": "https://cinemaswiki.publio.dev/formatos.html",
    "estatisticas.html": "https://cinemaswiki.publio.dev/estatisticas.html",
    "contribuir.html": "https://cinemaswiki.publio.dev/contribuir.html",
  };
  for (const [page, canonical] of Object.entries(canonicalPages)) {
    const html = await read(page);
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
    assert.match(html, /aria-label="Navegação principal"/);
  }

  const shell = await read(".tsbuild/assets/shell.js");
  assert.match(shell, /textContent = open \? "Fechar navegação" : "Abrir navegação"/);
  assert.match(shell, /setNavigationOpen\(false, true\)/);

  const app = await read(".tsbuild/assets/app.js");
  assert.match(app, /role="group"/);
  assert.match(app, /aria-label="\$\{escapeHtml\(\`\$\{label\}: \$\{primary \|\| "A confirmar"\}\`\)\}"/);
  assert.match(app, /filterForm\?\.addEventListener\("submit", \(event\) => \{\s*event\.preventDefault\(\);/);

  const statistics = await read(".tsbuild/assets/statistics.js");
  assert.match(statistics, /error\.setAttribute\("role", "alert"\)/);

  const headers = await read("_headers");
  assert.match(headers, /img-src 'self' data:/);
  assert.match(headers, /style-src 'self' 'unsafe-inline'/);

  const theme = await read("assets/lab-theme.css");
  assert.match(theme, /\.catalog-page \.filter-toggle strong::after \{[\s\S]*margin-left: 0\.35em;[\s\S]*content: "ativos";/);
  assert.match(theme, /grid-template-columns: repeat\(7, minmax\(120px, 1fr\)\) auto;/);
  assert.match(theme, /\.catalog-page \.clear-filters \{[\s\S]*justify-self: end;[\s\S]*border: 1px solid #aeb6bb;/);
  assert.match(theme, /\.catalog-page \.clear-filters \{[\s\S]*position: static;[\s\S]*grid-column: 1 \/ -1;/);
  assert.match(theme, /\.catalog-page \.filter-toggle\[aria-expanded="true"\] \{[\s\S]*border-bottom: 0;/);
  assert.match(theme, /\.catalog-page \.filter-toggle\[aria-expanded="false"\] \{[\s\S]*border-bottom: 1px solid var\(--line\);/);
});

test("app usa módulos compartilhados de estado e busca e consulta o catálogo com cache revalidável", async () => {
  const app = await read(".tsbuild/assets/app.js");
  assert.match(app, /from "\.\/catalog-utils\.js"/);
  assert.match(app, /from "\.\/catalog-state\.js"/);
  assert.match(app, /fetch\("data\/cinemas\.json",\s*\{\s*cache: "no-cache"/s);
  assert.match(app, /Accept: "application\/json"/);
  assert.match(app, /soundLayoutFilter/);
  assert.match(app, /function resolutionBrandMark\(value\) \{[\s\S]*normalize\(value\) !== "4k"/);
  assert.match(app, /technology-mark--4k/);
});

test("detalhes preservam a visibilidade legada do filtro de layout", async () => {
  const app = await read(".tsbuild/assets/app.js");
  const visibilityControls = app.match(/function catalogVisibilityControls\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(visibilityControls, "o app precisa declarar os controles visíveis no catálogo e nos detalhes");
  assert.doesNotMatch(visibilityControls, /soundLayoutFilter/);
  assert.match(app, /function filterControls\(\) \{[\s\S]*soundLayoutFilter[\s\S]*\n\}/);
});

test("estatísticas expõem todas as áreas que o script preenche", async () => {
  const html = await read("estatisticas.html");
  const script = await read(".tsbuild/assets/statistics.js");
  for (const id of [
    "stat-ledger",
    "statistics-stamp",
    "technical-highlights",
    "coverage-list",
    "coverage-waffles",
    "network-ranking",
    "network-donut",
    "network-chart-legend",
    "network-insight",
    "accessibility-ledger",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
    assert.match(script, new RegExp(`(?:requiredElement|querySelector)\\("#${id}"\\)`), id);
  }
  assert.match(html, /<script type="module" src="assets\/statistics\.js"><\/script>/);
});

test("workflow de validação executa a suíte oficial", async () => {
  const workflow = await read(".github/workflows/validate.yml");
  assert.match(workflow, /npm test/);
  assert.match(workflow, /pull_request/);
  assert.match(workflow, /push/);
});

test("scripts de projeto permanecem documentados e unitários entram no npm test", async () => {
  const packageJson = await readJson<{ scripts: Record<string, string> }>("package.json");
  assert.equal(
    packageJson.scripts["test:unit"],
    "npm run compile && node --test --test-concurrency=1 .tsbuild/test/*.test.js",
  );
  assert.match(packageJson.scripts.test, /npm run test:unit/);
  assert.match(packageJson.scripts.test, /npm run test:coverage/);
  assert.match(packageJson.scripts["test:coverage"], /--experimental-test-coverage/);
  const readme = await read("README.md");
  assert.match(readme, /npm test/);
});
