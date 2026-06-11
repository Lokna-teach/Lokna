import { getVapidPublicKey } from "../../lib/push.js";
import { sendJson } from "../../lib/store.js";

export default async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      sendJson(response, 405, { message: "Metode ikke tillatt." });
      return;
    }

    sendJson(response, 200, { publicKey: getVapidPublicKey() });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
