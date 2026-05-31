const QUEUE_KEY = "handsopprekking:queue";
const CHECKLIST_VALUES = new Set([
  "Montørhåndbok",
  "OneNote",
  "Teams",
  "Fagbok",
  "Spurt en klassekompis",
]);

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

export function normalizeName(navn) {
  return String(navn || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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

  if (!navn || !gjelder || sjekket.length === 0) {
    return { ok: false, message: "Navn, hva det gjelder og minst ett sjekkpunkt må fylles ut." };
  }

  if (navn.length > 80 || gjelder.length > 1000) {
    return { ok: false, message: "Teksten er for lang." };
  }

  return { ok: true, entry: { navn, gjelder, sjekket } };
}
