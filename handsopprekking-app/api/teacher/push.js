import { addPushSubscription, isTeacherAuthorized, removePushSubscription, sendJson } from "../../lib/store.js";
import { sendTeacherTestNotification } from "../../lib/push.js";

function requireTeacher(request, response) {
  if (isTeacherAuthorized(request)) return true;
  sendJson(response, 401, { message: "Ikke innlogget som lærer." });
  return false;
}

export default async function handler(request, response) {
  try {
    if (!requireTeacher(request, response)) return;

    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Metode ikke tillatt." });
      return;
    }

    const action = String(request.body?.action || "");

    if (action === "subscribe") {
      const subscription = request.body?.subscription;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        sendJson(response, 400, { message: "Ugyldig push-abonnement." });
        return;
      }

      const count = await addPushSubscription(subscription);
      sendJson(response, 201, { ok: true, count });
      return;
    }

    if (action === "unsubscribe") {
      const endpoint = String(request.body?.endpoint || "");
      if (!endpoint) {
        sendJson(response, 400, { message: "Mangler push-endepunkt." });
        return;
      }

      const count = await removePushSubscription(endpoint);
      sendJson(response, 200, { ok: true, count });
      return;
    }

    if (action === "test") {
      const result = await sendTeacherTestNotification();
      sendJson(response, 200, { ok: result.sent > 0, ...result });
      return;
    }

    sendJson(response, 400, { message: "Ukjent push-handling." });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
