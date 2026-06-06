# Matica obrazoviek — Study Manager (Student OS)

Matica zobrazuje, ktoré obrazovky sú dostupné pre každú rolu. Roly NIE sú kumulatívne — každá rola má vlastnú sadu obrazoviek.

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
| **— Študentské stránky —** | | | | |
| **/today** | ❌ | ✅ | ❌ | ❌ |
| **/tasks** | ❌ | ✅ | ❌ | ❌ |
| **/notes** | ❌ | ✅ | ❌ | ❌ |
| **/notes/:noteId** | ❌ | ✅ | ❌ | ❌ |
| **/timeline** | ❌ | ✅ | ❌ | ❌ |
| **/courses** | ❌ | ✅ | ❌ | ❌ |
| **/courses/:courseId** (student view) | ❌ | ✅ | ❌ | ❌ |
| **/profile** | ❌ | ✅ | ✅ | ❌ |
| **— Teacher portal —** | | | | |
| **/teachers** (My Classes) | ❌ | ❌ | ✅ | ❌ |
| **/courses/:courseId** (tab Assignments) | ❌ | ❌ | ✅ | ❌ |
| **/courses/:courseId** (tab Materials) | ❌ | ❌ | ✅ | ❌ |
| **/courses/:courseId** (tab Students) | ❌ | ❌ | ✅ | ❌ |
| **— Admin panel —** | | | | |
| **/admin** (prehľad) | ❌ | ❌ | ❌ | ✅ |
| **/admin/logs** | ❌ | ❌ | ❌ | ✅ |
| **/admin/users** | ❌ | ❌ | ❌ | ✅ |
| **/admin/roles** | ❌ | ❌ | ❌ | ✅ |

---

## Navigácia podľa roly

### Študent (USER)

| Slot | Obrazovka | URL |
|------|-----------|-----|
| 1 | Today | /today |
| 2 | Tasks | /tasks |
| 3 | Courses | /courses |
| 4 | Notes | /notes |
| 5 | Others | /others |
| — | Profile | /profile |

### Učiteľ (TEACHER)

| Slot | Obrazovka | URL |
|------|-----------|-----|
| 1 | My Classes | /teachers |
| 2 | Profile | /profile |

### Admin (ADMIN)

| Slot | Obrazovka | URL |
|------|-----------|-----|
| 1 | Overview | /admin |
| 2 | System Logs | /admin/logs |
| 3 | Users | /admin/users |
| 4 | Roles | /admin/roles |

---

## Detailné oprávnenia per obrazovka

### /courses/:courseId

| Akcia | USER (zapísaný) | USER (nezapísaný) | TEACHER (kurzu) |
|-------|-----------------|-------------------|-----------------|
| Zobraziť detail kurzu | ✅ | ❌ | ✅ |
| Zobraziť study materials | ✅ | ❌ | ✅ |
| Zobraziť assignments (tab) | ✅ | ❌ | ✅ |
| Zobraziť zoznam študentov | ❌ | ❌ | ✅ |
| Vytvoriť assignment | ❌ | ❌ | ✅ |
| Editovať assignment | ❌ | ❌ | ✅ |
| Hodnotiť assignment (eval) | ❌ | ❌ | ✅ |
| Pridať study material | ❌ | ❌ | ✅ |
| Zapísať sa / odhlásiť | ✅ | ✅ | ❌ |

### /tasks

| Akcia | USER |
|-------|------|
| Zobraziť vlastné úlohy | ✅ |
| Vytvoriť úlohu | ✅ |
| Editovať vlastnú úlohu | ✅ |
| Zmazať vlastnú úlohu | ✅ |

### /admin/*

| Akcia | ADMIN |
|-------|-------|
| Zobraziť prehľad (štatistiky) | ✅ |
| Zobraziť audit logy | ✅ |
| Zobraziť / editovať používateľov | ✅ |
| Spravovať role | ✅ |

---

## Role v systéme

| Rola | Popis | Pridelenie |
|------|-------|-----------|
| **USER** | Študent — tasky, notes, kurzy, timeline | Automaticky pri registrácii |
| **TEACHER** | Učiteľ — vlastné kurzy, zadania, materiály, hodnotenie | Manuálne administrátorom |
| **ADMIN** | Systémový administrátor — správa používateľov, rolí, logov | Manuálne |
