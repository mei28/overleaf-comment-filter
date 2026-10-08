import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

const repo = "https://github.com/mei28/overleaf-comment-filter";
const rawDist =
  "https://raw.githubusercontent.com/mei28/overleaf-comment-filter/main/dist";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Overleaf Comment Filter",
        namespace: repo,
        match: ["https://www.overleaf.com/project/*"],
        noframes: true,
        grant: "none",
        "run-at": "document-idle",
        updateURL: `${rawDist}/overleaf-comment-filter.meta.js`,
        downloadURL: `${rawDist}/overleaf-comment-filter.user.js`,
        supportURL: `${repo}/issues`,
        homepageURL: repo,
      },
      build: {
        fileName: "overleaf-comment-filter.user.js",
        metaFileName: true,
      },
    }),
  ],
});
