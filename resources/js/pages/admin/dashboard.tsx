import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import { Activity, Boxes, Package, TriangleAlert } from 'lucide-react';

type Metrics = {
    posConnected: boolean | null;
    lockerConnected: boolean | null;
    storageToday: { batches: number; bags: number; accepted: number; rejected: number };
    locationUpdates: { received: number };
    failedRequests: number;
    failedBatches: number;
};

const friendlyStatus = (s: string) => {
    switch (s) {
        case 'COMPLETED': return 'Stored';
        case 'PARTIAL': return 'Partly stored';
        case 'FAILED': return 'Needs attention';
        case 'PENDING': return 'Waiting';
        case 'PROCESSING': return 'Sending…';
        case 'RETRYING': return 'Retrying…';
        case 'PROCESSED': return 'Done';
        case 'DUPLICATE': return 'Already done';
        default: return s;
    }
};

export default function AdminDashboard({
    metrics,
    recentBatches,
    recentEvents,
}: {
    metrics: Metrics;
    recentBatches: Array<{ id: number; batch_no: string; total: number; accepted: number; rejected: number; status: string; created_at: string }>;
    recentEvents: Array<{ id: number; event_id: string; bag_no: string; old_location: string | null; new_location: string | null; old_drawer_code: string | null; new_drawer_code: string | null; movement_type: string; status: string; created_at: string }>;
}) {
    const lockerOk = metrics.lockerConnected;
    const lockerText = lockerOk === null ? 'Not checked yet' : lockerOk ? 'Connected' : 'Not reachable';
    const lockerColor = lockerOk === null ? 'bg-gray-400' : lockerOk ? 'bg-emerald-500' : 'bg-red-500';

    return (
        <>
            <Head title="Home" />
            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Today at a glance</h1>
                        <p className="text-sm text-muted-foreground">See what was stored, what moved, and what needs your attention.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin/storage-batches/create"><Button size="sm">Store new bags</Button></Link>
                        <Badge variant="outline" className="text-xs self-center">{new Date().toLocaleDateString()}</Badge>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Activity className="size-4" /> System health
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span>Shop computer (POS)</span>
                                <span className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full bg-gray-400" />
                                    Offline mode
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Locker machine</span>
                                <span className="flex items-center gap-2">
                                    <span className={`size-2.5 rounded-full ${lockerColor}`} />
                                    {lockerText}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Records (database)</span>
                                <span className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full bg-emerald-500" /> Working
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Background sending</span>
                                <span className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full bg-emerald-500" /> Running
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Package className="size-4" /> Stored today
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold">{metrics.storageToday.batches}</div>
                                    <div className="text-xs text-muted-foreground">Lists sent</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{metrics.storageToday.bags}</div>
                                    <div className="text-xs text-muted-foreground">Bags</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-emerald-600">{metrics.storageToday.accepted}</div>
                                    <div className="text-xs text-muted-foreground">Stored OK</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-red-600">{metrics.storageToday.rejected}</div>
                                    <div className="text-xs text-muted-foreground">Need fix</div>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-4">
                                <Link href="/admin/storage-batches" className="text-xs underline">See all lists →</Link>
                                <Link href="/admin/bags" className="text-xs underline">See all bags →</Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Boxes className="size-4" /> Bags moved by locker staff
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Bags moved today</span><span className="font-mono">{metrics.locationUpdates.received}</span></div>
                            <div className="flex justify-between"><span>Problems today</span><span className="font-mono text-red-600">{metrics.failedRequests}</span></div>
                            <p className="text-xs text-muted-foreground">When locker staff move a bag to a different drawer, it shows up here automatically.</p>
                            <Link href="/admin/location-updates" className="text-xs underline block mt-2">See moves →</Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TriangleAlert className="size-4" /> Needs your attention
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Lists that failed</span><span className="font-mono text-red-600">{metrics.failedBatches}</span></div>
                            <div className="flex justify-between"><span>Errors today</span><span className="font-mono">{metrics.failedRequests}</span></div>
                            <Link href="/admin/failed-integrations" className="text-xs underline block mt-2">Fix problems →</Link>
                            <Link href="/admin/integration-logs" className="text-xs underline block">See full history →</Link>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Latest lists</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-muted-foreground border-b">
                                        <tr><th className="text-left p-2">List</th><th className="p-2">Bags</th><th className="p-2">Result</th><th className="p-2">When</th></tr>
                                    </thead>
                                    <tbody>
                                        {recentBatches.map((b) => (
                                            <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50">
                                                <td className="p-2 font-mono"><Link href={`/admin/storage-batches/${b.id}`} className="underline">{b.batch_no}</Link></td>
                                                <td className="p-2 text-center">{b.total}</td>
                                                <td className="p-2 text-center"><Badge variant={b.status === 'COMPLETED' ? 'default' : b.status === 'PARTIAL' ? 'secondary' : b.status === 'FAILED' ? 'destructive' : 'outline'}>{friendlyStatus(b.status)}</Badge></td>
                                                <td className="p-2 text-xs">{new Date(b.created_at).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {recentBatches.length === 0 && <tr><td colSpan={4} className="p-6 text-center"><p className="text-muted-foreground">No lists yet today.</p><Link href="/admin/storage-batches/create" className="text-xs underline">Store your first bags →</Link></td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-sm">Latest moves</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-muted-foreground border-b">
                                        <tr><th className="text-left p-2">Bag</th><th className="p-2">Moved</th><th className="p-2">Result</th></tr>
                                    </thead>
                                    <tbody>
                                        {recentEvents.map((e) => (
                                            <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                                                <td className="p-2 font-mono">{e.bag_no}</td>
                                                <td className="p-2 text-xs font-mono">{e.old_drawer_code || e.old_location} → {e.new_drawer_code || e.new_location}</td>
                                                <td className="p-2"><Badge variant={e.status === 'PROCESSED' ? 'default' : 'outline'}>{friendlyStatus(e.status)}</Badge></td>
                                            </tr>
                                        ))}
                                        {recentEvents.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No moves yet.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
} as const;
