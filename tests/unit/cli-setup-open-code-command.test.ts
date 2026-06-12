import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-cli-setup-"));
}

/**
 * Run the command inside a sandbox with a fake HOME so opencode.json
 * writes to the temp dir. We DON'T mock XDG_CONFIG_HOME by default so
 * `resolveOpenCodeDirs()` falls back to `~/.config/opencode`.
 */
async function withSandbox(fn: (sandbox: string, homeDir: string) => Promise<void>) {
  const sandbox = createTempDir();
  // Create a fake HOME so opencode.json goes to sandbox/.config/opencode/
  const fakeHome = path.join(sandbox, "fake-home");
  fs.mkdirSync(fakeHome, { recursive: true });
  const oldHome = process.env.HOME;
  process.env.HOME = fakeHome;
  // Ensure XDG_CONFIG_HOME is not set so resolveOpenCodeDirs uses HOME
  delete process.env.XDG_CONFIG_HOME;

  try {
    await fn(sandbox, fakeHome);
  } finally {
    process.env.HOME = oldHome;
    if (ORIGINAL_XDG_CONFIG_HOME === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = ORIGINAL_XDG_CONFIG_HOME;
    }
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

test("setup opencode: resolves plugin path from repo", async () => {
  await withSandbox(async (sandbox, fakeHome) => {
    const { runSetupOpenCodeCommand } = await import("../../bin/cli/commands/setup-open-code.mjs");
    const result = await runSetupOpenCodeCommand({
      providerId: "omniroute-test",
      baseURL: "http://localhost:20128",
      nonInteractive: true,
    });
    assert.equal(result.exitCode, 0, "exit code must be 0");
    assert.ok(result.configPath, "configPath returned");
    assert.ok(result.pluginTargetDir, "pluginTargetDir returned");

    // Verify opencode.json was created
    const cfg = JSON.parse(fs.readFileSync(result.configPath!, "utf8"));
    assert.ok(Array.isArray(cfg.plugin), "cfg.plugin is an array");

    // Find our entry
    const entry = cfg.plugin.find((p: unknown) => {
      if (Array.isArray(p) && p[1] && typeof p[1] === "object") {
        return (p[1] as Record<string, unknown>).providerId === "omniroute-test";
      }
      return false;
    });
    assert.ok(entry, "plugin entry for omniroute-test found");
    assert.equal((entry as [string, Record<string, unknown>])[1].baseURL, "http://localhost:20128");

    // Verify plugin dist was copied
    const pluginDist = path.join(
      path.dirname(result.configPath!),
      "plugins",
      "omniroute",
      "dist",
      "index.js"
    );
    assert.ok(fs.existsSync(pluginDist), "plugin dist/index.js copied");
  });
});

test("setup opencode: idempotent — re-run replaces prior entry", async () => {
  await withSandbox(async (sandbox, fakeHome) => {
    const { runSetupOpenCodeCommand } = await import("../../bin/cli/commands/setup-open-code.mjs");

    // First run
    const r1 = await runSetupOpenCodeCommand({
      providerId: "omniroute",
      baseURL: "http://localhost:20128",
      nonInteractive: true,
    });
    assert.equal(r1.exitCode, 0);

    // Second run with different baseURL
    const r2 = await runSetupOpenCodeCommand({
      providerId: "omniroute",
      baseURL: "http://or.example.com",
      nonInteractive: true,
    });
    assert.equal(r2.exitCode, 0);

    const cfg = JSON.parse(fs.readFileSync(r2.configPath!, "utf8"));
    const entries = cfg.plugin.filter((p: unknown) => {
      if (Array.isArray(p) && p[1] && typeof p[1] === "object") {
        return (p[1] as Record<string, unknown>).providerId === "omniroute";
      }
      return false;
    });
    assert.equal(entries.length, 1, "only one entry for omniroute after re-run");
    assert.equal(
      (entries[0] as [string, Record<string, unknown>])[1].baseURL,
      "http://or.example.com",
      "baseURL updated on re-run"
    );
  });
});

test("setup opencode: replaces legacy opencode-omniroute-auth entry", async () => {
  await withSandbox(async (sandbox, fakeHome) => {
    // Seed opencode.json with a legacy entry like the real install had
    const configDir = path.join(fakeHome, ".config", "opencode");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, "opencode.json"),
      JSON.stringify({
        plugin: [
          [
            "/home/user/node_modules/opencode-omniroute-auth/dist/index.js",
            { providerId: "omniroute", baseURL: "http://localhost:20128" },
          ],
        ],
      }) + "\n"
    );

    const { runSetupOpenCodeCommand } = await import("../../bin/cli/commands/setup-open-code.mjs");
    const result = await runSetupOpenCodeCommand({
      providerId: "omniroute",
      baseURL: "http://localhost:20128",
      nonInteractive: true,
    });
    assert.equal(result.exitCode, 0);

    const cfg = JSON.parse(fs.readFileSync(result.configPath!, "utf8"));
    for (const p of cfg.plugin) {
      if (Array.isArray(p)) {
        const pathStr = String(p[0] ?? "");
        assert.ok(!pathStr.includes("opencode-omniroute-auth"), "legacy entry removed: " + pathStr);
      }
    }
  });
});

test("setup opencode: preserves other plugin entries", async () => {
  await withSandbox(async (sandbox, fakeHome) => {
    const configDir = path.join(fakeHome, ".config", "opencode");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, "opencode.json"),
      JSON.stringify({
        plugin: [["@other/plugin", { someOption: true }]],
      }) + "\n"
    );

    const { runSetupOpenCodeCommand } = await import("../../bin/cli/commands/setup-open-code.mjs");
    const result = await runSetupOpenCodeCommand({
      providerId: "omniroute",
      baseURL: "http://localhost:20128",
      nonInteractive: true,
    });
    assert.equal(result.exitCode, 0);

    const cfg = JSON.parse(fs.readFileSync(result.configPath!, "utf8"));
    const otherEntry = cfg.plugin.find((p: unknown) => {
      if (Array.isArray(p) && p[1]) {
        const opts = p[1] as Record<string, unknown>;
        return opts.someOption === true;
      }
      return false;
    });
    assert.ok(otherEntry, "other plugin entry preserved");
  });
});

test("setup opencode: handles empty opencode.json gracefully", async () => {
  await withSandbox(async (sandbox, fakeHome) => {
    const configDir = path.join(fakeHome, ".config", "opencode");
    fs.mkdirSync(configDir, { recursive: true });
    // Write empty JSON that parses as array — should not crash
    fs.writeFileSync(path.join(configDir, "opencode.json"), "[]\n");

    const { runSetupOpenCodeCommand } = await import("../../bin/cli/commands/setup-open-code.mjs");
    const result = await runSetupOpenCodeCommand({
      providerId: "omniroute",
      baseURL: "http://localhost:20128",
      nonInteractive: true,
    });
    assert.equal(result.exitCode, 0);

    const cfg = JSON.parse(fs.readFileSync(result.configPath!, "utf8"));
    assert.ok(Array.isArray(cfg.plugin), "plugin is array after empty config reset");
  });
});

test("setup opencode: handles malformed JSON gracefully", async () => {
  await withSandbox(async (sandbox, fakeHome) => {
    const configDir = path.join(fakeHome, ".config", "opencode");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, "opencode.json"), "not json at all\n");

    const { runSetupOpenCodeCommand } = await import("../../bin/cli/commands/setup-open-code.mjs");
    const result = await runSetupOpenCodeCommand({
      providerId: "omniroute",
      baseURL: "http://localhost:20128",
      nonInteractive: true,
    });
    // Malformed JSON should throw and return exit code 1
    assert.equal(result.exitCode, 1);
  });
});
