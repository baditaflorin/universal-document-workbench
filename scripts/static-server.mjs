import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.argv[2] ?? "docs");
const port = Number(process.argv[3] ?? 4173);
const basePath = normalizeBase(process.argv[4] ?? "/universal-document-workbench");

const contentTypes = new Map([
  [".html", "text/html;charset=utf-8"],
  [".js", "text/javascript;charset=utf-8"],
  [".css", "text/css;charset=utf-8"],
  [".json", "application/json;charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json;charset=utf-8"],
  [".map", "application/json;charset=utf-8"]
]);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (!url.pathname.startsWith(basePath)) {
    response.writeHead(302, { Location: `${basePath}/` });
    response.end();
    return;
  }

  const relativePath = decodeURIComponent(url.pathname.slice(basePath.length)).replace(/^\/+/, "");
  const requestedPath = path.resolve(root, relativePath || "index.html");
  const safePath = requestedPath.startsWith(root) ? requestedPath : path.join(root, "index.html");
  const filePath = resolveFile(safePath);
  const extension = path.extname(filePath);

  response.writeHead(200, {
    "Content-Type": contentTypes.get(extension) ?? "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  const currentFile = fileURLToPath(import.meta.url);
  console.log(`Serving ${root} at http://127.0.0.1:${port}${basePath}/ via ${currentFile}`);
});

function normalizeBase(value) {
  const prefixed = value.startsWith("/") ? value : `/${value}`;
  return prefixed.replace(/\/+$/, "");
}

function resolveFile(candidate) {
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const indexPath = path.join(candidate, "index.html");
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }

  return path.join(root, "index.html");
}

