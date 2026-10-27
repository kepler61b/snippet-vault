const esbuild = require("esbuild");

const production = process.argv.includes("--production");

async function main() {
  await esbuild.build({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "info",
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
