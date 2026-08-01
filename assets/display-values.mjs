const knownValue = (value) =>
  value !== null && value !== undefined && value !== "" && value !== "A confirmar";

export function soundValues(room) {
  return [room?.sound?.format, room?.sound?.channel_layout].filter(knownValue);
}
