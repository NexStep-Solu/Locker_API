# Pawn Locker Integration — API Documentation

Generated per spec §45-46. Clearly labeled POS-facing, Locker-facing, and Admin APIs. Do not represent internal gateway APIs as Locker vendor APIs.

## Authentication

Separate credentials (spec §15, §38):

- **POS → Integration App**: `Authorization: Bearer {POS_API_TOKEN}` (middleware `pos.integration`). Locker token must NOT be used.
- **Locker → Integration App**: `Authorization: Bearer {LOCKER_API_TOKEN}` (middleware `locker.integration`). POS token must NOT be used.
- **Admin UI**: Laravel Fortify session auth (`auth`, `verified` middleware). Never expose Locker/POS tokens to browser (spec §38).

## POS → Integration (Gateway) — LAN, POS owns business

### POST /api/v1/pos/storage-assignments
Create storage assignment batch (spec §14).

**Headers**
```
Authorization: Bearer {POS_API_TOKEN}
Content-Type: application/json
Accept: application/json
X-Request-Id: POS-20260920-000001   // stable for retry, preserved per spec §13
```

**Request**
```json
{
  "batchNo": "ST-20260920-001",
  "items": [
    { "voucherNo": "PV-2026-000001", "voucherDate": "2026-09-20", "bagNo": "BAG-001", "location": "C1-R1" }
  ]
}
```
- `batchNo` string required, regex `^[A-Za-z0-9\-_]+$`, unique
- `items` 1..1000 required
- `voucherDate` `YYYY-MM-DD`
- `location` `^[A-Za-z0-9\-_]+$` (approved Locker locations, not invented)

**Responses**
- `201` `{"success":true,"message":"Storage assignment accepted","data":{"batchNo","requestId","total","status","items":[…]}}`
- `200` duplicate `{"success":true,"message":"Duplicate batch - already processed","errorCode":"DUPLICATE_BATCH","data":{"batchNo","status","duplicate":true}}`
- `401` `{"success":false,"errorCode":"INTEGRATION_AUTH_FAILED"}`
- `422` validation `{"success":false,"errorCode":"VALIDATION_ERROR","errors":{}}`

**Idempotency**: `batch_no` UNIQUE; second POST same `batchNo` returns 200 duplicate, no duplicate physical assignment. `X-Request-Id` preserved on retry.

**Queue**: Accepted batch dispatched as `SendStorageAssignmentToLocker` job (`database` queue per spec §6). Worker sends to Locker `POST /api/integration/v1/storage-assignments/batch` with same `batchNo` + `X-Request-Id`.

### GET /api/v1/pos/bags/{bagNo}
Retrieve bag with authoritative `current_location` (Locker is source of truth per spec §19).

**Response** `200` `{"success":true,"data":{"bagNo","voucherNo","voucherDate","currentLocation","lastLockerUpdateAt","lastLockerEventId"}}` or `404` `BAG_NOT_FOUND`.

### GET /api/v1/pos/bags/{bagNo}/location
Current location only: `{"data":{"bagNo","currentLocation","lastLockerUpdateAt"}}` or `404`.

## Locker → Integration (Gateway) — Locker owns physical

### POST /api/locker-integration/v1/location-updates
Locker notifies when bag physical location changes (spec §16).

**Headers**
```
Authorization: Bearer {LOCKER_API_TOKEN}
Content-Type: application/json
```

**Request** (all required per spec §16)
```json
{
  "eventId": "LOC-20260901-000001",
  "eventType": "BAG_LOCATION_CHANGED",
  "bagNo": "BAG-00125",
  "voucherNo": "PV-2026-000123",
  "oldLocation": "C1-R1",
  "newLocation": "C3-R8",
  "movementType": "CONSOLIDATION",
  "occurredAt": "2026-09-01T09:15:21+06:30"
}
```

**Processing** (spec §17):
1. Authenticate 2. Validate JSON 3. Validate eventId 4. Check eventId exists 5. If exists return 200 6. Find bag 7. Record event 8. Update `bags.current_location` 9. Queue `SyncLocationUpdateToPos` 10. Return 200

**Responses**
- `200` `{"success":true,"message":"Location update processed","data":{"eventId","bagNo","oldLocation","newLocation","currentLocation"}}`
- `200` duplicate `{"success":true,"errorCode":"DUPLICATE_EVENT","data":{"eventId","duplicate":true}}`
- `401` `INTEGRATION_AUTH_FAILED`
- `422` `VALIDATION_ERROR`

**Idempotency** (spec §18): `event_id` UNIQUE; second POST same `eventId` returns 200, one movement record. Never create duplicate.

## Integration → Locker (Vendor) — Outbound, not routed

### POST {LOCKER_API_URL}/storage-assignments/batch
Gateway calls Locker vendor API (spec §9, §27). **Never called from React.**

**Headers**
```
Authorization: Bearer {LOCKER_API_TOKEN}
Content-Type: application/json
Accept: application/json
X-Request-Id: POS-20260920-000001
```

**Request**
```json
{ "batchNo":"ST-20260920-001", "items":[{"voucherNo","voucherDate":"YYYY-MM-DD","bagNo","location"}] }
```

**Locker Common Response** (spec §11):
```json
{ "success": true, "message":"Storage assignment processed", "data":{} }
{ "success": false, "message":"Invalid request", "errorCode":"INVALID_LOCATION" }
```
HTTP: `200/201` success, `400` invalid, `401` auth, `403` forbidden, `404` not found, `409` conflict, `422` validation, `500` internal, `503` unavailable

**Partial Failure** (spec §12): `{"success":true,"message":"Batch processed with rejected items","data":{"total":3,"accepted":2,"rejected":1}}` — item-level `REJECTED` preserved, batch `PARTIAL` not `FAILED`.

**Retry** (spec §13): On `0/timeout/500/503`, job retries 3 attempts delay 5s (configurable `INTEGRATION_RETRY_ATTEMPTS/DELAY`), same `batchNo+X-Request-Id`.

## Integration → POS (Vendor) — Outbound, configurable

### PUT {POS_API_URL}{POS_LOCATION_UPDATE_ENDPOINT}
Gateway syncs location to POS (spec §20). Template default `/bags/{bagNo}/location`, configurable `POS_API_URL` + `POS_LOCATION_UPDATE_ENDPOINT`.

**Request**
```json
{ "bagNo":"BAG-001","voucherNo":"PV-001","oldLocation":"C1-R1","newLocation":"C3-R8","eventId":"LOC-001","occurredAt":"2026-09-20T10:00:00+06:30" }
```

**Behavior** (spec §21-22): If POS offline, event stays stored, `pos_sync_jobs` `PENDING→RETRYING`, gateway owns retry. No resend to Locker.

## Admin (Session) — Inertia

All under `auth+verified`:
- `GET /dashboard` → metrics
- `GET /admin/storage-batches` `?status&search` paginated
- `GET /admin/storage-batches/{id}` detail + `POST /admin/storage-batches/{id}/retry`
- `GET /admin/bags` + `GET /admin/bags/{bagNo}`
- `GET /admin/location-updates` `?search&movementType&status`
- `GET /admin/integration-logs` filters `direction/system/status/http_status/request_id/event_id/date`, `GET /admin/integration-logs/{id}` detail
- `GET /admin/failed-integrations`
- `GET /admin/system-status` + `GET /admin/system-status/check`
- `GET /admin/settings` + `PUT /admin/settings` (non-secret only)

## Error Codes

Locker examples: `BAG_NOT_FOUND`, `INVALID_LOCATION`, `LOCKER_OCCUPIED`, `BAG_ALREADY_ASSIGNED`, `LOCKER_NOT_AVAILABLE` (spec §31). App-specific: `INVALID_BATCH`, `DUPLICATE_BATCH`, `DUPLICATE_EVENT`, `POS_UNAVAILABLE`, `LOCKER_UNAVAILABLE`, `POS_SYNC_FAILED`, `INTEGRATION_AUTH_FAILED`, `VALIDATION_ERROR`.

## Retry & Idempotency Summary

| Direction | Key | Retry on | Idempotency |
|-----------|-----|----------|-------------|
| App→Locker | `batchNo`+`X-Request-Id` | 0/500/503/timeout | `batch_no` UNIQUE, same key preserved |
| Locker→App | `eventId` | — (Locker retries) | `event_id` UNIQUE → 200 duplicate |
| App→POS | `eventId` | 0/500/503/504 | `pos_sync_jobs` tracks attempts, `RETRYING`→`SUCCESS` |

All responses use consistent `{success,message,errorCode,data}` per spec §25, no stack traces to POS/Locker.

## LAN Deployment

All URLs configurable via `.env` / `integration_settings` — never hard-code `192.168.1.20` (spec §5). Example:

```
POS_API_URL=http://192.168.1.10/api
POS_LOCATION_UPDATE_ENDPOINT=/bags/{bagNo}/location
LOCKER_API_URL=http://192.168.1.20:3000/api/integration/v1
INTEGRATION_REQUEST_TIMEOUT=15
INTEGRATION_RETRY_ATTEMPTS=3
INTEGRATION_RETRY_DELAY=5
```
Locker Api 

http://192.168.1.33:3001/api to test return hello world html .

auth require now
GET http://192.168.1.33:3001/api/integration/v1/drawers?available=true 
response {
  "success": true,
  "message": "Drawers retrieved",
  "data": {
    "total": 10,
    "drawers": [
      {
        "code": "D001",
        "zoneNo": "ZONE A",
        "rowNo": "R1",
        "columnNo": "C1",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:03:43.320Z"
      },
      {
        "code": "D002",
        "zoneNo": "ZONE A",
        "rowNo": "R1",
        "columnNo": "C1",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:03:35.064Z"
      },
      {
        "code": "D003",
        "zoneNo": "ZONE A",
        "rowNo": "R1",
        "columnNo": "C2",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:03:50.292Z"
      },
      {
        "code": "D010",
        "zoneNo": "ZONE A",
        "rowNo": "R10",
        "columnNo": "C10",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:03:55.570Z"
      },
      {
        "code": "D004",
        "zoneNo": "ZONE A",
        "rowNo": "R4",
        "columnNo": "C4",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:04:01.000Z"
      },
      {
        "code": "D005",
        "zoneNo": "ZONE A",
        "rowNo": "R5",
        "columnNo": "C5",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:04:06.930Z"
      },
      {
        "code": "D006",
        "zoneNo": "ZONE A",
        "rowNo": "R6",
        "columnNo": "C6",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:04:12.425Z"
      },
      {
        "code": "D007",
        "zoneNo": "ZONE A",
        "rowNo": "R7",
        "columnNo": "C7",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:04:17.075Z"
      },
      {
        "code": "D008",
        "zoneNo": "ZONE A",
        "rowNo": "R8",
        "columnNo": "C8",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": true,
        "unavailableReason": null,
        "updatedAt": "2026-09-22T07:04:24.881Z"
      },
      {
        "code": "D009",
        "zoneNo": "ZONE A",
        "rowNo": "R9",
        "columnNo": "C9",
        "status": "available",
        "lockStatus": "locked",
        "enabled": true,
        "maintenance": false,
        "hardwareReady": false,
        "unavailableReason": "Drawer D009 has no controller assigned.",
        "updatedAt": "2026-09-22T07:04:29.927Z"
      }
    ]
  }
}

POST http://192.168.1.33:3001/api/integration/v1/storage-assignments/batch?X-Request-Id=POS-20260815-000001
header required X-Request-Id which has to be unique
response {
  "success": true,
  "message": "Storage assignment batch accepted",
  "data": {
    "status": "COMPLETED",
    "batchNo": "ST-20260815-004",
    "total": 3,
    "accepted": 3,
    "rejected": 0,
    "errors": []
  }
}

POST http://192.168.1.33:3001/api/integration/v1/bags/query
body {
  "bagNos": [
    "BAG-00125",
    "BAG-00126",
    "BAG-00127"
  ]
}
response {
  "success": true,
  "message": "Bags retrieved",
  "data": {
    "totalRequested": 3,
    "found": 2,
    "missing": 1,
    "bags": [
      {
        "bagNo": "BAG-00125",
        "voucherNo": "PV-2026-000123",
        "voucherDate": "2026-08-15",
        "status": "ASSIGNED",
        "drawerCode": "D001",
        "removedAt": null,
        "updatedAt": "2026-09-22T07:15:25.610Z"
      },
      {
        "bagNo": "BAG-00127",
        "voucherNo": "PV-2026-000123",
        "voucherDate": "2026-08-15",
        "status": "ASSIGNED",
        "drawerCode": "D001",
        "removedAt": null,
        "updatedAt": "2026-09-22T03:25:08.647Z"
      }
    ],
    "missingBagNos": [
      "BAG-00126"
    ]
  }
}

GET http://192.168.1.33:3001/api/integration/v1/bags/BAG-00125
response {
  "success": true,
  "message": "Bag retrieved",
  "data": {
    "bagNo": "BAG-00125",
    "voucherNo": "PV-2026-000123",
    "voucherDate": "2026-08-15",
    "status": "ASSIGNED",
    "drawerCode": "D001",
    "removedAt": null,
    "updatedAt": "2026-09-22T07:15:25.610Z"
  }
}.