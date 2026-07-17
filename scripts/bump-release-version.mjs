#!/usr/bin/env node
/**
 * Bump coordinated release versions in-tree (before tagging).
 *
 * Usage:
 *   node scripts/bump-release-version.mjs 1.0.2
 *   node scripts/bump-release-version.mjs 1.0.2 --dry-run
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const version = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!version || version === "--help" || version === "-h") {
  console.error("Usage: node scripts/bump-release-version.mjs <X.Y.Z> [--dry-run]");
  process.exit(version ? 0 : 1);
}

if (version.startsWith("v")) {
  console.error(`Version must not include a leading "v" (got ${version}). Use ${version.slice(1)}.`);
  process.exit(1);
}

if (!SEMVER.test(version)) {
  console.error(`Invalid semver: ${version}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (dryRun) {
    console.log(`dry-run would write ${path}`);
    return;
  }
  writeFileSync(path, text);
}

function writeText(path, text) {
  if (dryRun) {
    console.log(`dry-run would write ${path}`);
    return;
  }
  writeFileSync(path, text);
}

/** npm packages that publish (and depend on @orbit-id/core where applicable) */
const npmPackages = ["core", "typescript", "cli"];

const rootPkgPath = resolve(root, "package.json");
const rootPkg = readJson(rootPkgPath);
rootPkg.version = version;
writeJson(rootPkgPath, rootPkg);
console.log(`root package.json -> ${version}`);

for (const name of npmPackages) {
  const path = resolve(root, "packages", name, "package.json");
  const pkg = readJson(path);
  pkg.version = version;
  if (pkg.dependencies?.["@orbit-id/core"]) {
    pkg.dependencies["@orbit-id/core"] = version;
  }
  writeJson(path, pkg);
  console.log(`packages/${name}/package.json -> ${version}`);
}

// Keep local consumers aligned with published core when present.
for (const name of ["node-lease", "playground"]) {
  const path = resolve(root, "packages", name, "package.json");
  const pkg = readJson(path);
  let changed = false;
  if (pkg.dependencies?.["@orbit-id/core"]) {
    pkg.dependencies["@orbit-id/core"] = version;
    changed = true;
  }
  if (changed) {
    writeJson(path, pkg);
    console.log(`packages/${name}/package.json @orbit-id/core -> ${version}`);
  }
}

const pomPath = resolve(root, "packages/java/pom.xml");
const pom = readFileSync(pomPath, "utf8");
const nextPom = pom.replace(
  /(<artifactId>orbit-id<\/artifactId>\s*<version>)[^<]+(<\/version>)/,
  `$1${version}$2`,
);
if (nextPom === pom) {
  console.error("Failed to update packages/java/pom.xml <version>");
  process.exit(1);
}
writeText(pomPath, nextPom);
console.log(`packages/java/pom.xml -> ${version}`);

const cargoPath = resolve(root, "packages/rust/Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8");
const nextCargo = cargo.replace(/^version = "[^"]+"/m, `version = "${version}"`);
if (nextCargo === cargo) {
  console.error("Failed to update packages/rust/Cargo.toml version");
  process.exit(1);
}
writeText(cargoPath, nextCargo);
console.log(`packages/rust/Cargo.toml -> ${version}`);

// Keep packages/rust/Cargo.lock in sync so `cargo publish` is not dirty.
const lockPath = resolve(root, "packages/rust/Cargo.lock");
if (existsSync(lockPath)) {
  if (dryRun) {
    console.log(`dry-run would refresh ${lockPath}`);
  } else {
    const gen = spawnSync("cargo", ["generate-lockfile"], {
      cwd: resolve(root, "packages/rust"),
      encoding: "utf8",
    });
    if (gen.status === 0) {
      console.log(`packages/rust/Cargo.lock refreshed via cargo generate-lockfile`);
    } else {
      // Fallback when cargo is unavailable (e.g. local dry environments).
      const lock = readFileSync(lockPath, "utf8");
      const nextLock = lock.replace(
        /(\[\[package\]\]\nname = "orbit-id"\nversion = ")[^"]+(")/,
        `$1${version}$2`,
      );
      if (nextLock === lock) {
        console.error(
          `Failed to refresh Cargo.lock (cargo: ${gen.stderr?.trim() || gen.error || "unavailable"})`,
        );
        process.exit(1);
      }
      writeText(lockPath, nextLock);
      console.log(`packages/rust/Cargo.lock package version -> ${version} (regex fallback)`);
    }
  }
}

console.log(dryRun ? "Dry run complete." : `Bumped release metadata to ${version}.`);
