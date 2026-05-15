import { existsSync, readdirSync, statSync } from "node:fs";
import { arch, platform } from "node:os";
import { basename, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const bundleRoot = join(root, "src-tauri", "target", "release", "bundle");
const checks = [];

if (platform() === "darwin") {
  inspectMacBundle();
} else if (platform() === "win32") {
  inspectWindowsBundle();
} else {
  checks.push({
    status: "skipped",
    label: "platform bundle inspection",
    detail: `No release bundle inspector is defined for ${platform()}/${arch()}.`,
  });
}

printChecks();

const failures = checks.filter((check) => check.status === "failed");
if (failures.length > 0) {
  process.exitCode = 1;
}

function inspectMacBundle() {
  const appPath = join(bundleRoot, "macos", "FlowDesk.app");
  const infoPath = join(appPath, "Contents", "Info.plist");
  const dmgPath = findFirstFile(join(bundleRoot, "dmg"), ".dmg");

  requirePath(appPath, "macOS application bundle exists");
  requirePath(infoPath, "macOS Info.plist exists");
  requirePath(dmgPath, "macOS DMG exists");

  if (existsSync(infoPath)) {
    expectPlistValue(infoPath, "CFBundleIdentifier", "com.flowdesk.desktop");
    expectPlistValue(infoPath, "CFBundleDisplayName", "FlowDesk");
    expectPlistValue(infoPath, "LSApplicationCategoryType", "public.app-category.productivity");
  }

  if (existsSync(appPath)) {
    runCheck(
      "macOS bundle code signature",
      "codesign",
      ["--verify", "--deep", "--strict", "--verbose=2", appPath],
      "Strict bundle signature verification completed.",
    );
  }

  if (dmgPath) {
    runCheck("macOS DMG metadata", "hdiutil", ["imageinfo", dmgPath], "DMG image metadata is readable.");
  }

  if (existsSync(appPath)) {
    const gatekeeper = runCommand("spctl", ["--assess", "--type", "execute", "--verbose=4", appPath]);
    if (process.env.FLOWDESK_REQUIRE_GATEKEEPER === "1") {
      checks.push({
        status: gatekeeper.ok ? "passed" : "failed",
        label: "macOS Gatekeeper assessment",
        detail: gatekeeper.output,
      });
    } else {
      checks.push({
        status: gatekeeper.ok ? "passed" : "warned",
        label: "macOS Gatekeeper assessment",
        detail: gatekeeper.ok
          ? gatekeeper.output
          : "Not enforced without FLOWDESK_REQUIRE_GATEKEEPER=1 because notarization requires Apple credentials.",
      });
    }
  }
}

function inspectWindowsBundle() {
  const installerPath = findFirstFile(join(bundleRoot, "nsis"), ".exe");
  requirePath(installerPath, "Windows NSIS installer exists");
}

function requirePath(path, label) {
  checks.push({
    status: path && existsSync(path) ? "passed" : "failed",
    label,
    detail: path || "No matching artifact found.",
  });
}

function expectPlistValue(infoPath, key, expected) {
  const result = runCommand("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, infoPath]);
  const actual = result.output.trim();
  checks.push({
    status: result.ok && actual === expected ? "passed" : "failed",
    label: `Info.plist ${key}`,
    detail: actual || result.output,
  });
}

function runCheck(label, command, args, successDetail = null) {
  const result = runCommand(command, args);
  checks.push({
    status: result.ok ? "passed" : "failed",
    label,
    detail: result.ok && successDetail ? successDetail : result.output,
  });
}

function runCommand(command, args) {
  try {
    const output = execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return { ok: true, output: output.trim() || `${basename(command)} completed.` };
  } catch (error) {
    const stdout = error.stdout?.toString() ?? "";
    const stderr = error.stderr?.toString() ?? "";
    return { ok: false, output: `${stdout}${stderr}`.trim() || error.message };
  }
}

function findFirstFile(directory, extension) {
  if (!existsSync(directory)) {
    return null;
  }

  return readdirSync(directory)
    .map((entry) => join(directory, entry))
    .filter((entry) => statSync(entry).isFile() && entry.endsWith(extension))
    .sort()
    .at(0);
}

function printChecks() {
  for (const check of checks) {
    const marker = {
      passed: "PASS",
      failed: "FAIL",
      warned: "WARN",
      skipped: "SKIP",
    }[check.status];

    console.log(`${marker} ${check.label}: ${check.detail}`);
  }
}
