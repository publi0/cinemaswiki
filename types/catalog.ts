export type UnknownText = string | null;
export type UnknownNumber = number | null;

export type RoomType = "VIP" | "VIP Lounge";

export type ProjectionTechnology = "Película 70 mm" | "Tela LED" | "A confirmar" | null;
export type ProjectionResolution = "2K" | "4K" | "A confirmar" | null;
export type ProjectionLightSource = "Laser" | "Laser RGB" | "Xenon" | "LED" | "A confirmar" | null;
export type ScreenTechnology = "LED modular" | "A confirmar" | null;
export type ScreenSurface = "Perolizada" | "A confirmar" | null;
export type ScreenGeometry = "Plana" | "Curva" | "A confirmar" | null;
export type AspectRatio =
  | "1.33:1"
  | "1.37:1"
  | "1.43:1"
  | "1.66:1"
  | "1.85:1"
  | "1.90:1"
  | "2.00:1"
  | "2.20:1"
  | "2.33:1"
  | "2.39:1"
  | "2.76:1"
  | "A confirmar"
  | null;
export type SoundFormat =
  | "Multicanal"
  | "Dolby Digital"
  | "Dolby Atmos"
  | "DTS:X"
  | "IMAX"
  | "A confirmar"
  | null;
export type SoundChannelLayout = "5.1" | "7.1" | "11.1" | "A confirmar" | null;
export type SoundProcessor = "Harman Quantum Logic (JBL)" | "A confirmar" | null;

export type SystemTechnologyName = "IMAX" | "Macro XE" | "XD" | "Cinépic" | "UCI XPLUS";
export type ExperienceTechnologyName = "3D" | "4DX";

export interface SystemTechnology {
  name: SystemTechnologyName;
  type: "system";
  notes?: string;
}

export interface ExperienceTechnology {
  name: ExperienceTechnologyName;
  type: "experience";
  notes?: string;
}

export type Technology = SystemTechnology | ExperienceTechnology;

export interface CinemaNetwork {
  slug: string;
  name: string;
}

export interface Projection {
  technology?: ProjectionTechnology;
  resolution?: ProjectionResolution;
  light_source?: ProjectionLightSource;
  watts_each?: UnknownNumber;
  dual_lens?: boolean;
  brand?: UnknownText;
  model?: UnknownText;
  notes?: string;
}

export interface Screen {
  technology?: ScreenTechnology;
  surface?: ScreenSurface;
  geometry?: ScreenGeometry;
  aspect_ratio?: AspectRatio;
  width_m?: UnknownNumber;
  height_m?: UnknownNumber;
  area_m2?: UnknownNumber;
  diagonal_in?: UnknownNumber;
  notes?: string;
}

export interface Sound {
  format?: SoundFormat;
  channel_layout?: SoundChannelLayout;
  channels?: UnknownNumber;
  audio_streams?: UnknownNumber;
  processor?: SoundProcessor;
  speakers?: UnknownNumber;
  power_watts?: UnknownNumber;
  notes?: string;
}

export interface Accessibility {
  wheelchair_seats?: UnknownNumber;
  reduced_mobility_seats?: UnknownNumber;
  obese_seats?: UnknownNumber;
  ramp_to_seats?: boolean | null;
  ramp_to_room?: boolean | null;
  accessible_restrooms?: boolean | null;
}

export type SourceType =
  | "official"
  | "press"
  | "photo"
  | "visit"
  | "user_report"
  | "inferred"
  | "metadata"
  | "placeholder";

export interface Source {
  type: SourceType;
  url: "" | string;
  note: string;
}

export interface Room {
  name: string;
  slug: string;
  room_type?: RoomType;
  ancine_registry?: string;
  technologies?: Technology[];
  projection: Projection;
  screen: Screen;
  sound: Sound;
  seats: UnknownNumber;
  accessibility?: Accessibility;
  sources: Source[];
  notes?: string;
}

export interface Cinema {
  slug: string;
  name: string;
  network: CinemaNetwork;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  last_verified: string;
  notes?: string;
  external_url?: string;
  ancine_registry?: string;
  rooms: Room[];
}

export interface CatalogItem {
  cinema: Cinema;
  room: Room;
  id: string;
  searchable: string;
}

export interface RoomTextItem {
  cinema: {
    name: string;
    city: string;
    neighborhood: string;
    network?: { name?: string };
    operator?: string;
    notes?: string;
  };
  room: Room;
}
export type SoundRoomLike = { sound?: Sound };
export type SoundValuesFunction = (room: SoundRoomLike) => string[];

export type SortMode = "coverage" | "updated" | "name" | string;

export interface FilterState {
  query: string;
  system: string;
  experience: string;
  projection: string;
  resolution: string;
  sound: string;
  soundLayout: string;
  sort: SortMode;
  page: number;
}

export interface FilterInput {
  query?: string;
  system?: string;
  experience?: string;
  projection?: string;
  resolution?: string;
  sound?: string;
  soundLayout?: string;
}

export interface Paginated<T> {
  page: number;
  totalPages: number;
  pageStart: number;
  items: T[];
}

export type PaginationItem = number | "ellipsis";
