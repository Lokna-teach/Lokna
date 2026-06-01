import React, { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardCheck,
  GraduationCap,
  Hand,
  ListChecks,
  LockKeyhole,
  LogOut,
  Package,
  PlusCircle,
  RotateCcw,
  Wrench,
  Users,
} from "lucide-react";

const TEACHER_USERNAME = "hamstr";
const TEACHER_PASSWORD = "lokna";
const TEACHER_STORAGE_KEY = "handsopprekking-laerer-innlogget";
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

function normalizeForFilter(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå]/g, "");
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

function TopBar({ aktivSide, erLaererInnlogget, onLogout, onOpenTeacher, onVelgSide }) {
  return (
    <header className="top-bar">
      {erLaererInnlogget ? (
        <div className="brand-mark">
          <GraduationCap size={20} />
          <span>Lærervisning</span>
        </div>
      ) : (
        <div className="top-nav">
          <button
            type="button"
            className={`nav-pill ${aktivSide === "handsopprekking" ? "active" : ""}`}
            onClick={() => onVelgSide("handsopprekking")}
          >
            <Hand size={20} />
            Håndsopprekking
          </button>
          <button
            type="button"
            className={`nav-pill ${aktivSide === "materiell" ? "active" : ""}`}
            onClick={() => onVelgSide("materiell")}
          >
            <Wrench size={20} />
            Materiell/verktøy
          </button>
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

function StatsPanel({ title, eyebrow, subtitle, children }) {
  return (
    <section className="stats-panel">
      <div>
        <p className="portal-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {subtitle && <p className="muted-text">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function BarRow({ label, value, max }) {
  return (
    <div className="bar-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function ActiveQueueSection({ aktivKo, koFeil, onMerkHjulpet, onTilbakestillKo, onOpenStatistikk, sistOppdatert }) {
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
          <button type="button" className="ghost-button" onClick={onOpenStatistikk}>
            <BarChart3 size={18} />
            Statistikk
          </button>
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

      <MaterialStatus list={list} />
    </>
  );
}

function LaererPage({
  ko,
  koFeil,
  laererVisning,
  materiellFeil,
  materiellList,
  onByttLaererVisning,
  onMerkHjulpet,
  onMerkMateriell,
  onTilbakestillKo,
  sistOppdatert,
}) {
  const aktivKo = ko.filter((innslag) => !innslag.hjulpet);
  const viserStatistikk = laererVisning === "statistikk";
  const viserMateriell = laererVisning === "materiell";

  return (
    <section className="page">
      <div className="teacher-tabs" aria-label="Lærervalg">
        <button
          type="button"
          className={!viserStatistikk && !viserMateriell ? "active" : ""}
          onClick={() => onByttLaererVisning("ko")}
        >
          <ListChecks size={18} />
          Aktiv kø
        </button>
        <button
          type="button"
          className={viserStatistikk ? "active" : ""}
          onClick={() => onByttLaererVisning("statistikk")}
        >
          <BarChart3 size={18} />
          Statistikk
        </button>
        <button
          type="button"
          className={viserMateriell ? "active" : ""}
          onClick={() => onByttLaererVisning("materiell")}
        >
          <Package size={18} />
          Materiell
        </button>
      </div>

      {viserMateriell ? (
        <TeacherMaterialSection list={materiellList} feil={materiellFeil} onMerkMateriell={onMerkMateriell} />
      ) : viserStatistikk ? (
        <>
          <header className="hero">
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
          </header>

          <LaererStatus ko={ko} />
        </>
      ) : (
        <ActiveQueueSection
          aktivKo={aktivKo}
          koFeil={koFeil}
          sistOppdatert={sistOppdatert}
          onMerkHjulpet={onMerkHjulpet}
          onTilbakestillKo={onTilbakestillKo}
          onOpenStatistikk={() => onByttLaererVisning("statistikk")}
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
  const [koFeil, setKoFeil] = useState("");
  const [laererKoFeil, setLaererKoFeil] = useState("");
  const [materiellFeil, setMateriellFeil] = useState("");
  const [laererMateriellFeil, setLaererMateriellFeil] = useState("");
  const [laererVisning, setLaererVisning] = useState("ko");
  const [sistOppdatert, setSistOppdatert] = useState(null);

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
        const [ko, materiell] = await Promise.all([hentLaererKoFraApi(), hentLaererMateriellFraApi()]);
        setLaererKo(ko);
        setMateriellList(materiell);
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
  }, [erLaererInnlogget]);

  function velgElevSide(side) {
    if (erLaererInnlogget) return;
    setAktivSide(side);
    setVisLaerer(false);
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
            materiellFeil={laererMateriellFeil}
            materiellList={materiellList}
            sistOppdatert={sistOppdatert}
            onByttLaererVisning={setLaererVisning}
            onMerkHjulpet={merkSomHjulpet}
            onMerkMateriell={merkMateriellOrdnet}
            onTilbakestillKo={tilbakestillKo}
          />
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
