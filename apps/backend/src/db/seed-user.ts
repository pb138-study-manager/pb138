import { db } from './index';
import { users, courses, userCourses, tasks, events, notes } from './schema';
import { eq } from 'drizzle-orm';

const AUTH_ID = '512a5542-ace1-4c95-a8fe-cf552e5b8e17';

const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.authId, AUTH_ID));

let userId: number;

if (existing) {
  console.log('User already exists with id:', existing.id);
  userId = existing.id;
} else {
  const [inserted] = await db
    .insert(users)
    .values({
      authId: AUTH_ID,
      email: 'perveka.peter@gmail.com',
      login: 'peter',
      pwdHash: 'supabase-managed',
      activeSession: false,
    })
    .returning({ id: users.id });
  userId = inserted.id;
  console.log('User inserted with id:', userId);
}

// Seed courses
const existingCourses = await db
  .select({ id: courses.id })
  .from(courses)
  .where(eq(courses.code, 'PB138'));

if (existingCourses.length === 0) {
  const courseData = [
    { code: 'PB138', name: 'Web Development', semester: 'Jar 2026', color: '#6366f1' },
    { code: 'IB101', name: 'Algoritmy a dátové štruktúry', semester: 'Jar 2026', color: '#8b5cf6' },
    { code: 'MA001', name: 'Matematická analýza', semester: 'Jar 2026', color: '#10b981' },
  ];

  const createdCourses = await db.insert(courses).values(courseData).returning({ id: courses.id });

  await db.insert(userCourses).values(createdCourses.map((c) => ({ userId, courseId: c.id })));
  console.log('Courses seeded:', createdCourses.length);
}

// Seed tasks
const existingTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId));

if (existingTasks.length === 0) {
  const now = new Date();
  const d = (daysOffset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + daysOffset);
    return date;
  };

  await db.insert(tasks).values([
    {
      userId,
      title: 'Dokončiť prezentáciu PB138',
      dueDate: d(0),
      status: 'IN PROGRESS',
      priority: 'HIGH',
      tags: ['pb138', 'prezentácia'],
    },
    {
      userId,
      title: 'Odovzdať zadanie č. 3',
      dueDate: d(1),
      status: 'TODO',
      priority: 'HIGH',
      tags: ['pb138'],
    },
    {
      userId,
      title: 'Prečítať kapitolu 5 — IB101',
      dueDate: d(2),
      status: 'TODO',
      priority: 'MEDIUM',
      tags: ['ib101'],
    },
    {
      userId,
      title: 'Seriózne sa pozrieť na derivácie',
      dueDate: d(3),
      status: 'TODO',
      priority: 'MEDIUM',
      tags: ['ma001'],
    },
    {
      userId,
      title: 'Pripraviť otázky na konzultáciu',
      dueDate: d(4),
      status: 'TODO',
      priority: 'LOW',
      tags: [],
    },
    {
      userId,
      title: 'Opraviť bugy v projekte',
      dueDate: d(1),
      status: 'TODO',
      priority: 'HIGH',
      tags: ['pb138', 'bug'],
    },
    {
      userId,
      title: 'Zopísať týždenný report',
      dueDate: d(5),
      status: 'TODO',
      priority: 'LOW',
      tags: [],
    },
    {
      userId,
      title: 'Naštudovať React hooks',
      dueDate: d(-1),
      status: 'DONE',
      priority: 'MEDIUM',
      tags: ['pb138'],
    },
    {
      userId,
      title: 'Inštalácia prostredia',
      dueDate: d(-3),
      status: 'DONE',
      priority: null,
      tags: [],
    },
    {
      userId,
      title: 'Prečítať CLAUDE.md',
      dueDate: d(-2),
      status: 'DONE',
      priority: null,
      tags: [],
    },
  ]);
  console.log('Tasks seeded: 10');
}

// Seed events
const existingEvents = await db
  .select({ id: events.id })
  .from(events)
  .where(eq(events.userId, userId));

if (existingEvents.length === 0) {
  const now = new Date();
  const d = (daysOffset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + daysOffset);
    return date;
  };

  await db.insert(events).values([
    { userId, title: 'Prednáška PB138', startDate: d(1), endDate: d(1), place: 'B411' },
    { userId, title: 'Seminár IB101', startDate: d(2), endDate: d(2), place: 'A320' },
    {
      userId,
      title: 'Deadline: Odovzdanie projektu',
      startDate: d(1),
      endDate: d(1),
      type: 'DEADLINE',
    },
    { userId, title: 'Konzultácia s vedúcim', startDate: d(3), endDate: d(3), place: 'Online' },
    { userId, title: 'Cvičenie MA001', startDate: d(4), endDate: d(4), place: 'M1' },
  ]);
  console.log('Events seeded: 5');
}

// Seed notes
const existingNotes = await db.select({ id: notes.id }).from(notes).where(eq(notes.userId, userId));

if (existingNotes.length === 0) {
  await db.insert(notes).values([
    {
      userId,
      title: 'TCP/IP sieťové protokoly',
      description: `TCP (Transmission Control Protocol) je spojovo orientovaný protokol transportnej vrstvy modelu TCP/IP. Poskytuje spoľahlivý prenos dát medzi dvomi uzlami siete prostredníctvom three-way handshake mechanizmu.

Handshake prebieha v troch krokoch: SYN (klient odošle segment so SYN flagom), SYN-ACK (server odpovedá s SYN a ACK flagom), ACK (klient potvrdí prijatie). Po tomto procese je spojenie nadviazané.

TCP garantuje: doručenie všetkých paketov, správne poradie paketov, kontrolu toku (flow control) pomocou sliding window, kontrolu zahltenia siete (congestion control).

UDP (User Datagram Protocol) je nespojový protokol bez záruky doručenia. Je rýchlejší ako TCP lebo nemá overhead spojenia ani potvrdzovania. Používa sa pre DNS, streaming videa, online hry kde je rýchlosť dôležitejšia ako spoľahlivosť.

HTTP/3 používa QUIC protokol ktorý beží nad UDP ale implementuje vlastnú spoľahlivosť na aplikačnej vrstve. Výhoda oproti TCP je eliminácia head-of-line blocking problému — stratený paket blokuje iba jeden stream, nie celé spojenie.

IP adresovanie: IPv4 používa 32-bitové adresy (4 oktety oddelené bodkami), IPv6 128-bitové. Subnetting umožňuje rozdeliť sieť na menšie podsiete pomocou masky siete.

NAT (Network Address Translation) umožňuje viacerým zariadeniam zdieľať jednu verejnú IP adresu. Router prekladá privátne IP adresy (192.168.x.x, 10.x.x.x) na verejnú adresu.`,
    },
    {
      userId,
      title: 'Sorting algoritmy — porovnanie',
      description: `Sorting algoritmy radíme do dvoch kategórií: porovnávacie (comparison-based) a neporovnávacie (non-comparison). Dolná hranica časovej zložitosti pre porovnávacie algoritmy je O(n log n).

Bubble Sort: O(n²) priemerný prípad. Porovnáva susedné prvky a vymieňa ich. Jednoduchý ale pomalý. Vhodný len pre malé alebo takmer zoradené polia.

Merge Sort: O(n log n) garantovane. Divide and conquer — rozdeľuje pole na polovice, rekurzívne ich zoradi a zlúči. Stabilný algoritmus. Vyžaduje O(n) extra pamäti.

Quick Sort: O(n log n) priemerný prípad, O(n²) worst case (pri zlom výbere pivotu). In-place (O(log n) stack space). V praxi rýchlejší ako Merge Sort kvôli cache efektivite. Nie je stabilný.

Heap Sort: O(n log n) garantovane, O(1) extra pamäti. Používa binárnu haldu. Nie je stabilný a má slabšiu cache performance ako Quick Sort.

Counting Sort: O(n + k) kde k je rozsah hodnôt. Non-comparison. Efektívny ak k je malé (napr. zoradenie znakov ASCII).

Radix Sort: O(d * (n + k)) kde d je počet číslic. Non-comparison. Vhodný pre celé čísla alebo reťazce.

Tim Sort (Python, Java): Hybridný algoritmus kombinujúci Merge Sort a Insertion Sort. O(n log n) worst case, O(n) best case pre takmer zoradené dáta.`,
    },
    {
      userId,
      title: 'React Hooks — useState a useEffect',
      description: `React Hooks sú funkcie ktoré umožňujú používať state a lifecycle metódy v funkčných komponentoch bez nutnosti písať triedne komponenty.

useState hook vracia pole s dvomi prvkami: aktuálna hodnota state a funkcia na jej aktualizáciu. State aktualizácia je asynchrónna a spúšťa re-render komponentu. Ak nová hodnota je rovnaká ako stará (Object.is porovnanie), React re-render preskočí.

useEffect hook spúšťa side effects po renderi. Prijíma callback funkciu a dependency array. Ak je dependency array prázdne [], callback sa spustí iba raz po prvom renderi. Ak chýba, spustí sa po každom renderi. Cleanup funkcia vrátená z callbacku sa spúšťa pred ďalším efektom alebo pri unmount.

Custom hooks sú funkcie začínajúce "use" ktoré môžu volať iné hooks. Umožňujú extrahovať a zdieľať logiku medzi komponentmi bez zmeny ich štruktúry.

useCallback vracia memoizovanú verziu callbacku ktorá sa mení len ak sa zmenia závislosti. Optimalizácia pre zabranie zbytočných re-renderov child komponentov.

useMemo vracia memoizovanú hodnotu výpočtu. Vhodné pre expensive výpočty ktoré nechceme opakovať pri každom renderi.

useRef vracia mutable ref objekt s .current property. Zmena .current nespúšťa re-render. Používa sa pre prístup k DOM elementom alebo uchovávanie mutable hodnôt.`,
    },
    {
      userId,
      title: 'Taylorov rad a aproximácie',
      description: `Taylorov rad je reprezentácia funkcie ako nekonečný súčet členov odvodených z hodnôt derivácií funkcie v jednom bode. Pre funkciu f(x) okolo bodu a:

f(x) = f(a) + f'(a)(x-a) + f''(a)(x-a)²/2! + f'''(a)(x-a)³/3! + ...

Maclaurinov rad je špeciálny prípad Taylorovho radu kde a = 0.

Dôležité Maclaurinove rady:
e^x = 1 + x + x²/2! + x³/3! + ... (konverguje pre všetky x)
sin(x) = x - x³/3! + x⁵/5! - ... (konverguje pre všetky x)
cos(x) = 1 - x²/2! + x⁴/4! - ... (konverguje pre všetky x)
ln(1+x) = x - x²/2 + x³/3 - ... (konverguje pre |x| ≤ 1, x ≠ -1)
1/(1-x) = 1 + x + x² + x³ + ... (konverguje pre |x| < 1)

Taylorov polynóm stupňa n je konečná aproximácia funkcie prvými n+1 členmi radu. Zvyšok (chyba aproximácie) je ohraničená Lagrangeovým zvyškom.

Praktické použitie: numerické výpočty, fyzikálne aproximácie (napr. sin(x) ≈ x pre malé x), analýza algoritmov, digitálne spracovanie signálov (FFT).

Rádius konvergencie určuje pre aké hodnoty x rada konverguje. Vypočíta sa pomocou ratio testu alebo root testu.`,
    },
  ]);
  console.log('Notes seeded: 4');
}

process.exit(0);
