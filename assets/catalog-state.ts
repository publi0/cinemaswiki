import {
  coverageCount,
  exhibitionSystems,
  normalize,
  roomExperienceNames,
  projectionValues,
} from "./catalog-utils.js";
import type {
  CatalogItem,
  FilterInput,
  FilterState,
  Paginated,
  PaginationItem,
  SortMode,
  SoundValuesFunction,
} from "../types/catalog.js";

export function filterRooms(items: CatalogItem[], filters: FilterInput = {}): CatalogItem[] {
  const query = normalize(filters.query);
  const selectedSystem = normalize(filters.system);
  const selectedExperience = normalize(filters.experience);
  const selectedProjection = normalize(filters.projection);
  const selectedResolution = normalize(filters.resolution);
  const selectedSound = normalize(filters.sound);
  const selectedSoundLayout = normalize(filters.soundLayout);

  return items.filter((item) => {
    const systemMatches = !selectedSystem
      || exhibitionSystems(item.room)
        .some(({ name }) => normalize(name) === selectedSystem);
    const experienceMatches = !selectedExperience
      || roomExperienceNames(item.room)
        .some((name) => normalize(name) === selectedExperience);
    const projectionMatches = !selectedProjection
      || projectionValues(item.room)
        .some((value) => normalize(value) === selectedProjection);
    const resolutionMatches = !selectedResolution
      || normalize(item.room.projection?.resolution) === selectedResolution;
    const soundMatches = !selectedSound
      || normalize(item.room.sound?.format) === selectedSound;
    const soundLayoutMatches = !selectedSoundLayout
      || normalize(item.room.sound?.channel_layout) === selectedSoundLayout;

    return normalize(item.searchable).includes(query)
      && systemMatches
      && experienceMatches
      && projectionMatches
      && resolutionMatches
      && soundMatches
      && soundLayoutMatches;
  });
}

export function sortRooms(items: CatalogItem[], sort: SortMode | undefined, soundValues: SoundValuesFunction): CatalogItem[] {
  const sorted = [...items];

  if (sort === "coverage") {
    return sorted.sort((a, b) =>
      coverageCount(b.room, soundValues) - coverageCount(a.room, soundValues) ||
      a.cinema.name.localeCompare(b.cinema.name, "pt-BR"),
    );
  }

  if (sort === "updated") {
    return sorted.sort((a, b) =>
      String(b.cinema.last_verified ?? "")
        .localeCompare(String(a.cinema.last_verified ?? "")) ||
      a.cinema.name.localeCompare(b.cinema.name, "pt-BR"),
    );
  }

  return sorted;
}

export function paginate<T>(items: T[], requestedPage: number, pageSize: number): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pageStart = (page - 1) * pageSize;

  return {
    page,
    totalPages,
    pageStart,
    items: items.slice(pageStart, pageStart + pageSize),
  };
}

export function paginationItems(totalPages: number, activePage: number): PaginationItem[] {
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

export function parseFilterState(search: string, defaultSort: SortMode): FilterState {
  const params = new URLSearchParams(search);
  return {
    query: params.get("q") ?? "",
    system: params.get("sistema") ?? "",
    experience: params.get("experiencia") ?? "",
    projection: params.get("projecao") ?? "",
    resolution: params.get("resolucao") ?? "",
    sound: params.get("som") ?? "",
    soundLayout: params.get("layout") ?? "",
    sort: params.get("ordem") || defaultSort,
    page: Math.max(1, Number(params.get("p")) || 1),
  };
}

export function serializeFilterState(state: Partial<FilterState>, defaultSort: SortMode): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.system) params.set("sistema", state.system);
  if (state.experience) params.set("experiencia", state.experience);
  if (state.projection) params.set("projecao", state.projection);
  if (state.resolution) params.set("resolucao", state.resolution);
  if (state.sound) params.set("som", state.sound);
  if (state.soundLayout) params.set("layout", state.soundLayout);
  if (state.sort && state.sort !== defaultSort) params.set("ordem", state.sort);
  if (state.page !== undefined && state.page > 1) params.set("p", String(state.page));
  return params.toString();
}
