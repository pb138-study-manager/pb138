# Matica obrazoviek — Study Manager (Student OS)

Matica zobrazuje, ktoré obrazovky sú dostupné pre každú rolu. Roly sú kumulatívne: TEACHER a ADMIN sú súčasne aj USER.

## Legenda

| Symbol | Význam |
|--------|--------|
| ✅ | Plný prístup |
| 👁 | Len čítanie / obmedzený pohľad |
| ❌ | Nedostupné / presmerované |
| ⚠️ | Placeholder — stránka existuje, obsah nie je implementovaný |

---

## Matica prístupu

| Obrazovka / URL | GUEST | USER | TEACHER | ADMIN |
|---|---|---|---|---|
| **/ (Landing page)** | ✅ | ✅ | ✅ | ✅ |
| **/login** | ✅ | ✅ | ✅ | ✅ |
| **/register** | ✅ | ✅ | ✅ | ✅ |
| **/verify-email** | ✅ | ✅ | ✅ | ✅ |
| **— Chránené stránky —** | | | | |
| **/today** | ❌ | ✅ | ✅ | ✅ |
| **/tasks** | ❌ | ✅ | ✅ | ✅ |
| **/notes** | ❌ | ✅ | ✅ | ✅ |
| **/notes/:noteId** | ❌ | ✅ | ✅ | ✅ |
| **/timeline** | ❌ | ✅ | ✅ | ✅ |
| **/courses** | ❌ | ✅ | ✅ | ✅ |
| **/courses/new** | ❌ | ❌ | ✅ | ✅ |
| **/courses/:courseId** (student view) | ❌ | ✅ | ✅ | ✅ |
| **/courses/:courseId** (teacher view — tab Assignments) | ❌ | ❌ | ✅ | ✅ |
| **/courses/:courseId** (teacher view — tab Materials) | ❌ | ❌ | ✅ | ✅ |
| **/courses/:courseId** (teacher view — tab Students) | ❌ | ❌ | ✅ | ✅ |
| **/profile** | ❌ | ✅ | ✅ | ✅ |
| **/others** (More drawer) | ❌ | ✅ | ✅ | ✅ |
| **— Teacher portal —** | | | | |
| **/teachers** (My Classes) | ❌ | ❌ | ✅ | ✅ |
| **/teachers/assignments** | ❌ | ❌ | ⚠️ | ⚠️ |
| **/teachers/materials** | ❌ | ❌ | ⚠️ | ⚠️ |
| **/teachers/students** | ❌ | ❌ | ⚠️ | ⚠️ |
| **— Admin panel —** | | | | |
| **/admin** (prehľad) | ❌ | ❌ | ❌ | ✅ |
| **/admin/users** | ❌ | ❌ | ❌ | ✅ |
| **/admin/roles** | ❌ | ❌ | ❌ | ✅ |
| **/admin/logs** | ❌ | ❌ | ❌ | ✅ |
| **/admin/settings** | ❌ | ❌ | ❌ | ⚠️ |
| **/admin/database** | ❌ | ❌ | ❌ | ⚠️ |

---

## Navigácia podľa roly

### Študent (USER / TEACHER v student móde)

| Slot | Obrazovka | URL |
|------|-----------|-----|
| 1 | Today | /today |
| 2 | Tasks | /tasks |
| 3 | Courses | /courses |
| 4 | Notes | /notes |
| 5 | Others | /others |
| — | Profile | /profile |
| — | Role toggle (len TEACHER) | — prepne do teacher módu |

### Učiteľ (TEACHER v teacher móde)

| Slot | Obrazovka | URL |
|------|-----------|-----|
| 1 | My Classes | /teachers |
| 2 | Profile | /profile |
| — | Role toggle | — prepne späť do student módu |

> Role toggle je tlačidlo v spodnej navigácii (mobil) a v sidebar (desktop). Viditeľné iba pre používateľov s rolou TEACHER.

### Admin (ADMIN)

Admin má prístup k všetkým USER obrazovkám + vlastný admin panel s vlastným sidebar (`/admin/*`). Hlavná navigácia sa na admin stránkach skrýva.

---

## Detailné oprávnenia per obrazovka

### /courses/:courseId

| Akcia | USER (zapísaný) | USER (nezapísaný) | TEACHER (kurzu) | ADMIN |
|-------|-----------------|-------------------|-----------------|-------|
| Zobraziť detail kurzu | ✅ | ❌ | ✅ | ✅ |
| Zobraziť study materials | ✅ | ❌ | ✅ | ✅ |
| Zobraziť assignments (tab) | ✅ | ❌ | ✅ | ✅ |
| Zobraziť zoznam študentov | ❌ | ❌ | ✅ | ✅ |
| Vytvoriť assignment | ❌ | ❌ | ✅ | ✅ |
| Editovať assignment | ❌ | ❌ | ✅ | ✅ |
| Pridať study material | ❌ | ❌ | ✅ | ✅ |
| Zapísať sa / odhlásiť z kurzu | ✅ | ✅ | ❌ | ✅ |
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
| Zobraziť / editovať používateľov | ❌ | ❌ | ✅ |
| Spravovať role | ❌ | ❌ | ✅ |
| Zobraziť audit logy | ❌ | ❌ | ✅ |
| Systémové nastavenia | ❌ | ❌ | ⚠️ placeholder |

---

## Role v systéme

| Rola | Popis | Pridelenie |
|------|-------|-----------|
| **USER** | Základná rola každého prihláseného používateľa — tasky, notes, kurzy, timeline | Automaticky pri registrácii |
| **TEACHER** | Učiteľ — vytvára kurzy, zadáva úlohy, spravuje materials, hodnotí | Manuálne administrátorom |
| **ADMIN** | Systémový administrátor — plný prístup vrátane admin panelu | Manuálne |
