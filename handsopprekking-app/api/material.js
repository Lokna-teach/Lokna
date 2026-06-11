import { publicMaterialList, readMaterialList, sendJson, validateMaterialEntry, writeMaterialList } from "../lib/store.js";

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const list = await readMaterialList();
      sendJson(response, 200, { list: publicMaterialList(list) });
      return;
    }

    if (request.method === "POST") {
      const validation = validateMaterialEntry(request.body || {});
      if (!validation.ok) {
        sendJson(response, 400, { message: validation.message, code: validation.code });
        return;
      }

      const list = await readMaterialList();
      const entry = {
        ...validation.entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        opprettet: new Date().toISOString(),
        behandlet: false,
      };

      list.push(entry);
      await writeMaterialList(list);
      sendJson(response, 201, { entry, list });
      return;
    }

    sendJson(response, 405, { message: "Metoden er ikke støttet." });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Serverfeil." });
  }
}
