<?php

return [

    /*
    |--------------------------------------------------------------------------
    | POS Integration — Pure Offline Windows App (no network)
    |--------------------------------------------------------------------------
    |
    | Legacy POS is pure C# core with no API. Gateway acts as manual
    | Locker-API front-end (input/scan → Locker). No POS_API_URL sync.
    | Kept for backward compat but disabled by default (offline).
    |
    */

    'pos' => [
        'api_url' => env('POS_API_URL'), // null when offline (pure C# core)
        'api_token' => env('POS_API_TOKEN'),
        'auth_enabled' => filter_var(env('POS_AUTH_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
        'location_endpoint' => env('POS_LOCATION_UPDATE_ENDPOINT', '/bags/{bagNo}/location'),
        'sync_enabled' => filter_var(env('POS_SYNC_ENABLED', false), FILTER_VALIDATE_BOOLEAN) && ! empty(env('POS_API_URL')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Locker Integration
    |--------------------------------------------------------------------------
    |
    | Configuration for Integration App → Locker and Locker → App.
    | Locker owns physical locker operations and current physical location.
    |
    */

    'locker' => [
        'api_url' => env('LOCKER_API_URL', 'http://192.168.1.25:3001/api/integration/v1.1'),
        'api_token' => env('LOCKER_API_TOKEN'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Integration HTTP Settings
    |--------------------------------------------------------------------------
    */

    'request_timeout' => (int) env('INTEGRATION_REQUEST_TIMEOUT', 15),
    'retry_attempts' => (int) env('INTEGRATION_RETRY_ATTEMPTS', 3),
    'retry_delay' => (int) env('INTEGRATION_RETRY_DELAY', 5),

];
