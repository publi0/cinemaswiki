import {
  buildRooms,
  compact,
  exhibitionSystems,
  isKnown,
  networkId,
  networkName,
  normalize,
  projectionDisplay,
  projectionValues,
  roomExperienceNames,
  roomId,
  roomText,
  roomTechnologyBrands,
  screenValues,
  slugify,
  technicalTechnologies,
  technologyBrandKey,
  usefulSources,
} from "./catalog-utils.js";
import {
  filterRooms,
  paginate,
  paginationItems,
  parseFilterState,
  serializeFilterState,
  sortRooms,
} from "./catalog-state.js";
import { soundValues } from "./display-values.js";
import type {
  CatalogItem,
  Cinema,
  FilterState,
  PaginationItem,
  Room,
  Source,
  Technology,
} from "../types/catalog.js";
import type { TechnologyBrandKey } from "./catalog-utils.js";

const roomList = document.querySelector<HTMLElement>("#room-list");
const roomDetail = document.querySelector<HTMLElement>("#room-detail");
const roomTable = document.querySelector<HTMLElement>(".room-table");
const homeLinks = document.querySelector<HTMLElement>(".home-links");
const filtersSection = document.querySelector<HTMLElement>(".filters");
const resultsSummary = document.querySelector<HTMLElement>(".results-summary");
const structureSection = document.querySelector<HTMLElement>(".structure");
const methodSection = document.querySelector<HTMLElement>(".method");
const networkTree = document.querySelector<HTMLElement>("#network-tree");
const search = document.querySelector<HTMLInputElement>("#search");
const systemFilter = document.querySelector<HTMLSelectElement>("#system");
const experienceFilter = document.querySelector<HTMLSelectElement>("#experience");
const projectionFilter = document.querySelector<HTMLSelectElement>("#projection");
const resolutionFilter = document.querySelector<HTMLSelectElement>("#resolution");
const soundFilter = document.querySelector<HTMLSelectElement>("#sound");
const soundLayoutFilter = document.querySelector<HTMLSelectElement>("#sound-layout");
const sortFilter = document.querySelector<HTMLSelectElement>("#sort");
const clearFilters = document.querySelector<HTMLButtonElement>("#clear-filters");
const filterForm = document.querySelector<HTMLFormElement>(".filter-form");
const filterGrid = document.querySelector<HTMLElement>("#filter-grid");
const filterToggle = document.querySelector<HTMLButtonElement>("#filter-toggle");
const activeFilterCountLabel = document.querySelector<HTMLElement>("#active-filter-count");
const cinemaSearch = document.querySelector<HTMLInputElement>("#cinema-search");
const networkSummary = document.querySelector<HTMLElement>("#network-summary");
const resultCount = document.querySelector<HTMLElement>("#result-count");
const resultContext = document.querySelector<HTMLElement>("#result-context");
const pagination = document.querySelector<HTMLElement>("#pagination");
const networkPagination = document.querySelector<HTMLElement>("#network-pagination");
const isHomePage = document.body.classList.contains("home-page");
const defaultSort = isHomePage ? "coverage" : "name";
const networksPerPage = 5;

let cinemas: Cinema[] = [];
let rooms: CatalogItem[] = [];
let currentPage = 1;
let currentNetworkPage = 1;

interface NetworkDetail {
  id: string;
  name: string;
  cinemas: Cinema[];
}

type SpecRow = [label: string, value: unknown, href?: string];
type FilterControl = HTMLInputElement | HTMLSelectElement;

function closestButton(event: Event, selector: string): HTMLButtonElement | null {
  return event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>(selector)
    : null;
}

function filterControls(): FilterControl[] {
  return [
    search,
    systemFilter,
    experienceFilter,
    projectionFilter,
    resolutionFilter,
    soundFilter,
    soundLayoutFilter,
    sortFilter,
  ].filter((control): control is FilterControl => control !== null);
}

function catalogVisibilityControls(): FilterControl[] {
  return [
    search,
    systemFilter,
    experienceFilter,
    projectionFilter,
    resolutionFilter,
    soundFilter,
    sortFilter,
  ].filter((control): control is FilterControl => control !== null);
}

function hasDetailParams(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("sala") || params.has("cinema") || params.has("rede");
}

function roomsPerPage(): number {
  if (!isHomePage) return 12;
  return window.matchMedia("(max-width: 900px)").matches ? 3 : 6;
}

if (hasDetailParams()) {
  showDetailView();
}

function display(value: unknown, fallback = "A confirmar"): string {
  const visibleValue = value === null || value === undefined || value === "" ? fallback : value;
  return escapeHtml(visibleValue);
}

function yesNo(value: boolean | null | undefined): string | null {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return null;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function labIcon(name: unknown, className = ""): string {
  const safeName = String(name).replace(/[^a-z-]/g, "");
  const safeClassName = String(className).replace(/[^a-z0-9_-]/gi, "");
  return `<svg class="lab-icon ${safeClassName}" aria-hidden="true"><use href="assets/lab-icons.svg#${safeName}"></use></svg>`;
}

function fieldIcon(label: string): string {
  const icons: Record<string, string> = {
    "Projeção": "projector",
    "Resolução": "resolution",
    "Som": "sound",
    "Tela": "screen",
  };
  return icons[label] || "room";
}

function safeExternalUrl(value: string): string {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "";
  } catch {
    return "";
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day)).replace(".", "");
}

function roomUrl(id: string, _fromCinema?: string): string {
  return `salas/${encodeURIComponent(id)}.html`;
}

function cinemaUrl(cinema: Cinema): string {
  return `cinemas/${encodeURIComponent(cinema.slug)}.html`;
}

function networkUrl(cinemaOrId: Cinema | string): string {
  const id = typeof cinemaOrId === "string" ? cinemaOrId : networkId(cinemaOrId);
  return `redes/${encodeURIComponent(id)}.html`;
}

function technologyBrandMark(value: unknown): string {
  const key = technologyBrandKey(value);
  if (!key) return "";

  const wordmarks: Record<TechnologyBrandKey, string> = {
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

function renderTechnologyBrands(room: Room): string {
  const brands = roomTechnologyBrands(room);
  if (brands.length === 0) return "";
  return `<span class="technology-marks" aria-label="Tecnologias da sala">${brands.map(technologyBrandMark).join("")}</span>`;
}

function fillSelect(select: HTMLSelectElement, values: readonly string[]): void {
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

function setupFilters(): void {
  const validValues = (arr: readonly unknown[]): string[] => [
    ...new Set(arr.filter((value): value is string => Boolean(value) && value !== "A confirmar")),
  ];
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

function render(): void {
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

  let filtered = filterRooms(rooms, {
    query: search?.value,
    system: systemFilter?.value,
    experience: experienceFilter?.value,
    projection: projectionFilter?.value,
    resolution: resolutionFilter?.value,
    sound: soundFilter?.value,
    soundLayout: soundLayoutFilter?.value,
  });
  filtered = sortRooms(filtered, sortFilter?.value, soundValues);

  const pageSize = roomsPerPage();
  const page = paginate(filtered, currentPage, pageSize);
  currentPage = page.page;
  const { totalPages, pageStart, items: pageItems } = page;

  if (resultCount) resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "sala" : "salas"}`;
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
  if (activeFilterCountLabel) activeFilterCountLabel.textContent = String(advancedFilterCount);
  const rangeStart = filtered.length ? pageStart + 1 : 0;
  const rangeEnd = Math.min(pageStart + pageItems.length, filtered.length);
  if (resultContext) {
    resultContext.textContent = filtered.length > 0
      ? `mostrando ${rangeStart}–${rangeEnd}${activeFilterCount ? ` · ${activeFilterCount} ${activeFilterCount === 1 ? "filtro ativo" : "filtros ativos"}` : ""}`
      : activeFilterCount ? "nenhum resultado para os filtros atuais" : "em todo o catálogo";
  }

  roomList.innerHTML = pageItems.map((item, index) => renderRoom(item, pageStart + index + 1)).join("");
  renderPagination(totalPages);
  updateFilterUrl();

  if (filtered.length === 0) {
    roomList.innerHTML = '<p class="empty-result">Nenhuma sala encontrada para esses filtros.</p>';
  }
}

function renderPagination(totalPages: number): void {
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

function renderRoom(item: CatalogItem, rowNumber: number): string {
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

function renderRoomField(label: string, values: readonly unknown[], detailValues: readonly unknown[] = []): string {
  const knownValues = values.filter(isKnown);
  const knownDetails = detailValues.filter(isKnown);
  const primary = knownValues.join(" · ");
  const detail = knownDetails.join(" · ");

  return `
    <div
      class="room-field ${primary ? "" : "is-unknown"}"
      role="group"
      aria-label="${escapeHtml(`${label}: ${primary || "A confirmar"}`)}"
    >
      <span class="cell-label">${labIcon(fieldIcon(label))}${label}</span>
      <strong class="data-primary">${escapeHtml(primary || "A confirmar")}</strong>
      ${detail ? `<small class="data-secondary">${escapeHtml(detail)}</small>` : ""}
    </div>
  `;
}

function getSelectedRoom(): CatalogItem | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("sala");
  return id ? rooms.find((item) => item.id === id) ?? null : null;
}

function getSelectedCinema(): Cinema | null {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("cinema");
  return slug ? cinemas.find((cinema) => cinema.slug === slug) ?? null : null;
}

function getSelectedNetwork(): NetworkDetail | null {
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

function showCatalog(): void {
  if (homeLinks) homeLinks.hidden = false;
  catalogVisibilityControls().forEach((control) => {
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

function showDetailView(): void {
  if (homeLinks) homeLinks.hidden = true;
  catalogVisibilityControls().forEach((control) => {
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

function renderMissingDetail(title: string, message: string): void {
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

function renderRoomDetail(item: CatalogItem): void {
  const { cinema, room } = item;
  const sourceCount = usefulSources(room.sources).length;

  showDetailView();
  if (!roomDetail) return;

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

function renderCinemaDetail(cinema: Cinema): void {
  const cinemaRooms = rooms
    .filter((item) => item.cinema.slug === cinema.slug)
    .sort((a, b) => a.room.name.localeCompare(b.room.name, "pt-BR"));

  showDetailView();
  if (!roomDetail) return;
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

function renderNetworkDetail(network: NetworkDetail): void {
  const networkRooms = rooms.filter((item) => networkId(item.cinema) === network.id);

  showDetailView();
  if (!roomDetail) return;
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

function renderRoomCards(items: CatalogItem[], title: string, fromCinema?: Cinema): string {
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

function renderSpecGroup(title: string, rows: SpecRow[]): string {
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

function renderTechnologies(technologies: Technology[] = []): string {
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

function renderNotes(cinema: Cinema, room: Room): string {
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

function renderSources(sources: Source[] = []): string {
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

function sourceTypeLabel(type: Source["type"]): string {
  const labels: Record<Source["type"], string> = {
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

function buildNetworks(): NetworkDetail[] {
  const map = new Map<string, Cinema[]>();
  cinemas.forEach((cinema) => {
    const id = networkId(cinema);
    const networkCinemas = map.get(id) ?? [];
    networkCinemas.push(cinema);
    map.set(id, networkCinemas);
  });
  return [...map.entries()]
    .map(([id, networkCinemas]) => ({
      id,
      name: networkName(networkCinemas[0]),
      cinemas: networkCinemas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function restoreFiltersFromUrl(): void {
  if (!search) return;
  const state = parseFilterState(window.location.search, defaultSort);
  search.value = state.query;
  if (systemFilter) systemFilter.value = state.system;
  if (experienceFilter) experienceFilter.value = state.experience || state.system;
  if (projectionFilter) projectionFilter.value = state.projection;
  if (resolutionFilter) resolutionFilter.value = state.resolution;
  if (soundFilter) soundFilter.value = state.sound;
  if (soundLayoutFilter) soundLayoutFilter.value = state.soundLayout;
  if (sortFilter) sortFilter.value = state.sort;
  currentPage = state.page;
}

function updateFilterUrl(): void {
  if (!search) return;
  const qs = serializeFilterState({
    query: search.value,
    system: systemFilter?.value ?? "",
    experience: experienceFilter?.value ?? "",
    projection: projectionFilter?.value ?? "",
    resolution: resolutionFilter?.value ?? "",
    sound: soundFilter?.value ?? "",
    soundLayout: soundLayoutFilter?.value ?? "",
    sort: sortFilter?.value ?? defaultSort,
    page: currentPage,
  }, defaultSort);
  history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function renderNetworkTree(): void {
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

function renderNetworkPagination(totalPages: number): void {
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

async function init(): Promise<void> {
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

  filterControls().forEach((control) => {
    control.addEventListener("input", () => {
      currentPage = 1;
      render();
    });
    control.addEventListener("change", () => {
      currentPage = 1;
      render();
    });
  });

  filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  if (clearFilters) {
    clearFilters.addEventListener("click", () => {
      [search, systemFilter, experienceFilter, projectionFilter, resolutionFilter, soundFilter, soundLayoutFilter]
        .filter((control): control is FilterControl => control !== null)
        .forEach((control) => {
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
      const button = closestButton(event, "button[data-page]");
      if (!button || button.disabled) return;

      currentPage = Number(button.dataset.page);
      render();
      document.querySelector("#catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (networkPagination) {
    networkPagination.addEventListener("click", (event) => {
      const button = closestButton(event, "button[data-net-page]");
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

function setFilterExpanded(expanded: boolean): void {
  if (!filterToggle || !filterGrid) return;
  filterToggle.setAttribute("aria-expanded", String(expanded));
  filterGrid.hidden = !expanded;
}

function setupMobileFilters(): void {
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
    roomList.innerHTML = '<p class="empty-result">Não foi possível carregar os dados do catálogo.</p>';
  }
  if (networkTree) {
    networkTree.innerHTML = '<p class="empty-result">Não foi possível carregar os dados do catálogo.</p>';
  }
});
