export type RenameTarget = "friendly_name" | "entity_id";
export type RenameMode = "prefix" | "suffix" | "find-replace";

export interface RenameOptions {
  target: RenameTarget;
  mode: RenameMode;
  text: string; // used for prefix + suffix
  find: string; // used for find-replace
  replace: string; // used for find-replace
  regex: boolean;
  caseSensitive: boolean;
}

export interface RenameSubject {
  entity_id: string;
  name: string | null;
  original_name: string | null;
}

export interface RenameRow {
  entityId: string; // original entity_id — stable key
  currentValue: string;
  newValue: string;
  error: string | null;
  changed: boolean;
}

const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

const escapeForRegex = (s: string): string =>
  s.replace(REGEX_SPECIAL, "\\$&");

const currentValueFor = (e: RenameSubject, target: RenameTarget): string => {
  if (target === "entity_id") return e.entity_id;
  return e.name ?? e.original_name ?? "";
};

const findReplace = (input: string, options: RenameOptions): string => {
  if (!options.find) return input;
  if (options.regex) {
    try {
      const re = new RegExp(
        options.find,
        options.caseSensitive ? "g" : "gi",
      );
      return input.replace(re, options.replace);
    } catch {
      return input;
    }
  }
  if (options.caseSensitive) {
    return input.split(options.find).join(options.replace);
  }
  return input.replace(
    new RegExp(escapeForRegex(options.find), "gi"),
    options.replace,
  );
};

const transform = (input: string, options: RenameOptions): string => {
  switch (options.mode) {
    case "prefix":
      return options.text + input;
    case "suffix":
      return input + options.text;
    case "find-replace":
      return findReplace(input, options);
  }
};

const applyToEntityId = (
  originalId: string,
  options: RenameOptions,
): string => {
  // Find-replace operates on the whole id — domain collisions are caught
  // later by the domain-preservation check.
  if (options.mode === "find-replace") return transform(originalId, options);

  // Prefix / suffix should only touch the object_id so the domain stays
  // valid (otherwise a prefix of "kitchen_" on "sensor.foo" produces the
  // invalid id "kitchen_sensor.foo").
  const dot = originalId.indexOf(".");
  if (dot < 0) return transform(originalId, options);
  const domain = originalId.slice(0, dot);
  const objectId = originalId.slice(dot + 1);
  return `${domain}.${transform(objectId, options)}`;
};

export function validateOptions(options: RenameOptions): string | null {
  if (options.mode === "find-replace" && options.regex && options.find) {
    try {
      new RegExp(options.find);
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid regex";
    }
  }
  return null;
}

export function buildRenameRows(
  subjects: RenameSubject[],
  allEntityIds: Iterable<string>,
  options: RenameOptions,
): RenameRow[] {
  const optionsError = validateOptions(options);
  const originals = new Set(subjects.map((s) => s.entity_id));
  const remainingAfterRename = new Set<string>();
  for (const id of allEntityIds) {
    if (!originals.has(id)) remainingAfterRename.add(id);
  }

  const rows: RenameRow[] = subjects.map((s) => {
    const current = currentValueFor(s, options.target);
    const newValue =
      options.target === "entity_id"
        ? applyToEntityId(s.entity_id, options)
        : transform(current, options);
    return {
      entityId: s.entity_id,
      currentValue: current,
      newValue,
      error: null,
      changed: newValue !== current,
    };
  });

  if (optionsError) {
    for (const r of rows) r.error = optionsError;
    return rows;
  }

  if (options.target !== "entity_id") return rows;

  // Entity-id-specific validation + collision detection.
  const newCounts = new Map<string, number>();
  for (const r of rows) {
    newCounts.set(r.newValue, (newCounts.get(r.newValue) ?? 0) + 1);
  }

  for (const r of rows) {
    if (!ENTITY_ID_PATTERN.test(r.newValue)) {
      r.error =
        "Invalid entity_id — must be lowercase letters, digits, underscores, and one dot.";
      continue;
    }
    const originalDomain = r.entityId.split(".", 1)[0] ?? "";
    const newDomain = r.newValue.split(".", 1)[0] ?? "";
    if (newDomain !== originalDomain) {
      r.error = `Cannot change domain (${originalDomain} → ${newDomain})`;
      continue;
    }
    if (remainingAfterRename.has(r.newValue)) {
      r.error = "Conflicts with an existing entity";
      continue;
    }
    if ((newCounts.get(r.newValue) ?? 0) > 1) {
      r.error = "Two or more entities would collide on this new ID";
      continue;
    }
  }

  return rows;
}

export function summarizeRows(rows: RenameRow[]): {
  applicable: number;
  unchanged: number;
  errors: number;
} {
  let applicable = 0;
  let unchanged = 0;
  let errors = 0;
  for (const r of rows) {
    if (r.error) errors += 1;
    else if (!r.changed) unchanged += 1;
    else applicable += 1;
  }
  return { applicable, unchanged, errors };
}
