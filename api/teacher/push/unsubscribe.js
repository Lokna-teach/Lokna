import { isTeacherAuthorized, removePushSubscription, sendJson } from "../../_queueStore.js";

export default async function handler(request, response) {
  if (!isTeacherAuthorized(request)) {
    sendJson(response, 401, { message: "Ikke innlogget." });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Metode ikke tillatt." });
    return;
  }

  try {
    const endpoint = String(request.body?.endpoint || "");

    if (!endpoint) {
      sendJson(response, 400, { message: "Mangler push-endepunkt." });
      return;
    }

    const count = await removePushSubscription(endpoint);
    sendJson(response, 200, { ok: true, count });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Kunne ikke fjerne push-abonnement." });
  }
}
