Actúa como un desarrollador Fullstack Senior especializado en Next.js (App Router), TypeScript y MongoDB nativo. Necesito diseñar e implementar una aplicación para dividir gastos en grupo (tipo Splitwise) con cálculo de deuda óptima y actualizaciones en tiempo real mediante Server-Sent Events (SSE).

Stack técnico:
- Next.js (App Router, Server Actions, Route Handlers)
- TypeScript
- Base de datos: MongoDB con driver nativo
- Comunicación en tiempo real: Server-Sent Events (SSE) vía Route Handlers
- Estilos/UI: Tailwind CSS

Requerimientos de datos y dominio:
1. Precisión financiera: Todos los importes monetarios deben guardarse y calcularse en céntimos/centavos (enteros) para evitar errores de redondeo de punto flotante de JavaScript.
2. Modelo de datos en MongoDB:
   - Colección `groups`: id, name, slug (identificador único para la URL), members (array de strings con nombres o IDs de participantes), createdAt.
   - Colección `expenses`: id, groupId, description, amount (entero), paidBy (miembro que pagó), splitAmong (array de miembros entre los que se divide a partes iguales), createdAt.

Requerimientos funcionales:
1. Gestión de grupos y miembros:
   - Crear un grupo asignando un nombre y generando un slug de acceso directo (ej: `/group/[slug]`).
   - Acceso al grupo mediante la URL/slug sin requerir autenticación compleja inicial.
   - Agregar nuevos miembros al grupo en cualquier momento.
2. Registro de gastos:
   - Formulario para registrar un gasto: importe, descripción, selector de quién pagó y checkbox de participantes (por defecto todos los miembros del grupo).
3. Algoritmo de liquidación mínima (Debt Simplification):
   - Calcular el balance neto de cada miembro: balance = pagado - consumido.
   - Implementar un algoritmo codicioso (Greedy / Two-Pointers con lista de deudores y acreedores ordenados) para saldar todas las deudas con el menor número posible de transferencias ("A le debe X a B").
4. Tiempo real con SSE (Server-Sent Events):
   - Endpoint `/api/groups/[slug]/events` usando `ReadableStream` para emitir eventos de actualización a los clientes conectados.
   - Emisión de un evento `expense_added` cada vez que se registre un gasto, para que los clientes refresquen la lista y la liquidación sin recargar la página.

Entrega esperada:
1. Esquema de base de datos e índices recomendados en MongoDB.
2. Código completo de la utilidad matemática para la simplificación de deudas (con tipado estricto).
3. Implementación del Route Handler SSE y el hook/cliente de React para consumir los eventos.
4. Server Actions para creación de grupo y registro de gastos con revalidación y despacho del evento SSE.