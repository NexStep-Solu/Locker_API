# Locker Integration Guide — Locker Vendor / Machine

Who this is for: the locker machine (e.g. `192.168.1.33:3001`) and anyone wiring it to this gateway. The locker owns drawers, doors, IN/OUT, and consolidation. The gateway never drives hardware.

Swagger: `/docs/locker` (UI) + `/docs/locker.json` (OpenAPI). POS usage is in `POS-INTEGRATION.md`.

Real machine from testing:
```
LOCKER_API_URL=http://192.168.1.33:3001/api/integration/v1
```
Mock for development (no hardware):
```
LOCKER_API_URL=http://localhost:8000/mock/locker/api/integration/v1
```
Set URL + token in gateway **Settings → Step 1** (token stored server-side only, masked in UI, never logged). Health check: `GET /api` should return hello-world HTML.

---

## 1. Auth & headers (all locker calls)

Gateway → Locker (outbound):
```
Authorization: Bearer {LOCKER_API_TOKEN}
Content-Type: application/json
Accept: application/json
X-Request-Id: POS-20260815-000001   (storage batch only; keep identical on retry; also sent as ?X-Request-Id= for compat)
```

Locker → Gateway (callbacks):
```
Authorization: Bearer {LOCKER_API_TOKEN}   (same token, checked by locker.integration middleware)
Content-Type: application/json
```

401 = token missing/wrong. Tokens are per-system (POS token is different — never mix them).

## 2. Gateway → Locker APIs (we call you)

### 2.1 List free drawers — `GET /drawers?available=true`

Use before assigning drawers so POS never invents codes. Drawer codes (`D001`) are the integration identifier — cabinet/row/controller stay internal to the locker.

```bash
curl "http://192.168.1.33:3001/api/integration/v1/drawers?available=true" \
  -H "Authorization: Bearer $LOCKER_API_TOKEN"
```

Response (real example, 10 drawers):
```json
{"success":true,"message":"Drawers retrieved","data":{"total":10,"drawers":[
  {"code":"D001","zoneNo":"ZONE A","rowNo":"R1","columnNo":"C1","status":"available","lockStatus":"locked","enabled":true,"maintenance":false,"hardwareReady":true,"unavailableReason":null,"updatedAt":"2026-09-22T07:03:43.320Z"},
  {"code":"D009","zoneNo":"ZONE A","rowNo":"R9","columnNo":"C9","status":"available","lockStatus":"locked","enabled":true,"maintenance":false,"hardwareReady":false,"unavailableReason":"Drawer D009 has no controller assigned.","updatedAt":"2026-09-22T07:04:29.927Z"}
]}}
```
Gateway shows this at **Free Drawers** (`/admin/locker/drawers`) and in the Store-Bags drawer dropdown. Only approved codes may be sent (else `INVALID_DRAWER_CODE`).

### 2.2 Store bags — `POST /storage-assignments/batch`

Gateway sends one list. Supports hundreds/thousands of bags. Send `drawerCode` (v1.1); `location` is kept for backward compat.

```bash
curl -X POST "http://192.168.1.33:3001/api/integration/v1/storage-assignments/batch?X-Request-Id=POS-20260815-000001" \
  -H "Authorization: Bearer $LOCKER_API_TOKEN" \
  -H "Content-Type: application/json" -H "X-Request-Id: POS-20260815-000001" \
  -d '{"batchNo":"ST-20260815-004","items":[
    {"voucherNo":"PV-2026-000123","voucherDate":"2026-08-15","bagNo":"BAG-00125","drawerCode":"D001"},
    {"voucherNo":"PV-2026-000124","voucherDate":"2026-08-15","bagNo":"BAG-00126","drawerCode":"D002"}
  ]}'
```

Success (real):
```json
{"success":true,"message":"Storage assignment batch accepted","data":{"status":"COMPLETED","batchNo":"ST-20260815-004","total":3,"accepted":3,"rejected":0,"errors":[]}}
```
Partial (some rejected, still `success:true`):
```json
{"success":true,"message":"Batch processed with rejected items","data":{"total":3,"accepted":2,"rejected":1,"errors":[
  {"bagNo":"BAG-00127","drawerCode":"D101","errorCode":"DRAWER_NOT_AVAILABLE","message":"Drawer D101 is not available."}
]}}
```
Gateway maps this to Stored / Partly stored / Needs attention per bag. Retry rule: network timeout / 0 / 500 / 503 → retry same `batchNo` + same `X-Request-Id` (3 tries). Business errors (`400/401/403/404/409/422`, `INVALID_DRAWER_CODE`, `DRAWER_OCCUPIED`, `BAG_ALREADY_ASSIGNED`) are terminal — fix the drawer and send corrected bags as a **new** list.

Error codes you may return: `BAG_NOT_FOUND`, `INVALID_DRAWER_CODE`, `DRAWER_OCCUPIED`, `BAG_ALREADY_ASSIGNED`, `DRAWER_NOT_AVAILABLE`, `LOCKER_UNAVAILABLE`.

### 2.3 Find bags — `POST /bags/query` + `GET /bags/{bagNo}`

Bulk (gateway **Find in Locker** page uses this):
```bash
curl -X POST http://192.168.1.33:3001/api/integration/v1/bags/query \
  -H "Authorization: Bearer $LOCKER_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"bagNos":["BAG-00125","BAG-00126","BAG-00127"]}'
# → {success:true,message:"Bags retrieved",data:{totalRequested:3,found:2,missing:1,
#   bags:[{bagNo:"BAG-00125",voucherNo:"PV-2026-000123",voucherDate:"2026-08-15",status:"ASSIGNED",drawerCode:"D001",removedAt:null,updatedAt:"2026-09-22T07:15:25.610Z"}],
#   missingBagNos:["BAG-00126"]}}
```
Single:
```bash
curl http://192.168.1.33:3001/api/integration/v1/bags/BAG-00125 \
  -H "Authorization: Bearer $LOCKER_API_TOKEN"
# → {success:true,message:"Bag retrieved",data:{bagNo:"BAG-00125",voucherNo:"PV-2026-000123",voucherDate:"2026-08-15",status:"ASSIGNED",drawerCode:"D001",removedAt:null,updatedAt:"..."}}
# missing → 404 {success:false,errorCode:"BAG_NOT_FOUND"}
```
`status` is typically `ASSIGNED` (stored) — the gateway shows Found / Not found counts.

## 3. Locker → Gateway callbacks (you call us)

When staff move a bag (consolidation `D001 → D301`), tell us so current drawers stay correct. Two routes, same handler (v1.1 preferred):

- `POST /api/locker-integration/v1/drawer-code-updates` (v1.1)
- `POST /api/locker-integration/v1/location-updates` (v1.0 legacy)

v1.1 body (use this):
```json
{
  "eventId": "DRW-20260901-000001",
  "eventType": "BAG_DRAWER_CHANGED",
  "bagNo": "BAG-00125",
  "voucherNo": "PV-2026-000123",
  "oldDrawerCode": "D001",
  "newDrawerCode": "D301",
  "movementType": "CONSOLIDATION",
  "occurredAt": "2026-09-01T09:15:21+06:30"
}
```
v1.0 legacy equivalent: `eventId LOC-...`, `eventType BAG_LOCATION_CHANGED`, `oldLocation/newLocation` (`C1-R1 → C3-R8`). Gateway accepts both and stores both columns.

Rules:
- All 8 fields required. `movementType` is `CONSOLIDATION` for now (IN/OUT/RELOCATION accepted).
- `eventId` must be globally unique (`DRW-...` recommended). We store it UNIQUE — resend the **same** `eventId` on retry; duplicates return `200 {success:true, errorCode:"DUPLICATE_EVENT", data:{duplicate:true}}` with no second move.
- We update `bags.current_drawer_code` (= authoritative) inside a DB transaction, then return `200 {success:true, data:{eventId, bagNo, newDrawerCode, ...}}`.
- If we are unreachable, **keep the physical move and retry the callback later** — never block/undo consolidation because POS/gateway is offline.
- Validation failures return `422 VALIDATION_ERROR`; bad token `401 INTEGRATION_AUTH_FAILED`.

Physical consolidation you perform:
Admin starts → open source drawer → remove bag → scan bag QR → IN_TRANSIT → place in `D301` → confirm → STORED → record old+new → POST callback above.

OUT you perform (no API needed from POS):
Scan QR → find bag → find current drawer yourself → verify status → open drawer → remove → close → record OUT (bag/voucher/drawer/operator/kiosk/time). OUT QR is bag-number only — do not trust any printed drawer text after consolidation.

## 4. Flows with the gateway

**Store:** Gateway `POST batch (drawerCode)` → you validate drawer codes → accepted/rejected per bag → kiosk IN (staff card → IN → scan bag QR → you resolve drawer → open → place → STORED).

**Consolidate:** You move `D001 → D301` → `POST drawer-code-updates (DRW-...)` → gateway updates current drawer → visible under Bag Moves + Bags.

**Verify:** Gateway operator can cross-check any bag via **Find in Locker** (§2.3); mismatch banner means locker wins.

## 5. Go-live checklist (locker side)

- [ ] `GET /api` reachable; `GET /drawers?available=true` needs token, returns `D001...` with `hardwareReady` flags
- [ ] `POST batch` accepts 10 bags → `COMPLETED`; `D999` → per-item `INVALID_DRAWER_CODE`; same `batchNo` + same `X-Request-Id` twice → no duplicate
- [ ] `POST bags/query` returns found/missing correctly; `GET bags/{id}` 404 has `BAG_NOT_FOUND`
- [ ] Consolidation `D001 → D301` callback updates gateway; same `eventId` twice → second is duplicate 200, one move
- [ ] OUT by bag QR alone opens the current drawer even with an old slip
