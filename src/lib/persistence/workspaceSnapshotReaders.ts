import type { IsoDateString, IsoDateTimeString, WorkSessionId, WorkspaceFilePath } from "../../domain/workspace";
import {
  toIsoDateString,
  toIsoDateTimeString,
  toWorkSessionId,
  toWorkspaceFilePath,
} from "../../domain/workspaceValues";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readIsoDateTimeString(value: unknown, fallback: IsoDateTimeString): IsoDateTimeString {
  const stringValue = readNullableString(value);

  if (!stringValue) {
    return fallback;
  }

  try {
    return toIsoDateTimeString(stringValue);
  } catch {
    return fallback;
  }
}

export function readNullableIsoDateTimeString(value: unknown): IsoDateTimeString | null {
  const stringValue = readNullableString(value);

  if (!stringValue) {
    return null;
  }

  try {
    return toIsoDateTimeString(stringValue);
  } catch {
    return null;
  }
}

export function readNullableIsoDateString(value: unknown): IsoDateString | null {
  const stringValue = readNullableString(value);

  if (!stringValue) {
    return null;
  }

  try {
    return toIsoDateString(stringValue);
  } catch {
    return null;
  }
}

export function readNullableWorkSessionId(value: unknown): WorkSessionId | null {
  const stringValue = readNullableString(value);

  if (!stringValue) {
    return null;
  }

  try {
    return toWorkSessionId(stringValue);
  } catch {
    return null;
  }
}

export function readNullableWorkspaceFilePath(value: unknown): WorkspaceFilePath | null {
  const stringValue = readNullableString(value);

  if (!stringValue) {
    return null;
  }

  try {
    return toWorkspaceFilePath(stringValue);
  } catch {
    return null;
  }
}
