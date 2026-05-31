import { isTeacherAuthorized, readQueue, sendJson } from "../_queueStore.js";

export default async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      sendJson(response, 405, { message: "Metoden er ikke støttet." });
      return;
    }

    if (!isTeacherAuthorized(request)) {
      sendJson(response, 401, { message: "Ikke innlogget som lærer." });
      return;
    }

    const queue = await readQueue();
    sendJson(response, 200, { queue });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
