# Zeiterfassung – Projektübersicht (Stand v1.6)

Persönliche Zeiterfassungs-App für einen einzelnen Nutzer (Christian, Metallbau/Fexon-Kontext).
Läuft komplett offline im Browser, keine Server-Komponente, keine Abhängigkeiten außer Google Fonts (CDN).

## Architektur

- **Single-File-App**: eine `index.html` (~195 KB) enthält HTML, CSS und JS komplett inline. Kein Build-Prozess, kein npm, kein Bundler.
- **Speicherung**: `localStorage`, Key `zeiterfassung_data_v1`. Kein Backend, keine Accounts.
- **Rendering**: Kein Framework. Handgeschriebenes JS (IIFE), `innerHTML`-basiertes Re-Rendering pro Tab. Bottom-Nav mit 5 Tabs: Heute / Woche / Monat / Jahr / Einstellungen.
- **Modals**: Zwei Muster – `openSheet()` (statisch, schließt sich beim nächsten Öffnen) und `openSheetDynamic()` (Inhalt per `setContent()` austauschbar, ohne dass das Sheet zu-/aufklappt – wichtig für die Abwesenheits-Pillen und das Tag-Bearbeiten-Fenster, damit es nicht "flackert").
- **Fonts**: Big Shoulders Display (Headlines), Inter (Fließtext), JetBrains Mono (Zahlen/Uhrzeiten) – von Google Fonts geladen.
- **Design**: Rot/Schwarz, "Industrial"-Look (Warnstreifen-Header, "//"-Präfix vor Card-Headlines, rote Kartenumrandung, raue Hintergrundtextur via SVG-Noise-Filter, gebürstete Metalloptik bei der Stempeluhr).
- **Icon/PWA**: `apple-touch-icon` und Favicons sind als Base64-PNG inline im `<head>` eingebettet (kein separates Bilddateien nötig). "Powered by COC"-Badge (ebenfalls Base64) unter dem Header.

## Datenmodell (state-Objekt, JSON in localStorage)

```js
state = {
  settings: {
    sollWoche: 40,              // Sollstunden pro Woche
    workdays: [1,2,3,4,5],      // ISO-Wochentage die als Arbeitstage zählen (1=Mo..7=So)
    urlaubstageJahr: 25,        // Urlaubskontingent
    jobs: []                    // Liste von Job-Namen (strings)
  },
  tage: {
    "YYYY-MM-DD": {
      segmente: [{startTs, endTs, job}],   // Arbeitszeit-Blöcke (Epoch ms), job optional
      pausen: [{startTs, endTs}],          // Pausen-Blöcke
      manuellStunden: 0,                   // manuelle Korrektur in Stunden (+/-)
      abwesenheit: null | "urlaub" | "feiertag" | "ueberstunden"
    }
  },
  korrekturen: [{id, datum, betrag, notiz}],  // manuelle Überstundenkonto-Korrekturen
  laufend: null | {datum, startTs, job},      // aktiver "Kommen"-Stempel
  laufendPause: null | {datum, startTs},      // aktive Pause
  aktiverJob: null | "Jobname",               // aktuell gewählter Job (persistent bis geändert)
  ui: { tab, weekAnchor, monthAnchor, yearAnchor }  // Navigationszustand
}
```

## Kernberechnungen

- `dailySollBase(ds)`: reine Soll-Formel nach Wochentag (`sollWoche / workdays.length`, 0 wenn kein Arbeitstag), **ignoriert** Abwesenheit.
- `sollStundenTag(ds)`: wie oben, aber 0 wenn `abwesenheit` gesetzt ist (nichts mehr zu bringen).
- `istStundenTag(ds)`: Summe Arbeits-Segmente − Summe Pausen + manuelle Stunden. 0 wenn Abwesenheit gesetzt.
- `ueberstundenDeltaTag(ds)`: Beitrag eines Tages zum Überstundenkonto.
  - `urlaub`/`feiertag` → 0 (neutral)
  - `ueberstunden` (Ü-Tag genommen) → `-dailySollBase(ds)` (zehrt vom Konto)
  - normal → `ist - dailySollBase`
- `ueberstundenkontoGesamt()`: Summe aller Tages-Deltas + alle manuellen Korrekturen. Läuft über **alle** je erfassten Tage (keine Caching-Optimierung – bei sehr vielen Jahren Daten ggf. relevant für Performance).
- `istTagProblematisch(ds)`: true wenn Tag in der Vergangenheit liegt, Werktag ist, keine Abwesenheit gesetzt und `ist <= 0` → triggert das gelbe Warndreieck-Icon ("vermutlich vergessen zu stempeln").
- `feierabendTs(ds)`: berechnet den voraussichtlichen Feierabend-Zeitpunkt aus erstem Stempel-Start + Tagessoll + bisheriger Pausenzeit.

## Feature-Liste (chronologisch entstanden)

1. Grundgerüst: Stempeluhr (Kommen/Gehen), Soll/Ist-Vergleich, Wochen/Monats/Jahres-Übersicht, Settings (Sollstunden, Arbeitstage, Urlaubstage), Export/Import als JSON-Backup.
2. Redesign auf Rot/Schwarz, Pausen als Von-Bis-Stempel (kein Live-Sekunden-Zähler beim Arbeiten), Feierabend-Uhrzeit-Anzeige.
3. Bugfix: geteilte Variable in Event-Listenern (`var b`) führte zu `null`-Referenzfehlern beim Stempeln – behoben durch eigene `const`/`var`-Variable pro Button.
4. Feiertag als dritte Abwesenheitsart, Pause-Live-Timer (zeigt Gesamtpausenzeit des Tages, nicht nur die aktuelle Pause).
5. Kein Zu-/Aufklappen mehr beim Umschalten der Abwesenheit (dynamisches Sheet), Zeitraum-Abfrage ("nur dieser Tag" vs. "bis wann") für Urlaub/Feiertag/Ü-Tag, markiert automatisch nur die eingestellten Arbeitstage im Zeitraum.
6. Startzeit-Korrektur für laufende Stempel (auch ohne "Gehen" zu drücken), inkl. Möglichkeit den Stempel ganz zu verwerfen.
7. Bearbeiten bereits erfasster Zeiten (Tippen auf Zeile statt nur Löschen), Design-Überarbeitung (Inter/JetBrains-Mono-Fonts, raue Textur, Warnstreifen-Header, rote Kartenumrandung).
8. Pausen-Summenzeile statt Einzelauflistung (nur "X Min. · Yx", Detail bei Antippen), Pause wahlweise per Uhrzeit oder Minuten-Eingabe mit großem, mittig positioniertem Stepper (±1).
9. Job-Auswahl (mehrere Auftraggeber/Jobs verwaltbar, jeder Zeit-Eintrag bekommt ein `job`-Feld).
10. Statussymbole (⚒ Arbeit, ✈ Urlaub, ★ Feiertag, ⇄ Ü-Tag, ⚠ Warnung bei vergessenem Stempeln) in Woche/Monat-Listen mit Legende.

## Bekannte Grenzen / bewusst nicht umgesetzt

- **Keine Live Activity / Sperrbildschirm-Widget**: technisch nur mit nativer iOS-App (Swift/Xcode) möglich, nicht mit einer Web-App/PWA.
- **Keine Auswertung "Stunden pro Job"**: Jobs werden pro Segment gespeichert, aber es gibt noch keine aggregierte Ansicht (z. B. "Fexon: 32 Std. diese Woche"). Naheliegende nächste Ausbaustufe.
- **Keine automatische Feiertagserkennung** nach Bundesland – bewusst manuell gehalten, um keine falschen Annahmen zu treffen.
- **Überstundenkonto-Berechnung iteriert über alle Tage** bei jedem Aufruf – bei mehrjähriger Nutzung ggf. Performance-Optimierung (Caching/inkrementelle Summe) sinnvoll.
- **Keine Mehrgeräte-Synchronisation**: reines `localStorage`, gebunden an Browser + Domain. Umzug zwischen Hosting-Anbietern (z. B. Netlify → GitHub Pages) erfordert manuellen Export/Import, da jede Domain ihren eigenen Speicher hat.

## Deployment

Aktuell gehostet über **tiiny.host** (kostenlos, mit "Shared with tiiny.host"-Branding unten). Geplanter Umzug zu **Netlify** (eigener Account, sobald wieder Guthaben/Credits verfügbar sind) für ein werbefreies Ergebnis mit stabiler URL.

Frühere Versuche mit GitHub Pages sind an einem hängenden `pages build and deployment`-Workflow gescheitert (Status blieb dauerhaft "Queued") – vermutlich ein Runner-Problem bei einem sehr neuen Account, nicht app-seitig.

**Beim Hosting-Wechsel unbedingt beachten**: `localStorage` ist pro Domain getrennt. Vor dem Wechsel in der App unter Einstellungen → Export die Backup-Datei herunterladen, nach dem Wechsel auf der neuen Adresse über Import wieder einspielen.

## Namenskonventionen

- Versionsnummer steht in `APP_VERSION` (aktuell `"1.6"`), wird oben rechts im Header als Badge angezeigt.
- Ausgelieferte Dateien: `zeiterfassung.html` (zum direkten Ausprobieren) und `zeiterfassung-app.zip` (enthält `index.html`, fertig für Drag&Drop-Hosting-Dienste).
