import { getVapidPublicKey } from "../_push.js";
import { sendJson } from "../_queueStore.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { message: "Metode ikke tillatt." });
    return;
  }

  sendJson(response, 200, { publicKey: getVapidPublicKey() });
}
