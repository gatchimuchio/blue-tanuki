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
  invokeGitHubWrite,
  invokeBrowserRead,
  invokeShellExec,
  registerBuiltinTools,
  type FileSearchOptions,
  type GitHubReadOptions,
  type GitHubWriteOptions,
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
    expect(registry.get("github.write")).toBeDefined();
    expect(registry.get("browser.read")).toBeDefined();
    expect(registry.get("shell.exec")).toBeDefined();
    expect(registry.listCapabilities()).toEqual([
      "fs:read",
      "fs:write",
      "github:comment.write",
      "github:issue.write",
      "github:pr.write",
      "network:github.com",
      "network:http",
      "secrets:GITHUB_TOKEN",
      "shell:exec",
      "tool:browser.read",
      "tool:echo",
      "tool:file.edit",
      "tool:file.search",
      "tool:file.write",
      "tool:github.read",
      "tool:github.write",
      "tool:http.fetch",
      "tool:shell.exec",
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

  it("github.write creates an issue only with token and allowlisted repo", async () => {
    const seen: Array<{
      method: string;
      path: string;
      body: Record<string, unknown>;
      maxBytes: number;
      token: string;
    }> = [];
    const result = (await invokeGitHubWrite(
      {
        operation: "issue.create",
        owner: "gatchimuchio",
        repo: "blue-tanuki",
        title: "Phase smoke",
        body: "created by test",
        max_bytes: 4096,
      },
      fakeGitHubWrite(async (target) => {
        seen.push(target);
        return {
          status: 201,
          ok: true,
          content_type: "application/json",
          body: JSON.stringify({
            id: 123,
            number: 7,
            title: "Phase smoke",
            html_url: "https://github.com/gatchimuchio/blue-tanuki/issues/7",
          }),
          truncated: false,
          rate_limit_remaining: "58",
          request_id: "ABC123",
        };
      }),
    )) as {
      operation: string;
      api_host: string;
      repo: string;
      method: string;
      path: string;
      status: number;
      github_request_id: string;
      result_digest: string;
      result: { number: number; title: string; html_url: string };
    };

    expect(seen).toEqual([
      {
        method: "POST",
        path: "/repos/gatchimuchio/blue-tanuki/issues",
        body: { title: "Phase smoke", body: "created by test" },
        maxBytes: 4096,
        token: "ghp_dummy",
      },
    ]);
    expect(result).toMatchObject({
      operation: "issue.create",
      api_host: "api.github.com",
      repo: "gatchimuchio/blue-tanuki",
      method: "POST",
      path: "/repos/gatchimuchio/blue-tanuki/issues",
      status: 201,
      github_request_id: "ABC123",
      result: {
        number: 7,
        title: "Phase smoke",
        html_url: "https://github.com/gatchimuchio/blue-tanuki/issues/7",
      },
    });
    expect(result.result_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toContain("ghp_dummy");
  });

  it("github.write supports PR creation and comment/update paths", async () => {
    const seen: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
    const opts = fakeGitHubWrite(async (target) => {
      seen.push({ method: target.method, path: target.path, body: target.body });
      return {
        status: target.method === "PATCH" ? 200 : 201,
        ok: true,
        content_type: "application/json",
        body: JSON.stringify({ number: 42, html_url: "https://github.test/42" }),
        truncated: false,
        rate_limit_remaining: "57",
        request_id: "REQ",
      };
    });

    await invokeGitHubWrite(
      {
        operation: "pr.create",
        owner: "gatchimuchio",
        repo: "blue-tanuki",
        title: "Add feature",
        head: "feature",
        base: "main",
        draft: "true",
      },
      opts,
    );
    await invokeGitHubWrite(
      {
        operation: "pr.comment.create",
        owner: "gatchimuchio",
        repo: "blue-tanuki",
        number: 42,
        body: "review note",
      },
      opts,
    );
    await invokeGitHubWrite(
      {
        operation: "issue.update",
        owner: "gatchimuchio",
        repo: "blue-tanuki",
        number: 7,
        title: "Updated issue",
      },
      opts,
    );

    expect(seen).toEqual([
      {
        method: "POST",
        path: "/repos/gatchimuchio/blue-tanuki/pulls",
        body: { title: "Add feature", head: "feature", base: "main", draft: true },
      },
      {
        method: "POST",
        path: "/repos/gatchimuchio/blue-tanuki/issues/42/comments",
        body: { body: "review note" },
      },
      {
        method: "PATCH",
        path: "/repos/gatchimuchio/blue-tanuki/issues/7",
        body: { title: "Updated issue" },
      },
    ]);
  });

  it("github.write fails closed before network request when token or repo allowlist is missing", async () => {
    let called = false;
    const opts = fakeGitHubWrite(async () => {
      called = true;
      throw new Error("should not call network");
    }, {});

    await expect(
      invokeGitHubWrite(
        {
          operation: "issue.create",
          owner: "gatchimuchio",
          repo: "blue-tanuki",
          title: "blocked",
        },
        opts,
      ),
    ).rejects.toThrow(/BLUE_TANUKI_GITHUB_REPOS.*mutation_sent=false/);

    await expect(
      invokeGitHubWrite(
        {
          operation: "issue.create",
          owner: "gatchimuchio",
          repo: "blue-tanuki",
          title: "blocked",
        },
        fakeGitHubWrite(async () => {
          called = true;
          throw new Error("should not call network");
        }, { GITHUB_TOKEN: "ghp_dummy", BLUE_TANUKI_GITHUB_REPOS: "other/repo" }),
      ),
    ).rejects.toThrow(/denied repository.*mutation_sent=false/);

    await expect(
      invokeGitHubWrite(
        {
          operation: "issue.create",
          owner: "gatchimuchio",
          repo: "blue-tanuki",
          title: "blocked",
        },
        fakeGitHubWrite(async () => {
          called = true;
          throw new Error("should not call network");
        }, { BLUE_TANUKI_GITHUB_REPOS: "gatchimuchio/blue-tanuki" }),
      ),
    ).rejects.toThrow(/GITHUB_TOKEN.*mutation_sent=false/);

    expect(called).toBe(false);
  });

  it("github.write reports safe retry state on GitHub API errors", async () => {
    await expect(
      invokeGitHubWrite(
        {
          operation: "issue.create",
          owner: "gatchimuchio",
          repo: "blue-tanuki",
          title: "bad",
        },
        fakeGitHubWrite(async () => ({
          status: 422,
          ok: false,
          content_type: "application/json",
          body: JSON.stringify({ message: "Validation Failed" }),
          truncated: false,
          rate_limit_remaining: "56",
          request_id: "ERR",
        })),
      ),
    ).rejects.toThrow(/mutation_status=not_confirmed.*check GitHub\/audit/);
  });

  it("browser.read extracts bounded readable text and links through http.fetch", async () => {
    const seen: string[] = [];
    const result = (await invokeBrowserRead(
      { url: "https://example.test/docs", max_chars: 80, max_bytes: 4096 },
      fakeHttp(
        {
          "example.test": { address: "93.184.216.34", family: 4 },
        },
        async (target) => {
          seen.push(target.url.href);
          return {
            status: 200,
            ok: true,
            content_type: "text/html; charset=utf-8",
            location: null,
            body:
              "<html><head><title>Alpha &amp; Beta</title><style>.x{}</style></head>" +
              "<body><script>ignore()</script><h1>Hello</h1><p>Readable text</p>" +
              "<a href=\"/next\">Next</a><a href=\"javascript:bad()\">Bad</a></body></html>",
            truncated: false,
          };
        },
      ),
    )) as {
      url: string;
      title: string;
      text: string;
      links: string[];
    };

    expect(seen).toEqual(["https://example.test/docs"]);
    expect(result.title).toBe("Alpha & Beta");
    expect(result.text).toContain("Hello Readable text");
    expect(result.text).not.toContain("ignore");
    expect(result.links).toEqual(["https://example.test/next"]);
  });

  it("browser.read inherits http.fetch SSRF enforcement", async () => {
    await expect(
      invokeBrowserRead(
        { url: "http://metadata.test/" },
        fakeHttp({
          "metadata.test": { address: "169.254.169.254", family: 4 },
        }),
      ),
    ).rejects.toThrow(/non-public address/);
  });

  it("shell.exec runs a bounded non-shell command under BLUE_TANUKI_SHELL_ROOT", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-shell-"));
    try {
      const result = (await invokeShellExec(
        {
          cmd: process.execPath,
          args: ["-e", "console.log(process.cwd()); console.error('warn')"],
          cwd: ".",
          timeout_ms: 10_000,
          max_bytes: 4096,
        },
        { env: { BLUE_TANUKI_SHELL_ROOT: dir } },
      )) as {
        cwd: string;
        exit_code: number;
        stdout: string;
        stderr: string;
        timed_out: boolean;
      };

      expect(result.cwd).toBe(".");
      expect(result.exit_code).toBe(0);
      expect(result.stdout.replace(/\\/g, "/")).toContain(dir.replace(/\\/g, "/"));
      expect(result.stderr).toContain("warn");
      expect(result.timed_out).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("shell.exec fails closed without a shell root or when cwd escapes", async () => {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-shell-"));
    const root = path.join(parent, "root");
    const outside = path.join(parent, "outside");
    try {
      await fs.mkdir(root);
      await fs.mkdir(outside);
      await expect(
        invokeShellExec({ cmd: process.execPath, args: ["-v"] }, { env: {} }),
      ).rejects.toThrow(/BLUE_TANUKI_SHELL_ROOT/);
      await expect(
        invokeShellExec(
          { cmd: process.execPath, args: ["-v"], cwd: outside },
          { env: { BLUE_TANUKI_SHELL_ROOT: root } },
        ),
      ).rejects.toThrow(/cwd/);
    } finally {
      await fs.rm(parent, { recursive: true, force: true });
    }
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

function fakeGitHubWrite(
  request: NonNullable<GitHubWriteOptions["request"]> = async () => ({
    status: 201,
    ok: true,
    content_type: "application/json",
    body: "{}",
    truncated: false,
    rate_limit_remaining: "60",
    request_id: "REQ",
  }),
  env: Record<string, string | undefined> = {
    GITHUB_TOKEN: "ghp_dummy",
    BLUE_TANUKI_GITHUB_REPOS: "gatchimuchio/blue-tanuki",
  },
): GitHubWriteOptions {
  return { request, env };
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
