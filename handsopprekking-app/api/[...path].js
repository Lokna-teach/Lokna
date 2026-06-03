import {
  addAnalyticsEvent,
  addPushSubscription,
  anonymizeHelpedQueue,
  hasActiveDuplicate,
  isTeacherAuthorized,
  publicMaterialList,
  publicQueue,
  readAnalytics,
  readAppSettings,
  readMaterialList,
  readQueue,
  removePushSubscription,
  sendJson,
  validateMaterialEntry,
  validateStudentEntry,
  writeAppSettings,
  writeMaterialList,
  writeQueue,
} from "./_queueStore.js";
import { getVapidPublicKey, notifyTeacherNewQueueEntry } from "./_push.js";

const allowedAnalyticsTypes = new Set(["visit", "nav_click", "calculation_completed"]);

function getApiPath(request) {
  const url = new URL(request.url, `https://${request.headers.host || "localhost"}`);
  return url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
}

function requireTeacher(request, response) {
  if (isTeacherAuthorized(request)) {
    return true;
  }

  sendJson(response, 401, { message: "Ikke innlogget som lÃ¦rer." });
  return false;
}

async function handleQueue(request, response) {
  if (request.method === "GET") {
    const queue = await readQueue();
    sendJson(response, 200, { queue: publicQueue(queue) });
    return;
  }

  if (request.method === "POST") {
    const validation = validateStudentEntry(request.body || {});

    if (!validation.ok) {
      sendJson(response, 400, { message: validation.message, code: validation.code });
      return;
    }

    const queue = await readQueue();

    if (hasActiveDuplicate(queue, validation.entry.navn)) {
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
    await writeQueue(queue);
    await notifyTeacherNewQueueEntry(publicQueue(queue).length);

    sendJson(response, 201, {
      entry: publicQueue([entry])[0],
      plass: publicQueue(queue).length,
    });
    return;
  }

  sendJson(response, 405, { message: "Metoden er ikke stÃ¸ttet." });
}

async function handleTeacherQueue(request, response) {
  if (!["GET", "DELETE"].includes(request.method)) {
    sendJson(response, 405, { message: "Metoden er ikke stÃ¸ttet." });
    return;
  }

  if (!requireTeacher(request, response)) return;

  if (request.method === "DELETE") {
    const queue = await readQueue();
    const history = anonymizeHelpedQueue(queue).filter((entry) => entry.hjulpet);
    await writeQueue(history);
    sendJson(response, 200, { ok: true, queue: history });
    return;
  }

  const queue = await readQueue();
  const anonymizedQueue = anonymizeHelpedQueue(queue);
  if (JSON.stringify(queue) !== JSON.stringify(anonymizedQueue)) {
    await writeQueue(anonymizedQueue);
  }
  sendJson(response, 200, { queue: anonymizedQueue });
}

async function handleTeacherQueueItem(request, response, id) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Metoden er ikke stÃ¸ttet." });
    return;
  }

  if (!requireTeacher(request, response)) return;

  const queue = await readQueue();
  const entry = queue.find((item) => item.id === id);

  if (!entry) {
    sendJson(response, 404, { message: "Fant ikke eleven i kÃ¸en." });
    return;
  }

  entry.hjulpet = true;
  entry.hjulpetTid = new Date().toISOString();
  entry.navn = "Anonym elev";
  await writeQueue(anonymizeHelpedQueue(queue));
  sendJson(response, 200, { ok: true });
}

async function handleMaterial(request, response) {
  if (request.method === "GET") {
    const list = await readMaterialList();
    sendJson(response, 200, { list: publicMaterialList(list) });
    return;
  }

  if (request.method === "POST") {
    const validation = validateMaterialEntry(request.body || {});

    if (!validation.ok) {
      sendJson(response, 400, { message: validation.message, code: validation.code });
      return;
    }

    const list = await readMaterialList();
    const entry = {
      ...validation.entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      opprettet: new Date().toISOString(),
      behandlet: false,
    };

    list.push(entry);
    await writeMaterialList(list);
    sendJson(response, 201, { entry, list });
    return;
  }

  sendJson(response, 405, { message: "Metoden er ikke stÃ¸ttet." });
}

async function handleTeacherMaterial(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Metoden er ikke stÃ¸ttet." });
    return;
  }

  if (!requireTeacher(request, response)) return;

  const list = await readMaterialList();
  sendJson(response, 200, { list });
}

async function handleTeacherMaterialItem(request, response, id) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Metoden er ikke stÃ¸ttet." });
    return;
  }

  if (!requireTeacher(request, response)) return;

  const list = await readMaterialList();
  const entry = list.find((item) => item.id === id);

  if (!entry) {
    sendJson(response, 404, { message: "Fant ikke materiell i listen." });
    return;
  }

  entry.behandlet = true;
  entry.behandletTid = new Date().toISOString();
  await writeMaterialList(list);
  sendJson(response, 200, { ok: true });
}

async function handleSettings(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Metoden er ikke stÃ¸ttet." });
    return;
  }

  const settings = await readAppSettings();
  sendJson(response, 200, { settings });
}

async function handleTeacherSettings(request, response) {
  if (!["GET", "POST"].includes(request.method)) {
    sendJson(response, 405, { message: "Metoden er ikke stÃ¸ttet." });
    return;
  }

  if (!requireTeacher(request, response)) return;

  if (request.method === "GET") {
    const settings = await readAppSettings();
    sendJson(response, 200, { settings });
    return;
  }

  const settings = await writeAppSettings(request.body || {});
  sendJson(response, 200, { settings });
}

async function handleAnalytics(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Metode ikke tillatt." });
    return;
  }

  const body = request.body || {};
  const type = String(body.type || "");

  if (!allowedAnalyticsTypes.has(type)) {
    sendJson(response, 400, { message: "Ugyldig statistikkhendelse." });
    return;
  }

  const event = await addAnalyticsEvent({
    type,
    category: body.category,
    target: body.target,
  });

  sendJson(response, 201, { event });
}

async function handleTeacherAnalytics(request, response) {
  if (!requireTeacher(request, response)) return;

  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Metode ikke tillatt." });
    return;
  }

  const analytics = await readAnalytics();
  sendJson(response, 200, { analytics });
}

async function handlePushPublicKey(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Metode ikke tillatt." });
    return;
  }

  sendJson(response, 200, { publicKey: getVapidPublicKey() });
}

async function handlePushSubscribe(request, response) {
  if (!requireTeacher(request, response)) return;

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Metode ikke tillatt." });
    return;
  }

  const subscription = request.body?.subscription;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    sendJson(response, 400, { message: "Ugyldig push-abonnement." });
    return;
  }

  const count = await addPushSubscription(subscription);
  sendJson(response, 201, { ok: true, count });
}

async function handlePushUnsubscribe(request, response) {
  if (!requireTeacher(request, response)) return;

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Metode ikke tillatt." });
    return;
  }

  const endpoint = String(request.body?.endpoint || "");

  if (!endpoint) {
    sendJson(response, 400, { message: "Mangler push-endepunkt." });
    return;
  }

  const count = await removePushSubscription(endpoint);
  sendJson(response, 200, { ok: true, count });
}

export default async function handler(request, response) {
  const path = getApiPath(request);

  try {
    if (path === "queue") return await handleQueue(request, response);
    if (path === "teacher/queue") return await handleTeacherQueue(request, response);
    if (path.startsWith("teacher/queue/")) {
      return await handleTeacherQueueItem(request, response, decodeURIComponent(path.replace("teacher/queue/", "")));
    }

    if (path === "material") return await handleMaterial(request, response);
    if (path === "teacher/material") return await handleTeacherMaterial(request, response);
    if (path.startsWith("teacher/material/")) {
      return await handleTeacherMaterialItem(request, response, decodeURIComponent(path.replace("teacher/material/", "")));
    }

    if (path === "settings") return await handleSettings(request, response);
    if (path === "teacher/settings") return await handleTeacherSettings(request, response);

    if (path === "analytics") return await handleAnalytics(request, response);
    if (path === "teacher/analytics") return await handleTeacherAnalytics(request, response);

    if (path === "push/public-key") return await handlePushPublicKey(request, response);
    if (path === "teacher/push/subscribe") return await handlePushSubscribe(request, response);
    if (path === "teacher/push/unsubscribe") return await handlePushUnsubscribe(request, response);

    sendJson(response, 404, { message: "Fant ikke API-ruten." });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
