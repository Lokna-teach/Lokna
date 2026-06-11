import { isTeacherAuthorized, readAnalytics, sendJson } from "../../lib/store.js";

function requireTeacher(request, response) {
  if (isTeacherAuthorized(request)) return true;
  sendJson(response, 401, { message: "Ikke innlogget som lærer." });
  return false;
}

export default async function handler(request, response) {
  try {
    if (!requireTeacher(request, response)) return;

    if (request.method !== "GET") {
      sendJson(response, 405, { message: "Metode ikke tillatt." });
      return;
    }

    const analytics = await readAnalytics();
    sendJson(response, 200, { analytics });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
