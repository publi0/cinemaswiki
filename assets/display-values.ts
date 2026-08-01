import type { SoundRoomLike } from "../types/catalog.js";

const knownValue = (value: unknown): value is string =>
  value !== null && value !== undefined && value !== "" && value !== "A confirmar";

export function soundValues(room: SoundRoomLike): string[] {
  const values: Array<string | null | undefined> = [room?.sound?.format, room?.sound?.channel_layout];
  return values.filter(
    (value): value is Exclude<typeof value, null | undefined> => knownValue(value),
  );
}
