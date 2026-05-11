import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  invokeFileSearch,
  invokeFileWrite,
  invokeFileEdit,
  invokeHttpFetch,
  invokeWebSearch,
  invokeGitHubRead,
  registerBuiltinTools,
  type FileSearchOptions,
  type GitHubReadOptions,
  type HttpFetchOptions,
} from "../src/tools/builtin.js";
import { ToolRegistry } from "../src/tools/registry.js";

const ctx = {
  command_id: "cmd-1",
  upstream_commit_hash: "hash-1",
};

describe("built-in tools", () => {
  it("registerBuiltinTools registers tools and their capabilities", () => {
    const registry = new ToolRegistry();
    registerBuiltinTools(registry);

    expect(registry.get("echo")).toBeDefined();
    expect(registry.get("file.search")).toBeDefined();
    expect(registry.get("file.write")).toBeDefined();
    expect(registry.get("file.edit")).toBeDefined();
    expect(registry.get("http.fetch")).toBeDefined();
    expect(registry.get("web.search")).toBeDefined();
    expect(registry.get("github.read")).toBeDefined();
    expect(registry.listCapabilities()).toEqual([
      "fs:read",
      "fs:write",
      "network:github.com",
      "network:http",
      "tool:echo",
      "tool:file.edit",
      "tool:file.search",
      "tool:file.write",
      "tool:github.read",
      "tool:http.fetch",
      "tool:web.search",
    ]);
  });

  it("file.search returns bounded read-only text matches", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    try {
      await fs.writeFile(path.join(dir, "a.txt"), "alpha\nneedle here\n", "utf8");
      await fs.mkdir(path.join(dir, "sub"));
      await fs.writeFile(path.join(dir, "sub", "b.txt"), "needle again\n", "utf8");

      const result = (await invokeFileSearch(
        { root: ".", query: "needle", max_results: 1 },
        fileSearchEnv(dir),
      )) as {
        root: string;
        sandbox_root: string;
        matches: Array<{ path: string; line_number: number; line: string }>;
      };

      expect(result.root).toBe(await fs.realpath(dir));
      expect(result.sandbox_root).toBe(await fs.realpath(dir));
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]!.line).toContain("needle");
      expect(result.matches[0]!.line_number).toBeGreaterThan(0);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("file.search requires BLUE_TANUKI_FILE_ROOT", async () => {
    await expect(
      invokeFileSearch({ root: ".", query: "needle" }, { env: {} }),
    ).rejects.toThrow(/BLUE_TANUKI_FILE_ROOT/);
  });

  it("file.search denies roots outside the sandbox", async () => {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    const sandbox = path.join(parent, "sandbox");
    const outside = path.join(parent, "outside");
    try {
      await fs.mkdir(sandbox);
      await fs.mkdir(outside);
      await fs.writeFile(path.join(outside, "a.txt"), "needle outside\n", "utf8");

      await expect(
        invokeFileSearch(
          { root: outside, query: "needle" },
          fileSearchEnv(sandbox),
        ),
      ).rejects.toThrow(/BLUE_TANUKI_FILE_ROOT/);
    } finally {
      await fs.rm(parent, { recursive: true, force: true });
    }
  });

  it("file.search denies symlink escape from the sandbox", async () => {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    const sandbox = path.join(parent, "sandbox");
    const outside = path.join(parent, "outside");
    const link = path.join(sandbox, "link-out");
    try {
      await fs.mkdir(sandbox);
      await fs.mkdir(outside);
      await fs.writeFile(path.join(outside, "secret.txt"), "needle outside\n", "utf8");
      await fs.symlink(outside, link, "junction");

      await expect(
        invokeFileSearch(
          { root: "link-out", query: "needle" },
          fileSearchEnv(sandbox),
        ),
      ).rejects.toThrow(/symlink/);
    } finally {
      await fs.rm(parent, { recursive: true, force: true });
    }
  });

  it("file.search denies secret-like requested roots and skips secret-like files", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    try {
      await fs.writeFile(path.join(dir, ".env"), "TOKEN=needle\n", "utf8");
      await fs.writeFile(path.join(dir, "id_rsa"), "needle private key\n", "utf8");
      await fs.writeFile(path.join(dir, "safe.txt"), "needle safe\n", "utf8");

      await expect(
        invokeFileSearch({ root: ".env", query: "needle" }, fileSearchEnv(dir)),
      ).rejects.toThrow(/secret-like path/);

      const result = (await invokeFileSearch(
        { root: ".", query: "needle", max_results: 10 },
        fileSearchEnv(dir),
      )) as {
        matches: Array<{ path: string; line: string }>;
      };

      expect(result.matches).toEqual([
        expect.objectContaining({ path: "safe.txt", line: "needle safe" }),
      ]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("file.write creates, appends, and overwrites only inside the sandbox", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    try {
      await fs.mkdir(path.join(dir, "notes"));
      const created = await invokeFileWrite(
        { path: "notes/a.txt", content: "alpha\n" },
        fileSearchEnv(dir),
      );
      expect(created).toMatchObject({
        path: "notes/a.txt",
        mode: "create",
        bytes_written: 6,
      });
      await invokeFileWrite(
        { path: "notes/a.txt", content: "beta\n", mode: "append" },
        fileSearchEnv(dir),
      );
      expect(await fs.readFile(path.join(dir, "notes", "a.txt"), "utf8")).toBe(
        "alpha\nbeta\n",
      );
      await invokeFileWrite(
        { path: "notes/a.txt", content: "gamma\n", mode: "overwrite" },
        fileSearchEnv(dir),
      );
      expect(await fs.readFile(path.join(dir, "notes", "a.txt"), "utf8")).toBe(
        "gamma\n",
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("file.write fails closed for accidental overwrite, sandbox escape, and secret-like paths", async () => {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    const sandbox = path.join(parent, "sandbox");
    const outside = path.join(parent, "outside.txt");
    try {
      await fs.mkdir(sandbox);
      await fs.writeFile(path.join(sandbox, "a.txt"), "old", "utf8");
      await expect(
        invokeFileWrite({ path: "a.txt", content: "new" }, fileSearchEnv(sandbox)),
      ).rejects.toThrow(/exist|EEXIST/);
      await expect(
        invokeFileWrite({ path: outside, content: "x" }, fileSearchEnv(sandbox)),
      ).rejects.toThrow(/BLUE_TANUKI_FILE_ROOT/);
      await expect(
        invokeFileWrite({ path: ".env", content: "TOKEN=x" }, fileSearchEnv(sandbox)),
      ).rejects.toThrow(/secret-like path/);
    } finally {
      await fs.rm(parent, { recursive: true, force: true });
    }
  });

  it("file.write denies symlink targets", async () => {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    const sandbox = path.join(parent, "sandbox");
    const outside = path.join(parent, "outside");
    const link = path.join(sandbox, "link-out");
    try {
      await fs.mkdir(sandbox);
      await fs.mkdir(outside);
      await fs.symlink(outside, link, "junction");
      await expect(
        invokeFileWrite(
          { path: "link-out/a.txt", content: "new", mode: "overwrite" },
          fileSearchEnv(sandbox),
        ),
      ).rejects.toThrow(/symlink/);
    } finally {
      await fs.rm(parent, { recursive: true, force: true });
    }
  });

  it("file.edit performs exact replacements with an expected count", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    try {
      await fs.writeFile(path.join(dir, "a.txt"), "one fish\none bird\n", "utf8");
      const edited = await invokeFileEdit(
        {
          path: "a.txt",
          search: "one",
          replace: "blue",
          expected_replacements: 2,
        },
        fileSearchEnv(dir),
      );
      expect(edited).toMatchObject({
        path: "a.txt",
        replacements: 2,
      });
      expect(await fs.readFile(path.join(dir, "a.txt"), "utf8")).toBe(
        "blue fish\nblue bird\n",
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("file.edit refuses replacement-count mismatch and binary-looking files", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-tool-"));
    try {
      await fs.writeFile(path.join(dir, "a.txt"), "one one\n", "utf8");
      await expect(
        invokeFileEdit(
          { path: "a.txt", search: "one", replace: "two" },
          fileSearchEnv(dir),
        ),
      ).rejects.toThrow(/expected 1 replacement/);

      await fs.writeFile(path.join(dir, "b.bin"), Buffer.from([0, 1, 2]));
      await expect(
        invokeFileEdit(
          { path: "b.bin", search: "x", replace: "y" },
          fileSearchEnv(dir),
        ),
      ).rejects.toThrow(/binary/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("http.fetch is GET/HEAD only and returns a bounded response", async () => {
    const opts = fakeHttp({
      "example.test": { address: "93.184.216.34", family: 4 },
    }, async () => ({
      status: 200,
      ok: true,
      content_type: "text/plain",
      location: null,
      body: "hello",
      truncated: true,
    }));

    const result = (await invokeHttpFetch(
      { url: "https://example.test", max_bytes: 5 },
      opts,
    )) as { status: number; body: string; truncated: boolean };

    expect(result).toMatchObject({
      status: 200,
      body: "hello",
      truncated: true,
    });

    await expect(
      invokeHttpFetch({ url: "https://example.test", method: "POST" }, opts),
    ).rejects.toThrow(/GET or HEAD/);
  });

  it.each([
    ["loopback", "loopback.test", "127.0.0.1"],
    ["private", "private.test", "10.12.0.4"],
    ["metadata", "metadata.test", "169.254.169.254"],
    ["link-local", "linklocal.test", "169.254.10.20"],
  ])("http.fetch denies %s DNS targets", async (_name, host, address) => {
    await expect(
      invokeHttpFetch(
        { url: `http://${host}/secret` },
        fakeHttp({ [host]: { address, family: 4 } }),
      ),
    ).rejects.toThrow(/non-public address/);
  });

  it("http.fetch denies private IPv6 DNS targets", async () => {
    await expect(
      invokeHttpFetch(
        { url: "https://ipv6-private.test/" },
        fakeHttp({
          "ipv6-private.test": { address: "fc00::1", family: 6 },
        }),
      ),
    ).rejects.toThrow(/non-public address/);
  });

  it("http.fetch denies IPv4-mapped IPv6 targets", async () => {
    await expect(
      invokeHttpFetch(
        { url: "https://mapped-loopback.test/" },
        fakeHttp({
          "mapped-loopback.test": { address: "::ffff:7f00:1", family: 6 },
        }),
      ),
    ).rejects.toThrow(/non-public address/);
  });

  it("http.fetch validates every redirect target", async () => {
    const opts = fakeHttp(
      {
        "public.test": { address: "93.184.216.34", family: 4 },
        "metadata.test": { address: "169.254.169.254", family: 4 },
      },
      async (target) => ({
        status: target.hostname === "public.test" ? 302 : 200,
        ok: false,
        content_type: "text/plain",
        location: target.hostname === "public.test"
          ? "http://metadata.test/latest/meta-data"
          : null,
        body: "",
        truncated: false,
      }),
    );

    await expect(
      invokeHttpFetch({ url: "http://public.test/start" }, opts),
    ).rejects.toThrow(/non-public address/);
  });

  it("http.fetch caps redirect chains at three hops", async () => {
    const opts = fakeHttp(
      {
        "a.test": { address: "93.184.216.34", family: 4 },
        "b.test": { address: "93.184.216.35", family: 4 },
        "c.test": { address: "93.184.216.36", family: 4 },
        "d.test": { address: "93.184.216.37", family: 4 },
      },
      async (target) => ({
        status: 302,
        ok: false,
        content_type: null,
        location: `http://${nextRedirectHost(target.hostname)}/`,
        body: "",
        truncated: false,
      }),
    );

    await expect(
      invokeHttpFetch({ url: "http://a.test/start" }, opts),
    ).rejects.toThrow(/redirect limit/);
  });

  it("http.fetch supports optional domain allowlist mode", async () => {
    const opts = fakeHttp({
      "api.example.com": { address: "93.184.216.34", family: 4 },
      "outside.test": { address: "93.184.216.35", family: 4 },
    }, async () => ({
      status: 200,
      ok: true,
      content_type: "text/plain",
      location: null,
      body: "ok",
      truncated: false,
    }));

    await expect(
      invokeHttpFetch(
        { url: "https://api.example.com/" },
        { ...opts, env: { BLUE_TANUKI_HTTP_ALLOWLIST: "example.com" } },
      ),
    ).resolves.toMatchObject({ status: 200, body: "ok" });

    await expect(
      invokeHttpFetch(
        { url: "https://outside.test/" },
        { ...opts, env: { BLUE_TANUKI_HTTP_ALLOWLIST: "example.com" } },
      ),
    ).rejects.toThrow(/BLUE_TANUKI_HTTP_ALLOWLIST/);
  });

  it("web.search uses a configured provider endpoint and parses JSON results", async () => {
    const seen: string[] = [];
    const opts = fakeHttp(
      {
        "search.example.com": { address: "93.184.216.34", family: 4 },
      },
      async (target) => {
        seen.push(target.url.href);
        return {
          status: 200,
          ok: true,
          content_type: "application/json",
          location: null,
          body: JSON.stringify({
            results: [
              {
                title: "Alpha",
                url: "https://example.com/a",
                snippet: "first",
              },
              {
                name: "Beta",
                link: "https://example.com/b",
                description: "second",
              },
            ],
          }),
          truncated: false,
        };
      },
    );

    const result = (await invokeWebSearch(
      { query: "blue tanuki", max_results: 2 },
      {
        ...opts,
        env: {
          BLUE_TANUKI_WEB_SEARCH_ENDPOINT:
            "https://search.example.com/search?q={query}&count={max_results}",
        },
      },
    )) as {
      query: string;
      endpoint: string;
      results: Array<{ title: string; url: string; snippet: string }>;
    };

    expect(seen).toEqual([
      "https://search.example.com/search?q=blue%20tanuki&count=2",
    ]);
    expect(result.query).toBe("blue tanuki");
    expect(result.endpoint).toBe(seen[0]);
    expect(result.results).toEqual([
      { title: "Alpha", url: "https://example.com/a", snippet: "first" },
      { title: "Beta", url: "https://example.com/b", snippet: "second" },
    ]);
  });

  it("web.search fails closed when no provider endpoint is configured", async () => {
    await expect(
      invokeWebSearch(
        { query: "blue tanuki" },
        fakeHttp({ "search.example.com": { address: "93.184.216.34", family: 4 } }),
      ),
    ).rejects.toThrow(/BLUE_TANUKI_WEB_SEARCH_ENDPOINT/);
  });

  it("web.search inherits http.fetch SSRF and allowlist enforcement", async () => {
    await expect(
      invokeWebSearch(
        { query: "metadata" },
        {
          ...fakeHttp({
            "metadata.test": { address: "169.254.169.254", family: 4 },
          }),
          env: {
            BLUE_TANUKI_WEB_SEARCH_ENDPOINT:
              "http://metadata.test/search?q={query}",
          },
        },
      ),
    ).rejects.toThrow(/non-public address/);

    await expect(
      invokeWebSearch(
        { query: "outside" },
        {
          ...fakeHttp({
            "outside.test": { address: "93.184.216.34", family: 4 },
          }),
          env: {
            BLUE_TANUKI_WEB_SEARCH_ENDPOINT:
              "https://outside.test/search?q={query}",
            BLUE_TANUKI_HTTP_ALLOWLIST: "example.com",
          },
        },
      ),
    ).rejects.toThrow(/BLUE_TANUKI_HTTP_ALLOWLIST/);
  });

  it("github.read reads public repo metadata from fixed GitHub API paths", async () => {
    const seen: Array<{ path: string; maxBytes: number }> = [];
    const result = (await invokeGitHubRead(
      {
        resource: "issues",
        owner: "gatchimuchio",
        repo: "blue-tanuki",
        state: "closed",
        max_results: 2,
        max_bytes: 4096,
      },
      fakeGitHub(async (target) => {
        seen.push(target);
        return {
          status: 200,
          ok: true,
          content_type: "application/json",
          body: JSON.stringify([{ number: 1, title: "done" }]),
          truncated: false,
          rate_limit_remaining: "59",
        };
      }),
    )) as {
      resource: string;
      api_host: string;
      path: string;
      status: number;
      rate_limit_remaining: string;
      data: Array<{ number: number; title: string }>;
    };

    expect(seen).toEqual([
      {
        path: "/repos/gatchimuchio/blue-tanuki/issues?state=closed&per_page=2",
        maxBytes: 4096,
      },
    ]);
    expect(result).toMatchObject({
      resource: "issues",
      api_host: "api.github.com",
      path: "/repos/gatchimuchio/blue-tanuki/issues?state=closed&per_page=2",
      status: 200,
      rate_limit_remaining: "59",
      data: [{ number: 1, title: "done" }],
    });
  });

  it("github.read fails closed for invalid resources and path components", async () => {
    await expect(
      invokeGitHubRead(
        { resource: "release", owner: "gatchimuchio", repo: "blue-tanuki" },
        fakeGitHub(),
      ),
    ).rejects.toThrow(/resource/);

    await expect(
      invokeGitHubRead(
        { resource: "repo", owner: "gatchimuchio/escape", repo: "blue-tanuki" },
        fakeGitHub(),
      ),
    ).rejects.toThrow(/owner/);

    await expect(
      invokeGitHubRead(
        { resource: "pr", owner: "gatchimuchio", repo: "blue-tanuki" },
        fakeGitHub(),
      ),
    ).rejects.toThrow(/number/);
  });
});

function fakeHttp(
  records: Record<string, { address: string; family: 4 | 6 }>,
  request: HttpFetchOptions["request"] = async () => ({
    status: 200,
    ok: true,
    content_type: "text/plain",
    location: null,
    body: "ok",
    truncated: false,
  }),
): HttpFetchOptions {
  return {
    env: {},
    async resolveHost(hostname) {
      const record = records[hostname];
      if (!record) return [];
      return [record];
    },
    request,
  };
}

function fileSearchEnv(root: string): FileSearchOptions {
  return {
    env: {
      BLUE_TANUKI_FILE_ROOT: root,
    },
  };
}

function fakeGitHub(
  request: NonNullable<GitHubReadOptions["request"]> = async () => ({
    status: 200,
    ok: true,
    content_type: "application/json",
    body: "{}",
    truncated: false,
    rate_limit_remaining: "60",
  }),
): GitHubReadOptions {
  return { request };
}

function nextRedirectHost(hostname: string): string {
  const next: Record<string, string> = {
    "a.test": "b.test",
    "b.test": "c.test",
    "c.test": "d.test",
    "d.test": "a.test",
  };
  return next[hostname] ?? "a.test";
}
