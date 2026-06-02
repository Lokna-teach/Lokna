import { isTeacherAuthorized, readAnalytics, sendJson } from "../_queueStore.js";

export default async function handler(request, response) {
  if (!isTeacherAuthorized(request)) {
    sendJson(response, 401, { message: "Ikke innlogget." });
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Metode ikke tillatt." });
    return;
  }

  try {
    const analytics = await readAnalytics();
    sendJson(response, 200, { analytics });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Kunne ikke hente statistikk." });
  }
}
