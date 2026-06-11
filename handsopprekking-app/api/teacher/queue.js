import { anonymizeHelpedQueue, isTeacherAuthorized, readQueue, sendJson, writeQueue } from "../../lib/store.js";

function requireTeacher(request, response) {
  if (isTeacherAuthorized(request)) return true;
  sendJson(response, 401, { message: "Ikke innlogget som lærer." });
  return false;
}

export default async function handler(request, response) {
  try {
    if (!requireTeacher(request, response)) return;

    if (!["GET", "DELETE"].includes(request.method)) {
      sendJson(response, 405, { message: "Metoden er ikke støttet." });
      return;
    }

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
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
