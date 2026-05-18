# Matica obrazoviek — Study Manager (Student OS)

Matica zobrazuje, ktoré obrazovky sú dostupné pre každú rolu. Roly sú kumulatívne: TEACHER a ADMIN sú súčasne aj USER (majú všetky práva USER + navyše vlastné).

## Legenda

| Symbol | Význam |
|--------|--------|
| ✅ | Plný prístup |
| 👁 | Len čítanie / obmedzený pohľad |
| ❌ | Nedostupné / presmerované |
| 🔀 | Závisí od roly (role toggle) |

---

## Matica prístupu

| Obrazovka / URL | GUEST (neprihlásený) | USER | TEACHER | ADMIN |
|---|---|---|---|---|
| **/ (Landing page)** | ✅ | ✅ | ✅ | ✅ |
| **/login** | ✅ | ✅ (presmerovanie na /today) | ✅ | ✅ |
| **/register** | ✅ | ✅ (presmerovanie na /today) | ✅ | ✅ |
| **/verify-email** | ✅ | ✅ | ✅ | ✅ |
| **--- Chránené stránky (vyžadujú prihlásenie) ---** | | | | |
| **/today** | ❌ | ✅ | ✅ | ✅ |
| **/tasks** | ❌ | ✅ | ✅ | ✅ |
| **/notes** | ❌ | ✅ | ✅ | ✅ |
| **/notes/:noteId** | ❌ | ✅ (vlastné poznámky) | ✅ | ✅ |
| **/timeline** | ❌ | ✅ | ✅ | ✅ |
| **/courses** | ❌ | ✅ (zapísané kurzy) | ✅ | ✅ |
| **/courses/new** | ❌ | ❌ | ✅ | ✅ |
| **/courses/:courseId** | ❌ | 👁 (ako študent) | ✅ (ako učiteľ kurzu) | ✅ |
| **/profile** | ❌ | ✅ | ✅ | ✅ |
| **--- Teacher portal (role toggle STUDENT ⇄ TEACHER) ---** | | | | |
| **/teachers** (My Classes) | ❌ | ❌ | ✅ | ✅ |
| **/teachers/assignments** | ❌ | ❌ | ✅ | ✅ |
| **/teachers/materials** | ❌ | ❌ | ✅ | ✅ |
| **/teachers/students** | ❌ | ❌ | ✅ | ✅ |
| **--- Admin panel ---** | | | | |
| **/admin** | ❌ | ❌ | ❌ | ✅ |
| **/admin/users** | ❌ | ❌ | ❌ | ✅ |
| **/admin/roles** | ❌ | ❌ | ❌ | ✅ |
| **/admin/logs** | ❌ | ❌ | ❌ | ✅ |
| **/admin/settings** | ❌ | ❌ | ❌ | ✅ |
| **/admin/database** | ❌ | ❌ | ❌ | ✅ |
| **--- Pomocné stránky ---** | | | | |
| **/custom-nav** | ❌ | ✅ | ✅ | ✅ |
| **/others** (More drawer) | ❌ | ✅ | ✅ | ✅ |

---

## Navigácia podľa roly

### Študent (USER) — bottom nav / sidebar

| Slot | Obrazovka | Ikona |
|------|-----------|-------|
| 1 | Today | 🏠 |
| 2 | Tasks | ✅ |
| 3 | Courses | 📚 |
| 4 | Notes | 📝 |
| 5 | Timeline | 📅 |
| — | Profile | 👤 |
| — | Others / More | ⋯ |

### Učiteľ (TEACHER) — po prepnutí roly

| Slot | Obrazovka | Ikona |
|------|-----------|-------|
| 1 | My Classes | 🏫 |
| 2 | Assignments | 📋 |
| 3 | Study Materials | 📦 |
| 4 | Students | 👥 |
| — | Profile | 👤 |

### Admin (ADMIN)

Admin má prístup k všetkým USER obrazovkám + admin panel (`/admin/*`).

---

## Detailné oprávnenia per obrazovka

### /courses/:courseId

| Akcia | USER (zapísaný) | USER (nezapísaný) | TEACHER (kurzu) | ADMIN |
|-------|-----------------|-------------------|-----------------|-------|
| Zobraziť detail kurzu | ✅ | ❌ | ✅ | ✅ |
| Zobraziť study materials | ✅ | ❌ | ✅ | ✅ |
| Zobraziť assignments | ✅ | ❌ | ✅ | ✅ |
| Zobraziť zoznam študentov | ❌ | ❌ | ✅ | ✅ |
| Kliknúť na kartu študenta (detail) | ❌ | ❌ | ✅ | ✅ |
| Vytvoriť assignment | ❌ | ❌ | ✅ | ✅ |
| Editovať assignment | ❌ | ❌ | ✅ | ✅ |
| Pridať study material | ❌ | ❌ | ✅ | ✅ |
| Zapísať sa do kurzu | ✅ (enroll) | ✅ | ❌ | ✅ |
| Vymazať kurz | ❌ | ❌ | ✅ | ✅ |

### /tasks

| Akcia | USER | TEACHER | ADMIN |
|-------|------|---------|-------|
| Zobraziť vlastné úlohy | ✅ | ✅ | ✅ |
| Vytvoriť úlohu | ✅ | ✅ | ✅ |
| Editovať vlastnú úlohu | ✅ | ✅ | ✅ |
| Zmazať vlastnú úlohu | ✅ | ✅ | ✅ |
| Zobraziť cudzie úlohy | ❌ | 👁 (cez kurz) | ✅ |
| Hodnotiť úlohu (eval) | ❌ | ✅ | ✅ |

### /admin/*

| Akcia | USER | TEACHER | ADMIN |
|-------|------|---------|-------|
| Prístup k admin panelu | ❌ | ❌ | ✅ |
| Spravovať používateľov | ❌ | ❌ | ✅ |
| Spravovať role | ❌ | ❌ | ✅ |
| Zobraziť audit logy | ❌ | ❌ | ✅ |
| Systémové nastavenia | ❌ | ❌ | ✅ |

---

## Role v systéme

| Rola | Popis | Pridelenie |
|------|-------|-----------|
| **USER** | Základná rola každého prihláseného používateľa | Automaticky pri registrácii |
| **TEACHER** | Učiteľ — môže vytvárať kurzy, zadávať úlohy, hodnotiť | Manuálne administrátorom |
| **ADMIN** | Systémový administrátor — plný prístup | Manuálne |

> Poznámka: Rola MENTOR bola odstránená. Oprávnenia správy skupín a hodnotenia úloh prevzala rola TEACHER.
