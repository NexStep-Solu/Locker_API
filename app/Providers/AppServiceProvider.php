<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Dedoc\Scramble\Scramble;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerApiDocs();
    }

    protected function registerApiDocs(): void
    {
        // POS → App: shop operators / POS vendor integration
        Scramble::registerApi('pos', [
            'info' => [
                'version' => env('API_VERSION', '1.0.0'),
                'description' => 'POS → Gateway: send store-bag lists and look up where bags are. Base URL ends with /api. Auth: Bearer {POS_API_TOKEN}. Pure offline shop computers can use the web UI instead.',
            ],
            'ui' => ['title' => 'POS API — Store & Find Bags'],
        ])
            ->routes(fn (Route $route) => Str::startsWith($route->uri, 'api/v1/pos'))
            ->expose(
                ui: fn ($router, $action) => $router->get('docs/pos', $action)->name('scramble.docs.ui.pos'),
                document: fn ($router, $action) => $router->get('docs/pos.json', $action)->name('scramble.docs.document.pos'),
            );

        // Locker → App callbacks: what the locker machine sends us
        Scramble::registerApi('locker', [
            'info' => [
                'version' => env('API_VERSION', '1.0.0'),
                'description' => 'Locker → Gateway callbacks: the locker machine tells us when a bag moved drawers (consolidation). Auth: Bearer {LOCKER_API_TOKEN}. Events are idempotent by eventId; duplicates return 200.',
            ],
            'ui' => ['title' => 'Locker API — Bag Move Callbacks'],
        ])
            ->routes(fn (Route $route) => Str::startsWith($route->uri, 'api/locker-integration'))
            ->expose(
                ui: fn ($router, $action) => $router->get('docs/locker', $action)->name('scramble.docs.ui.locker'),
                document: fn ($router, $action) => $router->get('docs/locker.json', $action)->name('scramble.docs.document.locker'),
            );
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
