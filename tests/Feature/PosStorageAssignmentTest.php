<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PosStorageAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected string $posToken = 'dev-pos-token-change-me';

    protected function setUp(): void
    {
        parent::setUp();
        // Fake Locker API — per spec, storage assignment is batch; Locker returns success with counts
        Http::fake(function ($request) {
            if (str_contains($request->url(), 'storage-assignments/batch')) {
                $payload = $request->data();
                $total = count($payload['items'] ?? []);
                return Http::response([
                    'success' => true,
                    'message' => 'Storage assignment processed',
                    'data' => ['total' => $total, 'accepted' => $total, 'rejected' => 0],
                ], 200);
            }

            return Http::response(['success' => false], 404);
        });
    }

    protected function headers(): array
    {
        return [
            'Authorization' => 'Bearer '.$this->posToken,
            'Accept' => 'application/json',
            'X-Request-Id' => 'POS-20260920-000001',
        ];
    }

    public function test_requires_authentication(): void
    {
        $res = $this->postJson('/api/v1/pos/storage-assignments', [
            'batchNo' => 'ST-001',
            'items' => [['voucherNo' => 'PV-1', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-1', 'location' => 'C1-R1']],
        ]);

        $res->assertStatus(401);
        $res->assertJsonPath('errorCode', 'INTEGRATION_AUTH_FAILED');
    }

    public function test_valid_storage_batch(): void
    {
        $res = $this->postJson('/api/v1/pos/storage-assignments', [
            'batchNo' => 'ST-20260920-001',
            'items' => [
                ['voucherNo' => 'PV-2026-000001', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-001', 'location' => 'C1-R1'],
                ['voucherNo' => 'PV-2026-000002', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-002', 'location' => 'C1-R2'],
            ],
        ], $this->headers());

        $res->assertStatus(201);
        $res->assertJsonPath('success', true);
        $res->assertJsonPath('data.batchNo', 'ST-20260920-001');
        $res->assertJsonPath('data.total', 2);

        $this->assertDatabaseHas('storage_batches', ['batch_no' => 'ST-20260920-001', 'total' => 2]);
        $this->assertDatabaseHas('storage_batch_items', ['bag_no' => 'BAG-001', 'location' => 'C1-R1']);
        $this->assertDatabaseHas('bags', ['bag_no' => 'BAG-001', 'current_location' => 'C1-R1']);
        $this->assertDatabaseHas('integration_logs', ['direction' => 'POS_TO_APP', 'request_id' => 'POS-20260920-000001']);
    }

    public function test_empty_batch_fails(): void
    {
        $res = $this->postJson('/api/v1/pos/storage-assignments', [
            'batchNo' => 'ST-EMPTY',
            'items' => [],
        ], $this->headers());

        $res->assertStatus(422);
        $res->assertJsonPath('errorCode', 'VALIDATION_ERROR');
    }

    public function test_invalid_voucher_date(): void
    {
        $res = $this->postJson('/api/v1/pos/storage-assignments', [
            'batchNo' => 'ST-BAD',
            'items' => [['voucherNo' => 'PV-1', 'voucherDate' => '20-09-2026', 'bagNo' => 'BAG-1', 'location' => 'C1-R1']],
        ], $this->headers());

        $res->assertStatus(422);
        $res->assertJsonPath('errorCode', 'VALIDATION_ERROR');
    }

    public function test_missing_bag_number(): void
    {
        $res = $this->postJson('/api/v1/pos/storage-assignments', [
            'batchNo' => 'ST-BAD2',
            'items' => [['voucherNo' => 'PV-1', 'voucherDate' => '2026-09-20', 'location' => 'C1-R1']],
        ], $this->headers());

        $res->assertStatus(422);
    }

    public function test_duplicate_batch(): void
    {
        $payload = [
            'batchNo' => 'ST-DUP-001',
            'items' => [['voucherNo' => 'PV-1', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-DUP-1', 'location' => 'C1-R1']],
        ];

        $this->postJson('/api/v1/pos/storage-assignments', $payload, $this->headers())->assertStatus(201);

        $res2 = $this->postJson('/api/v1/pos/storage-assignments', $payload, $this->headers());
        $res2->assertStatus(200);
        $res2->assertJsonPath('data.duplicate', true);
        $res2->assertJsonPath('errorCode', 'DUPLICATE_BATCH');

        $this->assertDatabaseCount('storage_batches', 1);
        $this->assertDatabaseCount('storage_batch_items', 1);
    }

    public function test_bag_endpoints(): void
    {
        $this->postJson('/api/v1/pos/storage-assignments', [
            'batchNo' => 'ST-BAG-001',
            'items' => [['voucherNo' => 'PV-1', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-XYZ', 'location' => 'C1-R9']],
        ], $this->headers())->assertStatus(201);

        $res = $this->getJson('/api/v1/pos/bags/BAG-XYZ', $this->headers());
        $res->assertStatus(200);
        $res->assertJsonPath('data.bagNo', 'BAG-XYZ');
        $res->assertJsonPath('data.currentLocation', 'C1-R9');

        $res2 = $this->getJson('/api/v1/pos/bags/BAG-XYZ/location', $this->headers());
        $res2->assertStatus(200);
        $res2->assertJsonPath('data.currentLocation', 'C1-R9');

        $res3 = $this->getJson('/api/v1/pos/bags/NONE', $this->headers());
        $res3->assertStatus(404);
        $res3->assertJsonPath('errorCode', 'BAG_NOT_FOUND');
    }

    public function test_request_id_preserved(): void
    {
        $headers = $this->headers();
        $headers['X-Request-Id'] = 'REQ-UNIQUE-123';

        $res = $this->postJson('/api/v1/pos/storage-assignments', [
            'batchNo' => 'ST-REQ-001',
            'items' => [['voucherNo' => 'PV-1', 'voucherDate' => '2026-09-20', 'bagNo' => 'BAG-R1', 'location' => 'C1-R1']],
        ], $headers);

        $res->assertStatus(201)->assertJsonPath('data.requestId', 'REQ-UNIQUE-123');
        $this->assertDatabaseHas('storage_batches', ['batch_no' => 'ST-REQ-001', 'request_id' => 'REQ-UNIQUE-123']);
    }
}
