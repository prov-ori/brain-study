import fs from "node:fs/promises";
const repo = new URL("../", import.meta.url);
for (const name of ["index.html", "assets", "models", "draco", "licenses"]) {
  await fs.cp(new URL("dist/" + name, repo), new URL(name, repo), {
    recursive: true,
    force: true,
  });
}
console.log(
  "Exported production files at repository root for legacy GitHub Pages compatibility.",
);
