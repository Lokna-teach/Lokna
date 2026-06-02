const QUEUE_KEY = "handsopprekking:queue";
const MATERIAL_KEY = "handsopprekking:material";
const SETTINGS_KEY = "handsopprekking:settings";
const ANALYTICS_KEY = "handsopprekking:analytics";
const PUSH_SUBSCRIPTIONS_KEY = "handsopprekking:pushSubscriptions";
export const defaultAppSettings = {
  visibleMenus: {
    handsopprekking: true,
    materiell: true,
    beregning: true,
    beregningKabel: true,
    beregningJording: true,
    beregningVarmekabel: true,
  },
};
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

export async function readMaterialList() {
  const rawList = await redis(["GET", MATERIAL_KEY]);

  if (!rawList) {
    return [];
  }

  try {
    const list = JSON.parse(rawList);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function writeMaterialList(list) {
  await redis(["SET", MATERIAL_KEY, JSON.stringify(list)]);
}

export async function readAppSettings() {
  const rawSettings = await redis(["GET", SETTINGS_KEY]);

  if (!rawSettings) {
    return defaultAppSettings;
  }

  try {
    const settings = JSON.parse(rawSettings);
    return {
      ...defaultAppSettings,
      ...settings,
      visibleMenus: {
        ...defaultAppSettings.visibleMenus,
        ...(settings.visibleMenus || {}),
      },
    };
  } catch {
    return defaultAppSettings;
  }
}

export async function writeAppSettings(settings) {
  const nextSettings = {
    ...defaultAppSettings,
    ...settings,
    visibleMenus: {
      ...defaultAppSettings.visibleMenus,
      ...(settings.visibleMenus || {}),
    },
  };
  await redis(["SET", SETTINGS_KEY, JSON.stringify(nextSettings)]);
  return nextSettings;
}

export async function readAnalytics() {
  const rawAnalytics = await redis(["GET", ANALYTICS_KEY]);

  if (!rawAnalytics) {
    return [];
  }

  try {
    const analytics = JSON.parse(rawAnalytics);
    return Array.isArray(analytics) ? analytics : [];
  } catch {
    return [];
  }
}

export async function writeAnalytics(analytics) {
  await redis(["SET", ANALYTICS_KEY, JSON.stringify(analytics.slice(-2000))]);
}

export async function addAnalyticsEvent(event) {
  const analytics = await readAnalytics();
  const safeEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: String(event.type || "event").slice(0, 40),
    category: String(event.category || "app").slice(0, 40),
    target: String(event.target || "").slice(0, 80),
    opprettet: new Date().toISOString(),
  };
  const nextAnalytics = [...analytics, safeEvent].slice(-2000);
  await writeAnalytics(nextAnalytics);
  return safeEvent;
}

export async function readPushSubscriptions() {
  const rawSubscriptions = await redis(["GET", PUSH_SUBSCRIPTIONS_KEY]);

  if (!rawSubscriptions) {
    return [];
  }

  try {
    const subscriptions = JSON.parse(rawSubscriptions);
    return Array.isArray(subscriptions) ? subscriptions : [];
  } catch {
    return [];
  }
}

export async function writePushSubscriptions(subscriptions) {
  await redis(["SET", PUSH_SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions.slice(-20))]);
}

export async function addPushSubscription(subscription) {
  const subscriptions = await readPushSubscriptions();
  const endpoint = String(subscription?.endpoint || "");

  if (!endpoint) {
    throw new Error("Mangler push-endepunkt.");
  }

  const nextSubscriptions = [
    ...subscriptions.filter((item) => item.endpoint !== endpoint),
    {
      ...subscription,
      opprettet: new Date().toISOString(),
    },
  ].slice(-20);

  await writePushSubscriptions(nextSubscriptions);
  return nextSubscriptions.length;
}

export async function removePushSubscription(endpoint) {
  const subscriptions = await readPushSubscriptions();
  const nextSubscriptions = subscriptions.filter((subscription) => subscription.endpoint !== endpoint);
  await writePushSubscriptions(nextSubscriptions);
  return nextSubscriptions.length;
}

export function publicMaterialList(list) {
  return list.filter((entry) => !entry.behandlet);
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

function hasUnwantedWords(value) {
  const normalized = normalizeForFilter(value);
  return BLOCKED_NAME_WORDS.some((word) => normalized.includes(normalizeForFilter(word)));
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

  if (sjekket.length !== CHECKLIST_VALUES.size) {
    return { ok: false, message: "Alle punktene i sjekket først må krysses av." };
  }

  if (gjelder.length > 1000) {
    return { ok: false, message: "Teksten er for lang." };
  }

  return { ok: true, entry: { navn, gjelder, sjekket } };
}

export function validateMaterialEntry(body) {
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

  return {
    ok: true,
    entry: {
      elnummer,
      typeUtstyr,
      antall: Math.round(antall),
    },
  };
}
