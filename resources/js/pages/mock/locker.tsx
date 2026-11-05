import { Head, router, useForm } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function MockLocker({
    bags,
    logs,
    approvedLocations,
    lockerApiUrl,
    gatewayUrl,
}: {
    bags: Array<{ id: number; bag_no: string; voucher_no: string; location: string; drawer_code: string | null; status: string; batch_no: string | null; updated_at: string }>;
    logs: Array<{ id: number; direction: string; endpoint: string; http_status: number | null; status: string | null; payload: any; created_at: string }>;
    approvedLocations: string[];
    lockerApiUrl: string;
    gatewayUrl: string;
}) {
    const consolidateForm = useForm({ bagNo: '', newDrawerCode: 'D301', newLocation: 'D301' });
    const bagOutForm = useForm({ bagNo: '' });

    const handleConsolidate = (e: React.FormEvent) => {
        e.preventDefault();
        consolidateForm.post('/mock/locker/consolidate', { preserveScroll: true });
    };
    const handleBagOut = (e: React.FormEvent) => {
        e.preventDefault();
        bagOutForm.post('/mock/locker/bag-out', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Practice locker" />
            <div className="p-4 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold">Practice locker</h1>
                        <p className="text-sm text-muted-foreground">Try everything here safely — no real locker is touched.</p>
                    </div>
                    <Badge variant="secondary">Practice mode</Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Move a bag (tidy up)</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleConsolidate} className="space-y-3">
                                <div>
                                    <Label>Bag *</Label>
                                    <Input value={consolidateForm.data.bagNo} onChange={(e) => consolidateForm.setData('bagNo', e.target.value)} placeholder="e.g. BAG-001" list="baglist" />
                                    <datalist id="baglist">
                                        {bags.map((b) => <option key={b.id} value={b.bag_no} />)}
                                    </datalist>
                                    {consolidateForm.errors.bagNo && <div className="text-xs text-red-600">{consolidateForm.errors.bagNo}</div>}
                                </div>
                                <div>
                                    <Label>Move to drawer *</Label>
                                    <Select value={consolidateForm.data.newDrawerCode} onValueChange={(v) => { consolidateForm.setData('newDrawerCode', v); consolidateForm.setData('newLocation', v); }}>
                                        <SelectTrigger><SelectValue placeholder="Pick a drawer" /></SelectTrigger>
                                        <SelectContent>
                                            {approvedLocations.filter((l) => l.startsWith('D')).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {consolidateForm.errors.newDrawerCode && <div className="text-xs text-red-600">{consolidateForm.errors.newDrawerCode}</div>}
                                </div>
                                <Button type="submit" disabled={consolidateForm.processing} size="sm">Move bag</Button>
                                <p className="text-xs text-muted-foreground">The bag list updates automatically, just like with the real locker.</p>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-sm">Hand a bag to a customer</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleBagOut} className="space-y-3">
                                <div>
                                    <Label>Bag *</Label>
                                    <Input value={bagOutForm.data.bagNo} onChange={(e) => bagOutForm.setData('bagNo', e.target.value)} placeholder="e.g. BAG-001" />
                                </div>
                                <Button type="submit" disabled={bagOutForm.processing} size="sm" variant="outline">Mark as collected</Button>
                                <p className="text-xs text-muted-foreground">Like scanning the pickup QR at the locker.</p>
                            </form>
                            <div className="mt-4 flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => router.post('/mock/locker/clear')}>Start over</Button>
                                <a href="/admin/bags"><Button variant="ghost" size="sm">See all bags →</Button></a>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle className="text-sm">Bags in the practice locker ({bags.length})</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-muted-foreground">
                                    <tr><th className="text-left p-2">Bag</th><th className="text-left p-2">Voucher</th><th className="p-2">Drawer</th><th className="p-2">State</th><th className="p-2">Try</th></tr>
                                </thead>
                                <tbody>
                                    {bags.map((b) => (
                                        <tr key={b.id} className="border-b hover:bg-muted/50">
                                            <td className="p-2 font-mono">{b.bag_no}</td>
                                            <td className="p-2 text-xs">{b.voucher_no}</td>
                                            <td className="p-2 text-center font-mono"><Badge variant="outline">{b.drawer_code || b.location}</Badge></td>
                                            <td className="p-2 text-center"><Badge variant={b.status === 'STORED' ? 'default' : b.status === 'OUT' ? 'destructive' : 'secondary'}>{b.status === 'STORED' ? 'Inside' : b.status === 'OUT' ? 'Collected' : b.status}</Badge></td>
                                            <td className="p-2 flex gap-1 justify-center">
                                                <Button size="sm" variant="ghost" onClick={() => consolidateForm.setData({ bagNo: b.bag_no, newDrawerCode: 'D301', newLocation: 'D301' })}>Move → D301</Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {bags.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No bags here yet. Store some from the Store Bags page first.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-sm">What just happened (last 20)</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="border-b text-muted-foreground">
                                    <tr><th className="p-2 text-left">Time</th><th className="p-2">Dir</th><th className="p-2 text-left">Endpoint</th><th className="p-2">HTTP</th><th className="p-2">Status</th><th className="p-2 text-left">Payload</th></tr>
                                </thead>
                                <tbody>
                                    {logs.map((l) => (
                                        <tr key={l.id} className="border-b">
                                            <td className="p-2">{new Date(l.created_at).toLocaleString()}</td>
                                            <td className="p-2"><Badge variant="outline">{l.direction}</Badge></td>
                                            <td className="p-2 font-mono">{l.endpoint}</td>
                                            <td className="p-2 text-center">{l.http_status ?? '-'}</td>
                                            <td className="p-2 text-center"><Badge variant={l.status === 'SUCCESS' ? 'default' : l.status === 'REJECTED' ? 'destructive' : 'outline'}>{l.status || '-'}</Badge></td>
                                            <td className="p-2 font-mono max-w-[300px] truncate">{JSON.stringify(l.payload)}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No logs</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

MockLocker.layout = { breadcrumbs: [{ title: 'Mock Locker', href: '/mock/locker' }] } as const;
