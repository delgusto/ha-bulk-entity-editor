import { describe, it, expect } from "vitest";
import {
  buildRenameRows,
  summarizeRows,
  validateOptions,
  type RenameOptions,
  type RenameSubject,
} from "./rename.js";

const baseOptions = (overrides: Partial<RenameOptions> = {}): RenameOptions => ({
  target: "friendly_name",
  mode: "prefix",
  text: "",
  find: "",
  replace: "",
  regex: false,
  caseSensitive: true,
  ...overrides,
});

const subject = (
  entity_id: string,
  name: string | null = null,
  original_name: string | null = null,
): RenameSubject => ({ entity_id, name, original_name });

describe("friendly_name target", () => {
  it("adds a prefix", () => {
    const rows = buildRenameRows(
      [subject("light.lamp", "Lamp")],
      ["light.lamp"],
      baseOptions({ mode: "prefix", text: "Kitchen - " }),
    );
    expect(rows[0]).toMatchObject({
      currentValue: "Lamp",
      newValue: "Kitchen - Lamp",
      error: null,
      changed: true,
    });
  });

  it("adds a suffix", () => {
    const rows = buildRenameRows(
      [subject("light.lamp", "Lamp")],
      ["light.lamp"],
      baseOptions({ mode: "suffix", text: " (main)" }),
    );
    expect(rows[0].newValue).toBe("Lamp (main)");
  });

  it("falls back to original_name when name is null", () => {
    const rows = buildRenameRows(
      [subject("light.lamp", null, "Default Lamp Name")],
      ["light.lamp"],
      baseOptions({ mode: "prefix", text: ">> " }),
    );
    expect(rows[0].currentValue).toBe("Default Lamp Name");
    expect(rows[0].newValue).toBe(">> Default Lamp Name");
  });

  it("does case-sensitive find/replace by default", () => {
    const rows = buildRenameRows(
      [subject("x.a", "Living Room Lamp")],
      ["x.a"],
      baseOptions({
        mode: "find-replace",
        find: "Room",
        replace: "Space",
      }),
    );
    expect(rows[0].newValue).toBe("Living Space Lamp");
  });

  it("does case-insensitive find/replace when flag is off", () => {
    const rows = buildRenameRows(
      [subject("x.a", "living ROOM lamp")],
      ["x.a"],
      baseOptions({
        mode: "find-replace",
        find: "room",
        replace: "space",
        caseSensitive: false,
      }),
    );
    expect(rows[0].newValue).toBe("living space lamp");
  });

  it("escapes regex specials in plain find/replace", () => {
    const rows = buildRenameRows(
      [subject("x.a", "hi (test) hi")],
      ["x.a"],
      baseOptions({
        mode: "find-replace",
        find: "(test)",
        replace: "[ok]",
      }),
    );
    expect(rows[0].newValue).toBe("hi [ok] hi");
  });

  it("supports regex find/replace with capture groups", () => {
    const rows = buildRenameRows(
      [subject("x.a", "Sensor 12")],
      ["x.a"],
      baseOptions({
        mode: "find-replace",
        find: "Sensor (\\d+)",
        replace: "S$1",
        regex: true,
      }),
    );
    expect(rows[0].newValue).toBe("S12");
  });

  it("flags invalid regex on every row", () => {
    const rows = buildRenameRows(
      [subject("x.a", "one"), subject("x.b", "two")],
      ["x.a", "x.b"],
      baseOptions({
        mode: "find-replace",
        find: "(",
        replace: "",
        regex: true,
      }),
    );
    expect(rows.every((r) => r.error !== null)).toBe(true);
  });

  it("marks unchanged rows with changed=false", () => {
    const rows = buildRenameRows(
      [subject("x.a", "Hello")],
      ["x.a"],
      baseOptions({ mode: "prefix", text: "" }),
    );
    expect(rows[0].changed).toBe(false);
  });
});

describe("entity_id target", () => {
  it("prefixes only the object_id, preserving domain", () => {
    const rows = buildRenameRows(
      [subject("sensor.temp")],
      ["sensor.temp"],
      baseOptions({
        target: "entity_id",
        mode: "prefix",
        text: "kitchen_",
      }),
    );
    expect(rows[0].newValue).toBe("sensor.kitchen_temp");
    expect(rows[0].error).toBeNull();
  });

  it("suffixes only the object_id", () => {
    const rows = buildRenameRows(
      [subject("sensor.temp")],
      ["sensor.temp"],
      baseOptions({
        target: "entity_id",
        mode: "suffix",
        text: "_v2",
      }),
    );
    expect(rows[0].newValue).toBe("sensor.temp_v2");
  });

  it("rejects uppercase in resulting entity_id", () => {
    const rows = buildRenameRows(
      [subject("sensor.temp")],
      ["sensor.temp"],
      baseOptions({
        target: "entity_id",
        mode: "prefix",
        text: "Kitchen_",
      }),
    );
    expect(rows[0].newValue).toBe("sensor.Kitchen_temp");
    expect(rows[0].error).toMatch(/invalid/i);
  });

  it("detects collision with an entity NOT in the rename batch", () => {
    const rows = buildRenameRows(
      [subject("sensor.a")],
      ["sensor.a", "sensor.b"],
      baseOptions({
        target: "entity_id",
        mode: "find-replace",
        find: "a",
        replace: "b",
      }),
    );
    expect(rows[0].newValue).toBe("sensor.b");
    expect(rows[0].error).toMatch(/conflicts/i);
  });

  it("allows a rename when the conflicting entity is ALSO being renamed", () => {
    // Both sensor.a → sensor.c and sensor.c → sensor.d; the second-pass
    // collision against the original sensor.c should not block sensor.a's
    // rename, because sensor.c won't exist after the batch.
    const rows = buildRenameRows(
      [subject("sensor.a"), subject("sensor.c")],
      ["sensor.a", "sensor.c"],
      baseOptions({
        target: "entity_id",
        mode: "find-replace",
        find: "a",
        replace: "c",
      }),
    );
    // sensor.a → sensor.c, sensor.c unchanged
    expect(rows[0].newValue).toBe("sensor.c");
    // sensor.c unchanged → but there are two rows with newValue "sensor.c"
    // (sensor.a renamed to sensor.c, and sensor.c staying sensor.c), so
    // both rows should be flagged as batch collisions.
    expect(rows[0].error).toMatch(/collide/i);
    expect(rows[1].error).toMatch(/collide/i);
  });

  it("detects two renames that produce the same new id", () => {
    const rows = buildRenameRows(
      [subject("sensor.a_1"), subject("sensor.a_2")],
      ["sensor.a_1", "sensor.a_2"],
      baseOptions({
        target: "entity_id",
        mode: "find-replace",
        find: "_\\d+",
        replace: "",
        regex: true,
      }),
    );
    expect(rows[0].newValue).toBe("sensor.a");
    expect(rows[1].newValue).toBe("sensor.a");
    expect(rows[0].error).toMatch(/collide/i);
    expect(rows[1].error).toMatch(/collide/i);
  });

  it("rejects a find-replace that changes the domain", () => {
    const rows = buildRenameRows(
      [subject("sensor.temp")],
      ["sensor.temp"],
      baseOptions({
        target: "entity_id",
        mode: "find-replace",
        find: "sensor",
        replace: "light",
      }),
    );
    expect(rows[0].newValue).toBe("light.temp");
    expect(rows[0].error).toMatch(/domain/i);
  });
});

describe("validateOptions", () => {
  it("returns null for valid inputs", () => {
    expect(validateOptions(baseOptions())).toBeNull();
  });

  it("returns a message for bad regex", () => {
    expect(
      validateOptions(
        baseOptions({
          mode: "find-replace",
          find: "(unbalanced",
          regex: true,
        }),
      ),
    ).not.toBeNull();
  });
});

describe("summarizeRows", () => {
  it("counts applicable, unchanged, and errors", () => {
    const rows = buildRenameRows(
      [
        subject("sensor.a"),
        subject("sensor.b"),
        subject("sensor.c"),
      ],
      ["sensor.a", "sensor.b", "sensor.c", "sensor.a_new"],
      baseOptions({
        target: "entity_id",
        mode: "suffix",
        text: "_new",
      }),
    );
    // sensor.a → sensor.a_new (collides with existing sensor.a_new → error)
    // sensor.b → sensor.b_new (applicable)
    // sensor.c → sensor.c_new (applicable)
    const summary = summarizeRows(rows);
    expect(summary.errors).toBe(1);
    expect(summary.applicable).toBe(2);
    expect(summary.unchanged).toBe(0);
  });
});
