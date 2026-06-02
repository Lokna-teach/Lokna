import { readAppSettings, sendJson } from "./_queueStore.js";

export default async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      sendJson(response, 405, { message: "Metoden er ikke støttet." });
      return;
    }

    const settings = await readAppSettings();
    sendJson(response, 200, { settings });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
