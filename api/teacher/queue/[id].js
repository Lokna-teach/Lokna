import { isTeacherAuthorized, readQueue, sendJson, writeQueue } from "../../_queueStore.js";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Metoden er ikke støttet." });
      return;
    }

    if (!isTeacherAuthorized(request)) {
      sendJson(response, 401, { message: "Ikke innlogget som lærer." });
      return;
    }

    const { id } = request.query;
    const queue = await readQueue();
    const entry = queue.find((item) => item.id === id);

    if (!entry) {
      sendJson(response, 404, { message: "Fant ikke eleven i køen." });
      return;
    }

    entry.hjulpet = true;
    entry.hjulpetTid = new Date().toISOString();
    await writeQueue(queue);

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
