import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("../../node_modules/sql.js/dist/sql-wasm.wasm");
const dest = resolve("dist/sql-wasm.wasm");

const destDir = resolve("dist");
if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
cpSync(src, dest);
