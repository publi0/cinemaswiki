import assert from "node:assert/strict";
import { soundValues } from "../assets/display-values.js";

assert.deepEqual(
  soundValues({ sound: { format: "Dolby Digital", channel_layout: "7.1" } }),
  ["Dolby Digital", "7.1"],
  "formato e layout devem permanecer visíveis como dimensões separadas",
);

assert.deepEqual(
  soundValues({ sound: { format: "Multicanal", channel_layout: "5.1" } }),
  ["Multicanal", "5.1"],
  "multicanal deve ser combinado com o layout identificado",
);

assert.deepEqual(
  soundValues({ sound: { format: "Dolby Atmos", channel_layout: "7.1" } }),
  ["Dolby Atmos", "7.1"],
  "formato e layout diferentes continuam visíveis",
);

assert.deepEqual(
  soundValues({ sound: { format: null, channel_layout: "11.1" } }),
  ["11.1"],
  "um layout sem formato continua visível",
);

assert.deepEqual(
  soundValues({ sound: { format: "DTS:X", channel_layout: null } }),
  ["DTS:X"],
  "DTS:X deve ser exibido mesmo sem layout fixo declarado",
);

console.log("Exibição de som testada: formato e layout permanecem separados.");
