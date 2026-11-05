import { Head, useForm } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function SettingsIndex({
    settings,
    config,
}: {
    settings: Record<string, { key: string; value: string; description: string | null }>;
    config: Record<string, string | number | null>;
}) {
    const { data, setData, put, processing, errors } = useForm({
        locker_api_url: (config.locker_api_url as string) || (settings.locker_api_url?.value as string) || '',
        locker_api_token: '',
        request_timeout: String(config.request_timeout ?? '15'),
        retry_attempts: String(config.retry_attempts ?? '3'),
        retry_delay: String(config.retry_delay ?? '5'),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/admin/settings');
    };

    const [testState, setTestState] = useState<{ ok: boolean; msg: string } | null>(null);
    const [testing, setTesting] = useState(false);
    const testConnection = async () => {
        setTesting(true);
        setTestState(null);
        try {
            // Test through the server-side proxy so the saved token is used and
            // the browser never needs direct access to the Locker machine.
            const r = await fetch('/admin/locker/drawers?available=true', { headers: { Accept: 'application/json' } });
            const j = await r.json().catch(() => null);
            if (r.ok && (j?.success || j?.data)) {
                const n = j?.data?.drawers?.length ?? j?.drawers?.length ?? '?';
                setTestState({ ok: true, msg: `Connected — Locker responded 200, ${n} drawers returned.` });
            } else {
                setTestState({ ok: false, msg: `Failed (${r.status}) — ${j?.message || 'check token / Locker address'}` });
            }
        } catch (e: any) {
            setTestState({ ok: false, msg: `Error — ${String(e?.message || e)}` });
        } finally {
            setTesting(false);
        }
    };

    return (
        <>
            <Head title="Settings" />
            <div className="p-4 space-y-4 max-w-3xl">
                <div>
                    <h1 className="text-xl font-semibold">Settings</h1>
                    <p className="text-sm text-muted-foreground">Connect to your locker machine and tune how sending works. You only need to do this once.</p>
                </div>
                {(config as any).has_locker_token ? (
                    <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        <Badge variant="default">Token Configured</Badge>
                        <span className="font-mono">{(config as any).locker_api_token_masked}</span>
                        <span className="text-muted-foreground">({(config as any).locker_token_length} chars, from {(config as any).locker_token_source === 'env' ? '.env LOCKER_API_TOKEN' : 'database settings'}) — leave blank to keep existing.</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <Badge variant="destructive">No Token</Badge>
                        <span>No locker token saved yet — paste it below and Save. Locker APIs (drawers, batch, bags) will fail with 401 until set.</span>
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Step 1 — Connect to the locker</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label>Where is the locker machine?</Label>
                                <Input value={data.locker_api_url} onChange={(e) => setData('locker_api_url', e.target.value)} placeholder="e.g. http://192.168.1.33:3001/api/..." />
                                {errors.locker_api_url && <div className="text-xs text-red-600">{errors.locker_api_url}</div>}
                                <div className="text-xs text-muted-foreground">
                                    Ask your locker installer for this address. For practice mode, use the Mock Locker page instead.
                                    {' '}Currently using the value from {(config as any).locker_api_url_source === 'database' ? 'these settings' : '.env (no saved value)'}.
                                </div>
                            </div>
                            <div>
                                <Label>Locker password (token)</Label>
                                <Input type="password" value={data.locker_api_token} onChange={(e) => setData('locker_api_token', e.target.value)} placeholder={ (config as any).has_locker_token ? '•••••••• (leave blank to keep the saved one)' : 'Paste the password from your locker installer'} />
                                {errors.locker_api_token && <div className="text-xs text-red-600">{errors.locker_api_token}</div>}
                                <div className="text-xs text-muted-foreground">Kept safely on this computer, never shown to anyone else.</div>
                                {(config as any).has_locker_token && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <Button type="button" variant="outline" size="sm" onClick={testConnection} disabled={testing}>
                                            {testing ? 'Testing…' : 'Test Locker Connection'}
                                        </Button>
                                        {testState && (
                                            <span className={testState.ok ? 'text-xs text-emerald-600' : 'text-xs text-red-600'}>{testState.msg}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-sm">Step 2 — How patient should sending be?</CardTitle></CardHeader>
                        <CardContent className="grid md:grid-cols-3 gap-3">
                            <div>
                                <Label>Wait per try (seconds)</Label>
                                <Input type="number" value={data.request_timeout} onChange={(e) => setData('request_timeout', e.target.value)} />
                                {errors.request_timeout && <div className="text-xs text-red-600">{errors.request_timeout}</div>}
                            </div>
                            <div>
                                <Label>How many tries</Label>
                                <Input type="number" value={data.retry_attempts} onChange={(e) => setData('retry_attempts', e.target.value)} />
                                {errors.retry_attempts && <div className="text-xs text-red-600">{errors.retry_attempts}</div>}
                            </div>
                            <div>
                                <Label>Pause between tries (seconds)</Label>
                                <Input type="number" value={data.retry_delay} onChange={(e) => setData('retry_delay', e.target.value)} />
                                {errors.retry_delay && <div className="text-xs text-red-600">{errors.retry_delay}</div>}
                            </div>
                        </CardContent>
                    </Card>

                    <Button type="submit" disabled={processing}>{processing ? 'Saving…' : 'Save settings'}</Button>
                </form>
            </div>
        </>
    );
}

SettingsIndex.layout = { breadcrumbs: [{ title: 'Settings', href: '/admin/settings' }] } as const;
