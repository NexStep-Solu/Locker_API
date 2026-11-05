<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PosIntegrationAuth
{
    /**
     * Authenticate POS → Integration App requests.
     *
     * POS must send: Authorization: Bearer {POS_API_TOKEN}
     * Do not use Locker token for POS auth (spec §15).
     */
    public function handle(Request $request, Closure $next): Response
    {
        // POS auth can be disabled from .env (POS_AUTH_ENABLED=false) for
        // trusted LAN setups that cannot send an Authorization header.
        if (! config('integration.pos.auth_enabled', true)) {
            return $next($request);
        }

        $token = $request->bearerToken();
        $expected = config('integration.pos.api_token');

        // Allow local dev bypass when no token configured and APP_ENV=local/testing
        // In production, missing token should fail closed.
        if (empty($expected)) {
            if (app()->environment('production')) {
                return response()->json([
                    'success' => false,
                    'message' => 'POS integration not configured',
                    'errorCode' => 'INTEGRATION_AUTH_FAILED',
                ], 500);
            }
            // In non-production without token, allow through for development/testing
            return $next($request);
        }

        if (! hash_equals((string) $expected, (string) $token)) {
            return response()->json([
                'success' => false,
                'message' => 'POS authentication failed',
                'errorCode' => 'INTEGRATION_AUTH_FAILED',
            ], 401);
        }

        return $next($request);
    }
}
