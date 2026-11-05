<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IntegrationSetting;
use App\Services\Locker\LockerConfig;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index()
    {
        // Never send the raw token to the browser.
        $settings = IntegrationSetting::all()->keyBy('key')->except(['locker_api_token']);

        $rawToken = LockerConfig::token();
        $maskedToken = '';
        if ($rawToken !== '') {
            $maskedToken = substr($rawToken, 0, 4).str_repeat('•', max(0, min(strlen($rawToken) - 4, 12)));
        }

        return Inertia::render('admin/settings/index', [
            'settings' => $settings,
            'config' => [
                'locker_api_url' => LockerConfig::baseUrl(),
                'locker_api_url_source' => LockerConfig::urlSource(),
                'locker_api_token_masked' => $maskedToken,
                'has_locker_token' => $rawToken !== '',
                'locker_token_source' => LockerConfig::tokenSource(),
                'locker_token_length' => strlen($rawToken),
                'request_timeout' => LockerConfig::timeout(),
                'retry_attempts' => LockerConfig::retryAttempts(),
                'retry_delay' => LockerConfig::retryDelay(),
                'queue_connection' => config('queue.default'),
                'app_url' => config('app.url'),
                'app_env' => config('app.env'),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'locker_api_url' => ['nullable', 'string', 'url'],
            'locker_api_token' => ['nullable', 'string', 'max:500'],
            'request_timeout' => ['nullable', 'integer', 'min:1', 'max:120'],
            'retry_attempts' => ['nullable', 'integer', 'min:1', 'max:10'],
            'retry_delay' => ['nullable', 'integer', 'min:1', 'max:60'],
        ]);

        foreach ($validated as $key => $value) {
            if ($value !== null && $value !== '') {
                $store = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
                IntegrationSetting::updateOrCreate(['key' => $key], ['value' => $store]);
            }
        }

        return back()->with('success', 'Settings updated. Locker token is stored server-side only and never logged.');
    }
}
