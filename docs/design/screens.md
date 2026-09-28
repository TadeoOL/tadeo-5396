# Screens

The layout, states and copy of every screen, so implementation has no layout or copy decisions left. Terms follow [`CONTEXT.md`](../../CONTEXT.md); the look comes from the [visual direction](visual-direction.md) and [`tokens.css`](tokens.css). The behavior behind each state is specified in [Auth](../specs/auth.md), [Top-up reliability](../specs/top-up-reliability.md), [SnailPay API](../specs/snailpay-api.md) and [Deployment](../deployment.md#warm-up-in-the-ui). This was decided in the ticket [Design the screens: auth, dashboard and top-up flow with every state](https://github.com/TadeoOL/tadeo-5396/issues/19).

| File | What it is |
| --- | --- |
| [`screens-prototype.html`](screens-prototype.html) | Every screen and state below, as a gallery with desktop and 390 px phone frames. Open it through a static server, for example `npx serve docs/design`. It keeps the original English copy, so this document, not the prototype, is the source of truth for copy; spacing is indicative. |

UI copy is in neutral Spanish: the one exception to "every artifact in English", next to the response document. Quoted strings below are final copy; `{braces}` are values.

## Copy rules

- **Neutral Spanish**: address the User as "tú" (never "vos" or "usted"), no regional slang. "Ingresa tu correo electrónico.", not "Ingresá" or "Ingrese".
- **Names stay**: "Snailrace", "SnailPay" and the six Snail names (Pepper, Comet, Mossback, Drizzle, Nacho, Sprinkles).
- **Formats**: money keeps `Intl.NumberFormat('es-MX', …)`. Dates, times and lists use `es-MX` (`Intl.DateTimeFormat('es-MX')`, `Intl.ListFormat('es-MX')`, which joins with "y" and no comma before it). Singular/plural stays ("1 carrera", "3 carreras").
- **Placeholders**: "MM/YY" becomes "MM/AA"; the expiry format the API accepts does not change.
- Code, identifiers, comments, commits and the other docs stay in English. The page declares `lang="es"`.

### Glossary

| Domain term / English copy | UI copy (es) |
| --- | --- |
| Sign in / Sign out / Create account | Iniciar sesión / Cerrar sesión / Crear cuenta |
| Email / Password / Full name | Correo electrónico / Contraseña / Nombre completo |
| Balance | Saldo |
| Top-up / Top up (button) | Recarga / Recargar |
| Race Day / Race / Win | Jornada / Carrera / Victoria |
| Snail | Caracol |
| Bet (won / lost) | Apuesta (ganada / perdida) |
| Card / Expiry / CVV / Name on card | Tarjeta / Vencimiento / CVV / Nombre en la tarjeta |
| Processing / Confirming / Approved / Declined / Failed | Procesando / Confirmando / Aprobada / Rechazada / Fallida |
| Reconciliation ("Check again") | "Verificar de nuevo" |
| Outage ("SnailPay outage: on/off") | "Falla de SnailPay: activada/desactivada" |
| Simulation controls | Controles de simulación |
| Dashboard (title) | Panel |

## Global rules

- **One breakpoint**: Tailwind `md` (768 px). Below it, everything is one column and full-width primary buttons.
- **App shell**: an ink header bar with the wordmark (a Mossback silks shirt and "Snailrace"). On the dashboard it adds the User's full name (hidden below `md`) and a ghost "Cerrar sesión" button. The `['health']` query is mounted here, on every screen.
- **Titles and focus**: `document.title` is "{Screen} · Snailrace" ("Iniciar sesión", "Crear cuenta", "Panel"). Each screen has one `h1`, and focus moves to it on every route change.
- **Money**: `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`, which renders `$1,250.00`. The Balance adds a small "MXN" after the amount. **Dates and times**: `Intl.DateTimeFormat('es-MX')`.
- **Cards** are shown as `•••• {last 4}`. A stored CVV is never shown. In the Top-up form, the CVV is masked as `•••` while the Top-up is Processing; after a Declined or Failed result the form keeps what the User typed, so "Intentar de nuevo" resends it.
- **Busy buttons**: disabled, with a spinner and a verb in progress ("Iniciando sesión…"). Inputs become read-only while the form is busy.
- **Status and alerts**: progress messages use `role="status"`; errors and outcomes use `role="alert"`. When a form-level alert appears, focus moves to it.
- **Toasts**: Sonner at `bottom-right` (Sonner spans the bottom edge on phones). A toast always repeats something the screen already shows; it is never the only place (see [Notifications](../specs/frontend-stack.md#notifications)).

## Outcome labels

The code, specs and ledger use the domain terms. The UI shows words a User understands, so an Unknown Top-up never reads as an error.

| Top-up state (domain) | UI label | Badge token | Icon |
| --- | --- | --- | --- |
| `pending` | Procesando | `muted` | `Clock` |
| `unknown` | Confirmando | `warning` | `CircleHelp` |
| `credited` | Aprobada | `success` | `Check` |
| `declined` | Rechazada | `destructive` | `X` |
| `failed` | Fallida | `destructive` | `TriangleAlert` |

## Sign in (`/sign-in`)

Centered column, at most 26 rem wide, below the header bar. A row of the six silks shirts sits above the `h1` (decorative, `aria-hidden`).

- `h1` "Iniciar sesión"; subtitle "Mira cómo salieron las carreras de hoy y recarga tu saldo."
- Fields: "Correo electrónico" (`autocomplete="email"`), "Contraseña" (`autocomplete="current-password"`). Button "Iniciar sesión". Footer: "¿Primera vez aquí? [Crea una cuenta]".
- **Field errors** (on blur and submit): "Ingresa tu correo electrónico." / "Ingresa un correo electrónico válido." / "Ingresa tu contraseña." The password policy is not checked here ([Auth](../specs/auth.md#sign-in)).

| State | What shows |
| --- | --- |
| Checking | Button "Iniciando sesión…" busy; inputs read-only |
| Wrong email or password | Form-level `destructive` alert "Correo electrónico o contraseña incorrectos.", attached to no field. The password field is cleared. |
| Locked by the throttle | Alert with the `Clock` icon: "Demasiados intentos." + "Intenta de nuevo en {N} s." counting down every second; the button is disabled until it reaches 0, then the alert disappears |
| Session expired | Neutral alert: "Tu sesión expiró." + "Inicia sesión de nuevo para continuar." Shown when the expiry timer or a guard signed the User out because `expiresAt` passed, not after a manual sign-out. Passed as router state. |

## Create account (`/sign-up`)

Same layout as sign-in.

- `h1` "Crea tu cuenta"; subtitle "Tu saldo empieza en $0.00."
- Fields: "Nombre completo" (`autocomplete="name"`), "Correo electrónico", "Contraseña" (`autocomplete="new-password"`, hint "Al menos 15 caracteres. Una frase corta funciona bien."), "Confirma la contraseña". Button "Crear cuenta". Footer: "¿Ya tienes una cuenta? [Iniciar sesión]".
- **Field errors** are the ones in [Auth: registration fields](../specs/auth.md#registration-fields), shown under each field; on submit, every invalid field shows at once and focus goes to the first.

| State | What shows |
| --- | --- |
| Creating | Button "Creando cuenta…" busy (it covers the PBKDF2 derivation) |
| Duplicate email | Form-level alert "Ya existe una cuenta con este correo electrónico." with a "Inicia sesión con esa cuenta" link to `/sign-in` |
| Storage write failed | Form-level alert "No se pudo guardar tu cuenta. Libera espacio de almacenamiento del navegador e intenta de nuevo." |

## Dashboard (`/dashboard`)

Regions top to bottom, separated by dashed seams (no cards). Two columns for the charts from `md` up; one column below.

1. **Greeting**: `h1` "Hola, {full name}"; meta line "Jornada · {lunes, 28 de septiembre} · simulada".
2. **Balance**: `h3` "Saldo", the amount (`text-5xl`, 900, 75% wide) and the "Recargar" primary button (right-aligned; full width on phones). If any Top-up is `pending` or `unknown`, a `warning` line with the `CircleHelp` icon follows: "{sum} en confirmación, aún no incluido". The Balance reads localStorage synchronously, so it has no loading state.
3. **Wins today** (2/3 width): `h3` "Victorias de hoy", meta "6 carreras, 6 caracoles", the silks bar chart with value labels above the bars and names below, then the summary.
4. **Your bets today** (1/3 width): `h3` "Tus apuestas de hoy", meta "Simuladas, sin dinero real", the donut with "{won}/{total}" and "ganadas" in the center, then the summary with a legend: "■ {won} ganadas · ▨ {lost} perdidas, de {total} apuestas."
5. **Top-ups**: the history table.
6. **Simulation controls**: the Outage switch.

### Chart summaries

The summary sits under each chart as visible `meta` text and is the chart's accessible name (`aria-labelledby`).

- **Wins**: Snails with at least one Win, most Wins first (ties in Snail order), then the rest. "{Pepper} ganó {3} carreras, {Comet} {2} y {Mossback} {1}. {Drizzle, Nacho y Sprinkles} no ganaron." Use "carrera" for 1, and "no ganó" when a single Snail has no Win. Lists join with `Intl.ListFormat('es-MX')`, which joins with "y" and no comma before it.
- **Bets**: "{7} ganadas, {5} perdidas, de {12} apuestas."

### Race data states

The two charts load independently (two queries).

| State | What shows |
| --- | --- |
| Loading | A `Skeleton` in the chart's place (a 180 px block for the bars, a 140 px circle for the donut). Headings and meta stay. |
| Error | A `destructive` alert in the chart's place: "No se pudieron cargar las carreras de hoy." (or "No se pudieron cargar tus apuestas.") + "Revisa tu conexión e intenta de nuevo." and an outline "Intentar de nuevo" button that refetches |

There is no empty state for the charts: a Race Day always has six Races and the Bets list always has 4–12 Bets ([Simulated data](../specs/simulated-data.md)).

### Top-up history

`h3` "Recargas". Newest first. Columns: "Fecha" (time for today, "27 sep, 12:41" otherwise), "Tarjeta" (hidden below `md`), "Resultado" (the badge plus a detail line), "Monto" (right-aligned, bold).

| State | Detail line under the badge |
| --- | --- |
| Processing | — |
| Confirming | "Aún sin confirmar." plus a small outline "Verificar de nuevo" button, disabled with "Verificando…" while a Reconciliation run is active |
| Approved | "Cód. de autorización {authorization_code}" |
| Declined | The short reason from the [outcome copy](#outcome-copy) |
| Failed | The short reason from the [outcome copy](#outcome-copy) |

**Empty**: "Aún no hay recargas." + "Recarga con SnailPay para agregar fondos. Cada intento aparece aquí, sea cual sea su resultado."

### Simulation controls

`h3` "Controles de simulación"; text "Actívalo para que SnailPay falle en cada pago, como si tuviera un problema interno. Afecta a todos los que usan este servidor." and a `Switch` labeled "Falla de SnailPay: {activada|desactivada}". It reads `GET /api/snailpay/outage` on mount and writes `PUT` on toggle.

- While reading or writing, the switch is disabled.
- If either call fails: an inline "No se pudo conectar con SnailPay. Intenta de nuevo." and the switch keeps its last known value.
- This is the UI path for the System error row of the README's Scenario table.

## Top-up dialog

A shadcn `Dialog` over the dashboard, at most 28 rem wide (full width minus 16 px on phones). Focus starts on "Monto".

- `h2` "Recarga tu saldo"; subtitle "Se paga con SnailPay, una pasarela simulada. Usa una tarjeta de prueba, nunca una real."
- Fields: "Monto (MXN)" (`inputmode="decimal"`, placeholder "0.00"), "Número de tarjeta" (`inputmode="numeric"`, shown in groups of four, stripped before sending), "Vencimiento" (placeholder "MM/AA", the slash inserted as the User types) and "CVV" (placeholder "3 dígitos") side by side, "Nombre en la tarjeta" (prefilled with the User's full name). Every card field has `autocomplete="off"`.
- Actions: outline "Cancelar", primary "Recargar {amount}" (just "Recargar" while the amount is empty or invalid).
- **Test cards**: a closed `<details>` "Tarjetas de prueba" at the bottom: "Todas usan vencimiento 12/26 y CVV 543." and one row per Scenario card. The numbers come from the `ScenarioCard` enum in `@snailrace/contracts` (the same values SnailPay echoes unmasked); the labels are web copy: "Aprobada", "Rechazada: fondos insuficientes", "Rechazada: seguridad", "Sin respuesta a tiempo (tiempo agotado)". The wrong expiry, wrong CVV and outage rows stay in the README.

**Field errors** (on blur and submit; the same rules as the API):

| Field | Error |
| --- | --- |
| Amount | "Ingresa un monto de $0.01 a $10,000.00." (also for more than two decimals) |
| Card number | "Ingresa los 16 dígitos de la tarjeta." |
| Expiry | "Usa MM/AA." |
| CVV | "Ingresa 3 dígitos." |
| Name on card | "Ingresa el nombre que aparece en la tarjeta (hasta 100 caracteres)." |

### States

| State | What shows |
| --- | --- |
| Server waking | Neutral alert with a spinner: "Despertando el servidor." + "Esto puede tardar hasta un minuto." The submit button is disabled. |
| Server unreachable (health query failed) | `destructive` alert: "No se puede conectar con el servidor." + "Revisa tu conexión." and a "Intentar de nuevo" button that refetches `['health']`. Submit stays disabled. |
| Processing | Neutral alert with a spinner: "Procesando tu pago…" + "Puedes cerrar esta ventana. El resultado aparecerá en tus recargas." Inputs read-only, the CVV masked as `•••`, submit busy "Procesando…", "Cancelar" becomes "Cerrar". |
| Approved | The form is replaced by a receipt: success mark, `h2` "Pago aprobado", "+{amount}", "Se agregó a tu saldo. Nuevo saldo: {balance}", then a list with "Tarjeta", "Código de autorización" and "Referencia" (first 8 and last 4 characters). One primary "Listo" button. |
| Declined | The form stays filled. A `destructive` alert on top: "{title}" + "Tu saldo no cambió. {action}". For the three `bad_filled` details, the matching field is also marked invalid with "No coincide con esta tarjeta." Submit reads "Intentar de nuevo"; pressing it is a **new** Top-up. |
| Failed | The form stays filled. A `destructive` alert with `TriangleAlert`: "{title}" + "{body}". Submit reads "Intentar de nuevo" (a new Top-up). |
| Storage write failed | Saving the `pending` Top-up failed, so no request was sent. The form stays filled. A form-level (`root`) `destructive` alert: "No se pudo guardar esta recarga. Libera espacio de almacenamiento del navegador e intenta de nuevo." |
| Confirming (Unknown) | The form is replaced by a panel: `warning` mark, `h2` "Confirmando tu pago", the amount in muted ink, "SnailPay no respondió a tiempo, así que estamos verificando si el pago se realizó. Tu saldo no cambiará hasta que se confirme.", a spinner line "Verificando… (intento {n} de 5)" and an outline "Cerrar y seguir verificando". When Reconciliation settles it, the panel swaps to the Approved receipt, or to the Declined or Failed alert over the form. |
| Not confirmed yet (run exhausted) | Same panel: `h2` "Aún sin confirmar", "SnailPay aún no confirma este pago. Tu saldo no ha cambiado. Volveremos a verificar cuando regreses, o puedes verificar ahora." Buttons "Cerrar" and primary "Verificar de nuevo". |

- **Closing** the dialog never cancels anything. A Processing or Confirming Top-up keeps going and settles in the history, with a toast.
- Reopening the dialog always shows a fresh, empty form (name prefilled). The history is where earlier results live.

## Outcome copy

One row per result the User can meet. The dialog shows **title + body**; the history shows the **short reason**; the toast shows its own title and "{amount} · {short reason}".

| Result | Outcome | Title | Body | Short reason |
| --- | --- | --- | --- | --- |
| `accredited` | Approved | Pago aprobado | Se agregó a tu saldo. | Cód. de autorización {code} |
| `cc_rejected_bad_filled_card_number` | Declined | Rechazada: tarjeta no reconocida | Revisa el número de tarjeta e intenta de nuevo. | Tarjeta no reconocida |
| `cc_rejected_bad_filled_date` | Declined | Rechazada: fecha de vencimiento incorrecta | Revisa la fecha de vencimiento de la tarjeta. | Fecha de vencimiento incorrecta |
| `cc_rejected_bad_filled_security_code` | Declined | Rechazada: código de seguridad incorrecto | Revisa el código de 3 dígitos al reverso de la tarjeta. | Código de seguridad incorrecto |
| `cc_rejected_insufficient_amount` | Declined | Rechazada: fondos insuficientes | La tarjeta no tiene fondos suficientes. Prueba con un monto menor o con otra tarjeta. | Fondos insuficientes |
| `cc_rejected_high_risk` | Declined | Rechazada por seguridad | SnailPay rechazó este pago para protegerte. Usa otra tarjeta. | Rechazada por seguridad |
| `service_unavailable` | Failed | SnailPay no está disponible | No se cobró nada y tu saldo no cambió. Intenta de nuevo en unos momentos. | SnailPay no estaba disponible |
| `rate_limited` | Failed | Demasiados intentos | No se cobró nada. Espera un minuto e intenta de nuevo. | Demasiados intentos |
| `internal_error` | Failed | SnailPay no pudo procesar el pago | No se cobró nada y tu saldo no cambió. Intenta de nuevo. | Error de SnailPay |
| `invalid_request`, `idempotency_key_reused` | Failed | Algo salió mal con este pago | No se cobró nada. Intenta de nuevo. | Error en el pago |
| Lookup `404` after 2 minutes | Failed | Pago no encontrado | SnailPay no tiene registro de este pago, así que no se cobró nada. | Sin registro en SnailPay |
| Timeout, network error, unreadable body | Confirming | Confirmando tu pago | (see the dialog states) | Aún sin confirmar |

**Toasts**, fired in the tab that settles the Top-up (including Reconciliation on load):

| Outcome | Toast title |
| --- | --- |
| Approved | "Recarga aprobada" + "+{amount} agregados a tu saldo." |
| Declined | "Recarga rechazada" |
| Failed | "Recarga fallida" |
| Confirming | "Pago aún sin confirmar" + "{amount} · Estamos verificando con SnailPay." |

## System screens

Both use the auth layout (centered column, no header actions).

- **Unreadable local data** (users or ledger fail their schema, [State and persistence](../specs/state-and-persistence.md)): `h1` "No se pueden leer tus datos guardados"; "Los datos que este navegador guarda para Snailrace están dañados, así que no vamos a adivinar tu saldo. Al restablecerlos se eliminan todas las cuentas y recargas guardadas en este navegador."; primary "Restablecer datos locales", which removes every `snailrace.v1.*` key and goes to `/sign-in`.
- **Error boundary**: `h1` "Algo salió mal"; "La página tuvo un error inesperado. Tu saldo y tus recargas están a salvo en este navegador."; primary "Recargar la página".

## Left out

- A warning when signing out with a Processing Top-up ([Auth](../specs/auth.md#sign-out) keeps it running and the history shows it on the next sign-in).
- Showing the Outage state inside the Top-up dialog: the switch sits on the same screen.
