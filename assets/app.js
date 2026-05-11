const roomList = document.querySelector("#room-list");
const roomDetail = document.querySelector("#room-detail");
const roomTable = document.querySelector(".room-table");
const heroSection = document.querySelector(".hero");
const pageHeading = document.querySelector(".page-heading");
const homeLinks = document.querySelector(".home-links");
const filtersSection = document.querySelector(".filters");
const resultsSummary = document.querySelector(".results-summary");
const structureSection = document.querySelector(".structure");
const methodSection = document.querySelector(".method");
const networkTree = document.querySelector("#network-tree");
const search = document.querySelector("#search");
const cityFilter = document.querySelector("#city");
const formatFilter = document.querySelector("#format");
const projectionFilter = document.querySelector("#projection");
const soundFilter = document.querySelector("#sound");
const cinemaCount = document.querySelector("#cinema-count");
const roomCount = document.querySelector("#room-count");
const resultCount = document.querySelector("#result-count");
const resultContext = document.querySelector("#result-context");
const pagination = document.querySelector("#pagination");
const networkPagination = document.querySelector("#network-pagination");
const roomsPerPage = 12;
const networksPerPage = 5;

let cinemas = [];
let rooms = [];
let currentPage = 1;
let currentNetworkPage = 1;

function hasDetailParams() {
  const params = new URLSearchParams(window.location.search);
  return params.has("sala") || params.has("cinema") || params.has("rede");
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
  return value === null || value === undefined || value === "" ? fallback : value;
}

function compact(values) {
  return values.filter((value) => value && value !== "A confirmar").join(" · ") || "A confirmar";
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

function roomUrl(id, fromCinemaSlug) {
  const base = `salas.html?sala=${encodeURIComponent(id)}`;
  return fromCinemaSlug ? `${base}&de=${encodeURIComponent(fromCinemaSlug)}` : base;
}

function cinemaUrl(cinema) {
  return `cinemas.html?cinema=${encodeURIComponent(cinema.slug)}`;
}

function networkUrl(cinemaOrId) {
  const id = typeof cinemaOrId === "string" ? cinemaOrId : networkId(cinemaOrId);
  return `cinemas.html?rede=${encodeURIComponent(id)}`;
}

function roomText(item) {
  const room = item.room;

  return [
    item.cinema.name,
    networkName(item.cinema),
    item.cinema.city,
    item.cinema.neighborhood,
    room.name,
    room.format,
    room.projection?.technology,
    room.projection?.brand,
    room.projection?.model,
    room.projection?.resolution,
    room.projection?.light_source,
    room.screen?.type,
    room.screen?.area_m2,
    room.screen?.aspect_ratio,
    room.sound?.format,
    room.sound?.channels,
    room.sound?.speakers,
    room.sound?.power_watts,
    room.technologies?.map((tech) => `${tech.name} ${tech.type} ${tech.notes}`).join(" "),
    room.seats,
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
  if (!cityFilter) return;
  const validValues = (arr) => [...new Set(arr.filter((v) => v && v !== "A confirmar"))];
  fillSelect(cityFilter, [...new Set(cinemas.map((c) => c.city))]);
  if (formatFilter) fillSelect(formatFilter, validValues(rooms.map(({ room }) => room.format)));
  if (projectionFilter) fillSelect(projectionFilter, validValues(rooms.map(({ room }) => room.projection?.technology)));
  if (soundFilter) fillSelect(soundFilter, validValues(rooms.map(({ room }) => room.sound?.format)));
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
  const selectedCity = normalize(cityFilter?.value);
  const selectedFormat = normalize(formatFilter?.value);
  const selectedProjection = normalize(projectionFilter?.value);
  const selectedSound = normalize(soundFilter?.value);

  const filtered = rooms.filter((item) => {
    const cityMatches = !selectedCity || normalize(item.cinema.city) === selectedCity;
    const formatMatches = !selectedFormat || normalize(item.room.format) === selectedFormat;
    const projectionMatches = !selectedProjection || normalize(item.room.projection?.technology ?? "") === selectedProjection;
    const soundMatches = !selectedSound || normalize(item.room.sound?.format ?? "") === selectedSound;

    return (
      item.searchable.includes(query) &&
      cityMatches &&
      formatMatches &&
      projectionMatches &&
      soundMatches
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / roomsPerPage));
  currentPage = Math.min(currentPage, totalPages);
  const pageStart = (currentPage - 1) * roomsPerPage;
  const pageItems = filtered.slice(pageStart, pageStart + roomsPerPage);

  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "sala" : "salas"}`;
  resultContext.textContent = filtered.length > 0
    ? `${query ? `filtradas por "${search.value}"` : "em todos os cinemas catalogados"} · página ${currentPage} de ${totalPages}`
    : query ? `filtradas por "${search.value}"` : "em todos os cinemas catalogados";

  roomList.innerHTML = pageItems.map(renderRoom).join("");
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

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  pagination.innerHTML = `
    <button type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>Anterior</button>
    <div class="pagination-pages">
      ${pages.map((page) => `
        <button
          type="button"
          data-page="${page}"
          ${page === currentPage ? 'aria-current="page"' : ""}
        >${page}</button>
      `).join("")}
    </div>
    <button type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>Próxima</button>
  `;
}

function renderRoom(item) {
  const { cinema, room } = item;
  const projection = compact([
    room.projection?.technology,
    room.projection?.resolution,
    room.projection?.brand,
    room.projection?.light_source,
  ]);
  const screen = compact([
    room.screen?.type,
    room.screen?.aspect_ratio,
    room.screen?.area_m2 ? `${room.screen.area_m2} m²` : "",
    room.screen?.width_m ? `${room.screen.width_m} m largura` : "",
    room.screen?.height_m ? `${room.screen.height_m} m altura` : "",
  ]);
  const sound = compact([
    room.sound?.format,
    room.sound?.channels ? `${room.sound.channels} canais` : "",
    room.sound?.speakers ? `${room.sound.speakers} caixas` : "",
    room.sound?.power_watts ? `${room.sound.power_watts} W` : "",
  ]);

  return `
    <a class="room-row" href="${roomUrl(item.id)}" aria-label="Abrir detalhes de ${room.name} em ${cinema.name}">
      <div class="room-main">
        <span class="room-name">${room.name}</span>
        <strong>${cinema.name}</strong>
        <span class="format-badge">${display(room.format)}</span>
      </div>
      <div>
        <span class="cell-label">Local</span>
        <span>${cinema.city}, ${cinema.state}</span>
        <small>${display(cinema.neighborhood)}</small>
      </div>
      <div>
        <span class="cell-label">Projecao</span>
        <span>${projection}</span>
      </div>
      <div>
        <span class="cell-label">Tela</span>
        <span>${screen}</span>
      </div>
      <div>
        <span class="cell-label">Som</span>
        <span>${sound}</span>
      </div>
    </a>
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
  if (heroSection) heroSection.hidden = false;
  if (pageHeading) pageHeading.hidden = false;
  if (homeLinks) homeLinks.hidden = false;
  [search, cityFilter, formatFilter, projectionFilter, soundFilter].filter(Boolean).forEach((control) => {
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
  if (heroSection) heroSection.hidden = true;
  if (pageHeading) pageHeading.hidden = true;
  if (homeLinks) homeLinks.hidden = true;
  [search, cityFilter, formatFilter, projectionFilter, soundFilter].filter(Boolean).forEach((control) => {
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
        <h2>${title}</h2>
        <p class="detail-meta">${message}</p>
      </div>
    </header>
  `;
}

function renderRoomDetail(item) {
  const { cinema, room } = item;
  const sourceCount = room.sources?.length ?? 0;

  showDetailView();

  document.title = `${cinema.name} - ${room.name} | CinemasWiki`;

  const fromSlug = new URLSearchParams(window.location.search).get("de");
  const fromCinema = fromSlug ? cinemas.find((c) => c.slug === fromSlug) : null;
  const backLink = fromCinema
    ? `<a class="back-link" href="${cinemaUrl(fromCinema)}">Voltar para ${fromCinema.name}</a>`
    : `<a class="back-link" href="salas.html">Voltar para salas</a>`;

  roomDetail.innerHTML = `
    ${backLink}
    <header class="detail-header">
      <div>
        <p class="eyebrow"><a href="${networkUrl(cinema)}">${networkName(cinema)}</a></p>
        <h2><a href="${cinemaUrl(cinema)}">${cinema.name}</a> · ${room.name}</h2>
        <p class="detail-meta">${cinema.city}, ${cinema.state} · ${display(cinema.neighborhood)} · ${display(room.format)}</p>
      </div>
      <div class="detail-stamp">
        <span>${sourceCount}</span>
        <small>${sourceCount === 1 ? "fonte" : "fontes"}</small>
      </div>
    </header>

    <section class="detail-grid" aria-label="Especificacoes da sala">
      ${renderSpecGroup("Projecao", [
        ["Tecnologia", room.projection?.technology],
        ["Marca", room.projection?.brand],
        ["Modelo", room.projection?.model],
        ["Resolucao", room.projection?.resolution],
        ["Fonte de luz", room.projection?.light_source],
        ["Projetores", room.projection?.dual_lens ? "Duplo" : null],
        ["Potencia por projetor", room.projection?.watts_each ? `${room.projection.watts_each} W` : null],
      ])}
      ${renderSpecGroup("Tela", [
        ["Tipo", room.screen?.type],
        ["Proporcao", room.screen?.aspect_ratio],
        ["Area", room.screen?.area_m2 ? `${room.screen.area_m2} m²` : null],
        ["Largura", room.screen?.width_m ? `${room.screen.width_m} m` : null],
        ["Altura", room.screen?.height_m ? `${room.screen.height_m} m` : null],
        ["Diagonal", room.screen?.diagonal_in ? `${room.screen.diagonal_in}"` : null],
      ])}
      ${renderSpecGroup("Som", [
        ["Formato", room.sound?.format],
        ["Canais", room.sound?.channels],
        ["Caixas", room.sound?.speakers],
        ["Potencia", room.sound?.power_watts ? `${room.sound.power_watts} W` : null],
        ["Observacao", room.sound?.notes],
      ])}
      ${renderSpecGroup("Cinema", [
        ["Rede", `<a href="${networkUrl(cinema)}">${networkName(cinema)}</a>`],
        ["Endereco", cinema.address],
        ["Capacidade", room.seats],
        ["Ultima verificacao", cinema.last_verified],
      ])}
    </section>

    <section class="sources-block">
      <h3>Tecnologias</h3>
      ${renderTechnologies(room.technologies)}
    </section>

    ${renderNotes(cinema, room)}

    <section class="sources-block">
      <h3>Fontes e observacoes</h3>
      ${renderSources(room.sources)}
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
    <a class="back-link" href="${networkUrl(cinema)}">Voltar para ${networkName(cinema)}</a>
    <header class="detail-header">
      <div>
        <p class="eyebrow"><a href="${networkUrl(cinema)}">${networkName(cinema)}</a></p>
        <h2>${cinema.name}</h2>
        <p class="detail-meta">${cinema.city}, ${cinema.state} · ${display(cinema.neighborhood)} · ${display(cinema.address)}</p>
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
        <ul class="note-list"><li>${cinema.notes}</li></ul>
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
        <h2>${network.name}</h2>
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
              <strong>${cinema.name}</strong>
              <span>${cinema.city}, ${cinema.state} · ${display(cinema.neighborhood)}</span>
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
              <strong>${room.name}</strong>
              <span>${display(room.format)}</span>
              <small>${compact([
                room.projection?.technology,
                room.projection?.resolution,
                room.sound?.format,
                room.screen?.area_m2 ? `${room.screen.area_m2} m²` : "",
              ])}</small>
              <em>${cinema.name}</em>
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
        ${rows.map(([label, value]) => `
          <div>
            <dt>${label}</dt>
            <dd>${display(value)}</dd>
          </div>
        `).join("")}
      </dl>
    </article>
  `;
}

function renderTechnologies(technologies = []) {
  if (technologies.length === 0) {
    return '<p class="empty-result">Nenhuma tecnologia cadastrada para esta sala.</p>';
  }

  return `
    <ul class="tech-list">
      ${technologies.map((tech) => `
        <li>
          <strong>${display(tech.name)}</strong>
          <span>${display(tech.type)}</span>
          ${tech.notes ? `<small>${tech.notes}</small>` : ""}
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
        ${notes.map((note) => `<li>${note}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderSources(sources = []) {
  if (sources.length === 0) {
    return '<p class="empty-result">Nenhuma fonte cadastrada ainda.</p>';
  }

  return `
    <ul class="source-list">
      ${sources.map((source) => `
        <li>
          <strong>${display(source.type)}</strong>
          ${source.url ? `<a href="${source.url}">${source.url}</a>` : "<span>Sem URL</span>"}
          <small>${display(source.note, "Sem observacao")}</small>
        </li>
      `).join("")}
    </ul>
  `;
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
  if (cityFilter && params.has("cidade")) cityFilter.value = params.get("cidade");
  if (formatFilter && params.has("formato")) formatFilter.value = params.get("formato");
  if (projectionFilter && params.has("projecao")) projectionFilter.value = params.get("projecao");
  if (soundFilter && params.has("som")) soundFilter.value = params.get("som");
  if (params.has("p")) currentPage = Math.max(1, Number(params.get("p")) || 1);
}

function updateFilterUrl() {
  if (!search) return;
  const params = new URLSearchParams();
  if (search.value) params.set("q", search.value);
  if (cityFilter?.value) params.set("cidade", cityFilter.value);
  if (formatFilter?.value) params.set("formato", formatFilter.value);
  if (projectionFilter?.value) params.set("projecao", projectionFilter.value);
  if (soundFilter?.value) params.set("som", soundFilter.value);
  if (currentPage > 1) params.set("p", String(currentPage));
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function renderNetworkTree() {
  if (!networkTree) return;

  const networks = buildNetworks();
  const totalPages = Math.max(1, Math.ceil(networks.length / networksPerPage));
  currentNetworkPage = Math.min(currentNetworkPage, totalPages);
  const pageStart = (currentNetworkPage - 1) * networksPerPage;
  const pageNetworks = networks.slice(pageStart, pageStart + networksPerPage);

  networkTree.innerHTML = pageNetworks.map(({ name, cinemas: networkCinemas }) => {
    const networkSlug = networkId(networkCinemas[0]);
    return `
    <article class="network-block">
      <h3><a href="${networkUrl(networkSlug)}">${name}</a></h3>
      <div class="cinema-branch">
        ${networkCinemas.map((cinema) => `
          <section>
            <h4><a href="${cinemaUrl(cinema)}">${cinema.name}</a></h4>
            <p>${cinema.city}, ${cinema.state} · ${display(cinema.neighborhood)}</p>
            <ul>
              ${cinema.rooms.map((room) => `
                <li>
                  <a href="${roomUrl(roomId(cinema, room))}">${room.name}</a>
                  <span>${display(room.format)}</span>
                </li>
              `).join("")}
            </ul>
          </section>
        `).join("")}
      </div>
    </article>
  `;
  }).join("");

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

  const response = await fetch("data/cinemas.json");
  cinemas = await response.json();
  rooms = buildRooms(cinemas);

  if (cinemaCount) cinemaCount.textContent = cinemas.length;
  if (roomCount) roomCount.textContent = rooms.length;

  setupFilters();
  restoreFiltersFromUrl();
  renderNetworkTree();

  [search, cityFilter, formatFilter, projectionFilter, soundFilter].filter(Boolean).forEach((control) => {
    control.addEventListener("input", () => {
      currentPage = 1;
      render();
    });
    control.addEventListener("change", () => {
      currentPage = 1;
      render();
    });
  });

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
    if (!search) return;
    if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
    if (document.activeElement?.closest("input, select, textarea")) return;
    event.preventDefault();
    search.focus();
    search.select();
  });

  window.addEventListener("popstate", () => {
    restoreFiltersFromUrl();
    render();
  });
  render();
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
