# Payment gateway conventions: status, status_detail, idempotency, sandbox triggers

Research for issue #2. Question: how do real payment gateway APIs model a card charge result and its failure modes, so SnailPay follows recognizable conventions instead of invented ones?

Primary sources: Mercado Pago (MP) developer docs and its official Node SDK, Stripe docs, RFC 9110, and the IETF `Idempotency-Key` draft. Checked 2026-09-28. Anything the sources leave unclear, or where they disagree, is marked **Unclear** or **Disagreement**.

## Implications for SnailPay

1. **Use the MP Payments API field names.** The required fields match MP's payment resource (verified, see Q1). `reference` is MP's `external_reference`, a correlation ID the integrator supplies. `payer_id` and `payer_email` are MP's `payer.id` and `payer.email` flattened. `authorization_code` is `null` unless the payment is approved.
2. **Use three `status` values:**
   - `approved`, with `status_detail` `accredited`.
   - `rejected`, with an MP `cc_rejected_*` detail.
   - `error`, with detail `service_unavailable`, for the simulated system error. `error` is a SnailPay-only status: real gateways send no payment body on 5xx, but the brief requires the full field set on system errors too.
   - Skip `pending`/`in_process`: nothing in scope settles asynchronously.
3. **Suggested outcome table** (reuses MP `status_detail` names):

   | Scenario | HTTP | status | status_detail |
   |---|---|---|---|
   | Approved | 201 | `approved` | `accredited` |
   | Wrong CVV | 402 | `rejected` | `cc_rejected_bad_filled_security_code` |
   | Wrong or expired date | 402 | `rejected` | `cc_rejected_bad_filled_date` |
   | Insufficient funds | 402 | `rejected` | `cc_rejected_insufficient_amount` |
   | Fraud / high risk | 402 | `rejected` | `cc_rejected_high_risk` |
   | Unknown card number | 402 | `rejected` | `cc_rejected_bad_filled_card_number` |
   | Malformed request (missing field, amount <= 0) | 400 | `rejected` | `cc_rejected_bad_filled_other` |
   | Simulated system error | 503 + `Retry-After` | `error` | `service_unavailable` |
   | Same idempotency key, different payload | 422 | (error body) | `idempotency_key_reused` |
   | Same key while the first request is still in flight | 409 | (error body) | `idempotency_request_in_progress` |

   **Disagreement:** MP's Payments API returns declines as `201` with `status: "rejected"`. Stripe and MP's newer Orders API return declines as `402`. Prefer `402`: a client that checks `response.ok` then fails closed and cannot false-approve a decline.
4. **Trigger outcomes with card numbers, not cardholder names.** MP drives sandbox outcomes through cardholder-name codes (`APRO`, `FUND`...). The brief says any non-empty name must approve on the approved card, so name codes would contradict it. Stripe's convention of one magic card number per outcome fits. Rules:
   - Approval happens only on an exact match of the documented card, expiry and CVV.
   - The same card with a wrong CVV or a wrong expiry returns the matching `bad_filled` detail.
   - Extra magic numbers trigger insufficient funds, high risk, the system error, and a **slow response** (a delay longer than the client timeout) so timeout handling can be demonstrated.
   - Don't use magic amounts: the brief approves any amount above zero.
5. **Don't Luhn-validate card numbers.** The mandated approval card `1234123412341234` fails the Luhn check (sum 56).
6. **Don't check expiry against the wall clock.** The mandated expiry `12/26` lapses after 2026-12-31. A clock-based check would turn the approval scenario into a decline from January 2027. Validate the `MM/YY` format only and match triggers exactly.
7. **Idempotency:**
   - The client generates one UUID v4 per top-up attempt and sends it as `X-Idempotency-Key` (MP's header name) and as `reference`.
   - The server keeps an in-memory map from key to `{ payload fingerprint, HTTP status, body }`.
   - A replay returns the stored status and body plus `Idempotent-Replayed: true` (Stripe's header).
   - **Don't store the simulated 503.** It is refused before processing starts, like Stripe's validation and concurrency rejections, so a retry with the same key can succeed once the outage ends.
   - Retention is the process lifetime. The ceiling: a restart forgets keys, which is acceptable for a mock.
8. **Client rules against false approvals and double credits:**
   - Credit only when HTTP is `201`, `status === "approved"`, `authorization_code` is non-null, and `transaction_amount` equals the requested amount.
   - Credit at most once per payment `id`, tracked as a credited-IDs set in localStorage.
   - Save the pending attempt (key and amount) to localStorage **before** sending.
   - A timeout means the outcome is **unknown**: neither approved nor declined. Reconcile first, by re-sending the same request with the same key or by querying by `reference`. Never retry with a new key.
9. **Card number and CVV in responses deviate from every real gateway.** MP returns only `card.first_six_digits` and `card.last_four_digits`. The brief requires the full number and CVV, which is acceptable only because the data are fictitious. Document it as a deliberate, brief-driven deviation.

## Q1. Do the SnailPay fields mirror MP's Payments API?

Yes. MP's `POST /v1/payments` and `GET /v1/payments/{id}` return a payment resource with these fields. The official Node SDK's `PaymentResponse` type documents each one:

| SnailPay | MP field | MP description |
|---|---|---|
| `id` | `id` (number) | "Unique payment identifier" |
| `status` | `status` | "Payment status (e.g. approved, pending, rejected, cancelled)" |
| `status_detail` | `status_detail` | "Granular status reason (e.g. accredited, cc_rejected_high_risk)" |
| `transaction_amount` | `transaction_amount` | "Gross amount of the transaction" |
| `date_created` | `date_created` | "Payment creation timestamp (ISO 8601)" |
| `authorization_code` | `authorization_code` | "Authorization code returned by the card processor" |
| `reference` | `external_reference` | "Integrator-supplied external reference for reconciliation" |
| `payer_id`, `payer_email` | `payer.id`, `payer.email` | nested payer object |

- MP card data is masked: `card.first_six_digits`, `card.last_four_digits`, `card.cardholder`. The full number and CVV are never returned.
- **Unclear:** the public API reference page for create-payment doesn't list `authorization_code` or `external_reference` among its response parameters. The SDK type, the get-payment example and the search endpoint do include them.

**Stripe, for contrast:** Stripe models a charge as a PaymentIntent with `status` values `requires_payment_method`, `requires_confirmation`, `requires_action`, `processing`, `requires_capture`, `canceled` and `succeeded`. The failure reason goes in `last_payment_error` (`code`, `decline_code`, `message`), not in a flat `status_detail`. SnailPay's field set is clearly MP-shaped.

### MP `status` values

The "payment creation results" page documents these:

- `approved`: accredited.
- `authorized`: awaiting capture.
- `in_process`: under review.
- `pending`: awaiting payment.
- `rejected`: declined.

The SDK also mentions `cancelled`. Post-payment states such as refunds and chargebacks are out of scope for SnailPay and were not re-verified.

### MP `status_detail` catalog

- `approved`: `accredited`, `partially_refunded`.
- `authorized`: `pending_capture`.
- `in_process`: `offline_process`, `pending_contingency` (notified within 2 business days), `pending_review_manual`.
- `pending`: `pending_waiting_transfer`, `pending_waiting_payment`, `pending_challenge`.
- `rejected`:
  - `bank_error`, `cc_rejected_3ds_mandatory`, `cc_rejected_bad_filled_card_number`, `cc_rejected_bad_filled_date`, `cc_rejected_bad_filled_other`, `cc_rejected_bad_filled_security_code` (bad CVV), `cc_rejected_blacklist`, `cc_rejected_call_for_authorize`, `cc_rejected_card_disabled`, `cc_rejected_card_error`, `cc_rejected_duplicated_payment`, `cc_rejected_high_risk` (fraud engine), `cc_rejected_insufficient_amount` (insufficient funds), `cc_rejected_invalid_installments`, `cc_rejected_max_attempts`, `cc_rejected_other_reason` (issuer gave no reason), `cc_amount_rate_limit_exceeded`, `rejected_insufficient_data`, `rejected_by_bank`, `rejected_by_regulations`, `insufficient_amount`, `cc_rejected_card_type_not_allowed`.
  - MP classifies `cc_rejected_bad_filled_*` as payer input errors, `cc_rejected_high_risk` as its anti-fraud engine, and `cc_rejected_other_reason` / `call_for_authorize` as issuer decisions.
- MP has **no dedicated "expired card" detail**. Its expiry-related sandbox code maps to a date problem, most plausibly `cc_rejected_bad_filled_date`.

**MP Orders API (newer):** it uses a different vocabulary. Order `status` values are `created`, `processed`, `processing`, `action_required`, `failed`, `canceled`, `expired`, `refunded` and `charged_back`, with `status_detail` values such as `accredited`, `in_process` and `failed`. SnailPay should follow the Payments API vocabulary because its field names come from there.

## Q2. How sandboxes trigger outcomes deterministically

**MP: cardholder-name codes.**

- The cardholder name picks the outcome. Card number, CVV and expiry only need to be one of the test cards.
- Mexico test cards (expiry `11/30`):

  | Card | Number | CVV |
  |---|---|---|
  | Mastercard credit | 5474 9254 3267 0366 | 123 |
  | Visa credit | 4075 5957 1648 3764 | 123 |
  | Amex credit | 3711 803032 57522 | 1234 |
  | Mastercard debit | 5579 0534 6148 2647 | 123 |
  | Visa debit | 4189 1412 2126 7633 | 123 |

  Argentina and Brazil publish different numbers.
- The only allowed test payer email is `test@testuser.com`. Other cardholder fields (document type and number) are required.

| Code | Documented outcome |
|---|---|
| `APRO` | Approved |
| `OTHE` | Declined, general error |
| `CONT` | Pending |
| `CALL` | Declined, validation to authorize |
| `FUND` | Declined, insufficient amount |
| `SECU` | Declined, invalid security code |
| `EXPI` | Declined, due date issue |
| `FORM` | Declined, form error |
| `CARD`, `INST`, `DUPL`, `LOCK`, `CTNA`, `ATTE`, `BLAC` | Rejected: missing card number, invalid installments, duplicate payment, disabled card, card type not allowed, PIN attempts exceeded, blacklist |
| `UNSU` | Not supported |
| `TEST` | "Used to apply amount rules" |

- **Unclear:** the test-card pages describe outcomes in prose and do not map each code to a `status_detail`. The mapping (for example `SECU` to `cc_rejected_bad_filled_security_code`) is inferred from the catalog.
- **Unclear:** the "amount rules" behind `TEST` are not documented anywhere I found. MP has no documented magic amounts.

**Stripe: one magic card number per outcome.**

- Use any future expiry (for example `12/34`), any 3-digit CVC (4 for Amex), and any value in the other fields. The card number alone decides the outcome.
- Declines:

  | Card | Outcome (`code` / `decline_code`) |
  |---|---|
  | `4000000000000002` | `card_declined` / `generic_decline` |
  | `4000000000009995` | `card_declined` / `insufficient_funds` |
  | `4000000000009987` | lost card |
  | `4000000000009979` | stolen card |
  | `4000000000000069` | `expired_card` |
  | `4000000000000127` | `incorrect_cvc` |
  | `4000000000000119` | `processing_error` |
  | `4242424242424241` | `incorrect_number` |
  | `4000000000006975` | `card_velocity_exceeded` |

- Fraud (Radar):

  | Card | Outcome |
  |---|---|
  | `4100000000000019` | Always blocked |
  | `4000000000004954` | Highest risk |
  | `4000000000009235` | Elevated risk |

- Stripe documents no magic amounts for card outcomes.
- It explicitly forbids real card data in tests.

## Q3. Idempotency

| | Stripe | MP |
|---|---|---|
| Header | `Idempotency-Key` | `X-Idempotency-Key`. Mandatory on the Payments and Refunds APIs; the announcement's effective date "09/01/2024" is ambiguous in format. |
| Key format | Up to 255 chars. UUID v4 suggested. No sensitive data such as emails. | UUID v4 or a random string. `prefix_...` values are rejected (e.g. `payment_12...` is invalid). Orders API: max 150 chars. |
| Scope | Unique within your account over the last 24 h. Applies to `POST` only; `GET`/`DELETE` are idempotent by definition. | Per request. Scope is not otherwise documented. |
| What is stored | Status code and body of the first request once endpoint execution begins, success or failure, **including 500s**. Validation failures and concurrent-request conflicts are not stored and can be retried. | "Only the first one is processed". Storage is not otherwise documented. |
| Retention | Keys may be pruned once at least 24 h old. A reused pruned key starts a new request. | **Not documented.** |
| Replay, same payload | Same stored response, plus header `Idempotent-Replayed: true`. | The duplicate is recognized and not processed again. The replay response shape is not documented. |
| Same key, different payload | Error of type `idempotency_error`. The HTTP code is not pinned (the 409 row says "perhaps due to using the same idempotent key"). | Payments API: **not documented**. Orders API: `409 idempotency_key_already_used`, `423 resource_locked` (in-flight, retry shortly), `500 idempotency_validation_failed` (resend with a new key). |

- **Neutral reference:** the IETF draft `draft-ietf-httpapi-idempotency-key-header-07` (expired Internet-Draft, Oct 2025) specifies:
  - `400` for a missing required key.
  - `422` for a key reused with a different payload.
  - `409` for a retry while the original is still processing.
  - A replay after completion returns the original result, success or error.
  - Servers should publish their expiry policy.
- **MP's official Node SDK** generates one UUID v4 per call. It reuses the key across automatic retries on `429/500/502/503/504` (default 3 retries, 60 s timeout). This is the "same key on retry" pattern in code.
- **Disagreement:** on reusing a key after a 4xx, Stripe's advice is to generate a new key after fixing the request. MP's Orders API asks for a new key after `idempotency_validation_failed`. Both agree: never change the payload under the same key.

## Q4. HTTP status per outcome, and timeouts

| Outcome | MP Payments API | MP Orders API | Stripe |
|---|---|---|---|
| Approved | `201`, `status: approved` | `201` | `200` |
| Declined by issuer or fraud | **`201`**, `status: rejected` plus `status_detail` | **`402 failed`** | `4xx` with `type: card_error`. `402` is "parameters were valid but the request failed" |
| Validation error | `400`, error body `{message, error, status, cause[]}` | `400` | `400 invalid_request_error` |
| Auth | `401` / `403` | `401` / `403` | `401` / `403` |
| Rate limit | `429` (`Retry-After`) | `429` (`Retry-After`) | `429` |
| Server error | `5xx` (SDK retries) | `500 internal_error`: retry later | `500/502/503/504`. "Treat requests that return 500 errors as indeterminate." |

- RFC 9110 defines `503` as temporary overload or maintenance, optionally with `Retry-After`.
- RFC 9110 marks `402` as "reserved for future use". Stripe and MP Orders use it anyway, so it is convention rather than standard.

**Timeouts (both vendors agree in substance):**

- **Stripe.** A network error or timeout leaves the client "not knowing whether or not the server received the request". Retry "with the same idempotency keys and the same parameters until [you] receive a result". After a `500`, don't retry with a new key, "because the original key may have produced side effects". Reconcile later via webhooks, cross-referencing with a local ID stored in `metadata`.
- **MP.** The idempotency key exists for "network failures, timeouts, or automatic resending". Payments can be looked up with `GET /v1/payments/{id}` or `GET /v1/payments/search?external_reference=...`, which is why a client-supplied reference matters.
- **Implication:** a timeout is an **unknown** outcome, not a failure. Reconcile, by replaying with the same key or looking up by reference, before showing a result or starting a fresh attempt.

## Sources

**Mercado Pago**

- Payment creation results (status and status_detail catalog): https://www.mercadopago.com.br/developers/en/docs/checkout-api-payments/response-handling/collection-results/introduction
- Why a payment is rejected: https://www.mercadopago.com.br/developers/en/docs/checkout-api/how-tos/reasons-for-rejection
- Test cards, Mexico: https://www.mercadopago.com.mx/developers/en/docs/checkout-api/additional-content/your-integrations/test/cards
- Test cards, Orders API: https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/integration-test/cards
- Test cards, Bricks: https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/integration-test/test-cards.md
- Create payment reference: https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-api-payments/create-payment/post
- Get payment reference: https://www.mercadopago.com.mx/developers/en/reference/online-payments/checkout-api-payments/get-payment/get
- Search payments: https://www.mercadopago.com.br/developers/en/reference/payments/_payments_search/get
- Idempotency mandatory (news): https://www.mercadopago.com.br/developers/en/news/2023/01/04/Idempotency-key-usage-will-be-mandatory
- Idempotency key format (card form guide): https://www.mercadopago.com.ar/developers/en/docs/checkout-api-payments/integration-configuration/card/integrate-via-cardform/introduction
- Orders API errors: https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-management/integration-errors
- Orders API order status: https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/order-status
- Orders API transaction status: https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/payment-management/status/transaction-status
- Wallet Connect responses ("may be rejected even when the request returns 201"): https://www.mercadopago.com.ar/developers/en/docs/wallet-connect/payment-flow/capture-payment/responses
- Official Node SDK, payment types: https://github.com/mercadopago/sdk-nodejs/blob/master/src/clients/payment/commonTypes.ts
- Official Node SDK, REST client (idempotency key and retries): https://github.com/mercadopago/sdk-nodejs/blob/master/src/utils/restClient/index.ts
- Official Node SDK, config: https://github.com/mercadopago/sdk-nodejs/blob/master/src/utils/config/index.ts
- Official Node SDK, errors: https://github.com/mercadopago/sdk-nodejs/blob/master/src/utils/errors/index.ts

**Stripe**

- Idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Low-level error handling (network errors, 500s, `Idempotent-Replayed`, `Stripe-Should-Retry`): https://docs.stripe.com/error-low-level
- Errors and HTTP status codes: https://docs.stripe.com/api/errors
- Testing (test cards): https://docs.stripe.com/testing
- PaymentIntent object (status enum): https://docs.stripe.com/api/payment_intents/object

**Standards**

- RFC 9110, HTTP Semantics (402, 409, 422, 503): https://www.rfc-editor.org/rfc/rfc9110.html
- IETF draft, The Idempotency-Key HTTP Header Field (-07, expired): https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
