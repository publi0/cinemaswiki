import { loadAndValidateCinemas } from "./validate-data.mjs";

const cinemas = await loadAndValidateCinemas();
const rooms = cinemas.flatMap((cinema) =>
  cinema.rooms.map((room) => ({ cinema, room })),
);

const counters = {
  cinemas: cinemas.length,
  rooms: rooms.length,
  seats: count((room) => room.seats !== null),
  accessibility: count((room) => room.accessibility !== undefined),
  ancine: count((room) => room.ancine_registry !== undefined),
  sources: count((room) => room.sources.length > 0),
  projection: count(
    (room) =>
      known(room.projection?.technology) ||
      known(room.projection?.resolution) ||
      known(room.projection?.light_source),
  ),
  sound: count((room) => known(room.sound?.format)),
};

console.log(`Cobertura: ${counters.cinemas} cinemas, ${counters.rooms} salas`);
print("Capacidade", counters.seats);
print("Acessibilidade", counters.accessibility);
print("Registro ANCINE", counters.ancine);
print("Ao menos uma fonte", counters.sources);
print("Algum dado de projeção", counters.projection);
print("Formato de som", counters.sound);

function count(predicate) {
  return rooms.filter(({ room }) => predicate(room)).length;
}

function known(value) {
  return value !== null && value !== undefined && value !== "" && value !== "A confirmar";
}

function print(label, value) {
  const percentage = ((value / counters.rooms) * 100).toFixed(1).replace(".", ",");
  console.log(`- ${label}: ${value}/${counters.rooms} (${percentage}%)`);
}
