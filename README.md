# 💸 Reparto de Gastos — Next.js + MongoDB (estilo Splitwise)

## 🎯 Objetivo del proyecto

Construir una app de **gastos compartidos en grupo**: los miembros apuntan lo que pagan y la app calcula quién debe cuánto a quién con el mínimo número de transferencias.

Con este proyecto el alumno aprende:

- A implementar un **algoritmo de liquidación de deudas** (settlement): de balances individuales a la lista mínima de pagos.
- **Server Actions** de Next.js como alternativa a las API routes para mutaciones.
- **Server-Sent Events (SSE)** para actualizar el grupo en tiempo real cuando alguien añade un gasto.
- A organizar el acceso a datos en capas (`lib/db/` para queries, `lib/actions/` para acciones).

## 🏗️ Arquitectura

```
┌──────────────────┐  Server Actions  ┌─────────────────┐        ┌──────────┐
│  Componentes     │ ───────────────► │  lib/actions/   │ ─────► │ MongoDB  │
│  (formularios,   │                  │  (crear grupo,  │        └──────────┘
│   listas, panel  │   SSE (events)   │   gasto, etc.)  │
│   de liquidación)│ ◄─────────────── │  /api/grupos/   │
└──────────────────┘                  │  [name]/events  │
                                      └─────────────────┘
```

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Mutaciones | Server Actions (`lib/actions/`) |
| Tiempo real | Server-Sent Events (`/api/grupos/[groupName]/events`) |
| Base de datos | MongoDB driver nativo, dinero en céntimos |

### Modelo de datos (`lib/types.ts`)

```
Group   { name (único, tipo slug), description }
Member  { groupId, name }
Expense { groupId, amount (céntimos), description, paidBy (memberId) }
Transaction { from: Member, to: Member, amountCents }  ← resultado del settlement
```

### Estructura de carpetas

```
app/
  page.tsx                       # Crear o buscar grupo
  grupos/[groupName]/page.tsx    # Vista del grupo
  api/grupos/[groupName]/events/ # Stream SSE
components/
  CreateGroupForm, FindGroupForm, AddMemberForm, MembersList,
  AddExpenseForm, ExpensesList, SettlementPanel
lib/
  settlement.ts                  # ⭐ Algoritmo de reparto
  actions/  db/  mongodb.ts  types.ts
```

## ⚙️ Funcionalidades

- **Crear un grupo** con nombre único (sin login: el nombre del grupo es la "clave" para entrar).
- **Añadir miembros** al grupo.
- **Apuntar gastos**: importe, descripción y quién lo pagó.
- **Panel de liquidación**: la lista mínima de transferencias para saldar las cuentas.
- **Actualización en vivo**: si otro miembro añade un gasto, lo ves sin recargar (SSE).

## 💡 Solución

1. **El algoritmo de settlement** (`lib/settlement.ts`) es el corazón: se calcula el balance de cada miembro (lo pagado menos su parte equitativa), se separan acreedores y deudores, y se van emparejando los extremos hasta saldar todos los balances. El resultado son transacciones `from → to` con el importe mínimo de movimientos.
2. **Céntimos y reparto del resto**: dividir 10 € entre 3 da céntimos sobrantes; trabajar con enteros obliga a decidir explícitamente quién asume el céntimo de diferencia.
3. **Server Actions en lugar de API REST**: las mutaciones (`crear grupo`, `añadir gasto`...) son funciones de servidor invocadas directamente desde los formularios — menos código que una API completa.
4. **SSE para tiempo real barato**: la ruta `events` mantiene la conexión abierta y empuja los cambios del grupo; más simple que WebSockets cuando la comunicación es solo servidor → cliente.

## 🚀 Cómo ejecutar

1. Arranca MongoDB en local.
2. Instala y ejecuta:

```bash
npm install
npm run dev
```

3. Abre [http://localhost:3000](http://localhost:3000), crea un grupo y compártelo por nombre. Abre el mismo grupo en dos pestañas para ver el tiempo real.
