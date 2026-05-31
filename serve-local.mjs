import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");
const port = Number(process.env.PORT || 5190);
const teacherUsername = "hamstr";
const teacherPassword = "lokna";
let queue = [];

const checklistValues = new Set([
  "Montørhåndbok",
  "OneNote",
  "Teams",
  "Fagbok",
  "Spurt en klassekompis",
]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function publicQueue() {
  return queue
    .filter((entry) => !entry.hjulpet)
    .map(({ id, navn, opprettet }) => ({ id, navn, opprettet }));
}

function normalizeName(navn) {
  return String(navn || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hasActiveDuplicate(navn) {
  const normalizedName = normalizeName(navn);
  return queue.some((entry) => !entry.hjulpet && normalizeName(entry.navn) === normalizedName);
}

function isTeacherAuthorized(request) {
  const header = request.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return false;
  }

  const [username, password] = Buffer.from(encoded, "base64").toString("utf8").split(":");
  return username === teacherUsername && password === teacherPassword;
}

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Ugyldig JSON."));
      }
    });
  });
}

function validateStudentEntry(body) {
  const navn = String(body.navn || "").trim();
  const gjelder = String(body.gjelder || "").trim();
  const sjekket = Array.isArray(body.sjekket)
    ? body.sjekket.filter((value) => checklistValues.has(value))
    : [];

  if (!navn || !gjelder || sjekket.length === 0) {
    return { ok: false, message: "Navn, hva det gjelder og minst ett sjekkpunkt må fylles ut." };
  }

  return { ok: true, entry: { navn, gjelder, sjekket } };
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/queue") {
      sendJson(response, 200, { queue: publicQueue() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/queue") {
      const validation = validateStudentEntry(await getRequestBody(request));

      if (!validation.ok) {
        sendJson(response, 400, { message: validation.message });
        return;
      }

      if (hasActiveDuplicate(validation.entry.navn)) {
        sendJson(response, 409, { message: "fy!", code: "DUPLICATE_ACTIVE_ENTRY" });
        return;
      }

      const entry = {
        ...validation.entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        opprettet: new Date().toISOString(),
        hjulpet: false,
      };
      queue.push(entry);
      sendJson(response, 201, { entry: publicQueue().at(-1), plass: publicQueue().length });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/teacher/queue") {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lærer." });
        return;
      }

      sendJson(response, 200, { queue });
      return;
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/teacher/queue/")) {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lærer." });
        return;
      }

      const id = decodeURIComponent(url.pathname.replace("/api/teacher/queue/", ""));
      const entry = queue.find((item) => item.id === id);

      if (!entry) {
        sendJson(response, 404, { message: "Fant ikke eleven i køen." });
        return;
      }

      entry.hjulpet = true;
      entry.hjulpetTid = new Date().toISOString();
      sendJson(response, 200, { ok: true });
      return;
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(distDir, pathname);

    try {
      const content = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(content);
    } catch {
      const index = await readFile(join(distDir, "index.html"));
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(index);
    }
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Håndsopprekking preview: http://127.0.0.1:${port}`);
});
