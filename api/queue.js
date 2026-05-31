import {
  hasActiveDuplicate,
  publicQueue,
  readQueue,
  sendJson,
  validateStudentEntry,
  writeQueue,
} from "./_queueStore.js";

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const queue = await readQueue();
      sendJson(response, 200, { queue: publicQueue(queue) });
      return;
    }

    if (request.method === "POST") {
      const validation = validateStudentEntry(request.body || {});

      if (!validation.ok) {
        sendJson(response, 400, { message: validation.message });
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

      sendJson(response, 201, {
        entry: publicQueue([entry])[0],
        plass: publicQueue(queue).length,
      });
      return;
    }

    sendJson(response, 405, { message: "Metoden er ikke støttet." });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
