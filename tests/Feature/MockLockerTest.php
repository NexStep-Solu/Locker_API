<?php

namespace Tests\Feature;

use App\Models\Mock\MockLockerBag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MockLockerTest extends TestCase
{
    use RefreshDatabase;

    private string $lockerToken = 'dev-locker-token-change-me';

    public function test_mock_locker_accepts_valid_batch(): void
    {
        $res = $this->postJson('/mock/locker/api/integration/v1/storage-assignments/batch', [
            'batchNo' => 'ST-MOCK-001',
            'items' => [
                ['voucherNo' => 'PV-001', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-MOCK-001', 'location' => 'C1-R1'],
                ['voucherNo' => 'PV-002', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-MOCK-002', 'location' => 'C1-R2'],
            ],
        ], ['Authorization' => 'Bearer '.$this->lockerToken]);

        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('data.accepted', 2);
        $res->assertJsonPath('data.rejected', 0);

        $this->assertDatabaseHas('mock_locker_bags', ['bag_no' => 'BAG-MOCK-001', 'location' => 'C1-R1']);
    }

    public function test_mock_locker_rejects_invalid_location(): void
    {
        $res = $this->postJson('/mock/locker/api/integration/v1/storage-assignments/batch', [
            'batchNo' => 'ST-MOCK-002',
            'items' => [['voucherNo' => 'PV-001', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-BAD-001', 'location' => 'INVALID']],
        ], ['Authorization' => 'Bearer '.$this->lockerToken]);

        $res->assertStatus(200);
        $res->assertJsonPath('data.accepted', 0);
        $res->assertJsonPath('data.rejected', 1);
    }

    public function test_mock_consolidation_notifies_gateway(): void
    {
        // First store bag via mock
        $this->postJson('/mock/locker/api/integration/v1/storage-assignments/batch', [
            'batchNo' => 'ST-MOCK-003',
            'items' => [['voucherNo' => 'PV-001', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-CONS-MOCK', 'location' => 'C1-R1']],
        ], ['Authorization' => 'Bearer '.$this->lockerToken])->assertStatus(200);

        // Create gateway bag also (normally gateway would have bag from storage batch)
        \App\Models\Bag::create(['bag_no' => 'BAG-CONS-MOCK', 'voucher_no' => 'PV-001', 'current_location' => 'C1-R1']);

        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);

        $res = $this->postJson('/mock/locker/consolidate', ['bagNo' => 'BAG-CONS-MOCK', 'newLocation' => 'C3-R8']);
        $res->assertStatus(200);
        $res->assertJsonPath('success', true);

        $this->assertDatabaseHas('mock_locker_bags', ['bag_no' => 'BAG-CONS-MOCK', 'location' => 'C3-R8']);
        $this->assertDatabaseHas('bags', ['bag_no' => 'BAG-CONS-MOCK', 'current_location' => 'C3-R8']); // gateway updated via location-updates
        $this->assertDatabaseHas('locker_location_events', ['bag_no' => 'BAG-CONS-MOCK', 'new_location' => 'C3-R8']);
    }

    public function test_mock_bag_out(): void
    {
        $this->postJson('/mock/locker/api/integration/v1/storage-assignments/batch', [
            'batchNo' => 'ST-MOCK-004',
            'items' => [['voucherNo' => 'PV-001', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-OUT-MOCK', 'location' => 'C1-R1']],
        ], ['Authorization' => 'Bearer '.$this->lockerToken]);

        $user = \App\Models\User::factory()->create();
        $this->actingAs($user);
        $res = $this->postJson('/mock/locker/bag-out', ['bagNo' => 'BAG-OUT-MOCK']);
        $res->assertStatus(200);
        $res->assertJsonPath('success', true);
        $this->assertDatabaseHas('mock_locker_bags', ['bag_no' => 'BAG-OUT-MOCK', 'status' => 'OUT']);
    }
}
