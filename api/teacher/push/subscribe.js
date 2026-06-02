import { addPushSubscription, isTeacherAuthorized, sendJson } from "../../_queueStore.js";

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
    const subscription = request.body?.subscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      sendJson(response, 400, { message: "Ugyldig push-abonnement." });
      return;
    }

    const count = await addPushSubscription(subscription);
    sendJson(response, 201, { ok: true, count });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Kunne ikke lagre push-abonnement." });
  }
}
