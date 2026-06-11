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
let materialList = [];
let analytics = [];
let pushSubscriptions = [];
let appSettings = {
  visibleMenus: {
    handsopprekking: true,
    materiell: true,
    beregning: true,
    beregningKabel: true,
    beregningJording: true,
    beregningVarmekabel: true,
  },
};

const checklistValues = new Set([
  "Montørhåndbok",
  "OneNote",
  "Teams",
  "Fagbok",
  "Spurt en klassekompis",
  "Har sett i hele klasserommet",
]);
const blockedNameWords = [
  "admin",
  "anonymous",
  "anonym",
  "alkohol",
  "bitch",
  "batman",
  "captainamerica",
  "cannabis",
  "darthvader",
  "dritt",
  "dop",
  "drugs",
  "dust",
  "gandalf",
  "goku",
  "faen",
  "fitta",
  "fitte",
  "forbanna",
  "fuck",
  "hasj",
  "helvete",
  "hitler",
  "hore",
  "idiot",
  "ironman",
  "jævel",
  "javel",
  "joker",
  "kokain",
  "krig",
  "kuk",
  "marihuana",
  "marijuana",
  "nazi",
  "neger",
  "narkotika",
  "naruto",
  "penis",
  "pikachu",
  "pokemon",
  "rasist",
  "rus",
  "rusmiddel",
  "sauron",
  "satan",
  "sex",
  "spiderman",
  "superman",
  "test",
  "tiss",
  "thor",
  "voldemort",
  "weed",
  "ww2",
  "yoda",
];
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

function publicMaterialList() {
  return materialList.filter((entry) => !entry.behandlet);
}

function addAnalyticsEvent(event) {
  const safeEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: String(event.type || "event").slice(0, 40),
    category: String(event.category || "app").slice(0, 40),
    target: String(event.target || "").slice(0, 80),
    opprettet: new Date().toISOString(),
  };
  analytics = [...analytics, safeEvent].slice(-2000);
  return safeEvent;
}

function addPushSubscription(subscription) {
  const endpoint = String(subscription?.endpoint || "");

  if (!endpoint) {
    throw new Error("Mangler push-endepunkt.");
  }

  pushSubscriptions = [
    ...pushSubscriptions.filter((item) => item.endpoint !== endpoint),
    { ...subscription, opprettet: new Date().toISOString() },
  ].slice(-20);
}

function anonymizeHelpedQueue(items) {
  return items.map((entry) => (entry.hjulpet ? { ...entry, navn: "Anonym elev" } : entry));
}

function normalizeName(navn) {
  return String(navn || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeForFilter(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå]/g, "");
}

function hasUnwantedWords(value) {
  const normalized = normalizeForFilter(value);
  return blockedNameWords.some((word) => normalized.includes(normalizeForFilter(word)));
}

function validateStudentName(navn) {
  const trimmed = String(navn || "").trim();
  const normalized = normalizeForFilter(trimmed);

  if (trimmed.length < 2) return "Skriv inn et ekte navn.";
  if (trimmed.length > 20) return "Navnet kan maks være 20 bokstaver.";
  if (!/^[a-zA-ZæøåÆØÅ ]+$/.test(trimmed)) {
    return "Bruk kun bokstaver i navnet.";
  }
  if (/(.)\1{3,}/.test(normalized)) return "Bruk et ekte navn.";
  if (hasUnwantedWords(trimmed)) {
    return "Bruk et ordentlig navn.";
  }

  return "";
}

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
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

  if (hasUnwantedWords(navn) || hasUnwantedWords(gjelder)) {
    return { ok: false, message: "FY deg, det er ikke lov :) !", code: "UNWANTED_WORDS" };
  }

  const nameError = validateStudentName(navn);
  if (nameError) {
    return { ok: false, message: nameError };
  }

  if (countWords(gjelder) < 7) {
    return { ok: false, message: "Skriv minst 7 ord om hva du trenger hjelp til." };
  }

  if (sjekket.length !== checklistValues.size) {
    return { ok: false, message: "Alle punktene i sjekket først må krysses av." };
  }

  return { ok: true, entry: { navn, gjelder, sjekket } };
}

function validateMaterialEntry(body) {
  const elnummer = String(body.elnummer || "").trim();
  const typeUtstyr = String(body.typeUtstyr || "").trim();
  const antall = Number(body.antall);
  const harSjekket = Boolean(body.harSjekket);

  if (!elnummer || !typeUtstyr || !Number.isFinite(antall)) {
    return { ok: false, message: "El nummer, type utstyr og antall må fylles ut." };
  }

  if (!/^[0-9 ]{3,20}$/.test(elnummer)) {
    return { ok: false, message: "El nummer kan bare inneholde tall og mellomrom." };
  }

  if (hasUnwantedWords(typeUtstyr)) {
    return { ok: false, message: "FY deg, det er ikke lov :) !", code: "UNWANTED_WORDS" };
  }

  if (typeUtstyr.length > 80) {
    return { ok: false, message: "Type utstyr er for lang." };
  }

  if (antall < 1 || antall > 999) {
    return { ok: false, message: "Antall må være mellom 1 og 999." };
  }

  if (!harSjekket) {
    return { ok: false, message: "Du må først sjekke i klasserommet og på lager." };
  }

  return { ok: true, entry: { elnummer, typeUtstyr, antall: Math.round(antall) } };
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/queue") {
      sendJson(response, 200, { queue: publicQueue() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/settings") {
      sendJson(response, 200, { settings: appSettings });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/material") {
      sendJson(response, 200, { list: publicMaterialList() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/push/public-key") {
      sendJson(response, 200, { publicKey: process.env.VAPID_PUBLIC_KEY || "" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/analytics") {
      const body = await getRequestBody(request);
      const allowedTypes = new Set(["visit", "nav_click", "calculation_completed"]);

      if (!allowedTypes.has(String(body.type || ""))) {
        sendJson(response, 400, { message: "Ugyldig statistikkhendelse." });
        return;
      }

      const event = addAnalyticsEvent(body);
      sendJson(response, 201, { event });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/material") {
      const validation = validateMaterialEntry(await getRequestBody(request));

      if (!validation.ok) {
        sendJson(response, 400, { message: validation.message, code: validation.code });
        return;
      }

      const entry = {
        ...validation.entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        opprettet: new Date().toISOString(),
        behandlet: false,
      };
      materialList.push(entry);
      sendJson(response, 201, { entry, list: materialList });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/queue") {
      const validation = validateStudentEntry(await getRequestBody(request));

      if (!validation.ok) {
        sendJson(response, 400, { message: validation.message, code: validation.code });
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

      queue = anonymizeHelpedQueue(queue);
      sendJson(response, 200, { queue });
      return;
    }

    if (url.pathname === "/api/teacher/settings") {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lærer." });
        return;
      }

      if (request.method === "GET") {
        sendJson(response, 200, { settings: appSettings });
        return;
      }

      if (request.method === "POST") {
        const body = await getRequestBody(request);
        appSettings = {
          ...appSettings,
          ...body,
          visibleMenus: {
            ...appSettings.visibleMenus,
            ...(body.visibleMenus || {}),
          },
        };
        sendJson(response, 200, { settings: appSettings });
        return;
      }
    }

    if (request.method === "GET" && url.pathname === "/api/teacher/material") {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lærer." });
        return;
      }

      sendJson(response, 200, { list: materialList });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/teacher/analytics") {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lÃ¦rer." });
        return;
      }

      sendJson(response, 200, { analytics });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/teacher/push") {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lærer." });
        return;
      }

      const body = await getRequestBody(request);
      if (body.action === "subscribe") {
        addPushSubscription(body.subscription);
        sendJson(response, 201, { ok: true, count: pushSubscriptions.length });
        return;
      }

      if (body.action === "unsubscribe") {
        pushSubscriptions = pushSubscriptions.filter((subscription) => subscription.endpoint !== body.endpoint);
        sendJson(response, 200, { ok: true, count: pushSubscriptions.length });
        return;
      }

      sendJson(response, 400, { message: "Ukjent push-handling." });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/teacher/push/subscribe") {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lÃ¦rer." });
        return;
      }

      const body = await getRequestBody(request);
      addPushSubscription(body.subscription);
      sendJson(response, 201, { ok: true, count: pushSubscriptions.length });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/teacher/push/unsubscribe") {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lÃ¦rer." });
        return;
      }

      const body = await getRequestBody(request);
      pushSubscriptions = pushSubscriptions.filter((subscription) => subscription.endpoint !== body.endpoint);
      sendJson(response, 200, { ok: true, count: pushSubscriptions.length });
      return;
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/teacher/material/")) {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lærer." });
        return;
      }

      const id = decodeURIComponent(url.pathname.replace("/api/teacher/material/", ""));
      const entry = materialList.find((item) => item.id === id);

      if (!entry) {
        sendJson(response, 404, { message: "Fant ikke materiell i listen." });
        return;
      }

      entry.behandlet = true;
      entry.behandletTid = new Date().toISOString();
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/teacher/queue") {
      if (!isTeacherAuthorized(request)) {
        sendJson(response, 401, { message: "Ikke innlogget som lærer." });
        return;
      }

      queue = anonymizeHelpedQueue(queue).filter((entry) => entry.hjulpet);
      sendJson(response, 200, { ok: true, queue });
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
      entry.navn = "Anonym elev";
      queue = anonymizeHelpedQueue(queue);
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
