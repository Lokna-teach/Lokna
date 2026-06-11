import { anonymizeHelpedQueue, isTeacherAuthorized, readQueue, sendJson, writeQueue } from "../../../lib/store.js";

function requireTeacher(request, response) {
  if (isTeacherAuthorized(request)) return true;
  sendJson(response, 401, { message: "Ikke innlogget som lærer." });
  return false;
}

export default async function handler(request, response) {
  try {
    if (!requireTeacher(request, response)) return;

    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Metoden er ikke støttet." });
      return;
    }

    const id = String(request.query?.id || "");
    const queue = await readQueue();
    const entry = queue.find((item) => item.id === id);

    if (!entry) {
      sendJson(response, 404, { message: "Fant ikke eleven i køen." });
      return;
    }

    entry.hjulpet = true;
    entry.hjulpetTid = new Date().toISOString();
    entry.navn = "Anonym elev";
    await writeQueue(anonymizeHelpedQueue(queue));
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
