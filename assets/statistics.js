const ledger = document.querySelector("#stat-ledger");
const stamp = document.querySelector("#statistics-stamp");
const coverageList = document.querySelector("#coverage-list");
const coverageWaffles = document.querySelector("#coverage-waffles");
const technicalHighlights = document.querySelector("#technical-highlights");
const networkRanking = document.querySelector("#network-ranking");
const networkDonut = document.querySelector("#network-donut");
const networkDonutTotal = document.querySelector("#network-donut-total");
const networkChartLegend = document.querySelector("#network-chart-legend");
const networkInsight = document.querySelector("#network-insight");
const accessibilityLedger = document.querySelector("#accessibility-ledger");

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function known(value) {
  return value !== null
    && value !== undefined
    && value !== ""
    && value !== "A confirmar";
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

function formatDate(value) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function percentage(value, total) {
  return total === 0 ? 0 : (value / total) * 100;
}

function countRooms(rooms, predicate) {
  return rooms.filter(({ room }) => predicate(room)).length;
}

function countValues(rooms, getter) {
  const counts = new Map();
  rooms.forEach((item) => {
    const values = getter(item);
    (Array.isArray(values) ? values : [values]).filter(known).forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
}

function projectionFilterValues(room) {
  const technology = room.projection?.technology;
  const lightSource = room.projection?.light_source;
  if (known(technology)) return [technology];
  if (lightSource === "Laser RGB") return ["Laser", "Laser RGB"];
  return known(lightSource) ? [lightSource] : [];
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderLedger(cinemas, rooms, networks) {
  const seatCount = rooms.reduce((sum, { room }) => sum + (Number(room.seats) || 0), 0);
  const sourceCount = rooms.reduce(
    (sum, { room }) => sum + room.sources.filter((source) => source.url?.trim() || source.note?.trim()).length,
    0,
  );
  const metrics = [
    ["Cinemas", cinemas.length, "complexos catalogados"],
    ["Salas", rooms.length, "registros individuais"],
    ["Assentos", seatCount, "capacidade documentada"],
    ["Redes", networks.length, "incluindo independentes"],
    ["Fontes", sourceCount, "referências vinculadas"],
  ];

  ledger.replaceChildren();
  metrics.forEach(([label, value, note], index) => {
    const item = makeElement("div", "stat-ledger-item");
    item.style.setProperty("--order", index);
    item.append(
      makeElement("span", "stat-ledger-label", label),
      makeElement("strong", "stat-ledger-value", formatNumber(value)),
      makeElement("small", "stat-ledger-note", note),
    );
    ledger.append(item);
  });
  ledger.removeAttribute("aria-busy");
}

function hasTechnology(room, name, type) {
  return room.technologies?.some(
    (technology) => technology.name === name && technology.type === type,
  ) ?? false;
}

function renderTechnicalHighlights(rooms) {
  const total = rooms.length;
  const metrics = [
    {
      label: "Salas IMAX",
      value: countRooms(rooms, (room) => hasTechnology(room, "IMAX", "system")),
      queryName: "sistema",
      queryValue: "IMAX",
      note: "sistema de exibição",
    },
    {
      label: "Projeção Laser",
      value: countRooms(rooms, (room) => projectionFilterValues(room).includes("Laser")),
      queryName: "projecao",
      queryValue: "Laser",
      note: "fonte de luz",
    },
    {
      label: "Resolução 4K",
      value: countRooms(rooms, (room) => room.projection?.resolution === "4K"),
      queryName: "resolucao",
      queryValue: "4K",
      note: "resolução confirmada",
    },
    {
      label: "Dolby Atmos",
      value: countRooms(rooms, (room) => room.sound?.format === "Dolby Atmos"),
      queryName: "som",
      queryValue: "Dolby Atmos",
      note: "formato de som",
    },
    {
      label: "Salas 3D",
      value: countRooms(rooms, (room) => hasTechnology(room, "3D", "experience")),
      queryName: "experiencia",
      queryValue: "3D",
      note: "experiência de exibição",
    },
    {
      label: "Salas 4DX",
      value: countRooms(rooms, (room) => hasTechnology(room, "4DX", "experience")),
      queryName: "experiencia",
      queryValue: "4DX",
      note: "efeitos físicos",
    },
  ];

  technicalHighlights.replaceChildren();
  metrics.forEach(({ label, value, queryName, queryValue, note }) => {
    const link = makeElement("a", "technical-highlight");
    link.href = `salas.html?${queryName}=${encodeURIComponent(queryValue)}`;
    link.setAttribute(
      "aria-label",
      `${label}: ${value} ${value === 1 ? "sala" : "salas"}, ${percentFormatter.format(percentage(value, total))}% do catálogo`,
    );
    link.append(
      makeElement("span", "technical-highlight-label", label),
      makeElement("strong", "technical-highlight-value", formatNumber(value)),
      makeElement(
        "small",
        "technical-highlight-note",
        `${percentFormatter.format(percentage(value, total))}% do catálogo · ${note}`,
      ),
    );
    technicalHighlights.append(link);
  });
}

function renderCoverage(rooms) {
  const total = rooms.length;
  const rows = [
    ["Capacidade", countRooms(rooms, (room) => known(room.seats)), "Número de assentos"],
    ["Fontes", countRooms(rooms, (room) => room.sources.some((source) => source.url?.trim() || source.note?.trim())), "Ao menos uma referência"],
    ["Acessibilidade", countRooms(rooms, (room) => room.accessibility !== undefined), "Dados regulatórios ou locais"],
    ["Registro ANCINE", countRooms(rooms, (room) => known(room.ancine_registry)), "Identificador da sala"],
    ["Projeção", countRooms(rooms, (room) => [
      room.projection?.technology,
      room.projection?.resolution,
      room.projection?.light_source,
    ].some(known)), "Ao menos uma especificação"],
    ["Resolução", countRooms(rooms, (room) => known(room.projection?.resolution)), "2K, 4K ou equivalente"],
    ["Formato de som", countRooms(rooms, (room) => known(room.sound?.format)), "Formato identificado"],
  ];

  coverageList.replaceChildren();
  rows.forEach(([label, count, note]) => {
    const value = percentage(count, total);
    const row = makeElement("div", "coverage-row");
    const heading = makeElement("div", "coverage-heading");
    const labelGroup = makeElement("div");
    labelGroup.append(makeElement("strong", "", label), makeElement("small", "", note));
    const countGroup = makeElement("div", "coverage-count");
    countGroup.append(
      makeElement("strong", "", `${percentFormatter.format(value)}%`),
      makeElement("small", "", `${formatNumber(count)} de ${formatNumber(total)}`),
    );
    heading.append(labelGroup, countGroup);
    const track = makeElement("div", "coverage-track");
    track.setAttribute("aria-hidden", "true");
    const fill = makeElement("span", "coverage-fill");
    fill.style.setProperty("--value", `${value}%`);
    track.append(fill);
    row.append(heading, track);
    coverageList.append(row);
  });
}

function renderCoverageMap(rooms) {
  const total = rooms.length;
  const metrics = [
    [
      "Projeção",
      countRooms(rooms, (room) => [
        room.projection?.technology,
        room.projection?.resolution,
        room.projection?.light_source,
      ].some(known)),
    ],
    ["Resolução", countRooms(rooms, (room) => known(room.projection?.resolution))],
    ["Som", countRooms(rooms, (room) => known(room.sound?.format))],
  ];

  coverageWaffles.replaceChildren();
  metrics.forEach(([label, count]) => {
    const value = percentage(count, total);
    const filledCells = Math.round(value);
    const chart = makeElement("section", "waffle-chart");
    chart.setAttribute(
      "aria-label",
      `${label}: ${percentFormatter.format(value)}%, ${count} de ${total} salas com informação conhecida`,
    );
    const heading = makeElement("div", "waffle-heading");
    heading.append(
      makeElement("strong", "", label),
      makeElement("span", "", `${percentFormatter.format(value)}%`),
    );
    const grid = makeElement("div", "waffle-grid");
    grid.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 100; index += 1) {
      grid.append(makeElement("i", index < filledCells ? "is-known" : ""));
    }
    chart.append(heading, grid, makeElement("small", "", `${formatNumber(count)} de ${formatNumber(total)} salas`));
    coverageWaffles.append(chart);
  });
}

function renderDistribution(targetId, totalId, entries, queryName, roomTotal) {
  const target = document.querySelector(`#${targetId}`);
  const totalLabel = document.querySelector(`#${totalId}`);
  const total = roomTotal ?? entries.reduce((sum, [, count]) => sum + count, 0);
  const maximum = Math.max(...entries.map(([, count]) => count), 0);
  totalLabel.textContent = `${formatNumber(total)} ${total === 1 ? "sala conhecida" : "salas conhecidas"}`;
  target.replaceChildren();

  if (entries.length === 0) {
    target.append(makeElement("p", "distribution-empty", "Ainda não há dados confirmados."));
    return;
  }

  entries.forEach(([label, count]) => {
    const link = makeElement("a", "distribution-row");
    link.href = `salas.html?${queryName}=${encodeURIComponent(label)}`;
    link.setAttribute("aria-label", `${label}: ${count} ${count === 1 ? "sala" : "salas"}`);
    const top = makeElement("span", "distribution-row-top");
    top.append(makeElement("strong", "", label), makeElement("span", "", formatNumber(count)));
    const track = makeElement("span", "distribution-track");
    const fill = makeElement("span", "distribution-fill");
    fill.style.setProperty("--value", `${(count / maximum) * 100}%`);
    track.append(fill);
    link.append(top, track);
    target.append(link);
  });
}

function renderNetworks(cinemas) {
  const groups = new Map();
  cinemas.forEach((cinema) => {
    const name = cinema.network?.name || cinema.operator || "Rede independente";
    const slug = cinema.network?.slug || slugify(name);
    if (!groups.has(slug)) groups.set(slug, { name, slug, cinemas: 0, rooms: 0 });
    const group = groups.get(slug);
    group.cinemas += 1;
    group.rooms += cinema.rooms.length;
  });
  const networks = [...groups.values()].sort(
    (a, b) => b.rooms - a.rooms || a.name.localeCompare(b.name, "pt-BR"),
  );
  const maximum = Math.max(...networks.map(({ rooms }) => rooms), 1);

  renderNetworkChart(networks);
  networkRanking.replaceChildren();
  networks.forEach((network, index) => {
    const link = makeElement("a", "network-rank-row");
    link.href = `redes/${encodeURIComponent(network.slug)}.html`;
    link.append(makeElement("span", "network-rank-position", String(index + 1).padStart(2, "0")));
    const identity = makeElement("span", "network-rank-identity");
    identity.append(
      makeElement("strong", "", network.name),
      makeElement("small", "", `${formatNumber(network.cinemas)} ${network.cinemas === 1 ? "cinema" : "cinemas"}`),
    );
    const measure = makeElement("span", "network-rank-measure");
    const values = makeElement("span", "network-rank-values");
    values.append(
      makeElement("strong", "", formatNumber(network.rooms)),
      makeElement("small", "", network.rooms === 1 ? "sala" : "salas"),
    );
    const track = makeElement("span", "distribution-track");
    const fill = makeElement("span", "distribution-fill");
    fill.style.setProperty("--value", `${(network.rooms / maximum) * 100}%`);
    track.append(fill);
    measure.append(values, track);
    link.append(identity, measure);
    networkRanking.append(link);
  });

  return networks;
}

function renderNetworkChart(networks) {
  const total = networks.reduce((sum, network) => sum + network.rooms, 0);
  const featured = networks.slice(0, 5);
  const otherRooms = networks.slice(5).reduce((sum, network) => sum + network.rooms, 0);
  const segments = [
    ...featured.map((network) => ({ label: network.name, value: network.rooms })),
    ...(otherRooms > 0 ? [{ label: "Outras redes", value: otherRooms }] : []),
  ];
  const colors = [
    "var(--accent)",
    "var(--ink)",
    "var(--good)",
    "var(--unknown)",
    "var(--line-strong)",
    "var(--line)",
  ];
  let cursor = 0;
  const stops = segments.flatMap((segment, index) => {
    const start = cursor;
    cursor += percentage(segment.value, total);
    return [`${colors[index]} ${start}%`, `${colors[index]} ${cursor}%`];
  });
  networkDonut.style.background = `conic-gradient(${stops.join(", ")})`;
  networkDonut.setAttribute(
    "aria-label",
    segments
      .map((segment) => `${segment.label}: ${segment.value} salas, ${percentFormatter.format(percentage(segment.value, total))}%`)
      .join("; "),
  );
  networkDonutTotal.textContent = formatNumber(total);

  networkChartLegend.replaceChildren();
  segments.forEach((segment, index) => {
    const item = makeElement("li");
    const marker = makeElement("i");
    marker.style.background = colors[index];
    const label = makeElement("span");
    label.append(
      makeElement("strong", "", segment.label),
      makeElement("small", "", `${formatNumber(segment.value)} · ${percentFormatter.format(percentage(segment.value, total))}%`),
    );
    item.append(marker, label);
    networkChartLegend.append(item);
  });

  const leader = networks[0];
  const leaderShare = percentage(leader.rooms, total);
  const topThreeRooms = networks.slice(0, 3).reduce((sum, network) => sum + network.rooms, 0);
  networkInsight.replaceChildren(
    makeElement("span", "network-insight-label", "Leitura rápida"),
    makeElement("strong", "", `${percentFormatter.format(leaderShare)}%`),
    makeElement("p", "", `${leader.name} concentra ${formatNumber(leader.rooms)} das ${formatNumber(total)} salas atualmente documentadas.`),
    makeElement("small", "", `As três maiores somam ${percentFormatter.format(percentage(topThreeRooms, total))}% do catálogo.`),
  );
}

function renderAccessibility(rooms) {
  const sum = (getter) => rooms.reduce((total, { room }) => total + (Number(getter(room)) || 0), 0);
  const metrics = [
    ["Assentos", sum((room) => room.seats), "capacidade total registrada"],
    ["Espaços para cadeirantes", sum((room) => room.accessibility?.wheelchair_seats), "somados entre as salas"],
    ["Mobilidade reduzida", sum((room) => room.accessibility?.reduced_mobility_seats), "assentos registrados"],
    ["Assentos para pessoas obesas", sum((room) => room.accessibility?.obese_seats), "somados entre as salas"],
    ["Banheiros acessíveis", countRooms(rooms, (room) => room.accessibility?.accessible_restrooms === true), "salas com confirmação"],
    ["Rampa até os assentos", countRooms(rooms, (room) => room.accessibility?.ramp_to_seats === true), "salas com confirmação"],
  ];

  accessibilityLedger.replaceChildren();
  metrics.forEach(([label, value, note]) => {
    const item = makeElement("div", "accessibility-item");
    item.append(
      makeElement("strong", "", formatNumber(value)),
      makeElement("span", "", label),
      makeElement("small", "", note),
    );
    accessibilityLedger.append(item);
  });
}

async function initStatistics() {
  const response = await fetch("data/cinemas.json", {
    cache: "no-cache",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const cinemas = await response.json();
  if (!Array.isArray(cinemas)) throw new TypeError("Catálogo inválido");

  const rooms = cinemas.flatMap((cinema) => cinema.rooms.map((room) => ({ cinema, room })));
  const latestVerification = cinemas
    .map((cinema) => cinema.last_verified)
    .filter(Boolean)
    .sort()
    .at(-1);
  const networks = renderNetworks(cinemas);

  renderLedger(cinemas, rooms, networks);
  renderTechnicalHighlights(rooms);
  renderCoverage(rooms);
  renderCoverageMap(rooms);
  renderDistribution(
    "light-distribution",
    "light-total",
    countValues(rooms, ({ room }) => projectionFilterValues(room)),
    "projecao",
    countRooms(rooms, (room) => projectionFilterValues(room).length > 0),
  );
  renderDistribution(
    "resolution-distribution",
    "resolution-total",
    countValues(rooms, ({ room }) => room.projection?.resolution),
    "resolucao",
  );
  renderDistribution(
    "sound-distribution",
    "sound-total",
    countValues(rooms, ({ room }) => room.sound?.format),
    "som",
  );
  renderAccessibility(rooms);
  stamp.textContent = `Verificação mais recente: ${formatDate(latestVerification)}`;
  document.documentElement.classList.add("statistics-ready");
}

initStatistics().catch(() => {
  ledger.removeAttribute("aria-busy");
  ledger.replaceChildren(
    makeElement("p", "statistics-error", "Não foi possível calcular as estatísticas agora."),
  );
  stamp.textContent = "Dados indisponíveis";
});
