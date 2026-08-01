import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCinema } from "./normalization.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cinemaDirectory = path.join(projectRoot, "data", "cinemas");

async function run() {
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
    const result = normalizeCinema(cinema);

    changedValues += result.changedValues;
    removedValues += result.removedValues;

    const normalized = `${JSON.stringify(result.cinema, null, 2)}\n`;
    if (normalized !== original) {
      await writeFile(filePath, normalized);
      changedFiles += 1;
    }
  }

  console.log(
    `Normalização concluída: ${changedFiles} arquivos, ${changedValues} valores ajustados e ${removedValues} categorias removidas.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
