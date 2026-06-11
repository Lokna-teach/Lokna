import webPush from "web-push";
import { readPushSubscriptions, writePushSubscriptions } from "./store.js";

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:lokna@example.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function notifyTeacherNewQueueEntry(queueLength) {
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
}
