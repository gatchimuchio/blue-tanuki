import { describe, it, expect } from "vitest";
import { MemoryTicketStore } from "../src/index.js";

describe("MemoryTicketStore", () => {
  it("rejects invalid construction", () => {
    expect(() => new MemoryTicketStore({ cap: 0 })).toThrow();
  });

  it("issues unique base64url tickets bound to a user", async () => {
    const s = new MemoryTicketStore();
    const a = await s.issue("alice", 30_000);
    const b = await s.issue("alice", 30_000);
    expect(a.ticket).not.toBe(b.ticket);
    expect(a.ticket).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.ticket.length).toBeGreaterThanOrEqual(40);
    expect(a.expires_at_ms).toBeGreaterThan(Date.now());
  });

  it("rejects non-positive ttl_ms", async () => {
    const s = new MemoryTicketStore();
    await expect(s.issue("alice", 0)).rejects.toThrow();
    await expect(s.issue("alice", -1)).rejects.toThrow();
  });

  it("consume returns user once, then null (single-use)", async () => {
    const s = new MemoryTicketStore();
    const { ticket } = await s.issue("alice", 30_000);
    expect(await s.consume(ticket)).toBe("alice");
    expect(await s.consume(ticket)).toBeNull();
  });

  it("expired tickets return null", async () => {
    let t = 1_000_000;
    const s = new MemoryTicketStore({ now: () => t });
    const { ticket } = await s.issue("alice", 100);
    t += 200;
    expect(await s.consume(ticket)).toBeNull();
  });

  it("respects cap by dropping oldest", async () => {
    const s = new MemoryTicketStore({ cap: 2 });
    const a = await s.issue("u1", 30_000);
    const b = await s.issue("u2", 30_000);
    const c = await s.issue("u3", 30_000);
    // a should have been evicted to make room for c
    expect(await s.consume(a.ticket)).toBeNull();
    expect(await s.consume(b.ticket)).toBe("u2");
    expect(await s.consume(c.ticket)).toBe("u3");
  });

  it("size reflects live entries and gc on access", async () => {
    let t = 1_000_000;
    const s = new MemoryTicketStore({ now: () => t });
    await s.issue("u1", 100);
    await s.issue("u2", 5_000);
    expect(await s.size()).toBe(2);
    t += 200;
    expect(await s.size()).toBe(1);
  });
});
