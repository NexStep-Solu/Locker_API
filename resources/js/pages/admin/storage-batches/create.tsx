import { Head, Link, router, useForm } from '@inertiajs/react';
import { DrawerTag } from '@/components/drawer-tag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { friendlyLockerError } from '@/lib/locker-errors';
import { cn } from '@/lib/utils';
import {
    Archive,
    CheckCircle2,
    Info,
    ListChecks,
    Package,
    Plus,
    QrCode,
    RefreshCw,
    Scan,
    Trash2,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Item = {
    voucherNo: string;
    voucherDate: string;
    bagNo: string;
    drawerCode: string;
    location?: string;
};

type Drawer = {
    code: string;
    status: string;
    enabled: boolean;
    maintenance: boolean;
};

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function genBatchNo() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `ST-${y}${m}${day}-${rnd}`;
}

function parseQrText(text: string): Partial<Item> {
    const t = text.trim();
    if (t.startsWith('{')) {
        try {
            const j = JSON.parse(t);
            if (!j || typeof j !== 'object') return { bagNo: t };
            return {
                bagNo: j.bagNo || j.bag_no || '',
                voucherNo: j.voucherNo || j.voucher_no || '',
                drawerCode:
                    j.drawerCode || j.drawer_code || j.location || j.loc || '',
                voucherDate: j.voucherDate || j.voucher_date || todayStr(),
            };
        } catch {}
    }
    if (t.includes('|')) {
        const parts = t.split('|').map((p) => p.trim());
        if (parts.length === 3)
            return {
                bagNo: parts[0],
                voucherNo: parts[1],
                drawerCode: parts[2],
            };
        if (parts.length === 2)
            return { bagNo: parts[0], drawerCode: parts[1] };
        return { bagNo: parts[0] };
    }
    if (t.includes(',')) {
        const parts = t.split(',').map((p) => p.trim());
        if (parts.length >= 2)
            return {
                bagNo: parts[0],
                voucherNo: parts[1],
                drawerCode: parts[2] || '',
            };
    }
    if (/^BAG-[A-Za-z0-9\-_]+$/.test(t) || /^[A-Za-z0-9\-_]+$/.test(t)) {
        return { bagNo: t };
    }
    return { bagNo: t };
}

const zoneOf = (code: string): string => {
    const match = code.trim().match(/^([A-Za-z]+)/);
    return match ? match[1].toUpperCase() : 'Other';
};

function QrScanner({
    onResult,
    onClose,
}: {
    onResult: (text: string) => void;
    onClose: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(true);
    const [manual, setManual] = useState('');

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let raf: number | null = null;
        let detector: any = null;

        const start = async () => {
            try {
                // @ts-ignore BarcodeDetector may not exist
                if (
                    typeof window !== 'undefined' &&
                    'BarcodeDetector' in window
                ) {
                    // @ts-ignore
                    detector = new window.BarcodeDetector({
                        formats: ['qr_code'],
                    });
                }
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                const tick = async () => {
                    if (!scanning || !videoRef.current) return;
                    try {
                        if (detector && videoRef.current.readyState >= 2) {
                            const codes = await detector.detect(
                                videoRef.current,
                            );
                            if (codes.length > 0) {
                                onResult(codes[0].rawValue);
                                setScanning(false);
                                return;
                            }
                        }
                    } catch {}
                    raf = requestAnimationFrame(tick);
                };
                tick();
            } catch (e: any) {
                setError(
                    e?.message ||
                        'Camera not available — use the box below, or a USB scanner (it types like a keyboard).',
                );
            }
        };
        start();
        return () => {
            if (raf) cancelAnimationFrame(raf);
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, [scanning, onResult]);

    const useManual = () => {
        const value = manual.trim();
        if (value) onResult(value);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Scan a QR code"
                className="bg-card w-full max-w-md space-y-3 rounded-2xl border p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 font-semibold">
                            <QrCode className="size-4" aria-hidden />
                            Scan a QR code
                        </h3>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            Point the camera at the QR, or use a USB scanner.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={onClose}
                        aria-label="Close scanner"
                    >
                        <X className="size-4" aria-hidden />
                    </Button>
                </div>

                <div className="relative aspect-video overflow-hidden rounded-xl border bg-black">
                    <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 m-8 rounded-lg border-2 border-white/50 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]"
                    />
                </div>

                {error ? (
                    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                        <TriangleAlert
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden
                        />
                        {error}
                    </p>
                ) : (
                    <p className="text-muted-foreground text-xs">
                        Hold the QR steady in front of the camera. If it does
                        not scan, type or paste it below.
                    </p>
                )}

                <div className="flex gap-2">
                    <Input
                        id="qr-manual"
                        value={manual}
                        onChange={(e) => setManual(e.target.value)}
                        placeholder="Paste or scan text here"
                        aria-label="QR text"
                        className="font-mono text-xs"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                useManual();
                            }
                        }}
                    />
                    <Button
                        size="sm"
                        onClick={useManual}
                        disabled={!manual.trim()}
                    >
                        Use
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function CreateStorageBatch({
    lockerApi,
    posSyncEnabled,
}: {
    lockerApi: { url: string; timeout: number; retryAttempts: number };
    posSyncEnabled: boolean;
}) {
    const [drawers, setDrawers] = useState<Drawer[]>([]);
    const [drawersLoading, setDrawersLoading] = useState(false);
    const [drawersError, setDrawersError] = useState<string | null>(null);

    const loadDrawers = async () => {
        setDrawersLoading(true);
        setDrawersError(null);

        try {
            const r = await fetch('/admin/locker/drawers?available=true', {
                headers: { Accept: 'application/json' },
            });
            const j = await r.json().catch(() => null);

            if (j?.success === false) {
                setDrawers([]);
                setDrawersError(
                    friendlyLockerError(
                        j,
                        'Could not load free drawers. Type the drawer code manually.',
                    ),
                );
                return;
            }

            const list = j?.data?.drawers || j?.drawers || j?.data || [];

            if (Array.isArray(list)) {
                setDrawers(
                    list
                        .filter((d: any) => Boolean(d?.code))
                        .map((d: any) => ({
                            code: d.code,
                            status: d.status ?? 'available',
                            enabled: d.enabled !== false,
                            maintenance: d.maintenance === true,
                        }))
                        .filter(
                            (d: Drawer) =>
                                d.enabled &&
                                !d.maintenance &&
                                d.status === 'available',
                        )
                        .sort((a: Drawer, b: Drawer) =>
                            a.code.localeCompare(b.code, undefined, {
                                numeric: true,
                            }),
                        ),
                );
            } else {
                setDrawers([]);
                setDrawersError('No drawers returned by the locker.');
            }
        } catch (e) {
            setDrawers([]);
            setDrawersError(e instanceof Error ? e.message : String(e));
        } finally {
            setDrawersLoading(false);
        }
    };

    useEffect(() => {
        void loadDrawers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { data, setData, post, processing, errors } = useForm<{
        batchNo: string;
        items: Item[];
    }>({
        batchNo: genBatchNo(),
        items: [
            {
                voucherNo: '',
                voucherDate: todayStr(),
                bagNo: '',
                drawerCode: '',
            },
        ],
    });

    const [scanIdx, setScanIdx] = useState<number | null>(null);
    const [scanField, setScanField] = useState<'bagNo' | 'all'>('bagNo');

    const addRow = () =>
        setData('items', [
            ...data.items,
            {
                voucherNo: '',
                voucherDate: todayStr(),
                bagNo: '',
                drawerCode: '',
            },
        ]);
    const removeRow = (i: number) =>
        setData(
            'items',
            data.items.filter((_, idx) => idx !== i),
        );
    const updateRow = (i: number, field: keyof Item, value: string) => {
        const next = [...data.items];
        (next[i] as any)[field] = value;
        // keep location in sync for backward compat
        if (field === 'drawerCode') (next[i] as any).location = value;
        setData('items', next);
    };

    const handleScan = (text: string) => {
        const parsed = parseQrText(text);
        if (scanIdx === null) return;
        const next = [...data.items];
        if (scanField === 'bagNo') {
            next[scanIdx].bagNo = parsed.bagNo || text;
            if (parsed.voucherNo) next[scanIdx].voucherNo = parsed.voucherNo;
            if (parsed.drawerCode) {
                next[scanIdx].drawerCode = parsed.drawerCode;
                (next[scanIdx] as any).location = parsed.drawerCode;
            }
        } else {
            if (parsed.bagNo) next[scanIdx].bagNo = parsed.bagNo;
            if (parsed.voucherNo) next[scanIdx].voucherNo = parsed.voucherNo;
            if (parsed.drawerCode) {
                next[scanIdx].drawerCode = parsed.drawerCode;
                (next[scanIdx] as any).location = parsed.drawerCode;
            }
            if (parsed.voucherDate)
                next[scanIdx].voucherDate = parsed.voucherDate;
        }
        setData('items', next);
        setScanIdx(null);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/storage-batches');
    };

    const fieldError = (idx: number, field: string): string =>
        String(
            (errors as Record<string, string>)[`items.${idx}.${field}`] ?? '',
        );

    const drawerZones = useMemo(() => {
        const grouped = new Map<string, Drawer[]>();

        for (const drawer of drawers) {
            const zone = zoneOf(drawer.code);
            const list = grouped.get(zone) ?? [];
            list.push(drawer);
            grouped.set(zone, list);
        }

        return [...grouped.entries()].sort(([a], [b]) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
    }, [drawers]);

    const readyCount = data.items.filter(
        (item) =>
            item.voucherNo.trim() &&
            item.voucherDate &&
            item.bagNo.trim() &&
            item.drawerCode.trim(),
    ).length;

    const duplicateBags = useMemo(() => {
        const seen = new Map<string, number>();

        for (const item of data.items) {
            const bagNo = item.bagNo.trim().toUpperCase();
            if (!bagNo) continue;
            seen.set(bagNo, (seen.get(bagNo) ?? 0) + 1);
        }

        return [...seen.entries()]
            .filter(([, count]) => count > 1)
            .map(([bagNo]) => bagNo);
    }, [data.items]);

    const percent =
        data.items.length > 0
            ? Math.round((readyCount / data.items.length) * 100)
            : 0;

    return (
        <>
            <Head title="Store new bags" />
            <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase">
                            <Package className="size-3.5" aria-hidden />
                            Store bags
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Store new bags
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            Scan each bag, choose a free drawer, then send the
                            list to the locker.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            Manual entry
                        </Badge>
                        <Link href="/admin/locker/drawers">
                            <Button size="sm" variant="outline">
                                <Archive className="size-4" aria-hidden />
                                Free drawers
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                    {[
                        {
                            icon: Scan,
                            title: '1. Scan or type',
                            text: 'Add each bag, voucher and drawer.',
                        },
                        {
                            icon: ListChecks,
                            title: '2. Check the list',
                            text: 'Every bag needs a drawer before sending.',
                        },
                        {
                            icon: CheckCircle2,
                            title: '3. Send to locker',
                            text: 'We forward the list and show the result.',
                        },
                    ].map((step) => (
                        <div
                            key={step.title}
                            className="bg-card flex items-start gap-3 rounded-xl border p-3 shadow-sm"
                        >
                            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                                <step.icon className="size-4" aria-hidden />
                            </span>
                            <div>
                                <p className="text-xs font-semibold">
                                    {step.title}
                                </p>
                                <p className="text-muted-foreground mt-0.5 text-[11px]">
                                    {step.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Package
                                    className="text-muted-foreground size-4"
                                    aria-hidden
                                />
                                List name
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                <div className="flex-1">
                                    <Label htmlFor="batch-no">
                                        List name *
                                    </Label>
                                    <Input
                                        id="batch-no"
                                        value={data.batchNo}
                                        onChange={(e) =>
                                            setData('batchNo', e.target.value)
                                        }
                                        placeholder="e.g. ST-20260920-001"
                                        className="font-mono"
                                    />
                                    {errors.batchNo && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            {errors.batchNo}
                                        </p>
                                    )}
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Letters, numbers, dashes and underscores
                                        only. We filled one in — keep it or make
                                        a new one.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="sm:mt-6"
                                    onClick={() =>
                                        setData('batchNo', genBatchNo())
                                    }
                                >
                                    <RefreshCw className="size-4" aria-hidden />
                                    New name
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <ListChecks
                                        className="text-muted-foreground size-4"
                                        aria-hidden
                                    />
                                    Bags in this list
                                </CardTitle>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {readyCount} of {data.items.length} bag
                                    {data.items.length === 1 ? '' : 's'} ready
                                    {drawers.length > 0
                                        ? ` · ${drawers.length} free drawer${
                                              drawers.length === 1 ? '' : 's'
                                          } available`
                                        : ''}
                                </p>
                            </div>
                            <Button type="button" size="sm" onClick={addRow}>
                                <Plus className="size-4" aria-hidden />
                                Add bag
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <div
                                className="bg-muted h-1.5 overflow-hidden rounded-full"
                                role="progressbar"
                                aria-valuenow={readyCount}
                                aria-valuemin={0}
                                aria-valuemax={data.items.length}
                                aria-label="Bags ready to send"
                            >
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all',
                                        percent === 100
                                            ? 'bg-emerald-500'
                                            : 'bg-foreground/40',
                                    )}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>

                            {drawersError && (
                                <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                                    <div className="flex items-start gap-2">
                                        <TriangleAlert
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden
                                        />
                                        <div>
                                            <p className="font-medium">
                                                Free drawers not loaded
                                            </p>
                                            <p className="mt-0.5 opacity-90">
                                                {drawersError} You can still
                                                type the drawer code on each
                                                bag.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void loadDrawers()}
                                        disabled={drawersLoading}
                                    >
                                        <RefreshCw
                                            className={cn(
                                                'size-3.5',
                                                drawersLoading &&
                                                    'animate-spin',
                                            )}
                                            aria-hidden
                                        />
                                        Try again
                                    </Button>
                                </div>
                            )}

                            {duplicateBags.length > 0 && (
                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                                    <TriangleAlert
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden
                                    />
                                    <span>
                                        The same bag number appears more than
                                        once:{' '}
                                        <span className="font-mono font-medium">
                                            {duplicateBags.join(', ')}
                                        </span>
                                        . Check before sending.
                                    </span>
                                </div>
                            )}

                            <div className="space-y-3">
                                {data.items.map((it, idx) => {
                                    const complete = Boolean(
                                        it.voucherNo.trim() &&
                                        it.voucherDate &&
                                        it.bagNo.trim() &&
                                        it.drawerCode.trim(),
                                    );

                                    return (
                                        <div
                                            key={idx}
                                            className={cn(
                                                'rounded-xl border p-3 transition-colors',
                                                complete
                                                    ? 'border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/10'
                                                    : 'bg-background',
                                            )}
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                                                            complete
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : 'bg-muted text-muted-foreground',
                                                        )}
                                                    >
                                                        {complete ? (
                                                            <CheckCircle2
                                                                className="size-4"
                                                                aria-hidden
                                                            />
                                                        ) : (
                                                            idx + 1
                                                        )}
                                                    </span>
                                                    <span className="text-xs font-medium">
                                                        Bag {idx + 1}
                                                    </span>
                                                    <Badge
                                                        variant={
                                                            complete
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        className="text-[10px]"
                                                    >
                                                        {complete
                                                            ? 'Ready'
                                                            : 'Needs details'}
                                                    </Badge>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        removeRow(idx)
                                                    }
                                                    disabled={
                                                        data.items.length === 1
                                                    }
                                                    aria-label={`Remove bag ${idx + 1}`}
                                                >
                                                    <Trash2
                                                        className="size-4"
                                                        aria-hidden
                                                    />
                                                </Button>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                <div>
                                                    <Label
                                                        htmlFor={`voucher-${idx}`}
                                                        className="text-xs"
                                                    >
                                                        Voucher *
                                                    </Label>
                                                    <Input
                                                        id={`voucher-${idx}`}
                                                        value={it.voucherNo}
                                                        onChange={(e) =>
                                                            updateRow(
                                                                idx,
                                                                'voucherNo',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="PV-2026-000123"
                                                        className="mt-1 font-mono text-xs"
                                                    />
                                                    {fieldError(
                                                        idx,
                                                        'voucherNo',
                                                    ) && (
                                                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                                                            {fieldError(
                                                                idx,
                                                                'voucherNo',
                                                            )}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <Label
                                                        htmlFor={`date-${idx}`}
                                                        className="text-xs"
                                                    >
                                                        Voucher date *
                                                    </Label>
                                                    <Input
                                                        id={`date-${idx}`}
                                                        type="date"
                                                        value={it.voucherDate}
                                                        onChange={(e) =>
                                                            updateRow(
                                                                idx,
                                                                'voucherDate',
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="mt-1 text-xs"
                                                    />
                                                    {fieldError(
                                                        idx,
                                                        'voucherDate',
                                                    ) && (
                                                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                                                            {fieldError(
                                                                idx,
                                                                'voucherDate',
                                                            )}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <Label
                                                        htmlFor={`bag-${idx}`}
                                                        className="text-xs"
                                                    >
                                                        Bag number *
                                                    </Label>
                                                    <div className="mt-1 flex gap-1.5">
                                                        <Input
                                                            id={`bag-${idx}`}
                                                            value={it.bagNo}
                                                            onChange={(e) =>
                                                                updateRow(
                                                                    idx,
                                                                    'bagNo',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="BAG-001"
                                                            className="font-mono text-xs"
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key ===
                                                                    'Enter'
                                                                ) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            className="shrink-0"
                                                            onClick={() => {
                                                                setScanIdx(idx);
                                                                setScanField(
                                                                    'bagNo',
                                                                );
                                                            }}
                                                            aria-label={`Scan bag ${idx + 1}`}
                                                        >
                                                            <Scan
                                                                className="size-4"
                                                                aria-hidden
                                                            />
                                                        </Button>
                                                    </div>
                                                    {fieldError(
                                                        idx,
                                                        'bagNo',
                                                    ) && (
                                                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                                                            {fieldError(
                                                                idx,
                                                                'bagNo',
                                                            )}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <Label
                                                        htmlFor={`drawer-${idx}`}
                                                        className="text-xs"
                                                    >
                                                        Drawer *
                                                    </Label>
                                                    {drawers.length > 0 ? (
                                                        <Select
                                                            value={
                                                                it.drawerCode
                                                            }
                                                            onValueChange={(
                                                                v,
                                                            ) =>
                                                                updateRow(
                                                                    idx,
                                                                    'drawerCode',
                                                                    v,
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger
                                                                id={`drawer-${idx}`}
                                                                className="mt-1 w-full font-mono text-xs"
                                                            >
                                                                <SelectValue placeholder="Choose a free drawer" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {drawerZones.map(
                                                                    ([
                                                                        zone,
                                                                        list,
                                                                    ]) => (
                                                                        <SelectGroup
                                                                            key={
                                                                                zone
                                                                            }
                                                                        >
                                                                            <SelectLabel>
                                                                                Cabinet{' '}
                                                                                {
                                                                                    zone
                                                                                }
                                                                            </SelectLabel>
                                                                            {list.map(
                                                                                (
                                                                                    drawer,
                                                                                ) => (
                                                                                    <SelectItem
                                                                                        key={
                                                                                            drawer.code
                                                                                        }
                                                                                        value={
                                                                                            drawer.code
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            drawer.code
                                                                                        }
                                                                                    </SelectItem>
                                                                                ),
                                                                            )}
                                                                        </SelectGroup>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input
                                                            id={`drawer-${idx}`}
                                                            value={
                                                                it.drawerCode
                                                            }
                                                            onChange={(e) =>
                                                                updateRow(
                                                                    idx,
                                                                    'drawerCode',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="e.g. A-01"
                                                            className="mt-1 font-mono text-xs"
                                                        />
                                                    )}
                                                    {it.drawerCode && (
                                                        <DrawerTag
                                                            code={it.drawerCode}
                                                            className="mt-1.5"
                                                        />
                                                    )}
                                                    {drawersLoading && (
                                                        <p className="text-muted-foreground mt-1 text-[10px]">
                                                            Loading free
                                                            drawers…
                                                        </p>
                                                    )}
                                                    {(fieldError(
                                                        idx,
                                                        'drawerCode',
                                                    ) ||
                                                        fieldError(
                                                            idx,
                                                            'location',
                                                        )) && (
                                                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                                                            {fieldError(
                                                                idx,
                                                                'drawerCode',
                                                            ) ||
                                                                fieldError(
                                                                    idx,
                                                                    'location',
                                                                )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setScanIdx(0);
                                        setScanField('all');
                                    }}
                                >
                                    <QrCode className="size-4" aria-hidden />
                                    Scan to fill first bag
                                </Button>
                                <span className="text-muted-foreground text-[11px]">
                                    USB scanner: focus the bag box, then scan.
                                    Camera: use the scan button.
                                </span>
                            </div>

                            <details className="text-muted-foreground text-xs">
                                <summary className="flex cursor-pointer items-center gap-1.5">
                                    <Info className="size-3.5" aria-hidden />
                                    Accepted scan formats
                                </summary>
                                <ul className="mt-1 list-disc space-y-1 pl-5">
                                    <li>Bag number alone, e.g. BAG-001</li>
                                    <li>
                                        Bag, voucher and drawer together, e.g.
                                        BAG-001, PV-2026-000123, A-01
                                    </li>
                                    <li>
                                        JSON from the shop printer, e.g.{' '}
                                        {'{"bagNo":"BAG-001", ...}'}
                                    </li>
                                </ul>
                            </details>

                            {errors.items && (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {String(errors.items)}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="bg-card/95 sticky bottom-4 z-10 rounded-xl border p-3 shadow-lg backdrop-blur">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium">
                                    Step 3 — Send to locker
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {readyCount === data.items.length
                                        ? `All ${data.items.length} bag${
                                              data.items.length === 1 ? '' : 's'
                                          } ready.`
                                        : `${
                                              data.items.length - readyCount
                                          } bag${
                                              data.items.length - readyCount ===
                                              1
                                                  ? ''
                                                  : 's'
                                          } still need details.`}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        router.visit('/admin/storage-batches')
                                    }
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? (
                                        <Spinner />
                                    ) : (
                                        <CheckCircle2
                                            className="size-4"
                                            aria-hidden
                                        />
                                    )}
                                    {processing
                                        ? 'Sending…'
                                        : `Send ${data.items.length} bag${
                                              data.items.length === 1 ? '' : 's'
                                          }`}
                                </Button>
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-2 text-[11px]">
                            If sending is interrupted, send again with the same
                            list name — duplicates are ignored.
                        </p>
                    </div>
                </form>

                {scanIdx !== null && (
                    <QrScanner
                        onResult={handleScan}
                        onClose={() => setScanIdx(null)}
                    />
                )}
            </div>
        </>
    );
}

CreateStorageBatch.layout = {
    breadcrumbs: [
        { title: 'Store Bags', href: '/admin/storage-batches' },
        { title: 'New list', href: '/admin/storage-batches/create' },
    ],
} as const;
