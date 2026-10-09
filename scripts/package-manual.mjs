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
} from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { createHash } from "crypto";

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
  execSync(`tar -czf "${tarLatestPath}" -C "${distManualDir}" .`, {
    stdio: "inherit",
  });
  cpSync(tarLatestPath, tarVersionPath);

  // Create zip from inside dist/manual
  execSync(`zip -q -r "${zipLatestPath}" .`, {
    cwd: distManualDir,
    stdio: "inherit",
  });
  cpSync(zipLatestPath, zipVersionPath);

  console.log(`📦 Created release archives:`);
  console.log(`   - ${tarLatestName} & ${tarVersionName}`);
  console.log(`   - ${zipLatestName} & ${zipVersionName}`);
} catch (err) {
  console.error("❌ Failed to create archive bundles:", err);
  process.exit(1);
}

// 4. Generate SHA256 checksums
const archivesToHash = [
  tarLatestName,
  tarVersionName,
  zipLatestName,
  zipVersionName,
];

let checksumsOutput = "";
for (const filename of archivesToHash) {
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
