import { describe, it, expect } from "vitest";
import { createLogger } from "../src/logger.js";

interface Capture {
  out: string[];
  err: string[];
}

function cap(): Capture & {
  outFn: (line: string) => void;
  errFn: (line: string) => void;
} {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    outFn: (line: string) => out.push(line),
    errFn: (line: string) => err.push(line),
  };
}

describe("createLogger — text format (default)", () => {
  it("writes [scope] msg to stdout for info", () => {
    const c = cap();
    const log = createLogger({ scope: "gw", out: c.outFn, err: c.errFn });
    log.info("hello");
    expect(c.out).toEqual(["[gw] hello"]);
    expect(c.err).toEqual([]);
  });

  it("renders fields as key=value, quoting only when needed", () => {
    const c = cap();
    const log = createLogger({ scope: "gw", out: c.outFn, err: c.errFn });
    log.info("ping", { id: "abc", count: 3, ok: true, note: "with space" });
    expect(c.out[0]).toBe(
      `[gw] ping id=abc count=3 ok=true note=${JSON.stringify("with space")}`,
    );
  });

  it("warn/error go to stderr with level tag", () => {
    const c = cap();
    const log = createLogger({ scope: "gw", out: c.outFn, err: c.errFn });
    log.warn("careful");
    log.error("boom", { code: 42 });
    expect(c.out).toEqual([]);
    expect(c.err).toEqual([
      "[gw] WARN careful",
      "[gw] ERROR boom code=42",
    ]);
  });

  it("filters by level — debug below info is dropped", () => {
    const c = cap();
    const log = createLogger({
      scope: "gw",
      level: "info",
      out: c.outFn,
      err: c.errFn,
    });
    log.debug("verbose");
    log.info("kept");
    expect(c.out).toEqual(["[gw] kept"]);
  });

  it("level=debug includes everything", () => {
    const c = cap();
    const log = createLogger({
      scope: "gw",
      level: "debug",
      out: c.outFn,
      err: c.errFn,
    });
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");
    expect(c.out).toEqual(["[gw] d", "[gw] i"]);
    expect(c.err).toEqual(["[gw] WARN w", "[gw] ERROR e"]);
  });
});

describe("createLogger — JSON format", () => {
  it("emits one JSON object per line with fixed top-level keys", () => {
    const c = cap();
    const log = createLogger({
      scope: "gw",
      format: "json",
      out: c.outFn,
      err: c.errFn,
      now: () => "2026-04-30T12:34:56.000Z",
    });
    log.info("ping", { id: "abc", count: 3 });
    const parsed = JSON.parse(c.out[0]!);
    expect(parsed).toEqual({
      ts: "2026-04-30T12:34:56.000Z",
      level: "info",
      scope: "gw",
      msg: "ping",
      id: "abc",
      count: 3,
    });
  });

  it("does not let user fields clobber reserved keys", () => {
    const c = cap();
    const log = createLogger({
      scope: "gw",
      format: "json",
      out: c.outFn,
      err: c.errFn,
      now: () => "2026-04-30T12:34:56.000Z",
    });
    log.info("ping", {
      ts: "FAKE",
      level: "FAKE",
      scope: "FAKE",
      msg: "FAKE",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const parsed = JSON.parse(c.out[0]!);
    expect(parsed.scope).toBe("gw");
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("ping");
  });
});

describe("createLogger — child", () => {
  it("inherits format and level but uses a sub-scope", () => {
    const c = cap();
    const root = createLogger({
      scope: "gw",
      level: "warn",
      out: c.outFn,
      err: c.errFn,
    });
    const child = root.child("hds-brain");
    child.info("dropped"); // info < warn → dropped
    child.warn("kept");
    expect(c.err).toEqual(["[hds-brain] WARN kept"]);
  });
});

describe("createLogger — env-driven defaults", () => {
  it("respects BLUE_TANUKI_LOG_LEVEL", () => {
    const prevLvl = process.env.BLUE_TANUKI_LOG_LEVEL;
    const prevFmt = process.env.BLUE_TANUKI_LOG_FORMAT;
    try {
      process.env.BLUE_TANUKI_LOG_LEVEL = "warn";
      delete process.env.BLUE_TANUKI_LOG_FORMAT;
      const c = cap();
      const log = createLogger({ scope: "gw", out: c.outFn, err: c.errFn });
      log.info("dropped");
      log.warn("kept");
      expect(c.out).toEqual([]);
      expect(c.err).toEqual(["[gw] WARN kept"]);
    } finally {
      if (prevLvl === undefined) delete process.env.BLUE_TANUKI_LOG_LEVEL;
      else process.env.BLUE_TANUKI_LOG_LEVEL = prevLvl;
      if (prevFmt === undefined) delete process.env.BLUE_TANUKI_LOG_FORMAT;
      else process.env.BLUE_TANUKI_LOG_FORMAT = prevFmt;
    }
  });

  it("respects BLUE_TANUKI_LOG_FORMAT=json", () => {
    const prev = process.env.BLUE_TANUKI_LOG_FORMAT;
    try {
      process.env.BLUE_TANUKI_LOG_FORMAT = "json";
      const c = cap();
      const log = createLogger({
        scope: "gw",
        out: c.outFn,
        err: c.errFn,
        now: () => "2026-04-30T00:00:00.000Z",
      });
      log.info("hi");
      const parsed = JSON.parse(c.out[0]!);
      expect(parsed.msg).toBe("hi");
      expect(parsed.scope).toBe("gw");
    } finally {
      if (prev === undefined) delete process.env.BLUE_TANUKI_LOG_FORMAT;
      else process.env.BLUE_TANUKI_LOG_FORMAT = prev;
    }
  });

  it("falls back to defaults on malformed env", () => {
    const prevLvl = process.env.BLUE_TANUKI_LOG_LEVEL;
    const prevFmt = process.env.BLUE_TANUKI_LOG_FORMAT;
    try {
      process.env.BLUE_TANUKI_LOG_LEVEL = "trace"; // unknown
      process.env.BLUE_TANUKI_LOG_FORMAT = "yaml"; // unknown
      const c = cap();
      const log = createLogger({ scope: "gw", out: c.outFn, err: c.errFn });
      log.info("hello");
      expect(c.out).toEqual(["[gw] hello"]); // text + info shown
    } finally {
      if (prevLvl === undefined) delete process.env.BLUE_TANUKI_LOG_LEVEL;
      else process.env.BLUE_TANUKI_LOG_LEVEL = prevLvl;
      if (prevFmt === undefined) delete process.env.BLUE_TANUKI_LOG_FORMAT;
      else process.env.BLUE_TANUKI_LOG_FORMAT = prevFmt;
    }
  });
});
