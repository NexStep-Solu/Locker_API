# Mock Locker System — For Testing Without Hardware

Pure offline gateway needs a Locker to test. This mock simulates the **real Locker System** (physical lockers `C1-R1..C3-R8`) inside the same Laravel app.

## What it mocks (spec §9)

Real Locker APIs (only 2):

```
POST /api/integration/v1/storage-assignments/batch        (Gateway → Locker)
POST /api/locker-integration/v1/location-updates          (Locker → Gateway)
```

Mock provides:

```
POST /mock/locker/api/integration/v1/storage-assignments/batch   (same payload, validates, stores)
POST /mock/locker/consolidate  {bagNo, newLocation} → calls Gateway /api/locker-integration/v1/location-updates
POST /mock/locker/bag-out      {bagNo} → status OUT (mock door)
GET  /mock/locker              (UI)
```

## Switch Gateway to Mock (LAN test)

In `.env` on **Gateway** (`192.168.1.50` or local):

```env
# Real hardware (production)
LOCKER_API_URL=http://192.168.1.20:3000/api/integration/v1
LOCKER_API_TOKEN=<real>

# Mock for testing (no hardware)
LOCKER_API_URL=http://localhost:8000/mock/locker/api/integration/v1
LOCKER_API_TOKEN=dev-locker-token-change-me
```

`composer run dev` serves both Gateway and Mock on same host (`localhost:8000`). For separate LAN, use `http://192.168.1.50/mock/locker/api/integration/v1`.

## Test Flow (Pure Offline)

1. **Login** `admin@locker.com / password` → `Mock Locker` in sidebar (`/mock/locker`)
2. **Create batch** `admin/storage-batches/create` → scan/input `BAG-001 C1-R1` → `Send to Locker (via Gateway)` → Gateway `POST` Mock Locker → Mock stores `C1-R1` (see Mock `Physical Bags`)
3. **Verify** `admin/bags` shows `C1-R1`, `admin/integration-logs` `APP_TO_LOCKER SUCCESS`
4. **Consolidate** in Mock Locker: select `BAG-001` → `C3-R8` → `Consolidate → Notify Gateway` → Mock calls `LockerLocationService` → `admin/bags` now `C3-R8`, `admin/location-updates` shows `LOC-MOCK-... C1-R1→C3-R8`
5. **Bag OUT** in Mock Locker: `BAG-001` → `Bag OUT` → status `OUT` (mock door)
6. **Invalid location** test: create batch with `INVALID` → Mock rejects `0 accepted 1 rejected` → Gateway `PARTIAL`

## DB

`mock_locker_bags` (physical state) + `mock_locker_logs` — truncated via `POST /mock/locker/clear`. Not used in production.

## Tests

`tests/Feature/MockLockerTest.php` covers:

- `POST /mock/locker/api/.../batch` valid/invalid
- `POST /mock/locker/consolidate` → Gateway update
- `POST /mock/locker/bag-out`

Run: `php artisan test --filter=MockLockerTest`

Only for `APP_ENV=local` testing — not on prod.
