import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { copyText } from '@/lib/clipboard';
import { friendlyLockerError } from '@/lib/locker-errors';
import { cn } from '@/lib/utils';
import {
    Archive,
    ArrowUpRight,
    CheckCircle2,
    Copy,
    ListChecks,
    Search,
    SearchX,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type LockerBag = {
    bagNo: string;
    voucherNo?: string | null;
    voucherDate?: string | null;
    status?: string | null;
    drawerCode?: string | null;
    removedAt?: string | null;
    updatedAt?: string | null;
};

type QueryResult = {
    totalRequested: number;
    found: number;
    missing: number;
    bags: LockerBag[];
    missingBagNos: string[];
};

type Mode = 'single' | 'bulk';

const statusLabel = (status?: string | null) => {
    switch ((status ?? '').toUpperCase()) {
        case 'ASSIGNED':
            return 'In drawer';
        case 'STORED':
            return 'Stored';
        case 'REMOVED':
            return 'Removed';
        case 'AVAILABLE':
            return 'Free';
        default:
            return status || 'Unknown';
    }
};

const statusVariant = (
    status?: string | null,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch ((status ?? '').toUpperCase()) {
        case 'ASSIGNED':
        case 'STORED':
            return 'default';
        case 'REMOVED':
            return 'secondary';
        default:
            return 'outline';
    }
};

const copyDrawer = async (code: string) => {
    try {
        await copyText(code);
        toast.success(`Drawer ${code} copied`, {
            description: 'Paste it when you open the locker.',
        });
    } catch {
        toast.error('Could not copy the drawer code');
    }
};

function BagResultCard({ bag }: { bag: LockerBag }) {
    return (
        <div className="group bg-card hover:border-foreground/20 flex flex-col rounded-xl border p-4 shadow-sm transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-mono text-sm font-semibold">
                            {bag.bagNo}
                        </span>
                        <Badge variant={statusVariant(bag.status)}>
                            {statusLabel(bag.status)}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                        Voucher {bag.voucherNo || '—'}
                        {bag.voucherDate ? ` · ${bag.voucherDate}` : ''}
                    </p>
                </div>
                <Link
                    href={`/admin/bags/${encodeURIComponent(bag.bagNo)}`}
                    className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                >
                    View
                    <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
            </div>

            <div className="from-muted/40 to-muted/10 mt-3 flex items-center justify-between gap-3 rounded-lg border bg-gradient-to-b px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-background flex size-9 shrink-0 items-center justify-center rounded-md border shadow-sm">
                        <Archive
                            className="text-muted-foreground size-4"
                            aria-hidden
                        />
                    </span>
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                            Drawer
                        </p>
                        <p className="truncate font-mono text-base leading-tight font-bold">
                            {bag.drawerCode || '—'}
                        </p>
                    </div>
                </div>
                {bag.drawerCode && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() =>
                            void copyDrawer(bag.drawerCode as string)
                        }
                        aria-label={`Copy drawer ${bag.drawerCode}`}
                    >
                        <Copy className="size-4" aria-hidden />
                    </Button>
                )}
            </div>

            <div className="text-muted-foreground mt-2 flex items-center justify-between gap-2 text-[11px]">
                <span>
                    {bag.updatedAt
                        ? `Updated ${new Date(bag.updatedAt).toLocaleString()}`
                        : 'No update time'}
                </span>
                {bag.removedAt && (
                    <span>
                        Removed {new Date(bag.removedAt).toLocaleDateString()}
                    </span>
                )}
            </div>
        </div>
    );
}

function SingleBagResult({ bag }: { bag: LockerBag }) {
    return (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
                <div>
                    <p className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
                        Bag found
                    </p>
                    <h2 className="mt-1 font-mono text-xl font-bold tracking-tight">
                        {bag.bagNo}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Voucher {bag.voucherNo || '—'}
                        {bag.voucherDate ? ` · ${bag.voucherDate}` : ''}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(bag.status)}>
                        {statusLabel(bag.status)}
                    </Badge>
                    <Link href={`/admin/bags/${encodeURIComponent(bag.bagNo)}`}>
                        <Button size="sm" variant="outline">
                            Open bag
                            <ArrowUpRight className="size-4" aria-hidden />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,280px)_1fr]">
                <div
                    className={cn(
                        'flex flex-col justify-between rounded-xl border-2 p-4 shadow-inner',
                        bag.drawerCode
                            ? 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-emerald-100/50 dark:border-emerald-800/70 dark:from-emerald-950/40 dark:to-emerald-900/20'
                            : 'bg-muted/30 border-dashed',
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span
                            className={cn(
                                'text-[10px] font-semibold tracking-widest uppercase',
                                bag.drawerCode
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-muted-foreground',
                            )}
                        >
                            Drawer
                        </span>
                        <span
                            className={cn(
                                'size-2 rounded-full',
                                bag.drawerCode
                                    ? 'bg-emerald-500'
                                    : 'bg-zinc-400',
                            )}
                            aria-hidden
                        />
                    </div>

                    <div className="my-4 flex items-center justify-center">
                        <span className="font-mono text-4xl font-bold tracking-tight">
                            {bag.drawerCode || '—'}
                        </span>
                    </div>

                    <div
                        aria-hidden
                        className="bg-foreground/15 ring-background/60 mx-auto h-2 w-24 rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.18)] ring-1"
                    />
                    <p
                        className={cn(
                            'mt-3 text-center text-[11px]',
                            bag.drawerCode
                                ? 'text-emerald-700/80 dark:text-emerald-300/80'
                                : 'text-muted-foreground',
                        )}
                    >
                        {bag.drawerCode
                            ? 'The bag is stored in this drawer'
                            : 'No drawer recorded for this bag'}
                    </p>
                </div>

                <div className="space-y-4 text-sm">
                    <dl className="grid grid-cols-2 gap-4">
                        <div>
                            <dt className="text-muted-foreground text-xs">
                                Status
                            </dt>
                            <dd className="mt-1 font-medium">
                                {statusLabel(bag.status)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs">
                                Voucher
                            </dt>
                            <dd className="mt-1 font-mono">
                                {bag.voucherNo || '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs">
                                Voucher date
                            </dt>
                            <dd className="mt-1">{bag.voucherDate || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs">
                                Updated
                            </dt>
                            <dd className="mt-1 text-xs">
                                {bag.updatedAt
                                    ? new Date(bag.updatedAt).toLocaleString()
                                    : '—'}
                            </dd>
                        </div>
                    </dl>

                    <div className="flex flex-wrap gap-2">
                        {bag.drawerCode && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    void copyDrawer(bag.drawerCode as string)
                                }
                            >
                                <Copy className="size-4" aria-hidden />
                                Copy drawer code
                            </Button>
                        )}
                        <Link
                            href={`/admin/bags/${encodeURIComponent(bag.bagNo)}`}
                        >
                            <Button size="sm" variant="outline">
                                Open bag
                                <ArrowUpRight className="size-4" aria-hidden />
                            </Button>
                        </Link>
                    </div>

                    <p className="text-muted-foreground text-xs">
                        If the customer is at the counter, use the drawer code
                        above to open the locker.
                    </p>
                </div>
            </div>
        </div>
    );
}

function EmptyPrompt() {
    return (
        <div className="bg-muted/20 rounded-2xl border border-dashed px-6 py-12 text-center">
            <div className="bg-background mx-auto flex size-12 items-center justify-center rounded-full shadow-sm">
                <Search className="text-muted-foreground size-6" aria-hidden />
            </div>
            <h2 className="mt-3 text-sm font-semibold">
                Find any bag in the locker
            </h2>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-xs">
                Type one bag number or paste a list. We will show the exact
                drawer the locker has it in.
            </p>
            <div className="text-muted-foreground mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
                <span className="bg-background rounded-full border px-2.5 py-1">
                    One bag or many
                </span>
                <span className="bg-background rounded-full border px-2.5 py-1">
                    Live from the locker
                </span>
                <span className="bg-background rounded-full border px-2.5 py-1">
                    Shows missing bags
                </span>
            </div>
        </div>
    );
}

export default function LockerBagsPage() {
    const [mode, setMode] = useState<Mode>('single');
    const [bagNos, setBagNos] = useState('');
    const [singleBag, setSingleBag] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [singleResult, setSingleResult] = useState<LockerBag | null>(null);
    const [notFound, setNotFound] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const bulkCount = bagNos
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean).length;

    const queryBags = async () => {
        const list = bagNos
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);

        if (list.length === 0) {
            setError('Enter at least one bag number.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const r = await fetch('/admin/locker/bags/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN':
                        (
                            document.querySelector(
                                'meta[name="csrf-token"]',
                            ) as HTMLMetaElement
                        )?.content || '',
                },
                body: JSON.stringify({ bagNos: list }),
            });
            const j = await r.json().catch(() => null);

            if (j?.success) {
                const data = j.data as Partial<QueryResult>;
                setResult({
                    totalRequested: data.totalRequested ?? list.length,
                    found: data.found ?? data.bags?.length ?? 0,
                    missing: data.missing ?? data.missingBagNos?.length ?? 0,
                    bags: data.bags ?? [],
                    missingBagNos: data.missingBagNos ?? [],
                });
            } else {
                setError(
                    friendlyLockerError(
                        j,
                        'Query failed — check the locker connection in Settings.',
                    ),
                );
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    const getSingle = async () => {
        const bagNo = singleBag.trim();

        if (!bagNo) {
            setError('Enter a bag number first.');
            return;
        }

        setLoading(true);
        setError(null);
        setSingleResult(null);
        setNotFound(null);

        try {
            const r = await fetch(
                `/admin/locker/bags/${encodeURIComponent(bagNo)}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );
            const j = await r.json().catch(() => null);

            if (j?.success && j.data) {
                setSingleResult(j.data as LockerBag);
            } else if (r.status === 404) {
                setNotFound(bagNo);
            } else {
                setError(
                    friendlyLockerError(
                        j,
                        'Bag not found — check the locker connection in Settings.',
                    ),
                );
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (value: string) => {
        if (value !== 'single' && value !== 'bulk') return;
        setMode(value);
        setError(null);
    };

    const showEmptyPrompt =
        !loading &&
        !error &&
        (mode === 'single' ? !singleResult && !notFound : !result);

    return (
        <>
            <Head title="Find bags in locker" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase">
                            <Search className="size-3.5" aria-hidden />
                            Locker lookup
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Find bags in the locker
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            Search one bag or a whole list. The result shows the
                            exact drawer the locker has it in.
                        </p>
                    </div>
                    <Link href="/admin/locker/drawers">
                        <Button size="sm" variant="outline">
                            <Archive className="size-4" aria-hidden />
                            Free drawers
                        </Button>
                    </Link>
                </div>

                <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
                    <div className="bg-muted/20 border-b p-3">
                        <ToggleGroup
                            type="single"
                            value={mode}
                            onValueChange={switchMode}
                            variant="outline"
                            size="sm"
                            className="w-fit"
                        >
                            <ToggleGroupItem
                                value="single"
                                aria-label="Check one bag"
                            >
                                <Search className="size-4" aria-hidden />
                                One bag
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="bulk"
                                aria-label="Check several bags"
                            >
                                <ListChecks className="size-4" aria-hidden />
                                Several bags
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    <div className="p-4 md:p-5">
                        {mode === 'single' ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void getSingle();
                                }}
                                className="flex flex-col gap-2 sm:flex-row"
                            >
                                <div className="relative flex-1">
                                    <Search
                                        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                        aria-hidden
                                    />
                                    <Input
                                        value={singleBag}
                                        onChange={(e) =>
                                            setSingleBag(e.target.value)
                                        }
                                        placeholder="Bag number, e.g. BAG-00125"
                                        aria-label="Bag number"
                                        autoFocus
                                        className="h-11 pl-9 font-mono"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="h-11"
                                    disabled={loading || !singleBag.trim()}
                                >
                                    {loading ? (
                                        <Spinner />
                                    ) : (
                                        <Search
                                            className="size-4"
                                            aria-hidden
                                        />
                                    )}
                                    Find drawer
                                </Button>
                            </form>
                        ) : (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void queryBags();
                                }}
                                className="space-y-3"
                            >
                                <div className="relative">
                                    <textarea
                                        value={bagNos}
                                        onChange={(e) =>
                                            setBagNos(e.target.value)
                                        }
                                        placeholder={
                                            'BAG-00125\nBAG-00126\nBAG-00127'
                                        }
                                        rows={5}
                                        aria-label="Bag numbers, one per line"
                                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[120px] w-full rounded-md border px-3 py-2 font-mono text-xs shadow-xs focus-visible:ring-[3px] focus-visible:outline-none"
                                    />
                                    <div className="bg-background/90 text-muted-foreground pointer-events-none absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-[10px]">
                                        {bulkCount} bag
                                        {bulkCount === 1 ? '' : 's'}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-muted-foreground text-xs">
                                        One bag number per line, or separated by
                                        commas.
                                    </p>
                                    <div className="flex gap-2">
                                        {bagNos && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setBagNos('')}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                        <Button
                                            type="submit"
                                            disabled={
                                                loading || bulkCount === 0
                                            }
                                        >
                                            {loading ? (
                                                <Spinner />
                                            ) : (
                                                <Search
                                                    className="size-4"
                                                    aria-hidden
                                                />
                                            )}
                                            Find drawers
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/20"
                    >
                        <TriangleAlert
                            className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400"
                            aria-hidden
                        />
                        <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                Could not check the locker
                            </p>
                            <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                                {error}
                            </p>
                            <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                                Check the locker connection in{' '}
                                <Link
                                    href="/admin/settings"
                                    className="underline underline-offset-2"
                                >
                                    Settings
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                )}

                {loading && !result && !singleResult && (
                    <div
                        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                        aria-busy="true"
                    >
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-muted/40 h-40 animate-pulse rounded-xl border"
                            />
                        ))}
                    </div>
                )}

                {mode === 'single' && singleResult && (
                    <SingleBagResult bag={singleResult} />
                )}

                {mode === 'single' && notFound && !loading && (
                    <div className="bg-card rounded-2xl border border-dashed px-6 py-12 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
                            <SearchX
                                className="size-6 text-amber-600 dark:text-amber-400"
                                aria-hidden
                            />
                        </div>
                        <h2 className="mt-3 text-sm font-semibold">
                            Bag not in the locker
                        </h2>
                        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-xs">
                            The locker has no record of{' '}
                            <span className="text-foreground font-mono font-medium">
                                {notFound}
                            </span>
                            . Check the number, or the bag may not be stored
                            yet.
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                                setNotFound(null);
                                setSingleBag('');
                            }}
                        >
                            Try another bag
                        </Button>
                    </div>
                )}

                {mode === 'bulk' && result && (
                    <section className="space-y-4" aria-live="polite">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-card rounded-xl border p-4 shadow-sm">
                                <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                                    Asked
                                </p>
                                <p className="mt-1 text-2xl font-semibold tabular-nums">
                                    {result.totalRequested}
                                </p>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                <p className="text-[11px] font-medium tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                                    Found
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
                                    {result.found}
                                </p>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20">
                                <p className="text-[11px] font-medium tracking-wider text-amber-700 uppercase dark:text-amber-300">
                                    Not found
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-amber-700 tabular-nums dark:text-amber-300">
                                    {result.missing}
                                </p>
                            </div>
                        </div>

                        {result.bags.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {result.bags.map((bag) => (
                                    <BagResultCard key={bag.bagNo} bag={bag} />
                                ))}
                            </div>
                        )}

                        {result.missingBagNos.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                                <div className="flex items-start gap-3">
                                    <SearchX
                                        className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
                                        aria-hidden
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                            Not in the locker
                                        </p>
                                        <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-300/80">
                                            The locker has no drawer for these
                                            bag numbers. Check the number, or
                                            the bag may not be stored yet.
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {result.missingBagNos.map(
                                                (bagNo) => (
                                                    <span
                                                        key={bagNo}
                                                        className="bg-background/60 rounded-md border border-amber-200 px-2 py-1 font-mono text-[11px] font-medium text-amber-800 dark:border-amber-800/60 dark:text-amber-200"
                                                    >
                                                        {bagNo}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {result.missing === 0 && result.bags.length > 0 && (
                            <p className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2
                                    className="size-3.5"
                                    aria-hidden
                                />
                                All bags found in the locker.
                            </p>
                        )}
                    </section>
                )}

                {showEmptyPrompt && <EmptyPrompt />}
            </div>
        </>
    );
}

LockerBagsPage.layout = {
    breadcrumbs: [{ title: 'Find in Locker', href: '/admin/locker/bags' }],
} as const;
