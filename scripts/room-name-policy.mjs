const ROOM_NAME_CLASSIFICATION_TERMS = [
  "VIP Lounge",
  "Dolby Atmos",
  "Dolby Digital",
  "Projeção Laser",
  "Samsung Onyx",
  "Macro XE",
  "Cinépic",
  "UCI XPLUS",
  "XPLUS",
  "ScreenX",
  "D-BOX",
  "Platinum",
  "Premium",
  "Lounge",
  "IMAX",
  "Onyx",
  "Laser RGB",
  "Laser",
  "Xenon",
  "VIP",
  "4DX",
  "3D",
  "4K",
  "2K",
];

const NUMBERED_ROOM_CLASSIFICATION_TERMS = [
  "Standard",
  "Comfort",
  "Prime",
  "Gold",
  "PLF",
  "XD",
];

const APPROVED_NUMBERED_ROOM_PROPER_NAMES = new Set([
  "Leon Cakoff",
  "Carmen Miranda",
  "Rubens Ewald Filho",
  "Helena Ignez",
  "Luiz Carlos Merten",
  "Léo Mendes",
]);

const APPROVED_STANDALONE_ROOM_NAMES = new Set([
  "Bradesco Prime 1",
  "Bradesco Prime 2",
  "Bradesco Prime 3",
  "Bradesco Prime 4",
  "Grande Auditório",
]);

export function findRoomNameClassifications(room) {
  const candidates = new Set(ROOM_NAME_CLASSIFICATION_TERMS);

  if (/^Sala\s+\d+\b/iu.test(room.name)) {
    for (const term of NUMBERED_ROOM_CLASSIFICATION_TERMS) candidates.add(term);
  }

  for (const value of structuredClassifications(room)) {
    if (isKnown(value)) candidates.add(value.trim());
  }

  return [...candidates]
    .filter((term) => containsTerm(room.name, term))
    .sort((a, b) => b.length - a.length || a.localeCompare(b, "pt-BR"));
}

export function roomNamePolicyMessage(room) {
  const classifications = findRoomNameClassifications(room);
  if (classifications.length > 0) {
    return `o nome da sala mistura identificação com classificação (${classifications.join(", ")}); use apenas o número ou nome próprio e mantenha tipo, sistema e especificações nos campos dedicados`;
  }

  if (/^Sala\s+\d+(?:\s+\(Anexo\))?$/u.test(room.name)) return "";
  if (APPROVED_STANDALONE_ROOM_NAMES.has(room.name)) return "";

  const properName = room.name.match(/^Sala\s+\d+\s+[–-]\s+(.+)$/u)?.[1];
  if (properName && APPROVED_NUMBERED_ROOM_PROPER_NAMES.has(properName)) return "";

  return "formato de nome não aprovado; use \"Sala N\" ou cadastre explicitamente um nome próprio permitido";
}

function structuredClassifications(room) {
  return [
    room.room_type,
    ...(room.technologies ?? []).map((technology) => technology.name),
    room.projection?.technology,
    room.projection?.resolution,
    room.projection?.light_source,
    room.projection?.brand,
    room.projection?.model,
    room.screen?.technology,
    room.screen?.surface,
    room.screen?.geometry,
    room.sound?.format,
    room.sound?.channel_layout,
    room.sound?.processor,
  ];
}

function isKnown(value) {
  return typeof value === "string" && value.trim() && value !== "A confirmar";
}

function containsTerm(name, term) {
  const escaped = term
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(name);
}
