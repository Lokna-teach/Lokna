import React, { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Hand,
  ListChecks,
  LockKeyhole,
  LogOut,
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
];

function hasValue(value) {
  return String(value ?? "").trim() !== "";
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

async function hentElevKoFraApi() {
  const response = await fetch("/api/queue", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Kunne ikke hente køen.");
  return Array.isArray(data.queue) ? data.queue : [];
}

async function hentLaererKoFraApi() {
  const response = await fetch("/api/teacher/queue", {
    cache: "no-store",
    headers: { Authorization: laererAuthHeader() },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Kunne ikke hente lærerkøen.");
  return Array.isArray(data.queue) ? data.queue : [];
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

function TopBar({ erLaererInnlogget, onLogout }) {
  return (
    <header className="top-bar">
      <div className="brand-mark">
        <Hand size={20} />
        <span>Håndsopprekking</span>
      </div>
      {erLaererInnlogget && (
        <button type="button" className="ghost-button" onClick={onLogout}>
          <LogOut size={18} />
          Logg ut
        </button>
      )}
    </header>
  );
}

function HandsopprekkingPage({ ko, onLeggTil, koFeil, sistOppdatert, onOpenTeacher }) {
  const [navn, setNavn] = useState("");
  const [gjelder, setGjelder] = useState("");
  const [sjekket, setSjekket] = useState([]);
  const [melding, setMelding] = useState("");
  const [sender, setSender] = useState(false);

  function toggleSjekket(valg) {
    setSjekket((forrige) =>
      forrige.includes(valg)
        ? forrige.filter((aktivtValg) => aktivtValg !== valg)
        : [...forrige, valg]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!hasValue(navn) || !hasValue(gjelder) || sjekket.length === 0) {
      setMelding("Fyll inn navn, hva det gjelder, og kryss av minst ett sted du har sjekket.");
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
        window.alert("fy!");
      }
      setMelding(error.message || "Kunne ikke legge deg i kø akkurat nå.");
    } finally {
      setSender(false);
    }
  }

  return (
    <section className="page">
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
                placeholder="Forklar kort hva du står fast på"
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

        <QueuePanel ko={ko} koFeil={koFeil} sistOppdatert={sistOppdatert} onOpenTeacher={onOpenTeacher} />
      </div>
    </section>
  );
}

function QueuePanel({ ko, koFeil, sistOppdatert, onOpenTeacher }) {
  return (
    <aside className="queue-panel" aria-live="polite">
      <div className="queue-panel-header">
        <div>
          <p className="portal-eyebrow">Oppdateres ca. hvert minutt</p>
          <h2 onDoubleClick={onOpenTeacher}>Kø</h2>
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
  const sjekketStatistikk = sjekklisteValg.map((valg) => ({
    valg,
    antall: hjulpne.filter((innslag) => innslag.sjekket?.includes(valg)).length,
  }));
  const maksSjekketAntall = Math.max(1, ...sjekketStatistikk.map((item) => item.antall));
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

        <StatsPanel title="Hva elevene sjekket først" eyebrow="Forarbeid">
          <div className="bar-chart">
            {sjekketStatistikk.map((item) => (
              <BarRow key={item.valg} label={item.valg} value={item.antall} max={maksSjekketAntall} />
            ))}
          </div>
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

function LaererPage({ ko, koFeil, onMerkHjulpet, sistOppdatert }) {
  const aktivKo = ko.filter((innslag) => !innslag.hjulpet);

  return (
    <section className="page">
      <header className="hero">
        <div>
          <p className="portal-eyebrow">Lærer</p>
          <h1>Hjelpekø</h1>
          <p>Her ser du detaljer for hver elev og kan fjerne dem fra køen når de er hjulpet.</p>
        </div>
        <div className="hero-stat">
          <ListChecks size={22} />
          <span>{aktivKo.length}</span>
          <strong>aktive</strong>
        </div>
      </header>

      <LaererStatus ko={ko} />

      <section className="card">
        <div className="section-heading">
          <div className="section-icon">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <p className="portal-eyebrow">Aktiv kø</p>
            <h2>{aktivKo.length} i kø</h2>
            {sistOppdatert && (
              <p className="queue-updated">Sist oppdatert {sistOppdatert.toLocaleTimeString("nb-NO")}</p>
            )}
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
    </section>
  );
}

export default function App() {
  const [visLaerer, setVisLaerer] = useState(false);
  const [erLaererInnlogget, setErLaererInnlogget] = useState(
    () => sessionStorage.getItem(TEACHER_STORAGE_KEY) === "true"
  );
  const [elevKo, setElevKo] = useState([]);
  const [laererKo, setLaererKo] = useState([]);
  const [koFeil, setKoFeil] = useState("");
  const [laererKoFeil, setLaererKoFeil] = useState("");
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
    if (!erLaererInnlogget) return undefined;

    async function oppdaterLaererKo() {
      try {
        const ko = await hentLaererKoFraApi();
        setLaererKo(ko);
        setLaererKoFeil("");
        setSistOppdatert(new Date());
      } catch (error) {
        setLaererKoFeil(error.message || "Køserveren svarer ikke.");
      }
    }

    oppdaterLaererKo();
    const intervall = window.setInterval(oppdaterLaererKo, 15000);
    return () => window.clearInterval(intervall);
  }, [erLaererInnlogget]);

  async function leggTilIKo(innslag) {
    const response = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(innslag),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Kunne ikke legge deg i kø.");
    }

    const ko = await hentElevKoFraApi();
    setElevKo(ko);
    setKoFeil("");
    setSistOppdatert(new Date());
    return data.plass;
  }

  async function merkSomHjulpet(id) {
    const response = await fetch(`/api/teacher/queue/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { Authorization: laererAuthHeader() },
    });
    const data = await response.json();

    if (!response.ok) {
      setLaererKoFeil(data.message || "Kunne ikke markere som hjulpet.");
      return;
    }

    const [nyElevKo, nyLaererKo] = await Promise.all([hentElevKoFraApi(), hentLaererKoFraApi()]);
    setElevKo(nyElevKo);
    setLaererKo(nyLaererKo);
    setKoFeil("");
    setLaererKoFeil("");
    setSistOppdatert(new Date());
  }

  function loggUt() {
    sessionStorage.removeItem(TEACHER_STORAGE_KEY);
    setErLaererInnlogget(false);
    setVisLaerer(false);
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        <TopBar erLaererInnlogget={erLaererInnlogget} onLogout={loggUt} />

        {visLaerer && !erLaererInnlogget ? (
          <LoginScreen onLogin={() => setErLaererInnlogget(true)} />
        ) : visLaerer ? (
          <LaererPage
            ko={laererKo}
            koFeil={laererKoFeil}
            sistOppdatert={sistOppdatert}
            onMerkHjulpet={merkSomHjulpet}
          />
        ) : (
          <HandsopprekkingPage
            ko={elevKo}
            koFeil={koFeil}
            sistOppdatert={sistOppdatert}
            onLeggTil={leggTilIKo}
            onOpenTeacher={() => setVisLaerer(true)}
          />
        )}

        <footer className="app-footer">© Lokna</footer>
      </div>
    </div>
  );
}
