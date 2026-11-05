import { Head } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export default function SystemStatusIndex({
    status,
}: {
    status: {
        app: boolean;
        database: { healthy: boolean | null; message: string; pending?: number; failed?: number };
        queue: { healthy: boolean | null; message: string; pending?: number; failed?: number };
        pos: { healthy: boolean | null; message: string; url?: string };
        locker: { healthy: boolean | null; message: string; url?: string };
        timestamp: string;
    };
}) {
    const [checking, setChecking] = useState(false);
    const [live, setLive] = useState(status);

    const check = async () => {
        setChecking(true);
        try {
            const res = await fetch('/admin/system-status/check');
            const json = await res.json();
            // merge with existing messages? For simplicity reload page
            window.location.reload();
        } finally {
            setChecking(false);
        }
    };

    const dot = (healthy: boolean | null) => healthy === null ? 'bg-gray-400' : healthy ? 'bg-emerald-500' : 'bg-red-500';
    const label = (healthy: boolean | null) => healthy === null ? 'Unknown' : healthy ? 'Healthy' : 'Unhealthy';

    return (
        <>
            <Head title="System health" />
            <div className="p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold">Is everything working?</h1>
                        <p className="text-sm text-muted-foreground">Green means good. If the locker shows red, check Settings → locker connection.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={check} disabled={checking}>{checking ? 'Checking…' : 'Check again'}</Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle className="text-sm">This app</CardTitle></CardHeader>
                        <CardContent className="flex items-center justify-between text-sm">
                            <span>App</span><span className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${dot(true)}`} /> Working</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Saved records</CardTitle></CardHeader>
                        <CardContent className="flex items-center justify-between text-sm">
                            <span>Records</span><span className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${dot(live.database.healthy)}`} /> {label(live.database.healthy) === 'Healthy' ? 'Working' : label(live.database.healthy)}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Background sending</CardTitle></CardHeader>
                        <CardContent className="flex items-center justify-between text-sm">
                            <span>Sending</span><span className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${dot(live.queue.healthy)}`} /> {label(live.queue.healthy) === 'Healthy' ? 'Running' : label(live.queue.healthy)}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Locker machine</CardTitle></CardHeader>
                        <CardContent className="flex items-center justify-between text-sm">
                            <span>Locker</span><span className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${dot(live.locker.healthy)}`} /> {label(live.locker.healthy) === 'Unknown' ? 'Not checked yet' : label(live.locker.healthy)}</span>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

SystemStatusIndex.layout = { breadcrumbs: [{ title: 'System Status', href: '/admin/system-status' }] } as const;
