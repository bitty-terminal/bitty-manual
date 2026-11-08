#!/usr/bin/env bun
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  cpSync,
  existsSync,
  readdirSync,
  statSync,
  utimesSync,
} from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { createHash } from "crypto";

const DETERMINISTIC_MTIME_ISO = "2020-01-01T00:00:00Z";
const DETERMINISTIC_DATE = new Date(DETERMINISTIC_MTIME_ISO);
const DETERMINISTIC_ENV = {
  ...process.env,
  TZ: "UTC",
  LC_ALL: "C",
};

function normalizeMtimes(targetPath) {
  const stat = statSync(targetPath);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(targetPath)) {
      normalizeMtimes(join(targetPath, entry));
    }
  }
  utimesSync(targetPath, DETERMINISTIC_DATE, DETERMINISTIC_DATE);
}

function collectRelativePathsSorted(baseDir, entry = ".") {
  const startPath = entry === "." ? baseDir : join(baseDir, entry);
  const results = [];
  function walk(currentPath) {
    const stat = statSync(currentPath);
    const rel = relative(baseDir, currentPath).replace(/\\/g, "/");
    if (rel !== "") {
      results.push(rel);
    }
    if (stat.isDirectory()) {
      const children = readdirSync(currentPath).sort();
      for (const child of children) {
        walk(join(currentPath, child));
      }
    }
  }
  walk(startPath);
  return results.sort();
}

function createDeterministicTarGz(outPath, cwdDir, entries = ["."]) {
  normalizeMtimes(cwdDir);
  if (existsSync(outPath)) {
    rmSync(outPath, { force: true });
  }
  execFileSync(
    "tar",
    [
      "--sort=name",
      `--mtime=${DETERMINISTIC_MTIME_ISO}`,
      "--owner=0",
      "--group=0",
      "--numeric-owner",
      "-I",
      "gzip -n",
      "-cf",
      outPath,
      "-C",
      cwdDir,
      ...entries,
    ],
    { stdio: "inherit", env: DETERMINISTIC_ENV },
  );
  utimesSync(outPath, DETERMINISTIC_DATE, DETERMINISTIC_DATE);
}

function createDeterministicZip(outPath, cwdDir, entries = ["."]) {
  normalizeMtimes(cwdDir);
  if (existsSync(outPath)) {
    rmSync(outPath, { force: true });
  }
  const relPaths = Array.from(
    new Set(
      entries.flatMap((entry) => collectRelativePathsSorted(cwdDir, entry)),
    ),
  ).sort();
  execFileSync("zip", ["-q", "-X", outPath, "-@"], {
    cwd: cwdDir,
    input: `${relPaths.join("\n")}\n`,
    stdio: ["pipe", "inherit", "inherit"],
    env: DETERMINISTIC_ENV,
  });
  utimesSync(outPath, DETERMINISTIC_DATE, DETERMINISTIC_DATE);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const manifestPath = join(rootDir, "manifest.json");

if (!existsSync(manifestPath)) {
  console.error("❌ manifest.json not found in repository root.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const version = manifest.version || "0.1.0";
const locales = manifest.locales || ["en"];
const distDir = join(rootDir, "dist");
const distManualDir = join(distDir, "manual");

console.log(
  `📦 [bitty-manual package] Packaging manual version ${version} across [${locales.join(", ")}]...`,
);

// 1. Validate manifest integrity and gather doc metadata
const searchIndex = [];
const toc = [];
let totalDocCount = 0;

for (const section of manifest.sections) {
  const sectionNode = {
    id: section.id,
    title: section.title,
    items: [],
  };

  for (const item of section.items) {
    const itemNode = {
      slug: item.slug,
      title: item.title,
      path: item.path,
      locales: {},
    };

    for (const locale of locales) {
      const docPath = join(rootDir, locale, item.path);
      if (!existsSync(docPath)) {
        console.error(
          `❌ [Integrity Error] Missing document for locale '${locale}': ${item.path}`,
        );
        process.exit(1);
      }

      const content = readFileSync(docPath, "utf-8");
      const lines = content.split("\n");

      // Extract primary H1 title
      const h1Line = lines.find((l) => l.startsWith("# "));
      const docTitle = h1Line ? h1Line.replace(/^#\s+/, "").trim() : item.title;

      // Extract headings (H2 and H3)
      const headings = lines
        .filter((l) => /^#{2,3}\s+/.test(l))
        .map((l) => l.replace(/^#{2,3}\s+/, "").trim());

      // Extract first substantive paragraph for excerpt
      let excerpt = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.length > 0 &&
          !trimmed.startsWith("#") &&
          !trimmed.startsWith("```") &&
          !trimmed.startsWith(">")
        ) {
          excerpt = trimmed;
          break;
        }
      }

      const wordCount = content.split(/\s+/).filter(Boolean).length;

      searchIndex.push({
        id: `${locale}:${section.id}:${item.slug}`,
        locale,
        sectionId: section.id,
        sectionTitle: section.title,
        slug: item.slug,
        title: docTitle,
        path: `${locale}/${item.path}`,
        headings,
        excerpt,
        wordCount,
      });

      itemNode.locales[locale] = {
        title: docTitle,
        headingsCount: headings.length,
        wordCount,
      };

      totalDocCount++;
    }

    sectionNode.items.push(itemNode);
  }

  toc.push(sectionNode);
}

console.log(
  `✅ Validated ${totalDocCount} documents across ${manifest.sections.length} sections.`,
);

// 2. Prepare clean dist/manual output directory
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distManualDir, { recursive: true });

// Copy manifest
writeFileSync(
  join(distManualDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);

// Copy locale directories
for (const locale of locales) {
  const srcLocaleDir = join(rootDir, locale);
  const destLocaleDir = join(distManualDir, locale);
  cpSync(srcLocaleDir, destLocaleDir, { recursive: true });
}

// Write generated search index and TOC
writeFileSync(
  join(distManualDir, "search-index.json"),
  JSON.stringify(searchIndex, null, 2),
);

writeFileSync(
  join(distManualDir, "toc.json"),
  JSON.stringify(
    {
      name: manifest.name,
      version,
      locales,
      sections: toc,
    },
    null,
    2,
  ),
);

console.log(
  `📄 Generated search-index.json (${searchIndex.length} entries) & toc.json in dist/manual/.`,
);

// 3. Create compressed archives (tar.gz & zip)
const tarLatestName = "bitty-manual-latest.tar.gz";
const tarVersionName = `bitty-manual-${version}.tar.gz`;
const zipLatestName = "bitty-manual-latest.zip";
const zipVersionName = `bitty-manual-${version}.zip`;

const tarLatestPath = join(distDir, tarLatestName);
const tarVersionPath = join(distDir, tarVersionName);
const zipLatestPath = join(distDir, zipLatestName);
const zipVersionPath = join(distDir, zipVersionName);

try {
  // Create tar.gz from inside dist/manual (relative paths)
  createDeterministicTarGz(tarLatestPath, distManualDir, ["."]);
  cpSync(tarLatestPath, tarVersionPath);
  utimesSync(tarVersionPath, DETERMINISTIC_DATE, DETERMINISTIC_DATE);

  // Create zip from inside dist/manual
  createDeterministicZip(zipLatestPath, distManualDir, ["."]);
  cpSync(zipLatestPath, zipVersionPath);
  utimesSync(zipVersionPath, DETERMINISTIC_DATE, DETERMINISTIC_DATE);

  // Per-locale archives for the offline `doc` plugin: one bundle per
  // language so readers download only their locale from the CDN.
  const localeArchives = [];
  for (const locale of locales) {
    const localeTarLatest = `bitty-manual-${locale}-latest.tar.gz`;
    const localeTarVersion = `bitty-manual-${version}-${locale}.tar.gz`;
    const localeZipLatest = `bitty-manual-${locale}-latest.zip`;
    const localeZipVersion = `bitty-manual-${version}-${locale}.zip`;
    createDeterministicTarGz(join(distDir, localeTarLatest), distManualDir, [
      locale,
      "manifest.json",
      "toc.json",
    ]);
    cpSync(join(distDir, localeTarLatest), join(distDir, localeTarVersion));
    utimesSync(
      join(distDir, localeTarVersion),
      DETERMINISTIC_DATE,
      DETERMINISTIC_DATE,
    );
    createDeterministicZip(join(distDir, localeZipLatest), distManualDir, [
      locale,
      "manifest.json",
      "toc.json",
    ]);
    cpSync(join(distDir, localeZipLatest), join(distDir, localeZipVersion));
    utimesSync(
      join(distDir, localeZipVersion),
      DETERMINISTIC_DATE,
      DETERMINISTIC_DATE,
    );
    localeArchives.push(
      localeTarLatest,
      localeTarVersion,
      localeZipLatest,
      localeZipVersion,
    );
  }

  console.log(`📦 Created release archives:`);
  console.log(`   - ${tarLatestName} & ${tarVersionName}`);
  console.log(`   - ${zipLatestName} & ${zipVersionName}`);
  console.log(`   - per-locale: ${localeArchives.join(", ")}`);
} catch (err) {
  console.error("❌ Failed to create archive bundles:", err);
  process.exit(1);
}

// 4. Per-locale bundles for the per-package CDN layout
// (`manual/bitty-manual/<locale>.tar.gz`). Each bundle holds that locale's
// tree plus the manifest and TOC, so a new locale ships as new files without
// renaming existing keys.
const localeArchives = [];
for (const locale of locales) {
  const stageDir = join(distDir, `.stage-${locale}`);
  if (existsSync(stageDir)) {
    rmSync(stageDir, { recursive: true, force: true });
  }
  mkdirSync(stageDir, { recursive: true });
  cpSync(join(distManualDir, locale), join(stageDir, locale), {
    recursive: true,
  });
  cpSync(join(distManualDir, "manifest.json"), join(stageDir, "manifest.json"));
  cpSync(join(distManualDir, "toc.json"), join(stageDir, "toc.json"));

  const localeTarLatest = `bitty-manual-${locale}-latest.tar.gz`;
  const localeTarVersion = `bitty-manual-${locale}-${version}.tar.gz`;
  const localeZipLatest = `bitty-manual-${locale}-latest.zip`;
  const localeZipVersion = `bitty-manual-${locale}-${version}.zip`;
  try {
    createDeterministicTarGz(join(distDir, localeTarLatest), stageDir, [
      locale,
      "manifest.json",
      "toc.json",
    ]);
    cpSync(join(distDir, localeTarLatest), join(distDir, localeTarVersion));
    utimesSync(
      join(distDir, localeTarVersion),
      DETERMINISTIC_DATE,
      DETERMINISTIC_DATE,
    );
    createDeterministicZip(join(distDir, localeZipLatest), stageDir, [
      locale,
      "manifest.json",
      "toc.json",
    ]);
    cpSync(join(distDir, localeZipLatest), join(distDir, localeZipVersion));
    utimesSync(
      join(distDir, localeZipVersion),
      DETERMINISTIC_DATE,
      DETERMINISTIC_DATE,
    );
  } catch (err) {
    console.error(`❌ Failed to create ${locale} archive bundle:`, err);
    process.exit(1);
  }
  rmSync(stageDir, { recursive: true, force: true });
  localeArchives.push(
    localeTarLatest,
    localeTarVersion,
    localeZipLatest,
    localeZipVersion,
  );
  console.log(`📦 Created per-locale bundle set for '${locale}'.`);
}

// 5. Generate SHA256 checksums (combined + per-locale bundles, deduplicated)
const archivesToHash = [
  tarLatestName,
  tarVersionName,
  zipLatestName,
  zipVersionName,
  ...localeArchives,
];
for (const locale of locales) {
  archivesToHash.push(
    `bitty-manual-${version}-${locale}.tar.gz`,
    `bitty-manual-${version}-${locale}.zip`,
  );
}
const uniqueArchivesToHash = Array.from(new Set(archivesToHash));

let checksumsOutput = "";
for (const filename of uniqueArchivesToHash) {
  const filePath = join(distDir, filename);
  const fileBuffer = readFileSync(filePath);
  const hash = createHash("sha256").update(fileBuffer).digest("hex");
  checksumsOutput += `${hash}  ${filename}\n`;
}

writeFileSync(join(distDir, "SHA256SUMS.txt"), checksumsOutput);
// Also place a copy inside dist/manual for direct CDN access
writeFileSync(join(distManualDir, "SHA256SUMS.txt"), checksumsOutput);

console.log(`🔒 Written SHA256SUMS.txt.`);
console.log(
  `\n✨ Manual packaging complete! Artifacts ready in ${relative(rootDir, distDir)}/`,
);
