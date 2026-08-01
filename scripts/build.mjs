import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAndValidateCinemas } from "./validate-data.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const siteUrl = "https://cinemaswiki.publio.dev";
const cinemas = await loadAndValidateCinemas();
const networks = buildNetworks(cinemas);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(path.join(outputRoot, "data"), { recursive: true });
await mkdir(path.join(outputRoot, "salas"), { recursive: true });
await mkdir(path.join(outputRoot, "cinemas"), { recursive: true });
await mkdir(path.join(outputRoot, "redes"), { recursive: true });

for (const filename of ["index.html", "salas.html", "cinemas.html", "formatos.html", "estatisticas.html", "contribuir.html", "_headers"]) {
  await cp(path.join(projectRoot, filename), path.join(outputRoot, filename));
}
await cp(path.join(projectRoot, "assets"), path.join(outputRoot, "assets"), { recursive: true });
await writeFile(
  path.join(outputRoot, "data", "cinemas.json"),
  `${JSON.stringify(cinemas, null, 2)}\n`,
);

const sitemapEntries = [
  { url: "/", lastmod: latestDate(cinemas) },
  { url: "/salas.html", lastmod: latestDate(cinemas) },
  { url: "/cinemas.html", lastmod: latestDate(cinemas) },
  { url: "/formatos.html" },
  { url: "/estatisticas.html", lastmod: latestDate(cinemas) },
  { url: "/contribuir.html" },
];

for (const cinema of cinemas) {
  await writeFile(
    path.join(outputRoot, "cinemas", `${cinema.slug}.html`),
    renderCinemaPage(cinema),
  );
  sitemapEntries.push({
    url: `/cinemas/${cinema.slug}.html`,
    lastmod: cinema.last_verified,
  });

  for (const room of cinema.rooms) {
    const id = roomId(cinema, room);
    await writeFile(
      path.join(outputRoot, "salas", `${id}.html`),
      renderRoomPage(cinema, room),
    );
    sitemapEntries.push({
      url: `/salas/${id}.html`,
      lastmod: cinema.last_verified,
    });
  }
}

for (const network of networks) {
  await writeFile(
    path.join(outputRoot, "redes", `${network.slug}.html`),
    renderNetworkPage(network),
  );
  sitemapEntries.push({
    url: `/redes/${network.slug}.html`,
    lastmod: latestDate(network.cinemas),
  });
}

await writeFile(path.join(outputRoot, "sitemap.xml"), renderSitemap(sitemapEntries));
await writeFile(
  path.join(outputRoot, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`,
);

const roomCount = cinemas.reduce((total, cinema) => total + cinema.rooms.length, 0);
console.log(
  `Build concluído: ${cinemas.length} cinemas, ${roomCount} salas e ${networks.length} redes em dist/.`,
);

function pageShell({ title, description, canonicalPath, activeNav, content, structuredData }) {
  const canonical = `${siteUrl}${canonicalPath}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle} | CinemasWiki</title>
    <meta name="description" content="${safeDescription}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${safeTitle} | CinemasWiki">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:url" content="${canonical}">
    <link rel="stylesheet" href="../assets/styles.css">
    <link rel="stylesheet" href="../assets/lab-theme.css?v=4">
    <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
    ${structuredData ? `<script type="application/ld+json">${safeJson(structuredData)}</script>` : ""}
  </head>
  <body class="lab-theme">
    <header class="site-header">
      <a class="brand" href="../index.html" aria-label="CinemasWiki início">
        <img class="brand-mark" src="../assets/cinemaswiki-mark.png" alt="">
        <span>Cinemas<strong>Wiki</strong></span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">
        <svg class="lab-icon" aria-hidden="true"><use href="../assets/lab-icons.svg#menu"></use></svg>
        <span class="visually-hidden">Abrir navegação</span>
      </button>
      <nav class="nav" id="primary-nav" aria-label="Navegação principal">
        <a href="../salas.html"${activeNav === "salas" ? ' aria-current="page"' : ""}>Pesquisar</a>
        <a href="../cinemas.html"${activeNav === "cinemas" ? ' aria-current="page"' : ""}>Cinemas</a>
        <a href="../formatos.html">Formatos</a>
        <a href="../estatisticas.html">Estatísticas</a>
        <a href="../contribuir.html">Contribuir</a>
      </nav>
    </header>
    <main>${content}</main>
    <footer class="footer">
      <div>
        <strong>CinemasWiki</strong>
        <span>Criado por Felipe Públio, desenvolvedor e apaixonado por cinema.</span>
      </div>
      <nav class="footer-links" aria-label="Contatos de Felipe Públio">
        <a href="https://twitter.com/publi0">Twitter @publi0</a>
        <a href="https://github.com/publi0">GitHub @publi0</a>
        <a href="mailto:felipe@publio.dev">felipe@publio.dev</a>
      </nav>
    </footer>
    <script src="../assets/shell.js"></script>
  </body>
</html>
`;
}

function renderRoomPage(cinema, room) {
  const id = roomId(cinema, room);
  const sourceCount = usefulSources(room.sources).length;
  const description = `${cinema.name}, ${room.name}: ${compact([
    projectionDisplay(room),
    room.projection?.resolution,
    ...soundValues(room),
  ])}.`;

  const content = `
      <section class="detail-view">
        <a class="back-link" href="../salas.html">Voltar para salas</a>
        <header class="detail-header">
          <div>
            <p class="eyebrow"><a href="../redes/${cinema.network.slug}.html">${escapeHtml(cinema.network.name)}</a></p>
            <h1><a href="../cinemas/${cinema.slug}.html">${escapeHtml(cinema.name)}</a> · ${escapeHtml(room.name)}</h1>
            <p class="detail-meta">${escapeHtml(cinema.address)} · ${escapeHtml(cinema.city)}, ${escapeHtml(cinema.state)}</p>
          </div>
          <div class="detail-stamp">
            <span>${sourceCount}</span>
            <small>${sourceCount === 1 ? "fonte" : "fontes"}</small>
          </div>
        </header>
        <section class="detail-facts" aria-label="Resumo da sala">
          ${renderFact("Projeção", compact([projectionDisplay(room), room.projection?.resolution]))}
          ${renderFact("Som", compact(soundValues(room)))}
          ${renderFact("Tela", compact([
            ...screenValues(room),
            room.screen?.area_m2 ? `${room.screen.area_m2} m²` : "",
          ]))}
          ${renderFact("Última verificação", formatDate(cinema.last_verified))}
        </section>
        <section class="detail-grid" aria-label="Especificações da sala">
          ${renderSpecGroup("Projeção", [
            ["Meio", room.projection?.technology],
            ["Marca", room.projection?.brand],
            ["Modelo", room.projection?.model],
            ["Resolução", room.projection?.resolution],
            ["Fonte de luz", room.projection?.light_source],
            ["Projetores", room.projection?.dual_lens ? "Duplo" : null],
            ["Potência", room.projection?.watts_each ? `${room.projection.watts_each} W por projetor` : null],
          ])}
          ${renderSpecGroup("Tela", [
            ["Tecnologia", room.screen?.technology],
            ["Superfície", room.screen?.surface],
            ["Geometria", room.screen?.geometry],
            ["Proporção", room.screen?.aspect_ratio],
            ["Área", room.screen?.area_m2 ? `${room.screen.area_m2} m²` : null],
            ["Largura", room.screen?.width_m ? `${room.screen.width_m} m` : null],
            ["Altura", room.screen?.height_m ? `${room.screen.height_m} m` : null],
            ["Diagonal", room.screen?.diagonal_in ? `${room.screen.diagonal_in}"` : null],
          ])}
          ${renderSpecGroup("Som", [
            ["Formato", room.sound?.format],
            ["Layout", room.sound?.channel_layout],
            ["Processador", room.sound?.processor],
            ["Canais", room.sound?.channels],
            ["Streams", room.sound?.audio_streams],
            ["Caixas", room.sound?.speakers],
            ["Potência", room.sound?.power_watts ? `${room.sound.power_watts} W` : null],
            ["Observação", room.sound?.notes],
          ])}
          ${renderSpecGroup("Acessibilidade", [
            ["Espaços para cadeirantes", room.accessibility?.wheelchair_seats],
            ["Mobilidade reduzida", room.accessibility?.reduced_mobility_seats],
            ["Assentos para pessoas obesas", room.accessibility?.obese_seats],
            ["Rampa até os assentos", yesNo(room.accessibility?.ramp_to_seats)],
            ["Rampa até a sala", yesNo(room.accessibility?.ramp_to_room)],
            ["Banheiros acessíveis", yesNo(room.accessibility?.accessible_restrooms)],
          ])}
          ${renderSpecGroup("Cinema", [
            ["Rede", cinema.network.name],
            ["Endereço", cinema.address],
            ["Tipo de sala", room.room_type],
            ["Capacidade", room.seats],
            ["Registro ANCINE da sala", room.ancine_registry],
            ["Registro ANCINE do complexo", cinema.ancine_registry],
            ["Verificação", formatDate(cinema.last_verified)],
          ])}
        </section>
        <section class="sources-block">
          <h3>Sistema e recursos</h3>
          ${renderTechnologies(room.technologies)}
        </section>
        ${renderNotes(cinema, room)}
        <section class="sources-block">
          <h3>Fontes</h3>
          ${renderSources(usefulSources(room.sources))}
        </section>
      </section>`;

  return pageShell({
    title: `${cinema.name} - ${room.name}`,
    description,
    canonicalPath: `/salas/${id}.html`,
    activeNav: "salas",
    content,
  });
}

function renderCinemaPage(cinema) {
  const description = `${cinema.name}, em ${cinema.neighborhood}: ${cinema.rooms.length} ${cinema.rooms.length === 1 ? "sala catalogada" : "salas catalogadas"}.`;
  const content = `
      <section class="detail-view">
        <a class="back-link" href="../redes/${cinema.network.slug}.html">Voltar para ${escapeHtml(cinema.network.name)}</a>
        <header class="detail-header">
          <div>
            <p class="eyebrow"><a href="../redes/${cinema.network.slug}.html">${escapeHtml(cinema.network.name)}</a></p>
            <h1>${escapeHtml(cinema.name)}</h1>
            <p class="detail-meta">${escapeHtml(cinema.city)}, ${escapeHtml(cinema.state)} · ${escapeHtml(cinema.neighborhood)} · ${escapeHtml(cinema.address)}</p>
          </div>
          <div class="detail-stamp">
            <span>${cinema.rooms.length}</span>
            <small>${cinema.rooms.length === 1 ? "sala" : "salas"}</small>
          </div>
        </header>
        <section class="cinema-list-section">
          <h3>Salas deste cinema</h3>
          <div class="room-card-list">
            ${cinema.rooms.map((room) => renderRoomCard(cinema, room)).join("")}
          </div>
        </section>
        ${cinema.notes ? `
          <section class="sources-block">
            <h3>Notas</h3>
            <ul class="note-list"><li>${escapeHtml(cinema.notes)}</li></ul>
          </section>
        ` : ""}
      </section>`;

  return pageShell({
    title: cinema.name,
    description,
    canonicalPath: `/cinemas/${cinema.slug}.html`,
    activeNav: "cinemas",
    content,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "MovieTheater",
      name: cinema.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: cinema.address,
        addressLocality: cinema.city,
        addressRegion: cinema.state,
        addressCountry: "BR",
      },
      url: `${siteUrl}/cinemas/${cinema.slug}.html`,
    },
  });
}

function renderNetworkPage(network) {
  const roomCount = network.cinemas.reduce((total, cinema) => total + cinema.rooms.length, 0);
  const description = `${network.name}: ${network.cinemas.length} ${network.cinemas.length === 1 ? "cinema catalogado" : "cinemas catalogados"} e ${roomCount} ${roomCount === 1 ? "sala" : "salas"}.`;
  const content = `
      <section class="detail-view">
        <a class="back-link" href="../cinemas.html">Voltar para cinemas</a>
        <header class="detail-header">
          <div>
            <p class="eyebrow">Rede</p>
            <h1>${escapeHtml(network.name)}</h1>
            <p class="detail-meta">${escapeHtml(description)}</p>
          </div>
          <div class="detail-stamp">
            <span>${network.cinemas.length}</span>
            <small>${network.cinemas.length === 1 ? "cinema" : "cinemas"}</small>
          </div>
        </header>
        <section class="cinema-list-section">
          <h3>Cinemas desta rede</h3>
          <div class="cinema-list">
            ${network.cinemas.map((cinema) => `
              <a class="cinema-card-link" href="../cinemas/${cinema.slug}.html">
                <strong>${escapeHtml(cinema.name)}</strong>
                <span>${escapeHtml(cinema.city)}, ${escapeHtml(cinema.state)} · ${escapeHtml(cinema.neighborhood)}</span>
                <small>${cinema.rooms.length} ${cinema.rooms.length === 1 ? "sala catalogada" : "salas catalogadas"}</small>
              </a>
            `).join("")}
          </div>
        </section>
      </section>`;

  return pageShell({
    title: network.name,
    description,
    canonicalPath: `/redes/${network.slug}.html`,
    activeNav: "cinemas",
    content,
  });
}

function renderRoomCard(cinema, room) {
  return `
    <a class="room-card-link" href="../salas/${roomId(cinema, room)}.html">
      <strong>${escapeHtml(room.name)}</strong>
      <span>${escapeHtml(compact([
        projectionDisplay(room),
        room.projection?.resolution,
      ]))}</span>
      <small>${escapeHtml(compact([
        ...soundValues(room),
        room.screen?.area_m2 ? `${room.screen.area_m2} m²` : "",
      ]))}</small>
      <em>${escapeHtml(cinema.name)}</em>
    </a>`;
}

function renderFact(label, value) {
  return `
    <div class="detail-fact">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(display(value))}</strong>
    </div>`;
}

function renderSpecGroup(title, rows) {
  return `
    <article class="spec-group">
      <h3>${escapeHtml(title)}</h3>
      <dl>
        ${rows.map(([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd class="${isKnown(value) ? "" : "is-unknown"}">${escapeHtml(display(value))}</dd>
          </div>
        `).join("")}
      </dl>
    </article>`;
}

function renderTechnologies(technologies = []) {
  if (technologies.length === 0) {
    return '<p class="empty-result">Nenhum sistema ou recurso adicional cadastrado para esta sala.</p>';
  }

  const typeLabels = {
    experience: "Experiência",
    system: "Sistema",
  };

  return `
    <ul class="tech-list">
      ${technologies.map((technology) => `
        <li>
          <strong>${escapeHtml(technology.name)}</strong>
          <span>${escapeHtml(typeLabels[technology.type] || technology.type)}</span>
          ${technology.notes ? `<small>${escapeHtml(technology.notes)}</small>` : ""}
        </li>
      `).join("")}
    </ul>`;
}

function renderNotes(cinema, room) {
  const notes = [
    room.projection?.notes,
    room.screen?.notes,
    room.notes,
    cinema.notes,
  ].filter(Boolean);

  if (notes.length === 0) return "";
  return `
    <section class="sources-block">
      <h3>Notas</h3>
      <ul class="note-list">
        ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </section>`;
}

function renderSources(sources = []) {
  const visibleSources = usefulSources(sources);
  if (visibleSources.length === 0) {
    return '<p class="empty-result">Nenhuma fonte cadastrada ainda.</p>';
  }

  return `
    <ul class="source-list">
      ${visibleSources.map((source) => `
        <li>
          <strong class="source-type">${escapeHtml(sourceTypeLabel(source.type))}</strong>
          ${source.url
            ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Abrir fonte ↗</a>`
            : "<span>Referência sem link</span>"}
          <small>${escapeHtml(source.note || "Sem observação adicional")}</small>
        </li>
      `).join("")}
    </ul>`;
}

function renderSitemap(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url>
    <loc>${siteUrl}${entry.url}</loc>${entry.lastmod ? `
    <lastmod>${entry.lastmod}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>
`;
}

function buildNetworks(items) {
  const map = new Map();
  for (const cinema of items) {
    const current = map.get(cinema.network.slug) ?? {
      slug: cinema.network.slug,
      name: cinema.network.name,
      cinemas: [],
    };
    current.cinemas.push(cinema);
    map.set(cinema.network.slug, current);
  }
  return [...map.values()]
    .map((network) => ({
      ...network,
      cinemas: network.cinemas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function roomId(cinema, room) {
  return `${cinema.slug}-${room.slug}`;
}

function display(value, fallback = "A confirmar") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function yesNo(value) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return null;
}

function isKnown(value) {
  return value !== null && value !== undefined && value !== "" && value !== "A confirmar";
}

function compact(values) {
  return values.filter(isKnown).join(" · ") || "A confirmar";
}

function projectionValues(room) {
  const technology = room.projection?.technology;
  const lightSource = room.projection?.light_source;
  if (isKnown(technology)) return [technology];
  return isKnown(lightSource) ? [lightSource] : [];
}

function projectionDisplay(room) {
  return projectionValues(room).at(-1) || "A confirmar";
}

function screenValues(room) {
  return [
    room.screen?.technology,
    room.screen?.surface,
    room.screen?.geometry,
    room.screen?.aspect_ratio,
  ];
}

function soundValues(room) {
  return [room.sound?.format, room.sound?.channel_layout];
}

function usefulSources(sources = []) {
  return sources.filter((source) => source.url?.trim() || source.note?.trim());
}

function coverageCount(room) {
  return [
    projectionDisplay(room),
    room.projection?.resolution,
    compact([
      room.projection?.brand,
      room.projection?.model,
      room.projection?.watts_each,
      room.projection?.dual_lens ? "Duplo" : null,
    ]),
    compact([
      ...screenValues(room),
      room.screen?.area_m2,
      room.screen?.width_m,
      room.screen?.height_m,
    ]),
    compact(soundValues(room)),
    compact([
      room.sound?.processor,
      room.sound?.channels,
      room.sound?.audio_streams,
      room.sound?.speakers,
      room.sound?.power_watts,
    ]),
  ].filter(isKnown).length;
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day))).replace(".", "");
}

function sourceTypeLabel(type) {
  const labels = {
    official: "Oficial",
    press: "Imprensa",
    photo: "Foto",
    visit: "Visita",
    user_report: "Relato",
    inferred: "Inferido",
    metadata: "Metadado",
    placeholder: "Pendente",
  };
  return labels[type] ?? type;
}

function latestDate(items) {
  return items.map((item) => item.last_verified).filter(Boolean).sort().at(-1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
