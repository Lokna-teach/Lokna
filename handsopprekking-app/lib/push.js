import webPush from "web-push";
import { readPushSubscriptions, writePushSubscriptions } from "./store.js";

function cleanVapidKey(value, keyName) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(new RegExp(`^${keyName}\\s*=\\s*`, "i"), "")
    .replace(/\s+/g, "");
}

export function getVapidPublicKey() {
  return cleanVapidKey(process.env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");
}

function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = cleanVapidKey(process.env.VAPID_PRIVATE_KEY, "VAPID_PRIVATE_KEY");
  const subject = String(process.env.VAPID_SUBJECT || "mailto:lokna@example.com").trim();

  if (!publicKey || !privateKey) {
    return false;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function notifyTeacherNewQueueEntry(queueLength) {
  try {
    if (!configureWebPush()) {
      return { sent: 0, skipped: true };
    }

    const subscriptions = await readPushSubscriptions();
    const payload = JSON.stringify({
      title: "Ny håndsopprekking",
      body: `${queueLength} ${queueLength === 1 ? "elev står" : "elever står"} i kø.`,
      url: "/",
    });

    let sent = 0;
    const activeSubscriptions = [];

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(subscription, payload);
          sent += 1;
          activeSubscriptions.push(subscription);
        } catch (error) {
          if (![404, 410].includes(error.statusCode)) {
            activeSubscriptions.push(subscription);
          }
        }
      })
    );

    if (activeSubscriptions.length !== subscriptions.length) {
      await writePushSubscriptions(activeSubscriptions);
    }

    return { sent, skipped: false };
  } catch (error) {
    console.warn("Kunne ikke sende pushvarsel:", error.message);
    return { sent: 0, skipped: true, error: error.message };
  }
}
