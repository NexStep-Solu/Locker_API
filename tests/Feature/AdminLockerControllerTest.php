<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Locker\LockerApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminLockerControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_drawers_returns_502_when_locker_is_unreachable(): void
    {
        $this->mock(LockerApiService::class, function ($mock) {
            $mock->shouldReceive('getDrawers')->once()->andReturn([
                'httpStatus' => 0,
                'body' => [],
                'success' => false,
                'drawers' => [],
                'error' => 'Connection refused',
            ]);
        });

        $this->actingAs(User::factory()->create())
            ->getJson('/admin/locker/drawers?available=false')
            ->assertStatus(502)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errorCode', 'LOCKER_UNAVAILABLE')
            ->assertJsonPath('message', 'Connection refused');
    }

    public function test_bag_query_returns_502_when_locker_is_unreachable(): void
    {
        $this->mock(LockerApiService::class, function ($mock) {
            $mock->shouldReceive('queryBags')->once()->andReturn([
                'httpStatus' => 0,
                'body' => [],
                'success' => false,
                'error' => 'Connection refused',
            ]);
        });

        $this->actingAs(User::factory()->create())
            ->postJson('/admin/locker/bags/query', ['bagNos' => ['BAG-001']])
            ->assertStatus(502)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errorCode', 'LOCKER_UNAVAILABLE')
            ->assertJsonPath('message', 'Connection refused');
    }
}
