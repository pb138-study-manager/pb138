# PB138 — Ako má vyzerať finálny produkt

> **Student OS** — akademický hub pre študentov a učiteľov MU Brno  
> Verzia: 2026-05-16

---

## Vízia

App, ktorú student otvorí každé ráno a vidí celý deň na jednom mieste — čo má spraviť, čo má odovzdané od učiteľa, čo sa blíži. Učiteľ otvorí app a vidí kto zaostáva, čo treba ohodnotiť.

Nie ďalší todo list. Nie ďalší LMS. Jedno miesto, kde sa stretáva osobná organizácia s akademickými povinnosťami — spojené AI copilotom.

---

## App Shell

### Desktop layout

```
┌─────────────┬──────────────────────────────┬──────────────┐
│   Sidebar   │        Hlavný obsah          │  AI Copilot  │
│  (ľavý)     │                              │  (pravý)     │
│             │                              │  collapsible │
│  nav items  │                              │              │
│             │                              │              │
└─────────────┴──────────────────────────────┴──────────────┘
```

### Mobile layout

Hlavný obsah zaberá celú plochu. Navigácia je **bottom nav** (5 slotov). AI copilot je jeden zo slotov alebo dostupný cez floating button.

### Sidebar — Studentský pohľad

```
STUDENT  ⇄
─────────────────
🏠  Today
✅  Tasks       7
📚  Courses
📝  Notes
📅  Timeline
─────────────────
👤  Profile
```

Číslo vedľa Tasks = počet nesplnených taskov s dneš. deadline.

### Sidebar — Učiteľský pohľad

Prepína sa pill-om **STUDENT ⇄ TEACHER** v headeri sidebaru — viditeľný iba ak má user rolu TEACHER. Prepnutie neodhlási, iba zmení navigáciu.

```
TEACHER  ⇄
─────────────────
🏫  My Classes
📋  Assignments
📊  Evaluations  4
📦  Materials
👥  Students
─────────────────
👤  Profile
```

Číslo vedľa Evaluations = počet taskov čakajúcich na hodnotenie.

---

## Stránky — Študent

### 🏠 Today

Domovská stránka. To prvé čo student vidí po prihlásení.

**Čo obsahuje:**
- Personalizovaný pozdrav: *"Good morning, Peter 👋 — Thursday, May 15 · 3 tasks due today"*
- **Week strip** — 7 dní v rade, dnešok zvýraznený, bodky pod dňami kde sú tasky/eventy
- **Today's Tasks** — tasky s deadline = dnes, každý s checkboxom (toggle done), badge "DUE TODAY" / "TOMORROW"
- Teacher-assigned tasky sú označené: `📚 PB138 · From teacher`
- **Upcoming Deadlines** — najbližšie deadliny (kurzy, eventy) s farebným urgency indikátorom
- Tlačidlo `+ Add task for today`

**AI panel** (pravý, default otvorený):
- Overload warning ak je priveľa taskov v týždni
- Priority nudge pre najdôležitejší task
- Skrátené zhrnutie notes pre kurz s blížiacim deadlinom

---

### ✅ Tasks

Kompletný zoznam všetkých taskov používateľa.

**Čo obsahuje:**
- Zoznam taskov (karty) — title, due date, status badge, kurz (ak je priradený)
- Teacher-assigned tasky označené `📚 [KÓD KURZU] · From teacher`
- Kliknutie na task → detail s popisom + subtasky + eval (ak existuje)
- **Subtasky** — každý task môže mať vnorené subtasky, zobrazené pod rodičovským
- Filter: status (TODO / IN PROGRESS / DONE), dátumový rozsah
- Zoradenie: podľa due date (default), statusu
- Tlačidlo `+ New task` → modal s formulárom (title, due date, popis, voliteľné: priradenie ku kurzu)

---

### 📚 Courses

Zoznam kurzov v ktorých je student zapísaný.

**Čo obsahuje:**
- Karta kurzu: kód (`PB138`), názov, semester, progress bar (`75% · 9/12 tasks done`)
- Kliknutie → Course detail

**Course detail** (single scroll page, nie taby):
- **Header** — gradient podľa farby kurzu, kód + názov, rozvrh (`Mon 10:00 lecture · Thu 14:00 seminar`), meno učiteľa, progress bar + percento
- **Tasks sekcia** — tasky priradené k tomuto kurzu (aj teacher-assigned)
- **Study Materials sekcia** — linky/súbory zdieľané učiteľom (title, URL/link, popis)
- **My Grades sekcia** — ohodnotené tasky (score + feedback od učiteľa)

---

### 📝 Notes

Osobné poznámky s priečinkami.

**Čo obsahuje:**
- Ľavý panel: zoznam priečinkov + tlačidlo `+ New folder`
- Pravý panel: zoznam notes v aktívnom priečinku
- Kliknutie na note → detail/edit (title + rich text / markdown description)
- Note môže byť priradená ku kurzu (voliteľné)
- Tlačidlo `+ New note`

---

### 📅 Timeline

Kalendárový/chronologický pohľad na eventy a deadliny.

**Čo obsahuje:**
- Zoznam nadchádzajúcich eventov (title, dátum, čas, miesto)
- Deadliny z kurzov sú viditeľné tu tiež
- Tlačidlo `+ New event` → modal (title, start date/time, end date/time, miesto, popis)
- Edit a delete eventov

---

### 👤 Profile / Settings

**Profile tab:**
- Avatar (URL), meno, titul, organizácia, bio
- Formulár na zmenu

**Settings tab:**
- Prepínač Dark / Light mode (ukladá sa do DB + aplikuje okamžite)
- Prepínač jazyka EN / CS (ukladá sa do localStorage)
- Prepínač notifikácií (zapnúť/vypnúť)

---

## Stránky — Učiteľ

### 🏫 My Classes

Domovská stránka učiteľa po prepnutí na teacher view.

**Čo obsahuje:**
- Karta kurzu: kód, názov, počet zapísaných, rozvrh, badge `N pending evals`
- Stav kurzu: Active / Archived
- Tlačidlo `+ Create new course` → modal (kód, názov, semester, farba, rozvrh prednášky, rozvrh seminára)

---

### 📋 Assignments

**Čo obsahuje:**
- Zoznam assignmentov pre každý kurz
- Vytvorenie assignment: `POST /groups/:id/assignments` — automaticky vytvorí task pre každého zapísaného študenta v kurze
- Task sa objaví v zozname taskov každého študenta s tagom `📚 [KÓD] · From teacher`
- Sledovanie stavu: koľko % študentov má task ako DONE

**Vytvorenie assignment:**
- Výber kurzu
- Title + popis + due date
- Publish → task sa vytvorí pre každého zapísaného

---

### 📊 Evaluations

**Čo obsahuje:**
- Zoznam taskov kde `status = DONE` alebo je po deadline — bez hodnotenia
- Kliknutie → eval formulár: score (0–100) + textový feedback
- Po odovzdaní hodnotenia → student dostane notifikáciu
- História hodnotení (aj už ohodnotené)

---

### 📦 Study Materials

**Čo obsahuje:**
- Zoznam materiálov per kurz
- Pridanie materiálu: title + URL (externý link) + voliteľný popis
- Odstránenie (soft delete)
- Po pridaní → všetci zapísaní študenti dostanú notifikáciu

---

### 👥 Students

**Čo obsahuje:**
- Per kurz: zoznam zapísaných študentov (meno, email)
- Enroll: vyhľadávanie používateľov podľa mena/emailu + pridanie do kurzu
- Remove: odobratie zo kurzu
- Pohľad na stav taskov per študent (koľko splnených, koľko pending)

---

## AI Copilot panel

Pravý panel — collapsible na desktope, tab na mobile. Dostupný na všetkých stránkach.

### Módy

**① Proaktívny feed** (default stav panelu)

Panel zobrazuje kontextuálne karty bez toho aby sa pýtal:

| Typ karty | Popis |
|---|---|
| ⚠️ Overload warning | "5 taskov + 2 skúšky tento týždeň — začni s PB138 projektom teraz" |
| 📌 Priority nudge | "PB138 Project 2 — deadline za 3 dni, stále TODO" |
| ✅ Progress | "8 taskov hotových tento týždeň — o 60% viac ako minulý" |
| 📝 Note summary | "Tvoje PB138 notes pokrývajú REST, auth, Drizzle ORM" |

Každá karta má akčné tlačidlá (napr. "Generate plan", "Reschedule").

**② Chat**

Plnohodnotný chat. Študent sa pýta čokoľvek:
- *"Čo by som mal dnes študovať?"*
- *"Zhrň moje PB138 notes"*
- *"Som na dobrej ceste tento týždeň?"*

AI odpovedá s kontextom z reálnych dát používateľa (tasky, deadliny, notes).

**③ Weekly Plan Generator**

Tlačidlo v paneli alebo cez chat. AI prečíta všetky tasky + eventy na nasledujúci týždeň a vygeneruje denný study plán. Student ho môže jedným kliknutím pushnúť do Timeline.

### AI pre učiteľa

Na teacher view zobrazuje panel **AI Insights** (nie copilot):
- "4 študenti v PB138 neodovzdali minulotýždňový task"
- "Títo študenti majú najviac oneskorených taskov: ..."
- Tlačidlo "Draft assignment description with AI"

### Čo AI vie (a čo nie)

**Vie:**
- Tvoje tasky + deadliny + stav
- Kurzy v ktorých si zapísaný
- Obsah tvojich notes
- História splnených taskov
- Timeline eventy

**Nevie (privacy):**
- Notes jedného študenta nie sú viditeľné inému
- Učiteľ vidí cez AI iba agregované/anonymizované štatistiky — nikdy osobné dáta konkrétneho študenta

---

## Notifikácie

### Bell ikona (header)

- Badge s počtom neprečítaných
- Kliknutie → dropdown zoznam posledných notifikácií
- Kliknutie na notifikáciu → navigate na relevantný zdroj + označiť ako prečítané

### Typy notifikácií

| Typ | Komu | Kedy |
|---|---|---|
| `ASSIGNMENT_CREATED` | Študent | Učiteľ vytvorí nový assignment v kurze |
| `MATERIAL_ADDED` | Študent | Učiteľ pridá study material do kurzu |
| `TASK_EVALUATED` | Študent | Učiteľ ohodnotí task (score + feedback) |
| `GROUP_INVITE` | Používateľ | Pridanie do skupiny |

---

## Global Search (CMD+K)

- Klávesová skratka CMD+K (desktop) alebo search ikona (mobile)
- Výsledky zoskupené: **Tasks · Notes · Courses · Materials**
- Každý výsledok je klikateľný a naviguje na detail
- Backend hľadá ILIKE cez všetky typy paralelne

---

## Admin panel

Prístupný iba pre rolu ADMIN. Sekcie:

| Stránka | Čo obsahuje |
|---|---|
| Users | Tabuľka všetkých používateľov, edit, deaktivácia (soft delete) |
| Roles | Pridelenie/odobratie role konkrétnemu používateľovi |
| Audit Logs | Chronologický zoznam všetkých mutácií v systéme, filter podľa používateľa a dátumu |
| Settings | Globálne nastavenia systému |

---

## UX pravidlá

- **Dark mode** — toggle v nastaveniach, aplikuje sa cez `dark` class na `<html>`, persistuje v DB
- **i18n** — EN a CS, prepínač v nastaveniach, ukladá sa do localStorage
- **Soft delete** — nič sa v UI nevymaže natvrdo; deleted položky sa jednoducho neobjavia
- **Loading states** — každá asynchrónna operácia má loading stav (spinner / skeleton)
- **Prázdne stavy** — ak nemáš žiadne tasky/notes/kurzy, zobrazí sa ilustrácia + CTA
- **Mobilný dizajn** — app je mobile-first; desktop je rozšírením, nie separátnou verziou

---

## Čo zámer nevybuduje (YAGNI)

Aby bol scope jasný:

- ❌ Real-time kolaborácia na notes
- ❌ File upload na server (study materials = iba URL linky)
- ❌ Push notifikácie / native mobile app
- ❌ Grade book / GPA kalkulačka
- ❌ Student-to-student správy
- ❌ Video/audio obsah
