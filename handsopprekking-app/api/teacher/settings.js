import { isTeacherAuthorized, readAppSettings, sendJson, writeAppSettings } from "../../lib/store.js";

function requireTeacher(request, response) {
  if (isTeacherAuthorized(request)) return true;
  sendJson(response, 401, { message: "Ikke innlogget som lærer." });
  return false;
}

export default async function handler(request, response) {
  try {
    if (!requireTeacher(request, response)) return;

    if (!["GET", "POST"].includes(request.method)) {
      sendJson(response, 405, { message: "Metoden er ikke støttet." });
      return;
    }

    if (request.method === "GET") {
      const settings = await readAppSettings();
      sendJson(response, 200, { settings });
      return;
    }

    const settings = await writeAppSettings(request.body || {});
    sendJson(response, 200, { settings });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
