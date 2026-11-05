<?php

namespace Tests\Feature;

use App\Models\Bag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Pure Offline Windows App: no POS sync. Gateway is authoritative for current_location.
 */
class LockerLocationUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected string $lockerToken = 'dev-locker-token-change-me';
    protected string $posToken = 'dev-pos-token-change-me';

    private function lockerHeaders(): array
    {
        return [
            'Authorization' => 'Bearer '.$this->lockerToken,
            'Accept' => 'application/json',
        ];
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'eventId' => 'LOC-20260901-000001',
            'eventType' => 'BAG_LOCATION_CHANGED',
            'bagNo' => 'BAG-00125',
            'voucherNo' => 'PV-2026-000123',
            'oldLocation' => 'C1-R1',
            'newLocation' => 'C3-R8',
            'movementType' => 'CONSOLIDATION',
            'occurredAt' => '2026-09-01T09:15:21+06:30',
        ], $overrides);
    }

    public function test_requires_locker_authentication(): void
    {
        $res = $this->postJson('/api/locker-integration/v1/location-updates', $this->validPayload(), [
            'Authorization' => 'Bearer wrong-token',
        ]);

        $res->assertStatus(401);
        $res->assertJsonPath('errorCode', 'INTEGRATION_AUTH_FAILED');
    }

    public function test_valid_event_processes_and_updates_bag(): void
    {
        Bag::create(['bag_no' => 'BAG-00125', 'voucher_no' => 'PV-2026-000123', 'voucher_date' => '2026-09-01', 'current_location' => 'C1-R1']);

        $res = $this->postJson('/api/locker-integration/v1/location-updates', $this->validPayload(), $this->lockerHeaders());
        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('data.eventId', 'LOC-20260901-000001');
        $res->assertJsonPath('data.newLocation', 'C3-R8');

        $this->assertDatabaseHas('locker_location_events', ['event_id' => 'LOC-20260901-000001', 'status' => 'PROCESSED']);
        $this->assertDatabaseHas('bags', ['bag_no' => 'BAG-00125', 'current_location' => 'C3-R8', 'last_locker_event_id' => 'LOC-20260901-000001']);
        $this->assertDatabaseHas('integration_logs', ['direction' => 'LOCKER_TO_APP', 'event_id' => 'LOC-20260901-000001']);
        // Pure offline: no pos_sync_jobs
        $this->assertDatabaseCount('locker_location_events', 1);
    }

    public function test_missing_event_id_validation(): void
    {
        $payload = $this->validPayload();
        unset($payload['eventId']);

        $res = $this->postJson('/api/locker-integration/v1/location-updates', $payload, $this->lockerHeaders());
        $res->assertStatus(422);
        $res->assertJsonPath('errorCode', 'VALIDATION_ERROR');
    }

    public function test_unknown_bag_creates_placeholder(): void
    {
        $res = $this->postJson('/api/locker-integration/v1/location-updates', $this->validPayload(['bagNo' => 'BAG-UNKNOWN-999']), $this->lockerHeaders());
        $res->assertStatus(200);

        $this->assertDatabaseHas('bags', ['bag_no' => 'BAG-UNKNOWN-999', 'current_location' => 'C3-R8']);
        $this->assertDatabaseHas('locker_location_events', ['event_id' => 'LOC-20260901-000001']);
    }

    public function test_duplicate_event_idempotent(): void
    {
        Bag::create(['bag_no' => 'BAG-00125', 'current_location' => 'C1-R1', 'voucher_no' => 'PV-2026-000123']);

        $payload = $this->validPayload();
        $this->postJson('/api/locker-integration/v1/location-updates', $payload, $this->lockerHeaders())->assertStatus(200);
        $second = $this->postJson('/api/locker-integration/v1/location-updates', $payload, $this->lockerHeaders());
        $second->assertStatus(200);
        $second->assertJsonPath('data.duplicate', true);
        $second->assertJsonPath('errorCode', 'DUPLICATE_EVENT');

        $this->assertDatabaseCount('locker_location_events', 1);
        $bag = Bag::where('bag_no', 'BAG-00125')->first();
        $this->assertEquals('C3-R8', $bag->current_location);
    }

    public function test_new_location_becomes_authoritative(): void
    {
        Bag::create(['bag_no' => 'BAG-CONS', 'current_location' => 'C1-R1', 'voucher_no' => 'PV-001']);

        $this->postJson('/api/locker-integration/v1/location-updates', $this->validPayload([
            'eventId' => 'LOC-CONS-001',
            'bagNo' => 'BAG-CONS',
            'oldLocation' => 'C1-R1',
            'newLocation' => 'C3-R8',
        ]), $this->lockerHeaders())->assertStatus(200);

        $this->assertDatabaseHas('bags', ['bag_no' => 'BAG-CONS', 'current_location' => 'C3-R8']);
    }

    public function test_old_location_mismatch_still_updates(): void
    {
        Bag::create(['bag_no' => 'BAG-MISMATCH', 'current_location' => 'C1-R99', 'voucher_no' => 'PV-001']);

        $res = $this->postJson('/api/locker-integration/v1/location-updates', $this->validPayload([
            'eventId' => 'LOC-MISMATCH-001',
            'bagNo' => 'BAG-MISMATCH',
            'oldLocation' => 'C1-R1',
            'newLocation' => 'C3-R8',
        ]), $this->lockerHeaders());

        $res->assertStatus(200);
        $this->assertDatabaseHas('bags', ['bag_no' => 'BAG-MISMATCH', 'current_location' => 'C3-R8']);
        $this->assertDatabaseHas('locker_location_events', ['event_id' => 'LOC-MISMATCH-001']);
    }

    public function test_pure_offline_no_pos_sync(): void
    {
        Bag::create(['bag_no' => 'BAG-OFFLINE', 'current_location' => 'C1-R1', 'voucher_no' => 'PV-001']);

        $res = $this->postJson('/api/locker-integration/v1/location-updates', $this->validPayload([
            'eventId' => 'LOC-OFFLINE-001',
            'bagNo' => 'BAG-OFFLINE',
        ]), $this->lockerHeaders());

        $res->assertStatus(200);
        $this->assertDatabaseHas('locker_location_events', ['event_id' => 'LOC-OFFLINE-001', 'status' => 'PROCESSED']);
        $this->assertDatabaseHas('bags', ['bag_no' => 'BAG-OFFLINE', 'current_location' => 'C3-R8']);
        // Pure offline: no pos_sync_jobs table
        $this->assertDatabaseCount('locker_location_events', 1);
    }

    public function test_consolidation_flow_end_to_end(): void
    {
        Bag::create(['bag_no' => 'BAG-CONS-E2E', 'current_location' => 'C1-R1', 'voucher_no' => 'PV-CONS']);

        $eventPayload = [
            'eventId' => 'LOC-CONS-E2E-001',
            'eventType' => 'BAG_LOCATION_CHANGED',
            'bagNo' => 'BAG-CONS-E2E',
            'voucherNo' => 'PV-CONS',
            'oldLocation' => 'C1-R1',
            'newLocation' => 'C3-R8',
            'movementType' => 'CONSOLIDATION',
            'occurredAt' => '2026-09-20T10:00:00+06:30',
        ];

        $res = $this->postJson('/api/locker-integration/v1/location-updates', $eventPayload, $this->lockerHeaders());
        $res->assertStatus(200);

        $bag = Bag::where('bag_no', 'BAG-CONS-E2E')->first();
        $this->assertEquals('C3-R8', $bag->current_location);

        $bagRes = $this->getJson('/api/v1/pos/bags/BAG-CONS-E2E', ['Authorization' => 'Bearer '.$this->posToken]);
        $bagRes->assertJsonPath('data.currentLocation', 'C3-R8');
    }
}
