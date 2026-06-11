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

async function sendTeacherPush(payload) {
  try {
    if (!configureWebPush()) {
      return { sent: 0, skipped: true, subscriptions: 0, errors: ["VAPID-nøkler mangler."] };
    }

    const subscriptions = await readPushSubscriptions();
    const message = JSON.stringify(payload);

    let sent = 0;
    const errors = [];
    const activeSubscriptions = [];

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(subscription, message);
          sent += 1;
          activeSubscriptions.push(subscription);
        } catch (error) {
          if (![404, 410].includes(error.statusCode)) {
            activeSubscriptions.push(subscription);
            errors.push(error.message || "Ukjent pushfeil.");
          }
        }
      })
    );

    if (activeSubscriptions.length !== subscriptions.length) {
      await writePushSubscriptions(activeSubscriptions);
    }

    return {
      sent,
      skipped: false,
      subscriptions: subscriptions.length,
      errors: [...new Set(errors)].slice(0, 3),
    };
  } catch (error) {
    console.warn("Kunne ikke sende pushvarsel:", error.message);
    return { sent: 0, skipped: true, subscriptions: 0, errors: [error.message || "Ukjent pushfeil."] };
  }
}

export async function notifyTeacherNewQueueEntry(queueLength) {
  return sendTeacherPush({
    title: "Ny håndsopprekking",
    body: `${queueLength} ${queueLength === 1 ? "elev står" : "elever står"} i kø.`,
    url: "/",
  });
}

export async function sendTeacherTestNotification() {
  return sendTeacherPush({
    title: "Testvarsel fra Lokna",
    body: "Pushvarsler fungerer på denne enheten.",
    url: "/",
  });
}
