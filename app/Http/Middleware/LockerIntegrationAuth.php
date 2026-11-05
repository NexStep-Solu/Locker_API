<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LockerIntegrationAuth
{
    /**
     * Authenticate Locker → Integration App requests.
     *
     * Locker must send: Authorization: Bearer {LOCKER_API_TOKEN}
     * Separate from POS token (spec §10, §38).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        // Same effective token as outbound calls (Settings page wins, .env fallback).
        $expected = \App\Services\Locker\LockerConfig::token();

        if (empty($expected)) {
            if (app()->environment('production')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Locker integration not configured',
                    'errorCode' => 'INTEGRATION_AUTH_FAILED',
                ], 500);
            }

            return $next($request);
        }

        if (! hash_equals((string) $expected, (string) $token)) {
            return response()->json([
                'success' => false,
                'message' => 'Locker authentication failed',
                'errorCode' => 'INTEGRATION_AUTH_FAILED',
            ], 401);
        }

        return $next($request);
    }
}
