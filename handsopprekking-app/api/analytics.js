import { addAnalyticsEvent, sendJson } from "../lib/store.js";

const allowedAnalyticsTypes = new Set(["visit", "nav_click", "calculation_completed"]);

export default async function handler(request, response) {
  try {
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
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
