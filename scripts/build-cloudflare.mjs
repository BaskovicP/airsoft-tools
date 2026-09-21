import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "index.html");
const outputDirectory = resolve(projectRoot, "dist");
const cloudflareDirectory = resolve(projectRoot, "cloudflare");

const source = await readFile(sourcePath, "utf8");
const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/);
const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);

if (!styleMatch || !scriptMatch) {
  throw new Error("Expected one inline <style> and one closing inline <script> in index.html.");
}

const deploymentHtml = source
  .replace(styleMatch[0], '<link rel="stylesheet" href="./styles.css">')
  .replace(scriptMatch[0], '<script src="./app.js"></script>\n</body>');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, "index.html"), deploymentHtml),
  writeFile(resolve(outputDirectory, "styles.css"), `${styleMatch[1].trim()}\n`),
  writeFile(resolve(outputDirectory, "app.js"), `${scriptMatch[1].trim()}\n`),
  copyFile(resolve(cloudflareDirectory, "_headers"), resolve(outputDirectory, "_headers")),
  copyFile(resolve(cloudflareDirectory, ".assetsignore"), resolve(outputDirectory, ".assetsignore"))
]);

console.log("Built Cloudflare static assets in dist/.");
