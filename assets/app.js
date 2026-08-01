import { soundValues as getSoundValues } from "./display-values.mjs";

const roomList = document.querySelector("#room-list");
const roomDetail = document.querySelector("#room-detail");
const roomTable = document.querySelector(".room-table");
const homeLinks = document.querySelector(".home-links");
const filtersSection = document.querySelector(".filters");
const resultsSummary = document.querySelector(".results-summary");
const structureSection = document.querySelector(".structure");
const methodSection = document.querySelector(".method");
const networkTree = document.querySelector("#network-tree");
const search = document.querySelector("#search");
const systemFilter = document.querySelector("#system");
const experienceFilter = document.querySelector("#experience");
const projectionFilter = document.querySelector("#projection");
const resolutionFilter = document.querySelector("#resolution");
const soundFilter = document.querySelector("#sound");
const soundLayoutFilter = document.querySelector("#sound-layout");
const sortFilter = document.querySelector("#sort");
const clearFilters = document.querySelector("#clear-filters");
const filterGrid = document.querySelector("#filter-grid");
const filterToggle = document.querySelector("#filter-toggle");
const activeFilterCountLabel = document.querySelector("#active-filter-count");
const cinemaSearch = document.querySelector("#cinema-search");
const networkSummary = document.querySelector("#network-summary");
const resultCount = document.querySelector("#result-count");
const resultContext = document.querySelector("#result-context");
const pagination = document.querySelector("#pagination");
const networkPagination = document.querySelector("#network-pagination");
const isHomePage = document.body.classList.contains("home-page");
const defaultSort = isHomePage ? "coverage" : "name";
const networksPerPage = 5;

let cinemas = [];
let rooms = [];
let currentPage = 1;
let currentNetworkPage = 1;

function hasDetailParams() {
  const params = new URLSearchParams(window.location.search);
  return params.has("sala") || params.has("cinema") || params.has("rede");
}

function roomsPerPage() {
  if (!isHomePage) return 12;
  return window.matchMedia("(max-width: 900px)").matches ? 3 : 6;
}

if (hasDetailParams()) {
  showDetailView();
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function display(value, fallback = "A confirmar") {
  const visibleValue = value === null || value === undefined || value === "" ? fallback : value;
  return escapeHtml(visibleValue);
}

function yesNo(value) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function labIcon(name, className = "") {
  const safeName = String(name).replace(/[^a-z-]/g, "");
  const safeClassName = String(className).replace(/[^a-z0-9_-]/gi, "");
  return `<svg class="lab-icon ${safeClassName}" aria-hidden="true"><use href="assets/lab-icons.svg#${safeName}"></use></svg>`;
}

function fieldIcon(label) {
  return {
    "Projeção": "projector",
    "Resolução": "resolution",
    "Som": "sound",
    "Tela": "screen",
  }[label] || "room";
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "";
  } catch {
    return "";
  }
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
  if (lightSource === "Laser RGB") return ["Laser", "Laser RGB"];
  return isKnown(lightSource) ? [lightSource] : [];
}

function projectionDisplay(room) {
  const values = projectionValues(room);
  return values.at(-1) || "A confirmar";
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
  return getSoundValues(room);
}

function usefulSources(sources = []) {
  return sources.filter((source) => source.url?.trim() || source.note?.trim());
}

function formatDate(value) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day)).replace(".", "");
}

function coverageValues(room) {
  return [
    projectionDisplay(room),
    room.projection?.resolution,
    compact(soundValues(room)),
    compact(screenValues(room)),
  ];
}

function coverageCount(room) {
  return coverageValues(room).filter(isKnown).length;
}

function slugify(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function roomId(cinema, room) {
  return `${cinema.slug}-${room.slug || slugify(room.name)}`;
}

function networkName(cinema) {
  return cinema.network?.name || cinema.operator || "Rede independente";
}

function networkId(cinema) {
  return cinema.network?.slug || slugify(networkName(cinema));
}

function roomUrl(id) {
  return `salas/${encodeURIComponent(id)}.html`;
}

function cinemaUrl(cinema) {
  return `cinemas/${encodeURIComponent(cinema.slug)}.html`;
}

function networkUrl(cinemaOrId) {
  const id = typeof cinemaOrId === "string" ? cinemaOrId : networkId(cinemaOrId);
  return `redes/${encodeURIComponent(id)}.html`;
}

function technicalTechnologies(room) {
  return room.technologies ?? [];
}

function exhibitionSystems(room) {
  return (room.technologies ?? []).filter((technology) => technology.type === "system");
}

function roomExperiences(room) {
  return (room.technologies ?? []).filter((technology) => technology.type === "experience");
}

function roomExperienceNames(room) {
  const experiences = roomExperiences(room).map(({ name }) => name);
  return experiences.length > 0 ? experiences : ["2D"];
}

function technologyBrandKey(value) {
  return {
    imax: "imax",
    multicanal: "multicanal",
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
  }[normalize(value)] ?? "";
}

function technologyBrandMark(value) {
  const key = technologyBrandKey(value);
  if (!key) return "";

  const wordmarks = {
    imax: '<span class="technology-wordmark technology-wordmark--imax">IMAX</span>',
    multicanal: '<span class="multichannel-glyph" aria-hidden="true"><i></i><i></i><i></i></span><span class="technology-wordmark technology-wordmark--multicanal"><b>Multi</b><em>canal</em></span>',
    "dolby-digital": '<span class="dolby-double-d" aria-hidden="true"><i></i><i></i></span><span class="technology-wordmark technology-wordmark--dolby"><b>Dolby</b><em>Digital</em></span>',
    "dolby-atmos": '<span class="dolby-double-d" aria-hidden="true"><i></i><i></i></span><span class="technology-wordmark technology-wordmark--dolby"><b>Dolby</b><em>Atmos</em></span>',
    "dts-x": '<span class="technology-wordmark technology-wordmark--dts"><b>DTS</b><em>:X</em></span>',
    "4dx": '<span class="technology-wordmark technology-wordmark--4dx"><b>4D</b><em>X</em></span>',
    "macro-xe": '<span class="technology-wordmark technology-wordmark--macro"><b>MACRO</b><em>XE</em></span>',
    xd: '<span class="technology-wordmark technology-wordmark--xd"><b>XD</b><em>Cinemark</em></span>',
    cinepic: '<span class="technology-wordmark technology-wordmark--cinepic">Cinépic</span>',
    xplus: '<span class="technology-wordmark technology-wordmark--xplus"><b>UCI</b><em>XPLUS</em></span>',
    "d-box": '<span class="technology-wordmark technology-wordmark--dbox">D-BOX</span>',
  };

  return `<span class="technology-mark technology-mark--${key}" aria-label="${escapeHtml(value)}">${wordmarks[key]}</span>`;
}

function roomTechnologyBrands(room) {
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

function renderTechnologyBrands(room) {
  const brands = roomTechnologyBrands(room);
  if (brands.length === 0) return "";
  return `<span class="technology-marks" aria-label="Tecnologias da sala">${brands.map(technologyBrandMark).join("")}</span>`;
}

function roomText(item) {
  const room = item.room;

  return [
    item.cinema.name,
    networkName(item.cinema),
    item.cinema.city,
    item.cinema.neighborhood,
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
    technicalTechnologies(room).map((tech) => `${tech.name} ${tech.type} ${tech.notes ?? ""}`).join(" "),
    room.notes,
    item.cinema.notes,
  ].join(" ");
}

function buildRooms(data) {
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

function fillSelect(select, values) {
  values
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
}

function setupFilters() {
  const validValues = (arr) => [...new Set(arr.filter((v) => v && v !== "A confirmar"))];
  if (systemFilter) {
    fillSelect(
      systemFilter,
      validValues(rooms.flatMap(({ room }) => exhibitionSystems(room).map(({ name }) => name))),
    );
  }
  if (experienceFilter) {
    fillSelect(
      experienceFilter,
      validValues(rooms.flatMap(({ room }) => roomExperienceNames(room))),
    );
  }
  if (projectionFilter) {
    fillSelect(
      projectionFilter,
      validValues(rooms.flatMap(({ room }) => projectionValues(room))),
    );
  }
  if (resolutionFilter) fillSelect(resolutionFilter, validValues(rooms.map(({ room }) => room.projection?.resolution)));
  if (soundFilter) fillSelect(soundFilter, validValues(rooms.map(({ room }) => room.sound?.format)));
  if (soundLayoutFilter) fillSelect(soundLayoutFilter, validValues(rooms.map(({ room }) => room.sound?.channel_layout)));
}

function render() {
  const selectedRoom = getSelectedRoom();
  const selectedCinema = getSelectedCinema();
  const selectedNetwork = getSelectedNetwork();

  if (selectedRoom) {
    renderRoomDetail(selectedRoom);
    return;
  }

  if (new URLSearchParams(window.location.search).has("sala")) {
    renderMissingDetail("Sala não encontrada", "Não encontramos essa sala no catálogo.");
    return;
  }

  if (selectedCinema) {
    renderCinemaDetail(selectedCinema);
    return;
  }

  if (new URLSearchParams(window.location.search).has("cinema")) {
    renderMissingDetail("Cinema não encontrado", "Não encontramos esse cinema no catálogo.");
    return;
  }

  if (selectedNetwork) {
    renderNetworkDetail(selectedNetwork);
    return;
  }

  if (new URLSearchParams(window.location.search).has("rede")) {
    renderMissingDetail("Rede não encontrada", "Não encontramos essa rede no catálogo.");
    return;
  }

  if (!roomList) {
    showCatalog();
    return;
  }

  showCatalog();

  const query = normalize(search?.value);
  const selectedSystem = normalize(systemFilter?.value);
  const selectedExperience = normalize(experienceFilter?.value);
  const selectedProjection = normalize(projectionFilter?.value);
  const selectedResolution = normalize(resolutionFilter?.value);
  const selectedSound = normalize(soundFilter?.value);
  const selectedSoundLayout = normalize(soundLayoutFilter?.value);

  const filtered = rooms.filter((item) => {
    const systemMatches = !selectedSystem
      || exhibitionSystems(item.room).some(({ name }) => normalize(name) === selectedSystem);
    const experienceMatches = !selectedExperience
      || roomExperienceNames(item.room).some((name) => normalize(name) === selectedExperience);
    const projectionMatches = !selectedProjection
      || projectionValues(item.room).some((value) => normalize(value) === selectedProjection);
    const resolutionMatches = !selectedResolution || normalize(item.room.projection?.resolution ?? "") === selectedResolution;
    const soundMatches = !selectedSound || normalize(item.room.sound?.format ?? "") === selectedSound;
    const soundLayoutMatches = !selectedSoundLayout
      || normalize(item.room.sound?.channel_layout ?? "") === selectedSoundLayout;

    return (
      item.searchable.includes(query) &&
      systemMatches &&
      experienceMatches &&
      projectionMatches &&
      resolutionMatches &&
      soundMatches &&
      soundLayoutMatches
    );
  });

  if (sortFilter?.value === "coverage") {
    filtered.sort((a, b) =>
      coverageCount(b.room) - coverageCount(a.room) ||
      a.cinema.name.localeCompare(b.cinema.name, "pt-BR"),
    );
  } else if (sortFilter?.value === "updated") {
    filtered.sort((a, b) =>
      String(b.cinema.last_verified ?? "").localeCompare(String(a.cinema.last_verified ?? "")) ||
      a.cinema.name.localeCompare(b.cinema.name, "pt-BR"),
    );
  }

  const pageSize = roomsPerPage();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "sala" : "salas"}`;
  const activeFilterCount = [
    search?.value,
    systemFilter?.value,
    experienceFilter?.value,
    projectionFilter?.value,
    resolutionFilter?.value,
    soundFilter?.value,
    soundLayoutFilter?.value,
  ].filter(Boolean).length;
  const advancedFilterCount = [
    systemFilter?.value,
    experienceFilter?.value,
    projectionFilter?.value,
    resolutionFilter?.value,
    soundFilter?.value,
    soundLayoutFilter?.value,
    sortFilter?.value !== defaultSort ? sortFilter?.value : "",
  ].filter(Boolean).length;
  if (activeFilterCountLabel) activeFilterCountLabel.textContent = advancedFilterCount;
  const rangeStart = filtered.length ? pageStart + 1 : 0;
  const rangeEnd = Math.min(pageStart + pageItems.length, filtered.length);
  resultContext.textContent = filtered.length > 0
    ? `mostrando ${rangeStart}–${rangeEnd}${activeFilterCount ? ` · ${activeFilterCount} ${activeFilterCount === 1 ? "filtro ativo" : "filtros ativos"}` : ""}`
    : activeFilterCount ? "nenhum resultado para os filtros atuais" : "em todo o catálogo";

  roomList.innerHTML = pageItems.map((item, index) => renderRoom(item, pageStart + index + 1)).join("");
  renderPagination(totalPages);
  updateFilterUrl();

  if (filtered.length === 0) {
    roomList.innerHTML = '<p class="empty-result">Nenhuma sala encontrada para esses filtros.</p>';
  }
}

function renderPagination(totalPages) {
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const pages = paginationItems(totalPages, currentPage);

  pagination.innerHTML = `
    <button type="button" data-page="${currentPage - 1}" aria-label="Página anterior" ${currentPage === 1 ? "disabled" : ""}>${labIcon("chevron-left")}</button>
    <div class="pagination-pages">
      ${pages.map((page) => page === "ellipsis"
        ? '<span class="pagination-ellipsis" aria-hidden="true">…</span>'
        : `
          <button
            type="button"
            data-page="${page}"
            ${page === currentPage ? 'aria-current="page"' : ""}
          >${page}</button>
        `).join("")}
    </div>
    <button type="button" data-page="${currentPage + 1}" aria-label="Próxima página" ${currentPage === totalPages ? "disabled" : ""}>${labIcon("chevron-right")}</button>
    <label class="page-size">
      <span class="visually-hidden">Resultados por página</span>
      <select aria-label="Resultados por página" disabled>
        <option>${roomsPerPage()} por página</option>
      </select>
    </label>
  `;
}

function paginationItems(totalPages, activePage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (activePage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (activePage >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", activePage - 1, activePage, activePage + 1, "ellipsis", totalPages];
}

function renderRoom(item, rowNumber) {
  const { cinema, room } = item;
  const projectionDetailValues = [
    room.projection?.brand,
    room.projection?.model,
  ];
  const roomScreenValues = screenValues(room);
  const screenDetailValues = [
    room.screen?.area_m2 ? `${room.screen.area_m2} m²` : "",
    room.screen?.width_m ? `${room.screen.width_m} m largura` : "",
    room.screen?.height_m ? `${room.screen.height_m} m altura` : "",
  ];
  const roomSoundValues = soundValues(room);
  const soundDetailValues = [
    room.sound?.processor,
    room.sound?.channels ? `${room.sound.channels} canais` : "",
    room.sound?.audio_streams ? `${room.sound.audio_streams} streams` : "",
    room.sound?.speakers ? `${room.sound.speakers} caixas` : "",
    room.sound?.power_watts ? `${room.sound.power_watts} W` : "",
  ];
  return `
    <a class="room-row" href="${roomUrl(item.id)}" aria-label="Abrir detalhes de ${display(room.name)} em ${display(cinema.name)}">
      <span class="row-number" aria-hidden="true">${rowNumber}</span>
      <div class="room-main">
        <span class="room-network">${display(networkName(cinema))}</span>
        <span class="room-title-line">
          <strong>${display(cinema.name)} — ${display(room.name)}</strong>
          ${renderTechnologyBrands(room)}
        </span>
        <span class="room-name">${display(room.name)}</span>
        <span class="room-location">${display(cinema.neighborhood)} · ${display(cinema.city)}</span>
      </div>
      <div class="room-data-grid">
        <div class="room-specs">
          ${renderRoomField("Projeção", [projectionDisplay(room)], projectionDetailValues)}
          ${renderRoomField("Resolução", [room.projection?.resolution])}
          ${renderRoomField("Som", roomSoundValues, soundDetailValues)}
          ${renderRoomField("Tela", roomScreenValues, screenDetailValues)}
        </div>
        <div class="room-evidence">
          <span class="room-row-action">Ver ficha ${labIcon("arrow-right")}</span>
        </div>
      </div>
    </a>
  `;
}

function renderRoomField(label, values, detailValues = []) {
  const knownValues = values.filter(isKnown);
  const knownDetails = detailValues.filter(isKnown);
  const primary = knownValues.join(" · ");
  const detail = knownDetails.join(" · ");

  return `
    <div class="room-field ${primary ? "" : "is-unknown"}">
      <span class="cell-label">${labIcon(fieldIcon(label))}${label}</span>
      <strong class="data-primary">${escapeHtml(primary || "A confirmar")}</strong>
      ${detail ? `<small class="data-secondary">${escapeHtml(detail)}</small>` : ""}
    </div>
  `;
}

function getSelectedRoom() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("sala");
  return id ? rooms.find((item) => item.id === id) : null;
}

function getSelectedCinema() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("cinema");
  return slug ? cinemas.find((cinema) => cinema.slug === slug) : null;
}

function getSelectedNetwork() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("rede");
  if (!slug) return null;

  const networkCinemas = cinemas.filter((cinema) => networkId(cinema) === slug);
  if (networkCinemas.length === 0) return null;

  return {
    id: slug,
    name: networkName(networkCinemas[0]),
    cinemas: networkCinemas,
  };
}

function showCatalog() {
  if (homeLinks) homeLinks.hidden = false;
  [search, systemFilter, experienceFilter, projectionFilter, resolutionFilter, soundFilter, sortFilter].filter(Boolean).forEach((control) => {
    control.hidden = false;
  });
  if (roomDetail) roomDetail.hidden = true;
  if (roomTable) roomTable.hidden = false;
  if (filtersSection) filtersSection.hidden = false;
  if (resultsSummary) resultsSummary.hidden = false;
  if (pagination) pagination.hidden = false;
  if (structureSection) structureSection.hidden = false;
  if (methodSection) methodSection.hidden = false;
  if (networkPagination) networkPagination.hidden = false;
}

function showDetailView() {
  if (homeLinks) homeLinks.hidden = true;
  [search, systemFilter, experienceFilter, projectionFilter, resolutionFilter, soundFilter, sortFilter].filter(Boolean).forEach((control) => {
    control.hidden = true;
  });
  if (roomTable) roomTable.hidden = true;
  if (filtersSection) filtersSection.hidden = true;
  if (resultsSummary) resultsSummary.hidden = true;
  if (pagination) pagination.hidden = true;
  if (structureSection) structureSection.hidden = true;
  if (methodSection) methodSection.hidden = true;
  if (networkPagination) networkPagination.hidden = true;
  if (roomDetail) roomDetail.hidden = false;
}

function renderMissingDetail(title, message) {
  showDetailView();
  if (!roomDetail) return;

  document.title = `${title} | CinemasWiki`;
  roomDetail.innerHTML = `
    <a class="back-link" href="salas.html">Voltar para salas</a>
    <header class="detail-header">
      <div>
        <p class="eyebrow">Catálogo</p>
        <h1>${display(title)}</h1>
        <p class="detail-meta">${display(message)}</p>
      </div>
    </header>
  `;
}

function renderRoomDetail(item) {
  const { cinema, room } = item;
  const sourceCount = usefulSources(room.sources).length;

  showDetailView();

  document.title = `${cinema.name} - ${room.name} | CinemasWiki`;

  const fromSlug = new URLSearchParams(window.location.search).get("de");
  const fromCinema = fromSlug ? cinemas.find((c) => c.slug === fromSlug) : null;
  const backLink = fromCinema
    ? `<a class="back-link" href="${cinemaUrl(fromCinema)}">Voltar para ${display(fromCinema.name)}</a>`
    : `<a class="back-link" href="salas.html">Voltar para salas</a>`;

  roomDetail.innerHTML = `
    ${backLink}
    <header class="detail-header">
      <div>
        <p class="eyebrow"><a href="${networkUrl(cinema)}">${display(networkName(cinema))}</a></p>
        <h1><a href="${cinemaUrl(cinema)}">${display(cinema.name)}</a> · ${display(room.name)}</h1>
        <p class="detail-meta">${display(cinema.address)} · ${display(cinema.city)}, ${display(cinema.state)}</p>
        ${renderTechnologyBrands(room)}
      </div>
      <div class="detail-stamp">
        <span>${sourceCount}</span>
        <small>${sourceCount === 1 ? "fonte" : "fontes"}</small>
      </div>
    </header>

    <section class="detail-facts" aria-label="Resumo da sala">
      <div class="detail-fact">
        <small>Projeção</small>
        <strong>${display(compact([projectionDisplay(room), room.projection?.resolution]))}</strong>
      </div>
      <div class="detail-fact">
        <small>Som</small>
        <strong>${display(compact(soundValues(room)))}</strong>
      </div>
      <div class="detail-fact">
        <small>Tela</small>
        <strong>${display(compact([
          ...screenValues(room),
          room.screen?.area_m2 ? `${room.screen.area_m2} m²` : "",
        ]))}</strong>
      </div>
      <div class="detail-fact">
        <small>Última verificação</small>
        <strong>${formatDate(cinema.last_verified)}</strong>
      </div>
    </section>

    <section class="detail-grid" aria-label="Especificacoes da sala">
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
        ["Rede", networkName(cinema), networkUrl(cinema)],
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
  `;
}

function renderCinemaDetail(cinema) {
  const cinemaRooms = rooms
    .filter((item) => item.cinema.slug === cinema.slug)
    .sort((a, b) => a.room.name.localeCompare(b.room.name, "pt-BR"));

  showDetailView();
  document.title = `${cinema.name} | CinemasWiki`;

  roomDetail.innerHTML = `
    <a class="back-link" href="${networkUrl(cinema)}">Voltar para ${display(networkName(cinema))}</a>
    <header class="detail-header">
      <div>
        <p class="eyebrow"><a href="${networkUrl(cinema)}">${display(networkName(cinema))}</a></p>
        <h1>${display(cinema.name)}</h1>
        <p class="detail-meta">${display(cinema.city)}, ${display(cinema.state)} · ${display(cinema.neighborhood)} · ${display(cinema.address)}</p>
      </div>
      <div class="detail-stamp">
        <span>${cinemaRooms.length}</span>
        <small>${cinemaRooms.length === 1 ? "sala" : "salas"}</small>
      </div>
    </header>

    ${renderRoomCards(cinemaRooms, "Salas deste cinema", cinema)}

    ${cinema.notes ? `
      <section class="sources-block">
        <h3>Notas</h3>
        <ul class="note-list"><li>${display(cinema.notes)}</li></ul>
      </section>
    ` : ""}
  `;
}

function renderNetworkDetail(network) {
  const networkRooms = rooms.filter((item) => networkId(item.cinema) === network.id);

  showDetailView();
  document.title = `${network.name} | CinemasWiki`;

  roomDetail.innerHTML = `
    <a class="back-link" href="cinemas.html">Voltar para redes e cinemas</a>
    <header class="detail-header">
      <div>
        <p class="eyebrow">Rede</p>
        <h1>${display(network.name)}</h1>
        <p class="detail-meta">${network.cinemas.length} ${network.cinemas.length === 1 ? "cinema catalogado" : "cinemas catalogados"} · ${networkRooms.length} ${networkRooms.length === 1 ? "sala" : "salas"}</p>
      </div>
      <div class="detail-stamp">
        <span>${network.cinemas.length}</span>
        <small>${network.cinemas.length === 1 ? "cinema" : "cinemas"}</small>
      </div>
    </header>

    <section class="cinema-list-section">
      <h3>Cinemas desta rede</h3>
      <div class="cinema-list">
        ${network.cinemas.map((cinema) => {
          const count = cinema.rooms.length;
          return `
            <a class="cinema-card-link" href="${cinemaUrl(cinema)}">
              <strong>${display(cinema.name)}</strong>
              <span>${display(cinema.city)}, ${display(cinema.state)} · ${display(cinema.neighborhood)}</span>
              <small>${count} ${count === 1 ? "sala catalogada" : "salas catalogadas"}</small>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderRoomCards(items, title, fromCinema) {
  return `
    <section class="cinema-list-section">
      <h3>${title}</h3>
      <div class="room-card-list">
        ${items.map((item) => {
          const { cinema, room } = item;
          return `
            <a class="room-card-link" href="${roomUrl(item.id, fromCinema?.slug)}">
              <strong>${display(room.name)}</strong>
              ${renderTechnologyBrands(room)}
              <span>${display(compact([projectionDisplay(room), room.projection?.resolution]))}</span>
              <small>${display(compact([
                ...soundValues(room),
                room.screen?.area_m2 ? `${room.screen.area_m2} m²` : "",
              ]))}</small>
              <em>${display(cinema.name)}</em>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderSpecGroup(title, rows) {
  return `
    <article class="spec-group">
      <h3>${title}</h3>
      <dl>
        ${rows.map(([label, value, href]) => {
          const known = isKnown(value);
          return `
          <div>
            <dt>${display(label)}</dt>
            <dd class="${known ? "" : "is-unknown"}">${href && known ? `<a href="${href}">${display(value)}</a>` : display(value)}</dd>
          </div>
        `;
        }).join("")}
      </dl>
    </article>
  `;
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
      ${technologies.map((tech) => `
        <li>
          ${technologyBrandMark(tech.name)}
          <strong>${display(tech.name)}</strong>
          <span>${display(typeLabels[tech.type] || tech.type)}</span>
          ${tech.notes ? `<small>${display(tech.notes)}</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
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
        ${notes.map((note) => `<li>${display(note)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderSources(sources = []) {
  const visibleSources = usefulSources(sources);
  if (visibleSources.length === 0) {
    return '<p class="empty-result">Nenhuma fonte cadastrada ainda.</p>';
  }

  return `
    <ul class="source-list">
      ${visibleSources.map((source) => {
        const safeUrl = source.url ? safeExternalUrl(source.url) : "";
        return `
        <li>
          <strong class="source-type">${sourceTypeLabel(source.type)}</strong>
          ${safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noreferrer">Abrir fonte ↗</a>` : "<span>Referência sem link</span>"}
          <small>${display(source.note, "Sem observação adicional")}</small>
        </li>
      `;
      }).join("")}
    </ul>
  `;
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
  return labels[type] || display(type);
}

function buildNetworks() {
  const map = new Map();
  cinemas.forEach((cinema) => {
    const id = networkId(cinema);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(cinema);
  });
  return [...map.entries()]
    .map(([id, networkCinemas]) => ({
      id,
      name: networkName(networkCinemas[0]),
      cinemas: networkCinemas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function restoreFiltersFromUrl() {
  if (!search) return;
  const params = new URLSearchParams(window.location.search);
  if (params.has("q")) search.value = params.get("q");
  if (systemFilter && params.has("sistema")) {
    systemFilter.value = params.get("sistema");
    if (!systemFilter.value && experienceFilter) {
      experienceFilter.value = params.get("sistema");
    }
  }
  if (experienceFilter && params.has("experiencia")) experienceFilter.value = params.get("experiencia");
  if (projectionFilter && params.has("projecao")) projectionFilter.value = params.get("projecao");
  if (resolutionFilter && params.has("resolucao")) resolutionFilter.value = params.get("resolucao");
  if (soundFilter && params.has("som")) soundFilter.value = params.get("som");
  if (soundLayoutFilter && params.has("layout")) soundLayoutFilter.value = params.get("layout");
  if (sortFilter) sortFilter.value = params.get("ordem") || defaultSort;
  if (params.has("p")) currentPage = Math.max(1, Number(params.get("p")) || 1);
}

function updateFilterUrl() {
  if (!search) return;
  const params = new URLSearchParams();
  if (search.value) params.set("q", search.value);
  if (systemFilter?.value) params.set("sistema", systemFilter.value);
  if (experienceFilter?.value) params.set("experiencia", experienceFilter.value);
  if (projectionFilter?.value) params.set("projecao", projectionFilter.value);
  if (resolutionFilter?.value) params.set("resolucao", resolutionFilter.value);
  if (soundFilter?.value) params.set("som", soundFilter.value);
  if (soundLayoutFilter?.value) params.set("layout", soundLayoutFilter.value);
  if (sortFilter?.value && sortFilter.value !== defaultSort) params.set("ordem", sortFilter.value);
  if (currentPage > 1) params.set("p", String(currentPage));
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function renderNetworkTree() {
  if (!networkTree) return;

  const query = normalize(cinemaSearch?.value);
  const networks = buildNetworks()
    .map((network) => ({
      ...network,
      cinemas: network.cinemas.filter((cinema) => {
        const text = normalize([
          network.name,
          cinema.name,
          cinema.city,
          cinema.neighborhood,
          cinema.address,
          ...cinema.rooms.map((room) => roomText({ cinema, room })),
        ].join(" "));
        return text.includes(query);
      }),
    }))
    .filter((network) => network.cinemas.length > 0);
  const totalPages = Math.max(1, Math.ceil(networks.length / networksPerPage));
  currentNetworkPage = Math.min(currentNetworkPage, totalPages);
  const pageStart = (currentNetworkPage - 1) * networksPerPage;
  const pageNetworks = networks.slice(pageStart, pageStart + networksPerPage);

  if (networkSummary) {
    const cinemaTotal = networks.reduce((sum, network) => sum + network.cinemas.length, 0);
    networkSummary.textContent = networks.length
      ? `${networks.length} ${networks.length === 1 ? "rede" : "redes"} · ${cinemaTotal} ${cinemaTotal === 1 ? "cinema" : "cinemas"}${query ? " encontrados" : " catalogados"}`
      : "Nenhum cinema encontrado";
  }

  networkTree.innerHTML = pageNetworks.map(({ name, cinemas: networkCinemas }) => {
    const networkSlug = networkId(networkCinemas[0]);
    return `
    <article class="network-block">
      <h3>
        <a href="${networkUrl(networkSlug)}">${display(name)}</a>
        <span class="network-count">${networkCinemas.length} ${networkCinemas.length === 1 ? "cinema" : "cinemas"}</span>
      </h3>
      <div class="cinema-branch">
        ${networkCinemas.map((cinema) => `
          <section>
            <h4><a href="${cinemaUrl(cinema)}">${display(cinema.name)}</a></h4>
            <p>${display(cinema.city)}, ${display(cinema.state)} · ${display(cinema.neighborhood)}</p>
            <ul>
              ${cinema.rooms.map((room) => `
                <li>
                  <a href="${roomUrl(roomId(cinema, room))}">${display(room.name)}</a>
                  <span>${display(compact([
                    projectionDisplay(room),
                    room.projection?.resolution,
                    ...soundValues(room),
                  ]))}</span>
                </li>
              `).join("")}
            </ul>
          </section>
        `).join("")}
      </div>
    </article>
  `;
  }).join("");

  if (networks.length === 0) {
    networkTree.innerHTML = '<p class="empty-result">Tente buscar por outro nome, rede, bairro ou sala.</p>';
  }

  renderNetworkPagination(totalPages);
}

function renderNetworkPagination(totalPages) {
  if (!networkPagination) return;

  if (totalPages <= 1) {
    networkPagination.innerHTML = "";
    return;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  networkPagination.innerHTML = `
    <button type="button" data-net-page="${currentNetworkPage - 1}" ${currentNetworkPage === 1 ? "disabled" : ""}>Anterior</button>
    <div class="pagination-pages">
      ${pages.map((page) => `
        <button
          type="button"
          data-net-page="${page}"
          ${page === currentNetworkPage ? 'aria-current="page"' : ""}
        >${page}</button>
      `).join("")}
    </div>
    <button type="button" data-net-page="${currentNetworkPage + 1}" ${currentNetworkPage === totalPages ? "disabled" : ""}>Próxima</button>
  `;
}

async function init() {
  if (roomList) roomList.innerHTML = '<p class="empty-result">Carregando salas…</p>';
  if (networkTree) networkTree.innerHTML = '<p class="empty-result">Carregando…</p>';

  const response = await fetch("data/cinemas.json", {
    cache: "no-cache",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`O catálogo respondeu com HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new TypeError("O catálogo não contém uma lista de cinemas.");
  }

  cinemas = payload;
  rooms = buildRooms(cinemas);

  setupFilters();
  restoreFiltersFromUrl();
  setupMobileFilters();
  renderNetworkTree();

  [search, systemFilter, experienceFilter, projectionFilter, resolutionFilter, soundFilter, soundLayoutFilter, sortFilter].filter(Boolean).forEach((control) => {
    control.addEventListener("input", () => {
      currentPage = 1;
      render();
    });
    control.addEventListener("change", () => {
      currentPage = 1;
      render();
    });
  });

  if (clearFilters) {
    clearFilters.addEventListener("click", () => {
      [search, systemFilter, experienceFilter, projectionFilter, resolutionFilter, soundFilter, soundLayoutFilter].filter(Boolean).forEach((control) => {
        control.value = "";
      });
      if (sortFilter) sortFilter.value = defaultSort;
      currentPage = 1;
      render();
      search?.focus();
    });
  }

  if (filterToggle && filterGrid) {
    filterToggle.addEventListener("click", () => {
      setFilterExpanded(filterToggle.getAttribute("aria-expanded") !== "true");
    });
  }

  if (cinemaSearch) {
    cinemaSearch.addEventListener("input", () => {
      currentNetworkPage = 1;
      renderNetworkTree();
    });
  }

  if (pagination) {
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-page]");
      if (!button || button.disabled) return;

      currentPage = Number(button.dataset.page);
      render();
      document.querySelector("#catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (networkPagination) {
    networkPagination.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-net-page]");
      if (!button || button.disabled) return;

      currentNetworkPage = Number(button.dataset.netPage);
      renderNetworkTree();
      document.querySelector("#estrutura")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
    if (document.activeElement?.closest("input, select, textarea")) return;
    const searchControl = search || cinemaSearch;
    if (!searchControl) return;
    event.preventDefault();
    searchControl.focus();
    searchControl.select();
  });

  window.addEventListener("popstate", () => {
    restoreFiltersFromUrl();
    render();
  });

  if (isHomePage) {
    window.matchMedia("(max-width: 900px)").addEventListener("change", () => {
      currentPage = 1;
      render();
    });
  }
  render();
}

function setFilterExpanded(expanded) {
  if (!filterToggle || !filterGrid) return;
  filterToggle.setAttribute("aria-expanded", String(expanded));
  filterGrid.hidden = !expanded;
}

function setupMobileFilters() {
  if (!filterToggle || !filterGrid) return;
  const media = window.matchMedia("(max-width: 600px)");
  const defaultExpanded = document.body.classList.contains("catalog-page");
  const hasActiveTechnicalFilter = () => [
      systemFilter?.value,
      experienceFilter?.value,
      projectionFilter?.value,
      resolutionFilter?.value,
      soundFilter?.value,
      soundLayoutFilter?.value,
      sortFilter?.value !== defaultSort ? sortFilter?.value : "",
    ].some(Boolean);

  setFilterExpanded(!media.matches || defaultExpanded || hasActiveTechnicalFilter());
  media.addEventListener("change", (event) => {
    setFilterExpanded(!event.matches || defaultExpanded || hasActiveTechnicalFilter());
  });
}

init().catch(() => {
  if (hasDetailParams()) {
    renderMissingDetail("Não foi possível carregar os dados", "A tela de detalhe não conseguiu carregar o catálogo.");
    return;
  }

  if (roomList) {
    roomList.innerHTML = '<p class="empty-result">Nao foi possivel carregar os dados do catalogo.</p>';
  }
  if (networkTree) {
    networkTree.innerHTML = '<p class="empty-result">Nao foi possivel carregar os dados do catalogo.</p>';
  }
});
