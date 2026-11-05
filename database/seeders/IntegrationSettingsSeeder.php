<?php

namespace Database\Seeders;

use App\Models\IntegrationSetting;
use Illuminate\Database\Seeder;

class IntegrationSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            ['key' => 'pos_api_url', 'value' => config('integration.pos.api_url'), 'description' => 'POS base API URL (LAN configurable)'],
            ['key' => 'pos_location_endpoint', 'value' => config('integration.pos.location_endpoint'), 'description' => 'POS location update endpoint template, e.g. /bags/{bagNo}/location'],
            ['key' => 'locker_api_url', 'value' => config('integration.locker.api_url'), 'description' => 'Locker integration API base URL (LAN configurable)'],
            ['key' => 'request_timeout', 'value' => (string) config('integration.request_timeout'), 'description' => 'Integration HTTP timeout seconds'],
            ['key' => 'retry_attempts', 'value' => (string) config('integration.retry_attempts'), 'description' => 'Max retry attempts for Locker/POS sync'],
            ['key' => 'retry_delay', 'value' => (string) config('integration.retry_delay'), 'description' => 'Retry delay seconds'],
        ];

        foreach ($defaults as $row) {
            IntegrationSetting::updateOrCreate(['key' => $row['key']], $row);
        }
    }
}
