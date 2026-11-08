# 💸 Reparto de gastos

App para dividir gastos en grupo (estilo Splitwise): los miembros apuntan lo que pagan y la app calcula **quién debe cuánto a quién con el mínimo número de transferencias**. Los cambios aparecen en tiempo real en todos los navegadores abiertos mediante **Server-Sent Events**.

**Stack:** Next.js 16 (App Router, Server Actions, Route Handlers, Cache Components) · React 19 · TypeScript · MongoDB (driver nativo) · Tailwind CSS 4.

## 🚀 Cómo ejecutar

Requisitos: Node 22+ (probado con 24) y MongoDB en local.

```bash
# MongoDB, si no lo tienes instalado:
docker run -d --name mongo -p 27017:27017 mongo:7

cp .env.example .env.local   # opcional: por defecto usa mongodb://localhost:27017
npm install
npm run dev                  # http://localhost:3000
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build && npm start` | Build y servidor de producción |
| `npm test` / `npm run test:watch` | Tests automatizados con Vitest (ver [🧪 Tests](#-tests)); no necesitan MongoDB |
| `npm run typecheck` / `npm run lint` | TypeScript estricto y ESLint |

Para ver el tiempo real: crea un grupo, copia el enlace (botón con la URL) y ábrelo en otra pestaña o navegador. Lo que añadas en una aparece en la otra sin recargar.

## 🗂️ Estructura

```
app/
  page.tsx                          # Crear grupo / entrar con enlace
  group/[slug]/page.tsx             # Vista del grupo (Server Component + Suspense)
  api/groups/[slug]/events/route.ts # ⭐ Stream SSE
components/                         # Formularios (cliente) y listas/paneles (servidor)
hooks/useGroupEvents.ts             # ⭐ Hook cliente de EventSource
lib/
  settlement.ts                     # ⭐ Algoritmo de liquidación (+ settlement.test.ts)
  money.ts                          # Texto ↔ céntimos, formato de moneda
  actions/                          # ⭐ Server Actions (groups.ts, expenses.ts)
  db/                               # Queries a MongoDB (groups.ts, expenses.ts)
  realtime/                         # Tipos de evento + bus pub/sub en memoria
  mongodb.ts                        # Cliente único + creación de índices
  types.ts                          # Documentos Mongo y DTOs serializables
```

## 🧱 Esquema de base de datos e índices

Todos los importes son **enteros en céntimos**.

**`groups`**

```ts
{
  _id: ObjectId,
  name: string,        // "Viaje a Lisboa"
  slug: string,        // "viaje-a-lisboa-k3f9x2" → /group/viaje-a-lisboa-k3f9x2
  members: string[],   // ["Ana", "Luis", "Eva"]
  createdAt: Date
}
```

**`expenses`**

```ts
{
  _id: ObjectId,
  groupId: ObjectId,     // → groups._id
  description: string,
  amount: number,        // 10000 = 100,00 €
  paidBy: string,        // miembro que pagó
  splitAmong: string[],  // miembros entre los que se reparte a partes iguales
  createdAt: Date
}
```

**Índices** (se crean automáticamente al primer acceso en `lib/mongodb.ts`; `createIndex` es idempotente):

| Colección | Índice | Por qué |
| --- | --- | --- |
| `groups` | `{ slug: 1 }` **único** | Acceso por URL y garantía de unicidad. Si dos grupos generan el mismo slug, el insert falla con `E11000` y se reintenta con otro sufijo. |
| `expenses` | `{ groupId: 1, createdAt: -1 }` | Cubre la única consulta de gastos: "los de este grupo, más recientes primero" (filtro + orden sin `SORT` en memoria). |

Equivalente en `mongosh`:

```js
db.groups.createIndex({ slug: 1 }, { unique: true })
db.expenses.createIndex({ groupId: 1, createdAt: -1 })
```

Los miembros van embebidos en el grupo (son pocos y siempre se leen juntos). Los gastos van en su propia colección porque crecen sin límite y así no se acerca el documento del grupo al límite de 16 MB.

## 🧮 Algoritmo de liquidación (`lib/settlement.ts`)

1. **Reparto a partes iguales sin perder céntimos** – 125,00 € entre 3 son 41,666… €, que no se puede pagar. Cada participante recibe `floor(importe / n)` (41,66 €) y los `importe % n` céntimos indivisibles **los asume quien pagó** (41,68 €). Así todos los deudores deben exactamente lo mismo y nadie paga más de su parte exacta. Si quien pagó no participa en el gasto, el sobrante va céntimo a céntimo a los primeros participantes en el orden del grupo (diferencia máxima: 1 céntimo). La suma siempre cuadra al céntimo y la lista de gastos muestra la parte por persona y quién asume el redondeo.
2. **Balance neto** – `balance = pagado − consumido` por miembro. La suma de todos los balances es 0 (se valida).
3. **Simplificación codiciosa con dos punteros** – se ordenan deudores y acreedores de mayor a menor; el mayor deudor paga al mayor acreedor `min(deuda, crédito)`; quien queda a 0 avanza su puntero. Cada paso salda al menos a una persona, así que hay **como mucho n − 1 transferencias**.

> Encontrar el mínimo *absoluto* de transferencias es NP-difícil (equivale a particionar en subconjuntos de suma cero). El enfoque codicioso es el estándar del sector: O(n log n), nunca supera n − 1 pagos y en la práctica suele dar el óptimo.

Los tests (`npm test`) incluyen casos concretos y una prueba de propiedades sobre 200 grupos aleatorios: todo queda saldado a 0, ningún importe es decimal o negativo y nunca hay más de n − 1 transferencias.

## ⚡ Tiempo real con SSE

```
 Navegador A                   Servidor Next.js                   Navegador B
 ───────────                   ────────────────                   ───────────
 <form action={addExpense}> ─► Server Action
                                 1. valida + insertOne
                                 2. revalidatePath(/group/slug) ─► A ve su cambio
                                 3. publish(slug, expense_added)
                                        │ bus en memoria
                               GET /api/groups/[slug]/events ◄──── EventSource
                                 ReadableStream ── event: expense_added ──►
                                                              router.refresh()
```

- **Route Handler** (`app/api/groups/[slug]/events/route.ts`): devuelve un `ReadableStream` con `Content-Type: text/event-stream`. Envía `retry: 3000`, un evento `connected`, los eventos del grupo y un heartbeat cada 25 s para que ningún proxy corte la conexión. Al cerrar la pestaña (`request.signal` → `abort`) se desuscribe y limpia el intervalo. Devuelve 404 si el slug no existe.
- **Bus pub/sub** (`lib/realtime/event-bus.ts`): `Map<slug, Set<listener>>` guardado en `globalThis` para que la Server Action y el Route Handler (módulos distintos) compartan instancia.
- **Hook** (`hooks/useGroupEvents.ts`): abre un `EventSource`, expone el estado (`connecting` / `open` / `reconnecting`) y entrega eventos tipados. El callback se guarda en un ref para no reconectar en cada render.
- **`LiveUpdates`**: ante cada evento llama a `router.refresh()`, que re-renderiza los Server Components (gastos, balances, liquidación) **sin recargar la página ni perder lo que estés escribiendo** en los formularios, y muestra un aviso ("Luis añadió «Cena» (30,00 €)").

Eventos: `expense_added` (el pedido en el enunciado, con el gasto completo) y `member_added` (añadido para que los miembros nuevos aparezcan en el selector de los demás).

## 🧪 Tests

Vitest + React Testing Library (configuración en `vitest.config.mts` y `test/setup.ts`). Cada test vive junto al fichero que prueba (`*.test.ts(x)`). MongoDB y las APIs de Next (`revalidatePath`, `redirect`, `useRouter`) se sustituyen por mocks, así que `npm test` corre sin base de datos en unos segundos.

| Capa | Ficheros | Qué se comprueba |
|------|----------|------------------|
| Algoritmo | `lib/settlement.test.ts` | Reparto al céntimo, balances, liquidación y propiedades sobre 200 grupos aleatorios |
| Utilidades | `lib/money`, `lib/validation`, `lib/slug` | Parseo/formato de importes, normalización de nombres, slugs siempre válidos |
| Server Actions | `lib/actions/*.test.ts` | Validaciones, normalización, versión del estado, publicación del evento SSE |
| Datos | `lib/db/groups.test.ts` | Reintento ante colisión de slug, filtro atómico anti-duplicados |
| Tiempo real | `lib/realtime/event-bus.test.ts`, `app/api/groups/[slug]/events/route.test.ts` | Pub/sub por grupo, formato SSE, 404 y limpieza al desconectar |
| Componentes (jsdom) | `components/*.test.tsx` | Formulario de gasto, listas, panel de liquidación, búsqueda de grupo y avisos en vivo con un `EventSource` falso |

## 🤔 Decisiones de diseño

- **Céntimos de extremo a extremo.** El importe se convierte de texto a entero parseando la cadena (`"12,5"` → `1250`) con una regex, sin pasar por `parseFloat`. Los decimales solo existen al mostrar (`Intl.NumberFormat`).
- **El servidor no confía en el cliente.** `paidBy` y `splitAmong` se validan contra los miembros reales del grupo leídos de la BD; el orden de `splitAmong` se normaliza al del grupo para que el reparto del céntimo sea estable.
- **Slug = nombre legible + 6 caracteres aleatorios.** Evita colisiones entre grupos con el mismo nombre y hace que la URL no sea adivinable: funciona como "llave" sin necesidad de login.
- **Miembros como strings únicos (sin distinguir mayúsculas).** El alta usa un `updateOne` con `members: { $ne: nombre }` para que dos altas simultáneas no dupliquen.
- **Formulario de gasto con "excluidos" en vez de "incluidos".** Por defecto participan todos, *incluidos* los miembros que se unan en tiempo real mientras rellenas el formulario.
- **Cache Components.** Los datos de MongoDB son dinámicos y se leen dentro de `<Suspense>`: la cabecera de la página se sirve como shell estático y el contenido del grupo se transmite en streaming (la ruta sale como *Partial Prerender* en el build).
- **Revalidación + SSE son complementarios.** `revalidatePath` actualiza a quien hizo el cambio en la misma respuesta de la Server Action; el evento SSE avisa al resto.

### Limitaciones conocidas

- El bus de eventos vive en memoria: funciona con **una sola instancia** de Node (local, un contenedor, un VPS). Para escalar horizontalmente basta con sustituir `lib/realtime/event-bus.ts` por Redis Pub/Sub o MongoDB Change Streams; el endpoint y el cliente no cambian.
- En plataformas serverless, las conexiones SSE largas están limitadas por el timeout de la función; `EventSource` reconecta automáticamente.
- No se pueden editar ni borrar gastos o miembros (no lo pide el enunciado).
