import { Head, Link, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function IntegrationLogsIndex({
    logs,
    filters,
}: {
    logs: { data: Array<{ id: number; direction: string; system: string; endpoint: string; request_id: string | null; event_id: string | null; http_status: number | null; status: string | null; error_message: string | null; created_at: string }>; links: Array<{ url: string | null; label: string; active: boolean }> };
    filters: Record<string, string | undefined>;
}) {
    const [direction, setDirection] = useState(filters.direction || 'all');
    const [system, setSystem] = useState(filters.system || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [requestId, setRequestId] = useState(filters.request_id || '');
    const [eventId, setEventId] = useState(filters.event_id || '');

    const apply = () =>
        router.get(
            '/admin/integration-logs',
            {
                direction: direction === 'all' ? undefined : direction,
                system: system === 'all' ? undefined : system,
                status: status === 'all' ? undefined : status,
                request_id: requestId || undefined,
                event_id: eventId || undefined,
            },
            { preserveState: true, replace: true },
        );

    return (
        <>
            <Head title="Activity history" />
            <div className="p-4 space-y-4">
                <div>
                    <h1 className="text-xl font-semibold">Activity history</h1>
                    <p className="text-sm text-muted-foreground">Every message between this app and the locker, newest first. Useful when something looks wrong.</p>
                </div>
                <Card>
                    <CardContent className="grid md:grid-cols-5 gap-2 p-4">
                        <Select value={direction} onValueChange={setDirection}>
                            <SelectTrigger><SelectValue placeholder="All activity" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All activity</SelectItem>
                                <SelectItem value="POS_TO_APP">Shop → App</SelectItem>
                                <SelectItem value="APP_TO_LOCKER">App → Locker</SelectItem>
                                <SelectItem value="LOCKER_TO_APP">Locker → App</SelectItem>
                                <SelectItem value="APP_TO_POS">App → Shop</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger><SelectValue placeholder="All results" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All results</SelectItem>
                                <SelectItem value="SUCCESS">Worked</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                                <SelectItem value="RETRYING">Retrying</SelectItem>
                                <SelectItem value="DUPLICATE">Already done</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input placeholder="Search list or bag..." value={requestId} onChange={(e) => setRequestId(e.target.value)} />
                        <Input placeholder="Search move..." value={eventId} onChange={(e) => setEventId(e.target.value)} />
                        <Button onClick={apply} variant="secondary" className="md:col-span-5">Search history</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-muted-foreground">
                                    <tr><th className="p-3 text-left">When</th><th className="p-3">What happened</th><th className="p-3">Result</th><th className="p-3">Detail</th></tr>
                                </thead>
                                <tbody>
                                    {logs.data.map((l) => (
                                        <tr key={l.id} className="border-b hover:bg-muted/50">
                                            <td className="p-3 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                                            <td className="p-3 text-xs">{l.direction === 'APP_TO_LOCKER' ? 'Sent to locker' : l.direction === 'LOCKER_TO_APP' ? 'Heard from locker' : l.direction === 'POS_TO_APP' ? 'Received from shop' : l.direction?.replaceAll('_', ' → ')}</td>
                                            <td className="p-3 text-center"><Badge variant={l.status === 'SUCCESS' ? 'default' : l.status === 'FAILED' ? 'destructive' : 'outline'}>{l.status === 'SUCCESS' ? 'Worked' : l.status === 'FAILED' ? 'Failed' : l.status || '-'}</Badge></td>
                                            <td className="p-3"><Link href={`/admin/integration-logs/${l.id}`} className="underline text-xs">Open</Link></td>
                                        </tr>
                                    ))}
                                    {logs.data.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nothing here yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-1 p-3 flex-wrap">
                            {logs.links.map((l, i) => (
                                <Button key={i} variant={l.active ? 'default' : 'outline'} size="sm" disabled={!l.url} onClick={() => l.url && router.visit(l.url)} dangerouslySetInnerHTML={{ __html: l.label }} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground">Passwords and keys are never stored here.</p>
            </div>
        </>
    );
}

IntegrationLogsIndex.layout = { breadcrumbs: [{ title: 'Integration Logs', href: '/admin/integration-logs' }] } as const;
