import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function IntegrationLogShow({
    log,
}: {
    log: { id: number; direction: string; system: string; endpoint: string; request_id: string | null; event_id: string | null; http_status: number | null; status: string | null; request_body: unknown; response_body: unknown; error_message: string | null; created_at: string };
}) {
    return (
        <>
            <Head title={`Log #${log.id}`} />
            <div className="p-4 space-y-4">
                <Link href="/admin/integration-logs" className="text-sm underline">← Back to logs</Link>
                <h1 className="text-xl font-semibold">Log #{log.id} — {log.direction}</h1>
                <Card>
                    <CardContent className="grid md:grid-cols-3 gap-4 p-4 text-sm">
                        <div><div className="text-muted-foreground">Direction</div><Badge variant="outline">{log.direction}</Badge></div>
                        <div><div className="text-muted-foreground">System</div><Badge variant="secondary">{log.system}</Badge></div>
                        <div><div className="text-muted-foreground">HTTP</div>{log.http_status ?? '-'} <Badge variant={log.status === 'SUCCESS' ? 'default' : log.status === 'FAILED' ? 'destructive' : 'outline'}>{log.status || '-'}</Badge></div>
                        <div><div className="text-muted-foreground">Endpoint</div><div className="font-mono text-xs">{log.endpoint}</div></div>
                        <div><div className="text-muted-foreground">Request ID</div><div className="font-mono text-xs">{log.request_id || '-'}</div></div>
                        <div><div className="text-muted-foreground">Event ID</div><div className="font-mono text-xs">{log.event_id || '-'}</div></div>
                        <div className="md:col-span-3"><div className="text-muted-foreground">Time</div>{new Date(log.created_at).toLocaleString()}</div>
                        {log.error_message && <div className="md:col-span-3"><div className="text-muted-foreground">Error</div><div className="text-red-600 text-xs">{log.error_message}</div></div>}
                    </CardContent>
                </Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Request Body</CardTitle></CardHeader>
                        <CardContent><pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{JSON.stringify(log.request_body, null, 2) || '-'}</pre></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Response Body</CardTitle></CardHeader>
                        <CardContent><pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{JSON.stringify(log.response_body, null, 2) || '-'}</pre></CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

IntegrationLogShow.layout = { breadcrumbs: [{ title: 'Integration Logs', href: '/admin/integration-logs' }, { title: 'Detail', href: '#' }] } as const;
