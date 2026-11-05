<?php

namespace App\Services\Locker;

use App\Models\IntegrationSetting;

/**
 * Resolves the effective Locker connection settings.
 *
 * Values saved from the admin Settings page (integration_settings) take
 * precedence over .env so the UI is the single source of truth at runtime.
 * .env remains the fallback for fresh installs / first boot.
 */
class LockerConfig
{
    public static function baseUrl(): string
    {
        $url = trim((string) IntegrationSetting::get('locker_api_url', ''));

        if ($url === '') {
            $url = (string) config('integration.locker.api_url', '');
        }

        return rtrim($url, '/');
    }

    public static function token(): string
    {
        $token = trim((string) IntegrationSetting::get('locker_api_token', ''));

        if ($token === '') {
            $token = (string) config('integration.locker.api_token', '');
        }

        return $token;
    }

    public static function urlSource(): string
    {
        return trim((string) IntegrationSetting::get('locker_api_url', '')) !== '' ? 'database' : 'env';
    }

    public static function tokenSource(): string
    {
        if (trim((string) IntegrationSetting::get('locker_api_token', '')) !== '') {
            return 'database';
        }

        return (string) config('integration.locker.api_token') !== '' ? 'env' : 'none';
    }

    public static function timeout(): int
    {
        return (int) (IntegrationSetting::get('request_timeout') ?: config('integration.request_timeout', 15));
    }

    public static function retryAttempts(): int
    {
        return (int) (IntegrationSetting::get('retry_attempts') ?: config('integration.retry_attempts', 3));
    }

    public static function retryDelay(): int
    {
        return (int) (IntegrationSetting::get('retry_delay') ?: config('integration.retry_delay', 5));
    }

    /**
     * Path prefix of the configured base URL, e.g. "/api/integration/v1.1".
     * Used for accurate integration-log endpoints.
     */
    public static function pathPrefix(): string
    {
        $path = parse_url(static::baseUrl(), PHP_URL_PATH);

        return is_string($path) ? rtrim($path, '/') : '';
    }
}
