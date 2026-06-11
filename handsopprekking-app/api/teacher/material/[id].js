import { isTeacherAuthorized, readMaterialList, sendJson, writeMaterialList } from "../../../lib/store.js";

function requireTeacher(request, response) {
  if (isTeacherAuthorized(request)) return true;
  sendJson(response, 401, { message: "Ikke innlogget som lærer." });
  return false;
}

export default async function handler(request, response) {
  try {
    if (!requireTeacher(request, response)) return;

    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Metoden er ikke støttet." });
      return;
    }

    const id = String(request.query?.id || "");
    const list = await readMaterialList();
    const entry = list.find((item) => item.id === id);

    if (!entry) {
      sendJson(response, 404, { message: "Fant ikke materiell i listen." });
      return;
    }

    entry.behandlet = true;
    entry.behandletTid = new Date().toISOString();
    await writeMaterialList(list);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
