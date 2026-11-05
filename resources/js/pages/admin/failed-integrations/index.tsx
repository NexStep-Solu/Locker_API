import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { router } from '@inertiajs/react';

export default function FailedIntegrationsIndex({
    logs,
    failedBatches,
}: {
    logs: { data: Array<{ id: number; direction: string; endpoint: string; http_status: number | null; error_message: string | null; created_at: string }>; links: Array<{ url: string | null; label: string; active: boolean }> };
    failedBatches: Array<{ id: number; batch_no: string; total: number; status: string; created_at: string }>;
}) {
    return (
        <>
            <Head title="Needs attention" />
            <div className="p-4 space-y-4">
                <div>
                    <h1 className="text-xl font-semibold">Needs attention</h1>
                    <p className="text-sm text-muted-foreground">These lists did not fully reach the locker. Open one and try again.</p>
                </div>
                <Card>
                    <CardHeader><CardTitle className="text-sm">Lists to fix</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-muted-foreground"><tr><th className="text-left p-2">List</th><th className="p-2">Bags</th><th className="p-2">What next</th></tr></thead>
                                <tbody>
                                    {failedBatches.map((b) => (
                                        <tr key={b.id} className="border-b">
                                            <td className="p-2 font-mono"><Link href={`/admin/storage-batches/${b.id}`} className="underline">{b.batch_no}</Link></td>
                                            <td className="p-2 text-center">{b.total}</td>
                                            <td className="p-2 text-center"><Button size="sm" variant="outline" onClick={() => router.post(`/admin/storage-batches/${b.id}/retry`)}>Try again</Button></td>
                                        </tr>
                                    ))}
                                    {failedBatches.length === 0 && <tr><td colSpan={3} className="p-6 text-center"><p className="text-muted-foreground">All good — nothing needs fixing. 🎉</p></td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm">Recent problems</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-muted-foreground"><tr><th className="p-3 text-left">When</th><th className="p-3 text-left">What happened</th></tr></thead>
                                <tbody>
                                    {logs.data.map((l) => (
                                        <tr key={l.id} className="border-b">
                                            <td className="p-3 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                                            <td className="p-3 text-xs text-red-600 truncate max-w-[300px]">{l.error_message || 'Something went wrong — open the list above and try again.'}</td>
                                        </tr>
                                    ))}
                                    {logs.data.length === 0 && <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">No problems recorded.</td></tr>}
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
            </div>
        </>
    );
}

FailedIntegrationsIndex.layout = { breadcrumbs: [{ title: 'Failed Integrations', href: '/admin/failed-integrations' }] } as const;
