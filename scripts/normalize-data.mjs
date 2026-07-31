import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cinemaDirectory = path.join(projectRoot, "data", "cinemas");

const projectionTechnology = new Map([
  ["Digital", "A confirmar"],
  ["laser", "A confirmar"],
  ["Laser", "A confirmar"],
  ["Lâmpada Xenon", "A confirmar"],
  ["Xenon", "A confirmar"],
  ["LED", "Tela LED"],
  ["70mm", "Película 70 mm"],
  ["70 mm", "Película 70 mm"],
  ["IMAX 70mm", "Película 70 mm"],
]);

const lightSource = new Map([
  ["laser", "Laser"],
  ["laser RGB", "Laser RGB"],
  ["Lâmpada Xenon", "Xenon"],
]);

const soundFormat = new Map([
  ["Dolby 7.1", "Dolby Digital 7.1"],
  ["IMAX with Laser", "IMAX"],
  ["Multicanal", "A confirmar"],
  ["Multicanal 11.1", "A confirmar"],
  ["Surround 11.1", "A confirmar"],
  ["Harman Quantum Logic (JBL)", "A confirmar"],
]);

const aspectRatio = new Map([
  ["7:3 (aprox. 2,33:1)", "2.33:1"],
]);

const technologyName = new Map([
  ["Dolby 7.1", "Dolby Digital 7.1"],
  ["Tela LED autoemissiva 4K", "Samsung Onyx"],
  ["Imax", "IMAX"],
  ["imax", "IMAX"],
  ["IMAX Digital", "IMAX"],
  ["IMAX with Laser", "IMAX"],
]);

const discardedTechnologyNames = new Set([
  "Grande Formato",
  "Grande Formato Laser 4K",
]);

const technologyType = new Map([
  ["IMAX", "system"],
  ["3D", "experience"],
  ["4DX", "experience"],
  ["Samsung Onyx", "projection"],
]);

const filenames = (await readdir(cinemaDirectory))
  .filter((filename) => filename.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b, "pt-BR"));

let changedFiles = 0;
let changedValues = 0;
let removedValues = 0;

for (const filename of filenames) {
  const filePath = path.join(cinemaDirectory, filename);
  const original = await readFile(filePath, "utf8");
  const cinema = JSON.parse(original);

  for (const room of cinema.rooms) {
    const normalizedRoomName = room.name.replace(/\b4k\b/g, "4K");
    if (normalizedRoomName !== room.name) {
      room.name = normalizedRoomName;
      changedValues += 1;
    }

    changedValues += replace(room.projection, "technology", projectionTechnology);
    changedValues += replace(room.projection, "light_source", lightSource);
    changedValues += replace(room.screen, "aspect_ratio", aspectRatio);

    const legacyScreenType = room.screen?.type;
    if (legacyScreenType) {
      if (legacyScreenType === "LED modular") {
        changedValues += setValue(room.screen, "technology", "LED modular");
      } else if (["Perolizada", "perolizada"].includes(legacyScreenType)) {
        changedValues += setValue(room.screen, "surface", "Perolizada");
      } else if (legacyScreenType === "Plana") {
        changedValues += setValue(room.screen, "geometry", "Plana");
      }
      delete room.screen.type;
      changedValues += 1;
    }

    const legacySoundFormat = room.sound?.format;
    if (legacySoundFormat === "Dolby Digital 5.1") {
      changedValues += setValue(room.sound, "channel_layout", "5.1");
      if (room.sound.channels === 6) changedValues += setValue(room.sound, "channels", null);
    } else if (["Dolby 7.1", "Dolby Digital 7.1"].includes(legacySoundFormat)) {
      changedValues += setValue(room.sound, "channel_layout", "7.1");
    } else if (["Multicanal 11.1", "Surround 11.1"].includes(legacySoundFormat)) {
      changedValues += setValue(room.sound, "channel_layout", "11.1");
      if (room.sound.channels === 11) changedValues += setValue(room.sound, "channels", null);
    } else if (legacySoundFormat === "Harman Quantum Logic (JBL)") {
      changedValues += setValue(room.sound, "processor", "Harman Quantum Logic (JBL)");
    }

    if (room.sound?.notes?.includes("11.1") && room.sound.channels === 11) {
      changedValues += setValue(room.sound, "channel_layout", "11.1");
      changedValues += setValue(room.sound, "channels", null);
    }

    if (legacySoundFormat === "Dolby Atmos" && room.sound?.channels === 128) {
      changedValues += setValue(room.sound, "audio_streams", 128);
      changedValues += setValue(room.sound, "channels", null);
    }

    if (room.sound?.audio_streams === 128 && room.sound.notes?.includes("128 canais de áudio")) {
      room.sound.notes = room.sound.notes.replace("128 canais de áudio", "128 streams de áudio declarados");
      changedValues += 1;
    }

    changedValues += replace(room.sound, "format", soundFormat);

    const usefulSources = (room.sources ?? []).filter((source) =>
      source.url?.trim() || source.note?.trim()
    );
    if (usefulSources.length !== (room.sources ?? []).length) {
      removedValues += (room.sources ?? []).length - usefulSources.length;
      room.sources = usefulSources;
    }

    const normalizedTechnologies = [];
    const seenTechnologies = new Set();

    for (const technology of room.technologies ?? []) {
      if (discardedTechnologyNames.has(technology.name)) {
        removedValues += 1;
        continue;
      }

      const normalizedName = technologyName.get(technology.name) ?? technology.name;
      if (normalizedName !== technology.name) {
        technology.name = normalizedName;
        changedValues += 1;
      }

      const normalizedType = technologyType.get(technology.name);
      if (normalizedType && normalizedType !== technology.type) {
        technology.type = normalizedType;
        changedValues += 1;
      }

      if (technology.type === "audio") {
        if (technology.name === "Harman Quantum Logic (JBL)") {
          changedValues += setUnknownValue(
            room.sound,
            "processor",
            "Harman Quantum Logic (JBL)",
          );
        } else {
          changedValues += setUnknownValue(room.sound, "format", technology.name);
        }
        changedValues += appendNote(room.sound, technology.notes);
        removedValues += 1;
        continue;
      }

      if (technology.type === "projection") {
        if (technology.name === "Projeção Laser") {
          changedValues += setUnknownValue(room.projection, "light_source", "Laser");
        } else if (technology.name === "Samsung Onyx") {
          changedValues += setUnknownValue(room.projection, "technology", "Tela LED");
          changedValues += setUnknownValue(room.projection, "brand", "Samsung");
          changedValues += setUnknownValue(room.projection, "model", "Onyx");
        }
        changedValues += appendNote(room.projection, technology.notes);
        removedValues += 1;
        continue;
      }

      if (technology.type === "seat") {
        const comfortNote = [
          `Conforto: ${technology.name}`,
          technology.notes,
        ].filter(Boolean).join(" — ");
        changedValues += appendNote(room, comfortNote);
        removedValues += 1;
        continue;
      }

      const key = technology.name;
      if (seenTechnologies.has(key)) {
        removedValues += 1;
        continue;
      }

      seenTechnologies.add(key);
      normalizedTechnologies.push(technology);
    }

    room.technologies = normalizedTechnologies;
  }

  const normalized = `${JSON.stringify(cinema, null, 2)}\n`;
  if (normalized !== original) {
    await writeFile(filePath, normalized);
    changedFiles += 1;
  }
}

console.log(
  `Normalização concluída: ${changedFiles} arquivos, ${changedValues} valores ajustados e ${removedValues} categorias removidas.`,
);

function replace(target, property, replacements) {
  if (!target || !replacements.has(target[property])) return 0;
  target[property] = replacements.get(target[property]);
  return 1;
}

function setValue(target, property, value) {
  if (!target || target[property] === value) return 0;
  target[property] = value;
  return 1;
}

function setUnknownValue(target, property, value) {
  if (!target || ![undefined, null, "A confirmar"].includes(target[property])) return 0;
  return setValue(target, property, value);
}

function appendNote(target, note) {
  const normalizedNote = note?.trim();
  if (!target || !normalizedNote || target.notes?.includes(normalizedNote)) return 0;
  target.notes = [target.notes, normalizedNote].filter(Boolean).join(" · ");
  return 1;
}
