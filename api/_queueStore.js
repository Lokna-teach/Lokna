const QUEUE_KEY = "handsopprekking:queue";
const CHECKLIST_VALUES = new Set([
  "Montørhåndbok",
  "OneNote",
  "Teams",
  "Fagbok",
  "Spurt en klassekompis",
  "Har sett i hele klasserommet",
]);

const BLOCKED_NAME_WORDS = [
  "admin",
  "anonymous",
  "anonym",
  "bitch",
  "dritt",
  "faen",
  "fuck",
  "hitler",
  "hore",
  "idiot",
  "kuk",
  "nazi",
  "neger",
  "penis",
  "rasist",
  "sex",
  "test",
  "tiss",
];

export const teacherUsername = process.env.TEACHER_USERNAME || "hamstr";
export const teacherPassword = process.env.TEACHER_PASSWORD || "lokna";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Mangler UPSTASH_REDIS_REST_URL eller UPSTASH_REDIS_REST_TOKEN.");
  }

  return { url, token };
}

async function redis(command) {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || "Databasefeil.");
  }

  return data.result;
}

export function sendJson(response, statusCode, payload) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.status(statusCode).json(payload);
}

export function isTeacherAuthorized(request) {
  const header = request.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return false;
  }

  const [username, password] = Buffer.from(encoded, "base64").toString("utf8").split(":");
  return username === teacherUsername && password === teacherPassword;
}

export async function readQueue() {
  const rawQueue = await redis(["GET", QUEUE_KEY]);

  if (!rawQueue) {
    return [];
  }

  try {
    const queue = JSON.parse(rawQueue);
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

export async function writeQueue(queue) {
  await redis(["SET", QUEUE_KEY, JSON.stringify(queue)]);
}

export function publicQueue(queue) {
  return queue
    .filter((entry) => !entry.hjulpet)
    .map(({ id, navn, opprettet }) => ({ id, navn, opprettet }));
}

export function anonymizeHelpedQueue(queue) {
  return queue.map((entry) =>
    entry.hjulpet
      ? {
          ...entry,
          navn: "Anonym elev",
        }
      : entry
  );
}

export function normalizeName(navn) {
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

function validateStudentName(navn) {
  const trimmed = String(navn || "").trim();
  const normalized = normalizeForFilter(trimmed);

  if (trimmed.length < 2) return "Skriv inn et ekte navn.";
  if (trimmed.length > 20) return "Navnet kan maks være 20 bokstaver.";
  if (!/^[a-zA-ZæøåÆØÅ ]+$/.test(trimmed)) {
    return "Bruk kun bokstaver i navnet.";
  }
  if (/(.)\1{3,}/.test(normalized)) return "Bruk et ekte navn.";
  if (BLOCKED_NAME_WORDS.some((word) => normalized.includes(word))) {
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

export function hasActiveDuplicate(queue, navn) {
  const normalizedName = normalizeName(navn);
  return queue.some((entry) => !entry.hjulpet && normalizeName(entry.navn) === normalizedName);
}

export function validateStudentEntry(body) {
  const navn = String(body.navn || "").trim();
  const gjelder = String(body.gjelder || "").trim();
  const sjekket = Array.isArray(body.sjekket)
    ? body.sjekket.filter((value) => CHECKLIST_VALUES.has(value))
    : [];

  const nameError = validateStudentName(navn);
  if (nameError) {
    return { ok: false, message: nameError };
  }

  if (countWords(gjelder) < 7) {
    return { ok: false, message: "Skriv minst 7 ord om hva du trenger hjelp til." };
  }

  if (sjekket.length !== CHECKLIST_VALUES.size) {
    return { ok: false, message: "Alle punktene i sjekket først må krysses av." };
  }

  if (gjelder.length > 1000) {
    return { ok: false, message: "Teksten er for lang." };
  }

  return { ok: true, entry: { navn, gjelder, sjekket } };
}
