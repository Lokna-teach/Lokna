import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  BellOff,
  Cable,
  Calculator,
  ChevronDown,
  ClipboardCheck,
  Eye,
  EyeOff,
  Flame,
  GraduationCap,
  Hand,
  Info,
  ListChecks,
  LockKeyhole,
  LogOut,
  Package,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Wrench,
  Users,
} from "lucide-react";
import {
  BarRow,
  HelpButton,
  NumberInput,
  SelectInput,
  StatsPanel,
  StatusLine,
  StepCard,
} from "./components/ui.jsx";
import { defaultAppSettings, TEACHER_PASSWORD, TEACHER_STORAGE_KEY, TEACHER_USERNAME } from "./config.js";

const CLASSROOM_ALERT_STORAGE_KEY = "loknaClassroomAlertEnabled";

const menuVisibilityChoices = [
  { id: "handsopprekking", navn: "Håndsopprekking", icon: Hand },
  { id: "materiell", navn: "Materiell", icon: Wrench },
  { id: "beregning", navn: "Beregning", icon: Calculator },
  { id: "beregningKabel", navn: "Kabel og vern", icon: Cable, parent: "Beregning" },
  { id: "beregningJording", navn: "Jording", icon: ShieldCheck, parent: "Beregning" },
  { id: "beregningVarmekabel", navn: "Varmekabel", icon: Flame, parent: "Beregning" },
];
const beregningValg = [
  { id: "beregning-kabel", navn: "Kabel og vern", icon: Cable, visibilityKey: "beregningKabel" },
  { id: "beregning-jording", navn: "Jording", icon: ShieldCheck, visibilityKey: "beregningJording" },
  { id: "beregning-varmekabel", navn: "Varmekabel", icon: Flame, visibilityKey: "beregningVarmekabel" },
];
const sikringsKarakteristikker = {
  A: { i4: 2, i5: 3, forklaring: "Svært følsom karakteristikk." },
  B: { i4: 3, i5: 5, forklaring: "Vanlig ved lite eller ingen startstrøm." },
  C: { i4: 5, i5: 10, forklaring: "Brukes ofte ved moderat startstrøm." },
  D: { i4: 10, i5: 20, forklaring: "Brukes ved høy startstrøm." },
  K: { i4: 8, i5: 12, forklaring: "Ofte brukt ved motorlast." },
};
const sikringsStorrelser = [10, 13, 15, 16, 20, 25, 32, 40, 50, 63, 80];
const forlegningsmater = ["A1", "A2", "B1", "B2", "C", "D1", "D2", "E", "F", "G"];
const sjekklisteValg = [
  "Montørhåndbok",
  "OneNote",
  "Teams",
  "Fagbok",
  "Spurt en klassekompis",
  "Har sett i hele klasserommet",
];

const blokkerteNavnOrd = [
  "admin",
  "anonymous",
  "anonym",
  "alkohol",
  "bitch",
  "batman",
  "captainamerica",
  "cannabis",
  "darthvader",
  "dritt",
  "dop",
  "drugs",
  "dust",
  "gandalf",
  "goku",
  "faen",
  "fitta",
  "fitte",
  "forbanna",
  "fuck",
  "hasj",
  "helvete",
  "hitler",
  "hore",
  "idiot",
  "ironman",
  "jævel",
  "javel",
  "joker",
  "kokain",
  "krig",
  "kuk",
  "marihuana",
  "marijuana",
  "nazi",
  "neger",
  "narkotika",
  "naruto",
  "penis",
  "pikachu",
  "pokemon",
  "rasist",
  "rus",
  "rusmiddel",
  "sauron",
  "satan",
  "sex",
  "spiderman",
  "superman",
  "test",
  "tiss",
  "thor",
  "voldemort",
  "weed",
  "ww2",
  "yoda",
];

function hasValue(value) {
  return String(value ?? "").trim() !== "";
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDecimal(value) {
  return parseNumber(value).toFixed(2).replace(".", ",");
}

function formatAmpere(value) {
  return `${formatDecimal(value)} A`;
}

function formatWholeAmpere(value) {
  return hasValue(value) ? `${parseNumber(value).toFixed(0)} A` : "";
}

function formatWholeAmpereOrZero(value) {
  return `${parseNumber(value).toFixed(0)} A`;
}

function formatDecimalOrBlank(value) {
  return hasValue(value) ? formatDecimal(value) : "";
}

function formatAmpereOrBlank(value) {
  return hasValue(value) ? formatAmpere(value) : "";
}

function normalizeForFilter(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå]/g, "");
}

function beregnKabelResultat(input) {
  const safeKt = parseNumber(input.kt, 1) || 1;
  const safeKn = parseNumber(input.kn, 1) || 1;
  const safeIb = parseNumber(input.ib);
  const safeIn = parseNumber(input.sikring);
  const safeIzAvlest = parseNumber(input.izAvlest);
  const safeIzManuell = parseNumber(input.izManuell, NaN);
  const safeI2Faktor = parseNumber(input.i2Faktor);
  const valgtKarakteristikk =
    sikringsKarakteristikker[input.karakteristikk] || sikringsKarakteristikker.B;

  const izmin = safeIn / (safeKt * safeKn);
  const izBeregnet = safeIzAvlest * safeKt * safeKn;
  const iz = Number.isFinite(safeIzManuell) ? safeIzManuell : izBeregnet;
  const i2 = safeIn * safeI2Faktor;
  const i5 = valgtKarakteristikk.i5 * safeIn;
  const tverrsnittTall = parseNumber(input.tverrsnitt);
  const erBoligLandbrukHagebruk = input.installasjonstype === "Bolig / landbruk / hagebruk";
  const erIndustriNaering = input.installasjonstype === "Industri / næring";
  const erLavtTverrsnitt = tverrsnittTall <= 4;
  const brukerBoligLavtRegelsett = erBoligLandbrukHagebruk && erLavtTverrsnitt;
  const kreverTabell62g = erIndustriNaering && erLavtTverrsnitt;
  const krav1Ok = brukerBoligLavtRegelsett
    ? safeIb <= safeIn
    : safeIb <= safeIn && safeIn <= iz;
  const krav2Ok = brukerBoligLavtRegelsett ? i2 <= iz : i2 <= 1.45 * iz;
  const tabell62gOk = !kreverTabell62g || input.tabell62gKontrollert;

  return {
    izmin,
    iz,
    izBeregnet,
    i2,
    i5,
    krav1Ok,
    krav2Ok,
    tabell62gOk,
    brukerBoligLavtRegelsett,
    kreverTabell62g,
    samletOk: krav1Ok && krav2Ok && tabell62gOk,
    valgtKarakteristikk,
  };
}

function hasUnwantedWords(value) {
  const normalized = normalizeForFilter(value);
  return blokkerteNavnOrd.some((ord) => normalized.includes(normalizeForFilter(ord)));
}

function validateStudentName(navn) {
  const trimmed = String(navn || "").trim();
  const normalized = normalizeForFilter(trimmed);

  if (trimmed.length < 2) return "Skriv inn et ekte navn.";
  if (trimmed.length > 20) return "Navnet kan maks være 20 bokstaver.";
  if (!/^[a-zA-ZæøåÆØÅ ]+$/.test(trimmed)) {
    return "Bruk kun bokstaver i navnet.";
  }
  if (/(.)\1{3,}/.test(normalized)) return "Bruk et ekte navn.";
  if (hasUnwantedWords(trimmed)) {
    return "Bruk et ordentlig navn.";
  }

  return "";
}

function FyModal({ onClose }) {
  return (
    <div className="fy-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="fy-modal-title">
      <div className="fy-modal">
        <h2 id="fy-modal-title">FY deg, det er ikke lov :) !</h2>
        <button type="button" className="primary-button" onClick={onClose}>
          Ok, jeg skal være snill
        </button>
      </div>
    </div>
  );
}

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function laererAuthHeader() {
  return `Basic ${btoa(`${TEACHER_USERNAME}:${TEACHER_PASSWORD}`)}`;
}

function formatVentetid(minutter) {
  if (!Number.isFinite(minutter)) return "-";
  if (minutter < 1) return "Under 1 min";
  return `${Math.round(minutter)} min`;
}

function getVentetidMinutter(innslag) {
  if (!innslag.opprettet || !innslag.hjulpetTid) return NaN;
  return (new Date(innslag.hjulpetTid).getTime() - new Date(innslag.opprettet).getTime()) / 60000;
}

function formatDato(value) {
  return value ? new Date(value).toLocaleDateString("nb-NO") : "-";
}

function formatMonthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("nb-NO", {
    month: "short",
    year: "numeric",
  });
}

async function readApiResponse(response, fallbackMessage) {
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(fallbackMessage);
    }
  }

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

async function hentElevKoFraApi() {
  const response = await fetch("/api/queue", { cache: "no-store" });
  const data = await readApiResponse(response, "Køserveren svarte ikke riktig. Sjekk Vercel Functions-loggen.");
  return Array.isArray(data.queue) ? data.queue : [];
}

async function hentLaererKoFraApi() {
  const response = await fetch("/api/teacher/queue", {
    cache: "no-store",
    headers: { Authorization: laererAuthHeader() },
  });
  const data = await readApiResponse(
    response,
    "Lærerkøen svarte ikke riktig. Sjekk at API-filene er deployet i Vercel."
  );
  return Array.isArray(data.queue) ? data.queue : [];
}

async function hentMateriellFraApi() {
  const response = await fetch("/api/material", { cache: "no-store" });
  const data = await readApiResponse(response, "Materiell-listen svarte ikke riktig.");
  return Array.isArray(data.list) ? data.list : [];
}

async function hentLaererMateriellFraApi() {
  const response = await fetch("/api/teacher/material", {
    cache: "no-store",
    headers: { Authorization: laererAuthHeader() },
  });
  const data = await readApiResponse(response, "Materiell-listen svarte ikke riktig.");
  return Array.isArray(data.list) ? data.list : [];
}

async function hentLaererAnalyticsFraApi() {
  const response = await fetch("/api/teacher/analytics", {
    cache: "no-store",
    headers: { Authorization: laererAuthHeader() },
  });
  const data = await readApiResponse(response, "Statistikken svarte ikke riktig.");
  return Array.isArray(data.analytics) ? data.analytics : [];
}

async function loggStatistikk(type, category = "app", target = "") {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, category, target }),
    });
  } catch {
    // Statistikk skal aldri stoppe appflyten for elever.
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register("/sw.js");
}

async function hentVapidPublicKey() {
  const response = await fetch("/api/push/public-key", { cache: "no-store" });
  const data = await readApiResponse(response, "Kunne ikke hente varselnøkkel.");
  return data.publicKey || "";
}

async function subscribeTeacherPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("Denne nettleseren støtter ikke pushvarsler.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Varsler er ikke tillatt på denne enheten.");
  }

  const publicKey = await hentVapidPublicKey();

  if (!publicKey) {
    throw new Error("VAPID_PUBLIC_KEY mangler på serveren.");
  }

  const registration = await registerServiceWorker();
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await saveTeacherPushSubscription(subscription);
  return subscription;
}

async function saveTeacherPushSubscription(subscription) {
  const response = await fetch("/api/teacher/push", {
    method: "POST",
    headers: {
      Authorization: laererAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "subscribe", subscription }),
  });

  await readApiResponse(response, "Kunne ikke aktivere varsler.");
  return subscription;
}

async function unsubscribeTeacherPush() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await fetch("/api/teacher/push", {
    method: "POST",
    headers: {
      Authorization: laererAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "unsubscribe", endpoint: subscription.endpoint }),
  });

  await subscription.unsubscribe();
}

async function sendTeacherPushTest() {
  const response = await fetch("/api/teacher/push", {
    method: "POST",
    headers: {
      Authorization: laererAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "test" }),
  });

  return readApiResponse(response, "Kunne ikke sende testvarsel.");
}

function playClassroomAlertSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.setValueAtTime(660, context.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.38);
  window.setTimeout(() => context.close(), 600);
}

function varsleNyElevLokalt(nyeElever, totalIKo) {
  try {
    playClassroomAlertSound();
  } catch {
    // Lyd er bare ekstra hjelp. Køflyten må ikke stoppe hvis nettleseren blokkerer lyd.
  }

  if ("vibrate" in navigator) {
    navigator.vibrate([180, 80, 180]);
  }

  if ("Notification" in window && Notification.permission === "granted") {
    const body =
      nyeElever === 1
        ? `${totalIKo} ${totalIKo === 1 ? "elev står" : "elever står"} i kø.`
        : `${nyeElever} nye elever. ${totalIKo} står i kø.`;
    new Notification("Ny håndsopprekking", {
      body,
      icon: "/icon.svg",
      tag: "lokna-klasseromsvarsel",
    });
  }
}

function normalizeSettings(settings) {
  return {
    ...defaultAppSettings,
    ...settings,
    visibleMenus: {
      ...defaultAppSettings.visibleMenus,
      ...(settings?.visibleMenus || {}),
    },
  };
}

function getBeregningVisibilityKey(side) {
  return beregningValg.find((valg) => valg.id === side)?.visibilityKey || "beregning";
}

async function hentInnstillingerFraApi() {
  const response = await fetch("/api/settings", { cache: "no-store" });
  const data = await readApiResponse(response, "Innstillingene svarte ikke riktig.");
  return normalizeSettings(data.settings);
}

async function hentLaererInnstillingerFraApi() {
  const response = await fetch("/api/teacher/settings", {
    cache: "no-store",
    headers: { Authorization: laererAuthHeader() },
  });
  const data = await readApiResponse(response, "Innstillingene svarte ikke riktig.");
  return normalizeSettings(data.settings);
}

async function lagreLaererInnstillinger(settings) {
  const response = await fetch("/api/teacher/settings", {
    method: "POST",
    headers: {
      Authorization: laererAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  const data = await readApiResponse(response, "Kunne ikke lagre innstillinger.");
  return normalizeSettings(data.settings);
}

function LoginScreen({ onLogin }) {
  const [brukernavn, setBrukernavn] = useState("");
  const [passord, setPassord] = useState("");
  const [feilmelding, setFeilmelding] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (brukernavn.trim().toLowerCase() === TEACHER_USERNAME && passord === TEACHER_PASSWORD) {
      sessionStorage.setItem(TEACHER_STORAGE_KEY, "true");
      onLogin();
      return;
    }

    setFeilmelding("Feil brukernavn eller passord.");
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon">
          <LockKeyhole size={28} />
        </div>
        <div>
          <p className="portal-eyebrow">Lærerside</p>
          <h1>Logg inn</h1>
          <p className="muted-text">Logg inn for å se detaljer og statistikk.</p>
        </div>

        <label className="field">
          <span>Brukernavn</span>
          <input
            autoComplete="username"
            value={brukernavn}
            onChange={(event) => {
              setBrukernavn(event.target.value);
              setFeilmelding("");
            }}
          />
        </label>

        <label className="field">
          <span>Passord</span>
          <input
            autoComplete="current-password"
            type="password"
            value={passord}
            onChange={(event) => {
              setPassord(event.target.value);
              setFeilmelding("");
            }}
          />
        </label>

        {feilmelding && <p className="queue-error">{feilmelding}</p>}

        <button type="submit" className="primary-button">
          Logg inn
        </button>
      </form>
    </main>
  );
}

function TopBar({ aktivSide, erLaererInnlogget, innstillinger, onLogout, onOpenTeacher, onVelgSide }) {
  const [visBeregning, setVisBeregning] = useState(false);
  const aktivBeregning = aktivSide.startsWith("beregning-");
  const visibleMenus = innstillinger.visibleMenus;
  const synligeBeregninger = beregningValg.filter((valg) => visibleMenus[valg.visibilityKey]);
  const visBeregningMeny = visibleMenus.beregning && synligeBeregninger.length > 0;

  return (
    <header className="top-bar">
      {erLaererInnlogget ? (
        <div className="brand-mark">
          <GraduationCap size={20} />
          <span>Lærervisning</span>
        </div>
      ) : (
        <div className="top-nav">
          {visibleMenus.handsopprekking && (
            <button
              type="button"
              className={`nav-pill ${aktivSide === "handsopprekking" ? "active" : ""}`}
              onClick={() => onVelgSide("handsopprekking")}
            >
              <Hand size={20} />
              Håndsopprekking
            </button>
          )}
          {visibleMenus.materiell && (
            <button
              type="button"
              className={`nav-pill ${aktivSide === "materiell" ? "active" : ""}`}
              onClick={() => onVelgSide("materiell")}
            >
              <Wrench size={20} />
              Materiell/verktøy
            </button>
          )}
          {visBeregningMeny && (
            <div className="dropdown-shell">
              <button
                type="button"
                className={`nav-pill ${aktivBeregning ? "active" : ""}`}
                onClick={() => setVisBeregning((forrige) => !forrige)}
              >
                <Calculator size={20} />
                Beregning
                <ChevronDown size={18} />
              </button>
              {visBeregning && (
                <div className="dropdown-menu">
                  {synligeBeregninger.map((valg) => {
                    const Icon = valg.icon;
                    return (
                      <button
                        type="button"
                        className={aktivSide === valg.id ? "active" : ""}
                        key={valg.id}
                        onClick={() => {
                          onVelgSide(valg.id);
                          setVisBeregning(false);
                        }}
                      >
                        <Icon size={18} />
                        {valg.navn}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {erLaererInnlogget ? (
        <button type="button" className="ghost-button" onClick={onLogout}>
          <LogOut size={18} />
          Logg ut
        </button>
      ) : (
        <button type="button" className="teacher-login-button" onClick={onOpenTeacher}>
          <GraduationCap size={20} />
          Lærer
        </button>
      )}
    </header>
  );
}

function MaterialList({ list }) {
  if (list.length === 0) {
    return <div className="empty-queue">Ingen materiell eller verktøy er lagt inn ennå.</div>;
  }

  return (
    <div className="material-list">
      {list.map((item) => (
        <article className="material-item" key={item.id}>
          <div>
            <strong>{item.typeUtstyr}</strong>
            <p>El nummer: {item.elnummer}</p>
          </div>
          <span>{item.antall} stk</span>
        </article>
      ))}
    </div>
  );
}

function MaterialStatus({ list }) {
  const behandlet = list.filter((item) => item.behandlet && item.behandletTid);
  const maanedsStatistikk = Object.entries(
    behandlet.reduce((statistikk, item) => {
      const key = formatMonthKey(item.behandletTid);
      if (!key) return statistikk;
      return { ...statistikk, [key]: (statistikk[key] || 0) + 1 };
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, antall]) => ({ key, label: formatMonthLabel(key), antall }));
  const maksMaanedAntall = Math.max(1, ...maanedsStatistikk.map((item) => item.antall));
  const sisteBehandlet = [...behandlet]
    .sort((a, b) => new Date(b.behandletTid).getTime() - new Date(a.behandletTid).getTime())
    .slice(0, 5);

  return (
    <div className="teacher-status">
      <div className="stat-grid">
        <div className="stat-card">
          <span>Totalt behandlet</span>
          <strong>{behandlet.length}</strong>
        </div>
        <div className="stat-card">
          <span>Aktive ønsker</span>
          <strong>{list.filter((item) => !item.behandlet).length}</strong>
        </div>
        <div className="stat-card">
          <span>Sist behandlet</span>
          <strong>{behandlet.length ? formatDato(sisteBehandlet[0].behandletTid) : "-"}</strong>
        </div>
        <div className="stat-card">
          <span>Antall totalt</span>
          <strong>{behandlet.reduce((sum, item) => sum + Number(item.antall || 0), 0)}</strong>
        </div>
      </div>

      <StatsPanel title="Materiell per måned" eyebrow="Statistikk">
        {maanedsStatistikk.length === 0 ? (
          <div className="empty-queue">Ingen behandlet materiell ennå.</div>
        ) : (
          <div className="bar-chart">
            {maanedsStatistikk.map((item) => (
              <BarRow key={item.key} label={item.label} value={item.antall} max={maksMaanedAntall} />
            ))}
          </div>
        )}
      </StatsPanel>

      <StatsPanel title="Historikk" eyebrow="Materiell">
        {sisteBehandlet.length === 0 ? (
          <div className="empty-queue">Ingen historikk ennå.</div>
        ) : (
          <div className="material-list">
            {sisteBehandlet.map((item) => (
              <article className="material-item" key={item.id}>
                <div>
                  <strong>{item.typeUtstyr}</strong>
                  <p>El nummer: {item.elnummer}</p>
                  <p>Behandlet: {formatDato(item.behandletTid)}</p>
                </div>
                <span>{item.antall} stk</span>
              </article>
            ))}
          </div>
        )}
      </StatsPanel>
    </div>
  );
}

function AnalyticsStatus({ analytics }) {
  const visits = analytics.filter((event) => event.type === "visit");
  const clicks = analytics.filter((event) => event.type === "nav_click");
  const calculations = analytics.filter((event) => event.type === "calculation_completed");
  const clickStats = Object.entries(
    clicks.reduce((stats, event) => {
      const key = event.target || event.category || "ukjent";
      return { ...stats, [key]: (stats[key] || 0) + 1 };
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .map(([key, antall]) => ({ key, label: key, antall }));
  const maxClicks = Math.max(1, ...clickStats.map((item) => item.antall));

  return (
    <div className="teacher-status">
      <div className="stat-grid">
        <div className="stat-card">
          <span>Besøk</span>
          <strong>{visits.length}</strong>
        </div>
        <div className="stat-card">
          <span>Menyklikk</span>
          <strong>{clicks.length}</strong>
        </div>
        <div className="stat-card">
          <span>Kabelberegninger</span>
          <strong>{calculations.filter((event) => event.category === "kabel-og-vern").length}</strong>
        </div>
        <div className="stat-card">
          <span>Siste aktivitet</span>
          <strong>{analytics.length ? formatDato(analytics.at(-1).opprettet) : "-"}</strong>
        </div>
      </div>

      <StatsPanel title="Klikk per område" eyebrow="Bruk">
        {clickStats.length === 0 ? (
          <div className="empty-queue">Ingen klikk registrert ennå.</div>
        ) : (
          <div className="bar-chart">
            {clickStats.map((item) => (
              <BarRow key={item.key} label={item.label} value={item.antall} max={maxClicks} />
            ))}
          </div>
        )}
      </StatsPanel>
    </div>
  );
}

function EmptyCategoryStats({ title }) {
  return (
    <StatsPanel title={title} eyebrow="Statistikk">
      <div className="empty-queue">Denne modulen har egen statistikkside klar, men ingen tall logges ennå.</div>
    </StatsPanel>
  );
}

function MateriellPage({ list, feil, onLeggTilMateriell }) {
  const [elnummer, setElnummer] = useState("");
  const [typeUtstyr, setTypeUtstyr] = useState("");
  const [antall, setAntall] = useState(1);
  const [harSjekket, setHarSjekket] = useState(false);
  const [melding, setMelding] = useState("");
  const [sender, setSender] = useState(false);
  const [visFyPopup, setVisFyPopup] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (hasUnwantedWords(typeUtstyr)) {
      setVisFyPopup(true);
      setMelding("");
      return;
    }

    if (!hasValue(elnummer) || !hasValue(typeUtstyr) || !Number.isFinite(Number(antall))) {
      setMelding("Fyll inn el nummer, type utstyr og antall.");
      return;
    }

    if (!harSjekket) {
      setMelding("Du må først sjekke i klasserommet og på lager.");
      return;
    }

    setSender(true);
    try {
      await onLeggTilMateriell({
        elnummer: elnummer.trim(),
        typeUtstyr: typeUtstyr.trim(),
        antall: Number(antall),
        harSjekket,
      });
      setElnummer("");
      setTypeUtstyr("");
      setAntall(1);
      setHarSjekket(false);
      setMelding("Lagt til i materiell-listen.");
    } catch (error) {
      if (error.message === "FY deg, det er ikke lov :) !") {
        setVisFyPopup(true);
      }
      setMelding(error.message || "Kunne ikke legge til akkurat nå.");
    } finally {
      setSender(false);
    }
  }

  return (
    <section className="page">
      {visFyPopup && <FyModal onClose={() => setVisFyPopup(false)} />}

      <header className="hero">
        <div>
          <h1>Materiell/verktøy</h1>
          <p>Legg inn materiell eller verktøy som mangler etter at du har sjekket først.</p>
        </div>
        <div className="hero-stat">
          <Package size={22} />
          <span>{list.length}</span>
          <strong>på lista</strong>
        </div>
      </header>

      <div className="layout">
        <section className="card">
          <div className="section-heading">
            <div className="section-icon">
              <PlusCircle size={22} />
            </div>
            <div>
              <p className="portal-eyebrow">Elev</p>
              <h2>Legg til i liste</h2>
              <p className="muted-text">Sjekk klasserommet og lager før du legger inn behovet.</p>
            </div>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>El nummer</span>
              <input
                inputMode="numeric"
                value={elnummer}
                onChange={(event) => {
                  setElnummer(event.target.value);
                  setMelding("");
                }}
                placeholder="F.eks. 1234567"
              />
            </label>

            <label className="field">
              <span>Type utstyr</span>
              <input
                value={typeUtstyr}
                onChange={(event) => {
                  setTypeUtstyr(event.target.value);
                  setMelding("");
                }}
                placeholder="F.eks. PR 2x2,5 eller tang"
              />
            </label>

            <label className="field">
              <span>Antall</span>
              <input
                min={1}
                max={999}
                type="number"
                value={antall}
                onChange={(event) => {
                  setAntall(event.target.value);
                  setMelding("");
                }}
              />
            </label>

            <label className={`checkbox-row single-check ${harSjekket ? "checked" : ""}`}>
              <input
                checked={harSjekket}
                type="checkbox"
                onChange={(event) => {
                  setHarSjekket(event.target.checked);
                  setMelding("");
                }}
              />
              <span>Har sett i klasserommet/på lager</span>
            </label>

            {melding && <p className="queue-message">{melding}</p>}

            <button type="submit" className="primary-button" disabled={sender}>
              {sender ? "Legger til..." : "Legg til i liste"}
            </button>
          </form>
        </section>

        <aside className="queue-panel">
          <div className="queue-panel-header">
            <div>
              <p className="portal-eyebrow">Liste</p>
              <h2>Materiell og verktøy</h2>
              <p className="muted-text">Enkel oversikt over det som er meldt inn.</p>
            </div>
          </div>

          {feil ? <div className="queue-error">{feil}</div> : <MaterialList list={list} />}
        </aside>
      </div>
    </section>
  );
}

function BeregningLogin({ onLogin }) {
  const [brukernavn, setBrukernavn] = useState("");
  const [passord, setPassord] = useState("");
  const [feilmelding, setFeilmelding] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (brukernavn.trim().toLowerCase() === TEACHER_USERNAME && passord === TEACHER_PASSWORD) {
      onLogin();
      return;
    }

    setFeilmelding("Feil brukernavn eller passord.");
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon">
          <LockKeyhole size={28} />
        </div>
        <div>
          <p className="portal-eyebrow">Beregning</p>
          <h1>Passordbeskyttet</h1>
          <p className="muted-text">Beregninger er skjermet frem til lansering.</p>
        </div>

        <label className="field">
          <span>Brukernavn</span>
          <input
            autoComplete="username"
            value={brukernavn}
            onChange={(event) => {
              setBrukernavn(event.target.value);
              setFeilmelding("");
            }}
          />
        </label>

        <label className="field">
          <span>Passord</span>
          <input
            autoComplete="current-password"
            type="password"
            value={passord}
            onChange={(event) => {
              setPassord(event.target.value);
              setFeilmelding("");
            }}
          />
        </label>

        {feilmelding && <p className="queue-error">{feilmelding}</p>}

        <button type="submit" className="primary-button">
          Åpne beregning
        </button>
      </form>
    </main>
  );
}

function KabelOgVernPage() {
  const [kurs, setKurs] = useState("");
  const [ib, setIb] = useState("");
  const [sikring, setSikring] = useState("");
  const [karakteristikk, setKarakteristikk] = useState("B");
  const [izAvlest, setIzAvlest] = useState("");
  const [izSvar, setIzSvar] = useState("");
  const [kt, setKt] = useState("1");
  const [kn, setKn] = useState("1");
  const [i2Faktor, setI2Faktor] = useState("1,45");
  const [installasjonstype, setInstallasjonstype] = useState("Industri / næring");
  const [tverrsnitt, setTverrsnitt] = useState("2,5");
  const [tabell62gKontrollert, setTabell62gKontrollert] = useState(false);

  const resultat = beregnKabelResultat({
    ib,
    sikring,
    karakteristikk,
    i2Faktor,
    izAvlest,
    izManuell: izSvar,
    kt,
    kn,
    installasjonstype,
    tverrsnitt,
    tabell62gKontrollert,
  });
  const manglerVerdier = !hasValue(ib) || !hasValue(sikring) || !hasValue(izAvlest);

  function startPaNy() {
    setKurs("");
    setIb("");
    setSikring("");
    setKarakteristikk("B");
    setIzAvlest("");
    setIzSvar("");
    setKt("1");
    setKn("1");
    setI2Faktor("1,45");
    setInstallasjonstype("Industri / næring");
    setTverrsnitt("2,5");
    setTabell62gKontrollert(false);
  }

  return (
    <section className="page">
      <header className="hero">
        <div>
          <p className="portal-eyebrow">Beregning</p>
          <h1>Kabel og vern</h1>
          <p>Koordinering av tverrsnitt og vern. Kun for undervisning.</p>
        </div>
        <div className={`calculation-result ${manglerVerdier ? "missing" : resultat.samletOk ? "approved" : "rejected"}`}>
          <span>Konklusjon</span>
          <strong>{manglerVerdier ? "Fyll inn" : resultat.samletOk ? "OK" : "Ikke OK"}</strong>
        </div>
      </header>

      <div className="calculation-layout">
        <section className="card">
          <div className="section-heading">
            <div className="section-icon">
              <Cable size={22} />
            </div>
            <div>
              <h2>Steg for steg</h2>
              <p className="muted-text">Legg inn verdiene du bruker i oppgaven.</p>
            </div>
          </div>

          <div className="form">
            <label className="field">
              <span>Kurs til</span>
              <input value={kurs} onChange={(event) => setKurs(event.target.value)} placeholder="F.eks. stikk kjøkken" />
            </label>

            <div className="two-column">
              <NumberInput label="IB belastningsstrøm" value={ib} onChange={setIb} suffix="A" />
              <SelectInput label="IN sikringsstørrelse" value={sikring} onChange={setSikring}>
                <option value="">Velg sikring</option>
                {sikringsStorrelser.map((amp) => (
                  <option key={amp} value={amp}>{amp} A</option>
                ))}
              </SelectInput>
            </div>

            <div className="three-column">
              <SelectInput label="Karakteristikk" value={karakteristikk} onChange={setKarakteristikk}>
                {Object.keys(sikringsKarakteristikker).map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </SelectInput>
              <NumberInput label="Kt temperatur" value={kt} onChange={setKt} />
              <NumberInput label="Kn nærføring" value={kn} onChange={setKn} />
            </div>

            <div className="three-column">
              <SelectInput label="Tverrsnitt" value={tverrsnitt} onChange={setTverrsnitt}>
                <option>1,5</option>
                <option>2,5</option>
                <option>4</option>
                <option>6</option>
                <option>10</option>
                <option>16</option>
                <option>25</option>
              </SelectInput>
              <SelectInput label="Forlegningsmåte" value={forlegningsmater[0]} onChange={() => {}}>
                {forlegningsmater.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </SelectInput>
              <NumberInput label="I2 faktor" value={i2Faktor} onChange={setI2Faktor} />
            </div>

            <div className="two-column">
              <NumberInput label="IZ avlest" value={izAvlest} onChange={setIzAvlest} suffix="A" />
              <NumberInput label="IZ manuelt kontrollert" value={izSvar} onChange={setIzSvar} suffix="A" />
            </div>

            <SelectInput label="Installasjonstype" value={installasjonstype} onChange={setInstallasjonstype}>
              <option>Industri / næring</option>
              <option>Bolig / landbruk / hagebruk</option>
            </SelectInput>

            {resultat.kreverTabell62g && (
              <label className={`checkbox-row single-check ${tabell62gKontrollert ? "checked" : ""}`}>
                <input
                  checked={tabell62gKontrollert}
                  type="checkbox"
                  onChange={(event) => setTabell62gKontrollert(event.target.checked)}
                />
                <span>Tabell 6.2g er kontrollert</span>
              </label>
            )}

            <button type="button" className="danger-button" onClick={startPaNy}>
              <RotateCcw size={18} />
              Start på ny
            </button>
          </div>
        </section>

        <aside className="queue-panel">
          <div className="queue-panel-header">
            <div>
              <p className="portal-eyebrow">Oppsummering</p>
              <h2>{kurs || "Kurs ikke valgt"}</h2>
              <p className="muted-text">{resultat.valgtKarakteristikk.forklaring}</p>
            </div>
          </div>

          <div className="status-stack">
            <StatusLine
              ok={!manglerVerdier}
              title="IZmin"
              text={manglerVerdier ? "Fyll inn IB, IN og IZ avlest." : `Minste strømføringsevne: ${formatAmpere(resultat.izmin)}`}
            />
            <StatusLine
              ok={resultat.krav1Ok}
              title="Krav 1"
              text={`IB ≤ IN ≤ IZ: ${formatAmpere(parseNumber(ib))} ≤ ${formatAmpere(parseNumber(sikring))} ≤ ${formatAmpere(resultat.iz)}`}
            />
            <StatusLine
              ok={resultat.krav2Ok}
              title="Krav 2"
              text={`I2 = ${formatAmpere(resultat.i2)}. IZ = ${formatAmpere(resultat.iz)}.`}
            />
            {resultat.kreverTabell62g && (
              <StatusLine
                ok={resultat.tabell62gOk}
                title="Tabell 6.2g"
                text="Kreves for industri/næring med tverrsnitt opp til og med 4 mm²."
              />
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function KabelOgVernOriginalPage() {
  const [kurs, setKurs] = useState("");
  const [ib, setIb] = useState("");
  const [sikring, setSikring] = useState("");
  const [karakteristikk, setKarakteristikk] = useState("");
  const [i2Faktor, setI2Faktor] = useState("");
  const [forlegning, setForlegning] = useState("");
  const [isolasjon, setIsolasjon] = useState("");
  const [metall, setMetall] = useState("");
  const [ledere, setLedere] = useState("");
  const [tverrsnitt, setTverrsnitt] = useState("");
  const [installasjonstype, setInstallasjonstype] = useState("");
  const [izAvlest, setIzAvlest] = useState("");
  const [kt, setKt] = useState("");
  const [kn, setKn] = useState("");
  const [izminSvar, setIzminSvar] = useState("");
  const [izSvar, setIzSvar] = useState("");
  const [tabell62gKontrollert, setTabell62gKontrollert] = useState(false);
  const [visHjelp, setVisHjelp] = useState({});
  const [harLoggetBeregning, setHarLoggetBeregning] = useState(false);

  const toggleHjelp = (key) => setVisHjelp((forrige) => ({ ...forrige, [key]: !forrige[key] }));

  const resultat = useMemo(
    () =>
      beregnKabelResultat({
        ib,
        sikring,
        karakteristikk,
        i2Faktor,
        izAvlest,
        izManuell: izSvar,
        kt,
        kn,
        installasjonstype,
        tverrsnitt,
        tabell62gKontrollert,
      }),
    [ib, sikring, karakteristikk, i2Faktor, izAvlest, izSvar, kt, kn, installasjonstype, tverrsnitt, tabell62gKontrollert]
  );

  const krav1Formel = resultat.brukerBoligLavtRegelsett ? "IB ≤ IN" : "IB ≤ IN ≤ IZ";
  const krav1Verdier = resultat.brukerBoligLavtRegelsett
    ? `${formatAmpere(ib)} ≤ ${formatWholeAmpereOrZero(sikring)}`
    : `${formatAmpere(ib)} ≤ ${formatWholeAmpereOrZero(sikring)} ≤ ${formatAmpere(resultat.iz)}`;
  const krav2Formel = resultat.brukerBoligLavtRegelsett ? "I2 ≤ IZ" : "I2 ≤ 1,45 × IZ";
  const krav2Verdier = resultat.brukerBoligLavtRegelsett
    ? `${formatAmpere(resultat.i2)} ≤ ${formatAmpere(resultat.iz)}`
    : `${formatAmpere(resultat.i2)} ≤ ${formatAmpere(1.45 * resultat.iz)}`;

  const manglerVerdier =
    !hasValue(ib) ||
    !hasValue(sikring) ||
    !hasValue(karakteristikk) ||
    !hasValue(i2Faktor) ||
    !hasValue(forlegning) ||
    !hasValue(isolasjon) ||
    !hasValue(metall) ||
    !hasValue(ledere) ||
    !hasValue(tverrsnitt) ||
    !hasValue(installasjonstype) ||
    !hasValue(izAvlest) ||
    !hasValue(kt) ||
    !hasValue(kn) ||
    !hasValue(izminSvar) ||
    !hasValue(izSvar);
  const konklusjonTekst = manglerVerdier ? "Verdier mangler" : resultat.samletOk ? "Godkjent" : "Ikke godkjent";

  useEffect(() => {
    if (!manglerVerdier && !harLoggetBeregning) {
      loggStatistikk("calculation_completed", "kabel-og-vern", "Kabel og vern");
      setHarLoggetBeregning(true);
    }
  }, [harLoggetBeregning, manglerVerdier]);

  function startPaNy() {
    setKurs("");
    setIb("");
    setSikring("");
    setKarakteristikk("");
    setI2Faktor("");
    setForlegning("");
    setIsolasjon("");
    setMetall("");
    setLedere("");
    setTverrsnitt("");
    setInstallasjonstype("");
    setIzAvlest("");
    setKt("");
    setKn("");
    setIzminSvar("");
    setIzSvar("");
    setTabell62gKontrollert(false);
    setVisHjelp({});
    setHarLoggetBeregning(false);
  }

  return (
    <section className="page">
      <header className="hero">
        <div>
          <p className="portal-eyebrow">Beregning</p>
          <h1>6.2.5 Kabel og vern</h1>
          <p>Original kabelberegning med steg, kontroll og rapport. Kun for undervisning.</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="danger-button" onClick={startPaNy}>
            <RotateCcw size={18} />
            Start på ny
          </button>
          <div className={`calculation-result ${manglerVerdier ? "missing" : resultat.samletOk ? "approved" : "rejected"}`}>
            <span>Konklusjon</span>
            <strong>{konklusjonTekst}</strong>
          </div>
        </div>
      </header>

      <div className="calculation-layout">
        <section className="card">
          <div className="section-heading">
            <div className="section-icon"><Cable size={22} /></div>
            <div>
              <h2>Kabelberegning steg for steg</h2>
              <p className="muted-text">Samme funksjon som originalen, i nytt uttrykk.</p>
            </div>
          </div>

          <div className="form">
            <label className="field">
              <span>Kurs til</span>
              <input placeholder="Eks. stikkontakter stue" value={kurs} onChange={(event) => setKurs(event.target.value)} />
            </label>

            <StepCard number="1" title="Beregn belastningsstrømmen IB">
              <div className="field-with-help">
                <NumberInput label="IB - belastningsstrøm" value={ib} onChange={setIb} suffix="A" />
                <HelpButton open={visHjelp.ib} setOpen={() => toggleHjelp("ib")} />
              </div>
              {visHjelp.ib && (
                <div className="help-panel">
                  <p className="panel-title">Forslag til beregning av IB</p>
                  <div className="formula-list">
                    <div><strong>For stikkontaktkurser:</strong><code>IB = IN</code></div>
                    <code>IB = U / R</code>
                    <code>IB = P / U</code>
                    <code>IB = P / (U × √3)</code>
                    <code>IB = P / (U × √3 × cosφ)</code>
                  </div>
                </div>
              )}
            </StepCard>

            <StepCard number="2" title="Velg merkestrømmen på sikringen IN">
              <div className="two-column">
                <div>
                  <div className="field-with-help">
                    <SelectInput label="IN - sikringsstørrelse" value={sikring} onChange={setSikring}>
                      <option value="">Velg sikring</option>
                      {sikringsStorrelser.map((amp) => <option key={amp} value={amp}>{amp} A</option>)}
                    </SelectInput>
                    <HelpButton open={visHjelp.sikring} setOpen={() => toggleHjelp("sikring")} />
                  </div>
                  {visHjelp.sikring && (
                    <div className="help-panel">
                      <p className="panel-title">Vanlige sikringsstørrelser</p>
                      <p>15-20 % høyere enn belastningsstrømmen.</p>
                      <div className="amp-grid">
                        {sikringsStorrelser.map((amp) => (
                          <button key={amp} type="button" onClick={() => setSikring(amp)}>{amp} A</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="field-with-help">
                    <SelectInput
                      label="Utløsekarakteristikk"
                      value={karakteristikk}
                      onChange={setKarakteristikk}
                      helper={resultat.valgtKarakteristikk.forklaring}
                    >
                      <option value="">Velg karakteristikk</option>
                      {Object.keys(sikringsKarakteristikker).map((key) => <option key={key} value={key}>{key}</option>)}
                    </SelectInput>
                    <HelpButton open={visHjelp.karakteristikk} setOpen={() => toggleHjelp("karakteristikk")} />
                  </div>
                  {visHjelp.karakteristikk && (
                    <div className="help-panel">
                      <p>Har utstyret ingen startstrøm = B-karakteristikk.</p>
                      <p>Har utstyret startstrøm = C, D eller K-karakteristikk.</p>
                      <table>
                        <thead><tr><th>Karakteristikk</th><th>I4</th><th>I5</th></tr></thead>
                        <tbody>
                          {Object.entries(sikringsKarakteristikker).map(([key, value]) => (
                            <tr key={key}><td>{key}</td><td>{value.i4} × IN</td><td>{value.i5} × IN</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </StepCard>

            <StepCard number="3" title="Klargjør forutsetninger">
              <div className="three-column">
                <div>
                  <div className="field-with-help">
                    <SelectInput label="Isolasjon" value={isolasjon} onChange={setIsolasjon}>
                      <option value="">Velg isolasjon</option>
                      <option>PVC / P</option>
                      <option>PEX / T</option>
                    </SelectInput>
                    <HelpButton open={visHjelp.isolasjon} setOpen={() => toggleHjelp("isolasjon")} />
                  </div>
                  {visHjelp.isolasjon && <div className="help-panel"><p className="panel-title">Isolasjon i kabelmerking</p><p>P = PVC</p><p>T = PEX</p></div>}
                </div>
                <div>
                  <div className="field-with-help">
                    <SelectInput label="Ledermateriale" value={metall} onChange={setMetall}>
                      <option value="">Velg ledermateriale</option>
                      <option>Cu</option>
                      <option>Al</option>
                    </SelectInput>
                    <HelpButton open={visHjelp.metall} setOpen={() => toggleHjelp("metall")} />
                  </div>
                  {visHjelp.metall && <div className="help-panel"><p><strong>Kobber (Cu):</strong> Vanlig i de fleste installasjoner.</p><p><strong>Aluminium (Al):</strong> Vanlig på større tverrsnitt og inntak.</p></div>}
                </div>
                <div>
                  <div className="field-with-help">
                    <SelectInput label="Forlegningsmåte" value={forlegning} onChange={setForlegning}>
                      <option value="">Velg forlegningsmåte</option>
                      {forlegningsmater.map((value) => <option key={value} value={value}>{value}</option>)}
                    </SelectInput>
                    <HelpButton open={visHjelp.forlegning} setOpen={() => toggleHjelp("forlegning")} />
                  </div>
                  {visHjelp.forlegning && <div className="help-panel"><p className="panel-title">Forlegningsmåter</p><p>A1, A2, B1, B2, C, D1, D2, E, F og G.</p></div>}
                </div>
                <div>
                  <div className="field-with-help">
                    <SelectInput label="Antall strømførende ledere" value={ledere} onChange={setLedere}>
                      <option value="">Velg antall ledere</option>
                      <option>2</option>
                      <option>3</option>
                    </SelectInput>
                    <HelpButton open={visHjelp.ledere} setOpen={() => toggleHjelp("ledere")} />
                  </div>
                  {visHjelp.ledere && <div className="help-panel"><p>2 ledere - for 1- eller 2-fase belastninger.</p><p>3 ledere - for 3-fase belastninger.</p></div>}
                </div>
                <div>
                  <div className="field-with-help">
                    <SelectInput label="Tverrsnitt" value={tverrsnitt} onChange={setTverrsnitt}>
                      <option value="">Velg tverrsnitt</option>
                      <option>1,5</option><option>2,5</option><option>4</option><option>6</option><option>10</option><option>16</option><option>25</option>
                    </SelectInput>
                    <HelpButton open={visHjelp.tverrsnitt} setOpen={() => toggleHjelp("tverrsnitt")} />
                  </div>
                  {visHjelp.tverrsnitt && <div className="help-panel"><p>Tverrsnitt i mm² for ledere.</p></div>}
                </div>
              </div>
            </StepCard>

            <StepCard number="4" title="Bestem korreksjonsfaktor">
              <div className="two-column">
                <div>
                  <div className="field-with-help">
                    <NumberInput label="Kt - temperatur" value={kt} onChange={setKt} />
                    <HelpButton open={visHjelp.kt} setOpen={() => toggleHjelp("kt")} />
                  </div>
                  {visHjelp.kt && <div className="help-panel"><p>Hvor varmt er det i rommet kabelen skal legges i? Standard er 30 °C.</p></div>}
                </div>
                <div>
                  <div className="field-with-help">
                    <NumberInput label="Kn - nærføring" value={kn} onChange={setKn} />
                    <HelpButton open={visHjelp.kn} setOpen={() => toggleHjelp("kn")} />
                  </div>
                  {visHjelp.kn && <div className="help-panel"><p>Hvor mange kabler ligger sammen?</p></div>}
                </div>
              </div>
            </StepCard>

            <StepCard number="5" title="Beregn minste akseptable strømføringsevne IZmin">
              <div className="field-with-help">
                <NumberInput label="Skriv inn IZmin" value={izminSvar} onChange={setIzminSvar} suffix="A" />
                <HelpButton open={visHjelp.izmin} setOpen={() => toggleHjelp("izmin")} />
              </div>
              {visHjelp.izmin && <div className="help-panel"><p>IZmin = IN / (Kt × Kn)</p><p>Beregnet verdi nå: {formatAmpere(resultat.izmin)}</p></div>}
            </StepCard>

            <StepCard number="6" title="Finn avlest strømføringsevne og regn ut IZ">
              <div className="two-column">
                <div>
                  <div className="field-with-help">
                    <NumberInput label="IZ avlest" value={izAvlest} onChange={setIzAvlest} suffix="A" />
                    <HelpButton open={visHjelp.izAvlest} setOpen={() => toggleHjelp("izAvlest")} />
                  </div>
                  {visHjelp.izAvlest && <div className="help-panel"><p>Tabell 6.2b, side 207-208 i Montørhåndboka.</p></div>}
                </div>
                <div>
                  <div className="field-with-help">
                    <NumberInput label="Kabelens strømføringsevne" value={izSvar} onChange={setIzSvar} suffix="A" />
                    <HelpButton open={visHjelp.iz} setOpen={() => toggleHjelp("iz")} />
                  </div>
                  {visHjelp.iz && <div className="help-panel"><p>IZ = IZ avlest × Kt × Kn</p><p>Beregnet verdi nå: {formatAmpere(resultat.izBeregnet)}</p></div>}
                </div>
              </div>
            </StepCard>

            <StepCard number="7" title="Sjekk krav 1 og 2">
              <div className="step-stack">
                <SelectInput label="Installasjonstype" value={installasjonstype} onChange={setInstallasjonstype}>
                  <option value="">Velg installasjonstype</option>
                  <option>Industri / næring</option>
                  <option>Bolig / landbruk / hagebruk</option>
                </SelectInput>
                <div>
                  <div className="field-with-help">
                    <NumberInput label="I2" value={i2Faktor} onChange={setI2Faktor} helper="Automatsikring er ofte 1,45. Bolig kan ofte være 1,20 eller 1,30." />
                    <HelpButton open={visHjelp.i2} setOpen={() => toggleHjelp("i2")} />
                  </div>
                  {visHjelp.i2 && <div className="help-panel"><p>I2 = I2-faktor × IN</p><p>Beregnet I2 nå: {formatAmpere(resultat.i2)}</p></div>}
                </div>
              </div>

              {resultat.kreverTabell62g && (
                <label className={`checkbox-row single-check ${tabell62gKontrollert ? "checked" : ""}`}>
                  <input checked={tabell62gKontrollert} type="checkbox" onChange={(event) => setTabell62gKontrollert(event.target.checked)} />
                  <span>Tabell 6.2g er kontrollert for industri / næring med tverrsnitt opp til og med 4 mm².</span>
                </label>
              )}

              <div className="status-stack">
                <StatusLine ok={resultat.krav1Ok} title="Krav 1" labels={krav1Formel} values={krav1Verdier} />
                <StatusLine ok={resultat.krav2Ok} title="Krav 2" labels={krav2Formel} values={krav2Verdier} />
                {resultat.kreverTabell62g && <StatusLine ok={resultat.tabell62gOk} title="Tabell 6.2g kontrollert" text="Gjelder industri / næring med tverrsnitt opp til og med 4 mm²." />}
              </div>
            </StepCard>

            <div className="note">
              <Info size={18} />
              <p>Betaversjon av Lokna. Brukes som undervisningsstøtte, ikke som ferdig prosjektering.</p>
            </div>
          </div>
        </section>

        <aside className="queue-panel calculation-report">
          <div className="queue-panel-header">
            <div>
              <p className="portal-eyebrow">Rapport</p>
              <h2>{kurs || "Kurs ikke valgt"}</h2>
              <p className="muted-text">{resultat.valgtKarakteristikk.forklaring}</p>
            </div>
          </div>
          <div className="summary">
            <p className="summary-course">Konklusjon: {konklusjonTekst}</p>
            <div className="summary-step"><p>1. IB</p><p>Belastningsstrøm = {formatAmpereOrBlank(ib)}</p></div>
            <div className="summary-step"><p>2. IN</p><p>Sikringsstørrelse = {formatWholeAmpere(sikring)}</p><p>Utløsekarakteristikk = {karakteristikk}</p></div>
            <div className="summary-step"><p>3. Forutsetninger</p><p>Isolasjon = {isolasjon}</p><p>Ledermateriale = {metall}</p><p>Forlegningsmåte = {forlegning}</p><p>Antall strømførende ledere = {ledere}</p><p>Tverrsnitt = {formatDecimalOrBlank(tverrsnitt)}{hasValue(tverrsnitt) ? " mm²" : ""}</p></div>
            <div className="summary-step"><p>4. Korreksjonsfaktor</p><p>Kt temperatur = {formatDecimalOrBlank(kt)}</p><p>Kn nærføring = {formatDecimalOrBlank(kn)}</p></div>
            <div className="summary-step"><p>5. IZmin</p><p>IZmin elevsvar = {formatAmpereOrBlank(izminSvar)}</p><p>IZmin beregnet = {formatAmpere(resultat.izmin)}</p></div>
            <div className="summary-step"><p>6. IZ</p><p>IZ avlest = {formatAmpereOrBlank(izAvlest)}</p><p>IZ elevsvar = {formatAmpereOrBlank(izSvar)}</p><p>IZ beregnet = {formatAmpere(resultat.izBeregnet)}</p></div>
            <div className="summary-step"><p>7. Krav 1 og 2</p><p>Krav 1: {krav1Formel}</p><p>{krav1Verdier} {resultat.krav1Ok ? "OK" : "IKKE OK"}</p><p>Krav 2: {krav2Formel}</p><p>{krav2Verdier} {resultat.krav2Ok ? "OK" : "IKKE OK"}</p><p>I2 = {formatAmpere(resultat.i2)}</p><p>I5 = {formatAmpere(resultat.i5)}</p>{resultat.kreverTabell62g && <p>Tabell 6.2g: {resultat.tabell62gOk ? "OK" : "Ikke OK"}</p>}</div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ComingSoonCalculation({ type }) {
  const isJording = type === "beregning-jording";
  const Icon = isJording ? ShieldCheck : Flame;

  return (
    <section className="page">
      <header className="hero">
        <div>
          <p className="portal-eyebrow">Beregning</p>
          <h1>{isJording ? "Jording" : "Varmekabel"}</h1>
          <p>Denne modulen ligger bak passord og klargjøres før lansering.</p>
        </div>
        <div className="hero-stat">
          <Icon size={22} />
          <span>0</span>
          <strong>klar</strong>
        </div>
      </header>

      <section className="card">
        <div className="section-heading">
          <div className="section-icon">
            <Icon size={22} />
          </div>
          <div>
            <h2>{isJording ? "Jording kommer" : "Varmekabel kommer"}</h2>
            <p className="muted-text">Strukturen er klar i appen. Beregningsinnholdet kan bygges videre her.</p>
          </div>
        </div>
      </section>
    </section>
  );
}

function BeregningPage({ aktivSide }) {
  if (aktivSide === "beregning-kabel") return <KabelOgVernPage />;
  return <ComingSoonCalculation type={aktivSide} />;
}

function HandsopprekkingPage({ ko, onLeggTil, koFeil, sistOppdatert }) {
  const [navn, setNavn] = useState("");
  const [gjelder, setGjelder] = useState("");
  const [sjekket, setSjekket] = useState([]);
  const [melding, setMelding] = useState("");
  const [sender, setSender] = useState(false);
  const [visFyPopup, setVisFyPopup] = useState(false);

  function toggleSjekket(valg) {
    setSjekket((forrige) =>
      forrige.includes(valg)
        ? forrige.filter((aktivtValg) => aktivtValg !== valg)
        : [...forrige, valg]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (hasUnwantedWords(navn) || hasUnwantedWords(gjelder)) {
      setVisFyPopup(true);
      setMelding("");
      return;
    }

    const navnFeil = validateStudentName(navn);
    if (navnFeil) {
      setMelding(navnFeil);
      return;
    }

    if (countWords(gjelder) < 7) {
      setMelding("Skriv minst 7 ord om hva du trenger hjelp til.");
      return;
    }

    if (sjekket.length !== sjekklisteValg.length) {
      setMelding("Kryss av alle punktene i sjekket først før du legger deg i kø.");
      return;
    }

    setSender(true);

    try {
      const plass = await onLeggTil({
        navn: navn.trim(),
        gjelder: gjelder.trim(),
        sjekket,
      });

      setNavn("");
      setGjelder("");
      setSjekket([]);
      setMelding(`Du er lagt i kø som nummer ${plass}.`);
    } catch (error) {
      if (error.message === "fy!") {
        setVisFyPopup(true);
      }
      if (error.message === "FY deg, det er ikke lov :) !") {
        setVisFyPopup(true);
      }
      setMelding(error.message || "Kunne ikke legge deg i kø akkurat nå.");
    } finally {
      setSender(false);
    }
  }

  return (
    <section className="page">
      {visFyPopup && <FyModal onClose={() => setVisFyPopup(false)} />}

      <header className="hero">
        <div>
          <h1>Håndsopprekking</h1>
          <p>Legg deg i kø når du trenger Lokna. Hva du trenger hjelp til vises bare for Lokna.</p>
        </div>
        <div className="hero-stat">
          <Users size={22} />
          <span>{ko.length}</span>
          <strong>i kø</strong>
        </div>
      </header>

      <div className="layout">
        <section className="card">
          <div className="section-heading">
            <div className="section-icon">
              <Hand size={22} />
            </div>
            <div>
              <p className="portal-eyebrow">Elev</p>
              <h2>Be om hjelp</h2>
              <p className="muted-text">Skriv kort hva det gjelder, og kryss av for hva du har prøvd først.</p>
            </div>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Navn</span>
              <input
                maxLength={20}
                value={navn}
                onChange={(event) => {
                  setNavn(event.target.value);
                  setMelding("");
                }}
                placeholder="Skriv navnet ditt"
              />
            </label>

            <label className="field">
              <span>Hva gjelder det?</span>
              <textarea
                value={gjelder}
                onChange={(event) => {
                  setGjelder(event.target.value);
                  setMelding("");
                }}
                placeholder="Forklar med minst 7 ord hva du står fast på"
                rows={4}
              />
            </label>

            <fieldset className="checklist-field">
              <legend>Har du sjekket dette først?</legend>
              {sjekklisteValg.map((valg) => (
                <label className={`checkbox-row ${sjekket.includes(valg) ? "checked" : ""}`} key={valg}>
                  <input
                    checked={sjekket.includes(valg)}
                    type="checkbox"
                    onChange={() => {
                      toggleSjekket(valg);
                      setMelding("");
                    }}
                  />
                  <span>{valg}</span>
                </label>
              ))}
            </fieldset>

            <div className="privacy-note">
              <LockKeyhole size={18} />
              <p>Detaljene du skriver vises bare på lærersiden.</p>
            </div>

            {melding && <p className="queue-message">{melding}</p>}

            <button type="submit" className="primary-button" disabled={sender}>
              {sender ? "Legger i kø..." : "Legg meg i kø"}
            </button>
          </form>
        </section>

        <QueuePanel ko={ko} koFeil={koFeil} sistOppdatert={sistOppdatert} />
      </div>
    </section>
  );
}

function QueuePanel({ ko, koFeil, sistOppdatert }) {
  return (
    <aside className="queue-panel" aria-live="polite">
      <div className="queue-panel-header">
        <div>
          <p className="portal-eyebrow">Oppdateres ca. hvert minutt</p>
          <h2>Kø</h2>
          <p className="muted-text">Kun navn og plass i kø vises her.</p>
        </div>
        <div className="queue-count">
          <span>{ko.length}</span>
          <strong>venter</strong>
        </div>
      </div>

      {sistOppdatert && (
        <p className="queue-updated">Sist oppdatert {sistOppdatert.toLocaleTimeString("nb-NO")}</p>
      )}

      {koFeil ? (
        <div className="queue-error">{koFeil}</div>
      ) : ko.length === 0 ? (
        <div className="empty-queue">Ingen står i kø akkurat nå.</div>
      ) : (
        <ol className="queue-list">
          {ko.map((innslag, index) => (
            <li className="queue-item" key={innslag.id}>
              <span>{index + 1}</span>
              <strong>{innslag.navn}</strong>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function LaererStatus({ ko }) {
  const hjulpne = ko.filter((innslag) => innslag.hjulpet && innslag.hjulpetTid);
  const ventetider = hjulpne
    .map(getVentetidMinutter)
    .filter((minutter) => Number.isFinite(minutter) && minutter >= 0);
  const snittVentetid =
    ventetider.length > 0
      ? ventetider.reduce((sum, minutter) => sum + minutter, 0) / ventetider.length
      : NaN;
  const maksVentetid = ventetider.length > 0 ? Math.max(...ventetider) : NaN;
  const sisteDato = hjulpne.length > 0 ? hjulpne[hjulpne.length - 1].hjulpetTid : "";
  const timeStatistikk = Array.from({ length: 24 }, (_, time) => ({
    time,
    antall: hjulpne.filter((innslag) => new Date(innslag.hjulpetTid).getHours() === time).length,
  })).filter((item) => item.antall > 0);
  const maksTimeAntall = Math.max(1, ...timeStatistikk.map((item) => item.antall));
  const mestTrykk = timeStatistikk.reduce(
    (beste, item) => (item.antall > beste.antall ? item : beste),
    { time: null, antall: 0 }
  );
  const maanedsStatistikk = Object.entries(
    hjulpne.reduce((statistikk, innslag) => {
      const key = formatMonthKey(innslag.hjulpetTid);
      if (!key) return statistikk;
      return { ...statistikk, [key]: (statistikk[key] || 0) + 1 };
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, antall]) => ({ key, label: formatMonthLabel(key), antall }));
  const maksMaanedAntall = Math.max(1, ...maanedsStatistikk.map((item) => item.antall));
  const sisteHjulpet = [...hjulpne]
    .sort((a, b) => new Date(b.hjulpetTid).getTime() - new Date(a.hjulpetTid).getTime())
    .slice(0, 5);

  return (
    <div className="teacher-status">
      <div className="stat-grid">
        <div className="stat-card">
          <span>Totalt hjulpet</span>
          <strong>{hjulpne.length}</strong>
        </div>
        <div className="stat-card">
          <span>Snitt ventetid</span>
          <strong>{formatVentetid(snittVentetid)}</strong>
        </div>
        <div className="stat-card">
          <span>Lengste ventetid</span>
          <strong>{formatVentetid(maksVentetid)}</strong>
        </div>
        <div className="stat-card">
          <span>Mest trykk</span>
          <strong>{mestTrykk.antall ? `${String(mestTrykk.time).padStart(2, "0")}:00` : "-"}</strong>
        </div>
      </div>

      <div className="stats-layout">
        <StatsPanel title="Hjelp per klokkeslett" eyebrow="Tidspunkt" subtitle={`Sist hjulpet: ${formatDato(sisteDato)}`}>
          {timeStatistikk.length === 0 ? (
            <div className="empty-queue">Ingen hjulpne elever ennå.</div>
          ) : (
            <div className="bar-chart">
              {timeStatistikk.map((item) => (
                <BarRow
                  key={item.time}
                  label={`${String(item.time).padStart(2, "0")}:00`}
                  value={item.antall}
                  max={maksTimeAntall}
                />
              ))}
            </div>
          )}
        </StatsPanel>

        <StatsPanel title="Hjulpet per måned" eyebrow="Måned">
          {maanedsStatistikk.length === 0 ? (
            <div className="empty-queue">Ingen månedsdata ennå.</div>
          ) : (
            <div className="bar-chart">
              {maanedsStatistikk.map((item) => (
                <BarRow key={item.key} label={item.label} value={item.antall} max={maksMaanedAntall} />
              ))}
            </div>
          )}
        </StatsPanel>
      </div>

      <StatsPanel title="Siste ting det ble hjulpet med" eyebrow="Utdrag">
        {sisteHjulpet.length === 0 ? (
          <div className="empty-queue">Ingen utdrag ennå.</div>
        ) : (
          <div className="helped-excerpts">
            {sisteHjulpet.map((innslag) => (
              <article key={innslag.id}>
                <strong>{formatVentetid(getVentetidMinutter(innslag))}</strong>
                <p>{innslag.gjelder}</p>
                <span>{formatDato(innslag.hjulpetTid)}</span>
              </article>
            ))}
          </div>
        )}
      </StatsPanel>
    </div>
  );
}

function ActiveQueueSection({ aktivKo, koFeil, onMerkHjulpet, onTilbakestillKo, sistOppdatert }) {
  return (
    <section className="card">
      <div className="active-queue-header">
        <div className="section-heading">
          <div className="section-icon">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <p className="portal-eyebrow">Lærer</p>
            <h1>Aktiv kø</h1>
            <p className="muted-text">{aktivKo.length} i kø</p>
            {sistOppdatert && (
              <p className="queue-updated">Sist oppdatert {sistOppdatert.toLocaleTimeString("nb-NO")}</p>
            )}
          </div>
        </div>

        <div className="teacher-actions">
          <button type="button" className="danger-button" onClick={onTilbakestillKo}>
            <RotateCcw size={18} />
            Tilbakestill kø
          </button>
        </div>
      </div>

      {koFeil ? (
        <div className="queue-error">{koFeil}</div>
      ) : aktivKo.length === 0 ? (
        <div className="empty-queue">Ingen venter på hjelp.</div>
      ) : (
        <div className="teacher-queue-list">
          {aktivKo.map((innslag, index) => (
            <article className="teacher-queue-item" key={innslag.id}>
              <div>
                <div className="teacher-item-title">
                  <span>{index + 1}</span>
                  <h3>{innslag.navn}</h3>
                </div>
                <p>{innslag.gjelder}</p>
                <p className="muted-text">Sjekket: {innslag.sjekket.join(", ")}</p>
              </div>
              <label className="resolve-checkbox">
                <input type="checkbox" onChange={() => onMerkHjulpet(innslag.id)} />
                <span>Hjulpet</span>
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TeacherMaterialSection({ list, feil, onMerkMateriell }) {
  const aktivMateriell = list.filter((item) => !item.behandlet);

  return (
    <>
      <header className="hero">
        <div>
          <p className="portal-eyebrow">Lærer</p>
          <h1>Materiell</h1>
          <p>Oversikt over materiell og verktøy som elever har lagt inn.</p>
        </div>
        <div className="hero-stat">
          <Package size={22} />
          <span>{aktivMateriell.length}</span>
          <strong>innmeldt</strong>
        </div>
      </header>

      <section className="card">
        <div className="section-heading">
          <div className="section-icon">
            <Wrench size={22} />
          </div>
          <div>
            <p className="portal-eyebrow">Liste</p>
            <h2>Materiell og verktøy</h2>
          </div>
        </div>

        {feil ? (
          <div className="queue-error">{feil}</div>
        ) : aktivMateriell.length === 0 ? (
          <div className="empty-queue">Ingen aktive materiellønsker.</div>
        ) : (
          <div className="material-list">
            {aktivMateriell.map((item) => (
              <article className="material-item" key={item.id}>
                <div>
                  <strong>{item.typeUtstyr}</strong>
                  <p>El nummer: {item.elnummer}</p>
                </div>
                <span>{item.antall} stk</span>
                <label className="resolve-checkbox">
                  <input type="checkbox" onChange={() => onMerkMateriell(item.id)} />
                  <span>Ordnet</span>
                </label>
              </article>
            ))}
          </div>
        )}
      </section>

    </>
  );
}

function TeacherVisibilitySection({ innstillinger, onToggleVisibility }) {
  return (
    <section className="card">
      <div className="section-heading">
        <div className="section-icon">
          <Eye size={22} />
        </div>
        <div>
          <p className="portal-eyebrow">Lærer</p>
          <h1>Menyvalg</h1>
          <p className="muted-text">Velg hvilke knapper som skal være synlige for elever.</p>
        </div>
      </div>

      <div className="visibility-list">
        {menuVisibilityChoices.map((choice) => {
          const Icon = choice.icon;
          const visible = innstillinger.visibleMenus[choice.id];
          return (
            <button
              type="button"
              className={`visibility-item ${visible ? "visible" : ""} ${choice.parent ? "child" : ""}`}
              key={choice.id}
              onClick={() => onToggleVisibility(choice.id)}
            >
              <Icon size={22} />
              <span>
                {choice.parent && <small>{choice.parent}</small>}
                {choice.navn}
              </span>
              {visible ? <Eye size={22} /> : <EyeOff size={22} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TeacherPushSection() {
  const [stotte, setStotte] = useState("sjekker");
  const [aktiv, setAktiv] = useState(false);
  const [melding, setMelding] = useState("");
  const [jobber, setJobber] = useState(false);

  useEffect(() => {
    async function sjekkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStotte("nei");
        return;
      }

      setStotte("ja");
      const registration = await registerServiceWorker();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        try {
          await saveTeacherPushSubscription(subscription);
          setAktiv(true);
        } catch {
          setAktiv(false);
        }
        return;
      }

      setAktiv(false);
    }

    sjekkStatus();
  }, []);

  async function handleAktiver() {
    setJobber(true);
    setMelding("");

    try {
      await subscribeTeacherPush();
      setAktiv(true);
      setMelding("Varsler er aktivert på denne enheten.");
    } catch (error) {
      setMelding(error.message || "Kunne ikke aktivere varsler.");
    } finally {
      setJobber(false);
    }
  }

  async function handleDeaktiver() {
    setJobber(true);
    setMelding("");

    try {
      await unsubscribeTeacherPush();
      setAktiv(false);
      setMelding("Varsler er slått av på denne enheten.");
    } catch (error) {
      setMelding(error.message || "Kunne ikke slå av varsler.");
    } finally {
      setJobber(false);
    }
  }

  async function handleTestvarsel() {
    setJobber(true);
    setMelding("");

    try {
      const result = await sendTeacherPushTest();
      if (result.sent > 0) {
        setMelding(`Testvarsel sendt til ${result.sent} enhet${result.sent === 1 ? "" : "er"}.`);
      } else if (result.subscriptions === 0) {
        setMelding("Ingen mobil er registrert for pushvarsler. Slå av og på varsler på mobilen.");
      } else {
        const errorText = Array.isArray(result.errors) && result.errors.length ? ` ${result.errors.join(" ")}` : "";
        setMelding(`Fant ${result.subscriptions} registrert enhet, men ingen varsel ble sendt.${errorText}`);
      }
    } catch (error) {
      setMelding(error.message || "Kunne ikke sende testvarsel.");
    } finally {
      setJobber(false);
    }
  }

  return (
    <section className="card">
      <div className="section-heading">
        <div className="section-icon">
          {aktiv ? <Bell size={22} /> : <BellOff size={22} />}
        </div>
        <div>
          <p className="portal-eyebrow">Lærer</p>
          <h2>Pushvarsler</h2>
          <p className="muted-text">Få varsel på mobilen når en elev legger seg i håndsopprekkingskø.</p>
        </div>
      </div>

      {stotte === "nei" ? (
        <div className="queue-error">Denne nettleseren støtter ikke pushvarsler.</div>
      ) : (
        <div className="teacher-actions">
          {aktiv ? (
            <>
              <button type="button" className="primary-button compact-button" onClick={handleTestvarsel} disabled={jobber}>
                <Bell size={18} />
                Send testvarsel
              </button>
              <button type="button" className="danger-button" onClick={handleDeaktiver} disabled={jobber}>
                <BellOff size={18} />
                Slå av varsler
              </button>
            </>
          ) : (
            <button type="button" className="primary-button compact-button" onClick={handleAktiver} disabled={jobber}>
              <Bell size={18} />
              Aktiver varsler
            </button>
          )}
        </div>
      )}

      {melding && <p className={aktiv ? "queue-message" : "queue-error"}>{melding}</p>}
    </section>
  );
}

function TeacherClassroomAlertSection({ aktiv, onToggle }) {
  return (
    <section className="card">
      <div className="section-heading">
        <div className="section-icon">
          {aktiv ? <Bell size={22} /> : <BellOff size={22} />}
        </div>
        <div>
          <p className="portal-eyebrow">Klasserom</p>
          <h2>Varsel når appen er åpen</h2>
          <p className="muted-text">Gir lyd, vibrasjon og nettleservarsel når en ny elev legger seg i kø.</p>
        </div>
      </div>
      <div className="teacher-actions">
        <button type="button" className="primary-button compact-button" onClick={onToggle}>
          {aktiv ? <BellOff size={18} /> : <Bell size={18} />}
          {aktiv ? "Slå av klasseromsvarsel" : "Aktiver klasseromsvarsel"}
        </button>
      </div>
      <p className={aktiv ? "queue-message" : "queue-error"}>
        {aktiv
          ? "Klasseromsvarsel er aktivt så lenge lærervinduet står åpent."
          : "Dette virker uten push, men krever at lærervinduet står åpent."}
      </p>
    </section>
  );
}

function TeacherStatisticsSection({ ko, materiellList, analytics }) {
  const [aktivStatistikk, setAktivStatistikk] = useState("sammendrag");
  const hjulpne = ko.filter((innslag) => innslag.hjulpet && innslag.hjulpetTid);
  const behandletMateriell = materiellList.filter((item) => item.behandlet && item.behandletTid);
  const visits = analytics.filter((event) => event.type === "visit");
  const clicks = analytics.filter((event) => event.type === "nav_click");
  const kabelBeregninger = analytics.filter(
    (event) => event.type === "calculation_completed" && event.category === "kabel-og-vern"
  );
  const statTabs = [
    { id: "sammendrag", navn: "Sammendrag" },
    { id: "handsopprekking", navn: "Håndsopprekking" },
    { id: "materiell", navn: "Materiell" },
    { id: "kabel", navn: "Kabel og vern" },
    { id: "jording", navn: "Jording" },
    { id: "varmekabel", navn: "Varmekabel" },
  ];

  return (
    <>
      <header className="hero">
        <div>
          <p className="portal-eyebrow">Lærer</p>
          <h1>Statistikk</h1>
          <p>Samlet oversikt for appen, med egne underfaner for hver funksjon.</p>
        </div>
        <div className="hero-stat">
          <BarChart3 size={22} />
          <span>{visits.length}</span>
          <strong>besøk</strong>
        </div>
      </header>

      <div className="stats-subtabs" aria-label="Statistikkvalg">
        {statTabs.map((tab) => (
          <button
            type="button"
            className={aktivStatistikk === tab.id ? "active" : ""}
            key={tab.id}
            onClick={() => setAktivStatistikk(tab.id)}
          >
            {tab.navn}
          </button>
        ))}
      </div>

      {aktivStatistikk === "sammendrag" ? (
        <div className="teacher-status">
          <div className="stat-grid">
            <div className="stat-card">
              <span>Besøk på appen</span>
              <strong>{visits.length}</strong>
            </div>
            <div className="stat-card">
              <span>Antall klikk</span>
              <strong>{clicks.length}</strong>
            </div>
            <div className="stat-card">
              <span>Hjulpet</span>
              <strong>{hjulpne.length}</strong>
            </div>
            <div className="stat-card">
              <span>Materiell ordnet</span>
              <strong>{behandletMateriell.length}</strong>
            </div>
            <div className="stat-card">
              <span>Kabelberegninger</span>
              <strong>{kabelBeregninger.length}</strong>
            </div>
          </div>
          <AnalyticsStatus analytics={analytics} />
        </div>
      ) : aktivStatistikk === "handsopprekking" ? (
        <LaererStatus ko={ko} />
      ) : aktivStatistikk === "materiell" ? (
        <MaterialStatus list={materiellList} />
      ) : aktivStatistikk === "kabel" ? (
        <AnalyticsStatus analytics={analytics.filter((event) => event.category === "kabel-og-vern" || event.target === "Kabel og vern")} />
      ) : aktivStatistikk === "jording" ? (
        <EmptyCategoryStats title="Jording" />
      ) : (
        <EmptyCategoryStats title="Varmekabel" />
      )}
    </>
  );
}

function LaererPage({
  ko,
  koFeil,
  laererVisning,
  analytics,
  materiellFeil,
  materiellList,
  innstillinger,
  klasseromVarselAktivt,
  onByttLaererVisning,
  onToggleKlasseromVarsel,
  onMerkHjulpet,
  onMerkMateriell,
  onToggleVisibility,
  onTilbakestillKo,
  sistOppdatert,
}) {
  const aktivKo = ko.filter((innslag) => !innslag.hjulpet);
  const viserStatistikk = laererVisning === "statistikk";
  const viserMateriell = laererVisning === "materiell";
  const viserMenyvalg = laererVisning === "menyvalg";

  return (
    <section className="page">
      <div className="teacher-tabs" aria-label="Lærervalg">
        <button
          type="button"
          className={!viserStatistikk && !viserMateriell && !viserMenyvalg ? "active" : ""}
          onClick={() => onByttLaererVisning("ko")}
        >
          <ListChecks size={18} />
          Aktiv kø
        </button>
        <button
          type="button"
          className={viserMateriell ? "active" : ""}
          onClick={() => onByttLaererVisning("materiell")}
        >
          <Package size={18} />
          Materiell
        </button>
        <button
          type="button"
          className={viserMenyvalg ? "active" : ""}
          onClick={() => onByttLaererVisning("menyvalg")}
        >
          <Eye size={18} />
          Menyvalg
        </button>
        <button
          type="button"
          className={`teacher-tab-statistics ${viserStatistikk ? "active" : ""}`}
          onClick={() => onByttLaererVisning("statistikk")}
        >
          <BarChart3 size={18} />
          Statistikk
        </button>
      </div>

      {viserMenyvalg ? (
        <>
          <TeacherClassroomAlertSection aktiv={klasseromVarselAktivt} onToggle={onToggleKlasseromVarsel} />
          <TeacherPushSection />
          <TeacherVisibilitySection innstillinger={innstillinger} onToggleVisibility={onToggleVisibility} />
        </>
      ) : viserMateriell ? (
        <TeacherMaterialSection list={materiellList} feil={materiellFeil} onMerkMateriell={onMerkMateriell} />
      ) : viserStatistikk ? (
        <>
          {false && <header className="hero">
            <div>
              <p className="portal-eyebrow">Lærer</p>
              <h1>Statistikk</h1>
              <p>Oversikt over hjulpetid, trykk i timen og anonymisert historikk.</p>
            </div>
            <div className="hero-stat">
              <ListChecks size={22} />
              <span>{ko.filter((innslag) => innslag.hjulpet).length}</span>
              <strong>hjulpet</strong>
            </div>
          </header>}

          <TeacherStatisticsSection ko={ko} materiellList={materiellList} analytics={analytics} />
        </>
      ) : (
        <ActiveQueueSection
          aktivKo={aktivKo}
          koFeil={koFeil}
          sistOppdatert={sistOppdatert}
          onMerkHjulpet={onMerkHjulpet}
          onTilbakestillKo={onTilbakestillKo}
        />
      )}
    </section>
  );
}

export default function App() {
  const [aktivSide, setAktivSide] = useState("handsopprekking");
  const [visLaerer, setVisLaerer] = useState(false);
  const [erLaererInnlogget, setErLaererInnlogget] = useState(
    () => sessionStorage.getItem(TEACHER_STORAGE_KEY) === "true"
  );
  const [elevKo, setElevKo] = useState([]);
  const [laererKo, setLaererKo] = useState([]);
  const [materiellList, setMateriellList] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [koFeil, setKoFeil] = useState("");
  const [laererKoFeil, setLaererKoFeil] = useState("");
  const [materiellFeil, setMateriellFeil] = useState("");
  const [laererMateriellFeil, setLaererMateriellFeil] = useState("");
  const [innstillinger, setInnstillinger] = useState(defaultAppSettings);
  const [laererVisning, setLaererVisning] = useState("ko");
  const [sistOppdatert, setSistOppdatert] = useState(null);
  const [klasseromVarselAktivt, setKlasseromVarselAktivt] = useState(
    () => localStorage.getItem(CLASSROOM_ALERT_STORAGE_KEY) === "true"
  );
  const laererKoVarselRef = useRef({ klar: false, aktiveIder: new Set() });

  useEffect(() => {
    loggStatistikk("visit", "app", "besok");
    registerServiceWorker();
  }, []);

  useEffect(() => {
    async function oppdaterInnstillinger() {
      try {
        const settings = erLaererInnlogget
          ? await hentLaererInnstillingerFraApi()
          : await hentInnstillingerFraApi();
        setInnstillinger(settings);
      } catch {
        setInnstillinger(defaultAppSettings);
      }
    }

    oppdaterInnstillinger();
    const intervall = window.setInterval(oppdaterInnstillinger, 60000);
    return () => window.clearInterval(intervall);
  }, [erLaererInnlogget]);

  useEffect(() => {
    if (erLaererInnlogget) return;

    const visibleMenus = innstillinger.visibleMenus;
    const activeMenu = aktivSide.startsWith("beregning-") ? getBeregningVisibilityKey(aktivSide) : aktivSide;

    if (visibleMenus[activeMenu]) return;

    if (visibleMenus.handsopprekking) {
      setAktivSide("handsopprekking");
    } else if (visibleMenus.materiell) {
      setAktivSide("materiell");
    } else {
      const firstVisibleCalculation = beregningValg.find((valg) => visibleMenus.beregning && visibleMenus[valg.visibilityKey]);
      if (firstVisibleCalculation) setAktivSide(firstVisibleCalculation.id);
    }
  }, [aktivSide, erLaererInnlogget, innstillinger]);

  useEffect(() => {
    async function oppdaterElevKo() {
      try {
        const ko = await hentElevKoFraApi();
        setElevKo(ko);
        setKoFeil("");
        setSistOppdatert(new Date());
      } catch (error) {
        setKoFeil(error.message || "Køserveren svarer ikke.");
      }
    }

    oppdaterElevKo();
    const intervall = window.setInterval(oppdaterElevKo, 60000);
    return () => window.clearInterval(intervall);
  }, []);

  useEffect(() => {
    if (erLaererInnlogget) return undefined;

    async function oppdaterMateriell() {
      try {
        const list = await hentMateriellFraApi();
        setMateriellList(list);
        setMateriellFeil("");
      } catch (error) {
        setMateriellFeil(error.message || "Materiell-listen svarer ikke.");
      }
    }

    oppdaterMateriell();
    const intervall = window.setInterval(oppdaterMateriell, 60000);
    return () => window.clearInterval(intervall);
  }, [erLaererInnlogget]);

  useEffect(() => {
    if (!erLaererInnlogget) return undefined;

    async function oppdaterLaererKo() {
      try {
        const [ko, materiell, analyticsData] = await Promise.all([
          hentLaererKoFraApi(),
          hentLaererMateriellFraApi(),
          hentLaererAnalyticsFraApi(),
        ]);
        const aktivKo = ko.filter((innslag) => !innslag.hjulpet);
        const nyeInnslag = aktivKo.filter((innslag) => !laererKoVarselRef.current.aktiveIder.has(innslag.id));

        if (klasseromVarselAktivt && laererKoVarselRef.current.klar && nyeInnslag.length > 0) {
          varsleNyElevLokalt(nyeInnslag.length, aktivKo.length);
        }

        laererKoVarselRef.current = {
          klar: true,
          aktiveIder: new Set(aktivKo.map((innslag) => innslag.id)),
        };
        setLaererKo(ko);
        setMateriellList(materiell);
        setAnalytics(analyticsData);
        setLaererKoFeil("");
        setLaererMateriellFeil("");
        setSistOppdatert(new Date());
      } catch (error) {
        setLaererKoFeil(error.message || "Køserveren svarer ikke.");
      }
    }

    oppdaterLaererKo();
    const intervall = window.setInterval(oppdaterLaererKo, 15000);
    return () => window.clearInterval(intervall);
  }, [erLaererInnlogget, klasseromVarselAktivt]);

  useEffect(() => {
    if (!erLaererInnlogget) {
      laererKoVarselRef.current = { klar: false, aktiveIder: new Set() };
    }
  }, [erLaererInnlogget]);

  function velgElevSide(side) {
    if (erLaererInnlogget) return;
    const activeMenu = side.startsWith("beregning-") ? getBeregningVisibilityKey(side) : side;
    if (side.startsWith("beregning-") && !innstillinger.visibleMenus.beregning) return;
    if (!innstillinger.visibleMenus[activeMenu]) return;
    setAktivSide(side);
    setVisLaerer(false);
    const label = beregningValg.find((valg) => valg.id === side)?.navn || side;
    loggStatistikk("nav_click", activeMenu, label);
  }

  async function toggleVisibility(menuId) {
    const nextSettings = {
      ...innstillinger,
      visibleMenus: {
        ...innstillinger.visibleMenus,
        [menuId]: !innstillinger.visibleMenus[menuId],
      },
    };
    setInnstillinger(nextSettings);

    try {
      const savedSettings = await lagreLaererInnstillinger(nextSettings);
      setInnstillinger(savedSettings);
    } catch (error) {
      setLaererKoFeil(error.message || "Kunne ikke lagre menyvalg.");
    }
  }

  async function toggleKlasseromVarsel() {
    const nextValue = !klasseromVarselAktivt;

    if (nextValue && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    setKlasseromVarselAktivt(nextValue);
    localStorage.setItem(CLASSROOM_ALERT_STORAGE_KEY, String(nextValue));

    if (nextValue) {
      try {
        playClassroomAlertSound();
      } catch {
        // Noen nettlesere tillater ikke lyd før neste brukerhandling.
      }
    }
  }

  async function leggTilIKo(innslag) {
    const response = await fetch("/api/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(innslag),
  });
    const data = await readApiResponse(response, "Kunne ikke legge deg i kø.");

    const ko = await hentElevKoFraApi();
    setElevKo(ko);
    setKoFeil("");
    setSistOppdatert(new Date());
    return data.plass;
  }

  async function leggTilMateriell(innslag) {
    const response = await fetch("/api/material", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(innslag),
    });
    await readApiResponse(response, "Kunne ikke legge til materiell.");

    const list = await hentMateriellFraApi();
    setMateriellList(list);
    setMateriellFeil("");
  }

  async function merkSomHjulpet(id) {
    try {
      const response = await fetch(`/api/teacher/queue/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { Authorization: laererAuthHeader() },
      });
      await readApiResponse(response, "Kunne ikke markere som hjulpet. Sjekk Vercel Functions-loggen.");

      const [nyElevKo, nyLaererKo, nyMateriell] = await Promise.all([
        hentElevKoFraApi(),
        hentLaererKoFraApi(),
        hentLaererMateriellFraApi(),
      ]);
      setElevKo(nyElevKo);
      setLaererKo(nyLaererKo);
      setMateriellList(nyMateriell);
      setKoFeil("");
      setLaererKoFeil("");
      setSistOppdatert(new Date());
    } catch (error) {
      setLaererKoFeil(error.message || "Kunne ikke markere som hjulpet.");
    }
  }

  async function merkMateriellOrdnet(id) {
    try {
      const response = await fetch(`/api/teacher/material/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { Authorization: laererAuthHeader() },
      });
      await readApiResponse(response, "Kunne ikke markere materiell som ordnet.");

      const [elevMateriell, laererMateriell] = await Promise.all([
        hentMateriellFraApi(),
        hentLaererMateriellFraApi(),
      ]);
      setMateriellList(erLaererInnlogget ? laererMateriell : elevMateriell);
      setMateriellFeil("");
      setLaererMateriellFeil("");
      setSistOppdatert(new Date());
    } catch (error) {
      setLaererMateriellFeil(error.message || "Kunne ikke markere materiell som ordnet.");
    }
  }

  async function tilbakestillKo() {
    const bekreftet = window.confirm("Er du sikker på at du vil tilbakestille den aktive køen?");
    if (!bekreftet) return;

    try {
      const response = await fetch("/api/teacher/queue", {
        method: "DELETE",
        headers: { Authorization: laererAuthHeader() },
      });
      await readApiResponse(response, "Kunne ikke tilbakestille køen. Sjekk Vercel Functions-loggen.");

      const [nyElevKo, nyLaererKo] = await Promise.all([hentElevKoFraApi(), hentLaererKoFraApi()]);
      setElevKo(nyElevKo);
      setLaererKo(nyLaererKo);
      setKoFeil("");
      setLaererKoFeil("");
      setSistOppdatert(new Date());
    } catch (error) {
      setLaererKoFeil(error.message || "Kunne ikke tilbakestille køen.");
    }
  }

  function loggUt() {
    sessionStorage.removeItem(TEACHER_STORAGE_KEY);
    setErLaererInnlogget(false);
    setVisLaerer(false);
    setLaererVisning("ko");
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        <TopBar
          aktivSide={aktivSide}
          erLaererInnlogget={erLaererInnlogget}
          innstillinger={innstillinger}
          onLogout={loggUt}
          onOpenTeacher={() => setVisLaerer(true)}
          onVelgSide={velgElevSide}
        />

        {visLaerer && !erLaererInnlogget ? (
          <LoginScreen
            onLogin={() => {
              setErLaererInnlogget(true);
              setVisLaerer(true);
              setLaererVisning("ko");
            }}
          />
        ) : erLaererInnlogget ? (
          <LaererPage
            ko={laererKo}
            koFeil={laererKoFeil}
            laererVisning={laererVisning}
            analytics={analytics}
            materiellFeil={laererMateriellFeil}
            materiellList={materiellList}
            innstillinger={innstillinger}
            klasseromVarselAktivt={klasseromVarselAktivt}
            sistOppdatert={sistOppdatert}
            onByttLaererVisning={setLaererVisning}
            onToggleKlasseromVarsel={toggleKlasseromVarsel}
            onMerkHjulpet={merkSomHjulpet}
            onMerkMateriell={merkMateriellOrdnet}
            onToggleVisibility={toggleVisibility}
            onTilbakestillKo={tilbakestillKo}
          />
        ) : aktivSide.startsWith("beregning-") ? (
          <BeregningPage aktivSide={aktivSide} />
        ) : aktivSide === "materiell" ? (
          <MateriellPage
            list={materiellList}
            feil={materiellFeil}
            onLeggTilMateriell={leggTilMateriell}
          />
        ) : (
          <HandsopprekkingPage
            ko={elevKo}
            koFeil={koFeil}
            sistOppdatert={sistOppdatert}
            onLeggTil={leggTilIKo}
          />
        )}

        <footer className="app-footer">© Lokna</footer>
      </div>
    </div>
  );
}
