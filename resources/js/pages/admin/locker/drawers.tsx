import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import { copyText } from '@/lib/clipboard';
import { friendlyLockerError } from '@/lib/locker-errors';
import { cn } from '@/lib/utils';
import {
    Archive,
    CheckCircle2,
    Copy,
    Lock,
    PowerOff,
    RefreshCw,
    Search,
    TriangleAlert,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Drawer = {
    code: string;
    status: string;
    enabled: boolean;
    maintenance: boolean;
    hardwareReady: boolean;
    unavailableReason: string | null;
    updatedAt: string;
};

type DrawerTone = 'free' | 'occupied' | 'attention' | 'offline';

type DrawerState = {
    label: string;
    tone: DrawerTone;
    icon: LucideIcon;
    detail: string;
};

const stateFor = (drawer: Drawer): DrawerState => {
    const status = (drawer.status ?? '').toLowerCase();

    if (drawer.enabled === false) {
        return {
            label: 'Disabled',
            tone: 'offline',
            icon: PowerOff,
            detail: drawer.unavailableReason || 'Turned off in the locker',
        };
    }

    if (drawer.maintenance === true) {
        return {
            label: 'Maintenance',
            tone: 'attention',
            icon: Wrench,
            detail: drawer.unavailableReason || 'Under maintenance',
        };
    }

    if (status === 'occupied') {
        return {
            label: 'In use',
            tone: 'occupied',
            icon: Lock,
            detail: drawer.unavailableReason || 'A bag is stored here',
        };
    }

    if (status === 'available' && drawer.hardwareReady === false) {
        return {
            label: 'Not ready',
            tone: 'attention',
            icon: TriangleAlert,
            detail: drawer.unavailableReason || 'Hardware is not ready',
        };
    }

    if (status === 'available') {
        return {
            label: 'Free',
            tone: 'free',
            icon: CheckCircle2,
            detail: 'Ready for a new bag',
        };
    }

    return {
        label: drawer.status || 'Unknown',
        tone: 'offline',
        icon: Archive,
        detail: drawer.unavailableReason || 'The locker did not report a state',
    };
};

const toneStyles: Record<
    DrawerTone,
    { tile: string; icon: string; text: string; dot: string }
> = {
    free: {
        tile: 'border-emerald-300/80 bg-gradient-to-b from-emerald-50 to-emerald-100/50 hover:border-emerald-400 dark:border-emerald-800/80 dark:from-emerald-950/40 dark:to-emerald-900/20',
        icon: 'text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-500',
    },
    occupied: {
        tile: 'border-border bg-gradient-to-b from-muted/80 to-muted/30 hover:border-foreground/25',
        icon: 'text-muted-foreground',
        text: 'text-muted-foreground',
        dot: 'bg-slate-400 dark:bg-slate-500',
    },
    attention: {
        tile: 'border-amber-300/80 bg-gradient-to-b from-amber-50 to-amber-100/50 hover:border-amber-400 dark:border-amber-800/70 dark:from-amber-950/30 dark:to-amber-900/10',
        icon: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
    },
    offline: {
        tile: 'border-border bg-muted/20 opacity-75 hover:opacity-100',
        icon: 'text-muted-foreground',
        text: 'text-muted-foreground',
        dot: 'bg-zinc-400',
    },
};

const statTones = {
    emerald: {
        box: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
        value: 'text-emerald-700 dark:text-emerald-300',
    },
    slate: {
        box: 'bg-muted text-muted-foreground',
        value: 'text-foreground',
    },
    amber: {
        box: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
        value: 'text-amber-700 dark:text-amber-300',
    },
    neutral: {
        box: 'bg-muted text-muted-foreground',
        value: 'text-foreground',
    },
};

const zoneOf = (code: string): string => {
    const match = code.trim().match(/^([A-Za-z]+)/);
    return match ? match[1].toUpperCase() : 'Other';
};

function Stat({
    icon: Icon,
    label,
    value,
    hint,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    hint: string;
    tone: keyof typeof statTones;
}) {
    return (
        <div className="bg-card flex items-center gap-3 rounded-xl border p-4 shadow-sm">
            <span
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    statTones[tone].box,
                )}
            >
                <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
                <div
                    className={cn(
                        'text-2xl leading-none font-semibold tabular-nums',
                        statTones[tone].value,
                    )}
                >
                    {value}
                </div>
                <div className="mt-1 truncate text-xs font-medium">{label}</div>
                <div className="text-muted-foreground truncate text-[11px]">
                    {hint}
                </div>
            </div>
        </div>
    );
}

function DrawerTile({
    drawer,
    onCopy,
}: {
    drawer: Drawer;
    onCopy: (code: string) => void;
}) {
    const state = stateFor(drawer);
    const tone = toneStyles[state.tone];
    const Icon = state.icon;

    return (
        <button
            type="button"
            onClick={() => onCopy(drawer.code)}
            aria-label={`Drawer ${drawer.code}: ${state.label}. ${state.detail}. Click to copy the drawer code.`}
            title={`${drawer.code} — ${state.label}${drawer.unavailableReason ? `: ${drawer.unavailableReason}` : ''}. Click to copy.`}
            className={cn(
                'group relative flex min-h-[112px] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-lg border p-3 text-left transition-all duration-200',
                'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65),0_1px_2px_rgba(0,0,0,0.06)]',
                'dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.4)]',
                'focus-visible:ring-ring focus-visible:ring-offset-background hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                tone.tile,
            )}
        >
            <span className="flex items-start justify-between gap-2">
                <span className="font-mono text-sm font-bold tracking-tight">
                    {drawer.code}
                </span>
                <span
                    className={cn(
                        'bg-background/70 flex size-6 items-center justify-center rounded-full',
                        tone.icon,
                    )}
                >
                    <Icon className="size-3.5" aria-hidden />
                </span>
            </span>

            <span aria-hidden className="my-2 flex items-center justify-center">
                <span className="bg-foreground/15 ring-background/60 group-hover:bg-foreground/25 h-1.5 w-12 rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.18)] ring-1 transition-all duration-200 group-hover:w-14" />
            </span>

            <span className="flex items-center justify-between gap-1">
                <span
                    className={cn(
                        'inline-flex items-center gap-1.5 text-[11px] font-medium',
                        tone.text,
                    )}
                >
                    <span
                        className={cn('size-1.5 rounded-full', tone.dot)}
                        aria-hidden
                    />
                    {state.label}
                </span>
                <Copy
                    className="text-muted-foreground/0 group-hover:text-muted-foreground size-3 transition-colors"
                    aria-hidden
                />
            </span>
        </button>
    );
}

export default function DrawersPage() {
    const [drawers, setDrawers] = useState<Drawer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [availableOnly, setAvailableOnly] = useState(true);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const fetchDrawers = async () => {
        setLoading(true);
        setError(null);

        try {
            // Always go through the server-side proxy: the Locker token stays on
            // the server and this works regardless of browser/CORS restrictions.
            // Fetch every drawer so the cabinet keeps its physical layout; the
            // "Free only" toggle filters locally without another round trip.
            const r = await fetch('/admin/locker/drawers?available=false', {
                headers: { Accept: 'application/json' },
            });
            const j = await r.json().catch(() => null);
            const list = j?.data?.drawers || j?.drawers || j?.data || [];

            if (Array.isArray(list)) {
                setDrawers(list);
                setLastChecked(new Date());
            } else if (j?.success === false) {
                setError(
                    friendlyLockerError(
                        j,
                        'Failed to fetch drawers — check the Locker connection in Settings',
                    ),
                );
            } else {
                setError(`Unexpected response (${r.status})`);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchDrawers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const counts = useMemo(() => {
        let free = 0;
        let inUse = 0;
        let attention = 0;

        for (const drawer of drawers) {
            const state = stateFor(drawer);
            if (state.tone === 'free') free += 1;
            else if (state.tone === 'occupied') inUse += 1;
            else attention += 1;
        }

        return { free, inUse, attention, total: drawers.length };
    }, [drawers]);

    const zoneTotals = useMemo(() => {
        const totals = new Map<string, number>();
        for (const drawer of drawers) {
            const zone = zoneOf(drawer.code);
            totals.set(zone, (totals.get(zone) ?? 0) + 1);
        }
        return totals;
    }, [drawers]);

    const zoneFree = useMemo(() => {
        const free = new Map<string, number>();
        for (const drawer of drawers) {
            if (stateFor(drawer).tone !== 'free') continue;
            const zone = zoneOf(drawer.code);
            free.set(zone, (free.get(zone) ?? 0) + 1);
        }
        return free;
    }, [drawers]);

    const filtered = useMemo(() => {
        const query = filter.trim().toLowerCase();

        return drawers.filter((drawer) => {
            const state = stateFor(drawer);

            if (availableOnly && state.tone !== 'free') return false;
            if (!query) return true;

            return (
                drawer.code.toLowerCase().includes(query) ||
                (drawer.unavailableReason ?? '').toLowerCase().includes(query)
            );
        });
    }, [drawers, filter, availableOnly]);

    const zones = useMemo(() => {
        const grouped = new Map<string, Drawer[]>();

        for (const drawer of filtered) {
            const zone = zoneOf(drawer.code);
            const list = grouped.get(zone) ?? [];
            list.push(drawer);
            grouped.set(zone, list);
        }

        return [...grouped.entries()].sort(([a], [b]) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
    }, [filtered]);

    const copyCode = async (code: string) => {
        try {
            await copyText(code);
            toast.success(`Drawer ${code} copied`, {
                description: 'Paste it when you store a new bag.',
            });
        } catch {
            toast.error('Could not copy the drawer code');
        }
    };

    const hasDrawers = drawers.length > 0;

    return (
        <>
            <Head title="Free drawers" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase">
                            <Archive className="size-3.5" aria-hidden />
                            Locker cabinet
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Free drawers
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            Green drawers are ready for a new bag. Pick a code
                            from the cabinet and use it when you store bags.
                        </p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {counts.free} free now
                        </Badge>
                        <Link href="/admin/locker/bags">
                            <Button size="sm" variant="outline">
                                <Search className="size-4" aria-hidden />
                                Find a bag
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat
                        icon={CheckCircle2}
                        label="Free now"
                        value={counts.free}
                        hint="Ready for a bag"
                        tone="emerald"
                    />
                    <Stat
                        icon={Lock}
                        label="In use"
                        value={counts.inUse}
                        hint="A bag is stored"
                        tone="slate"
                    />
                    <Stat
                        icon={Wrench}
                        label="Needs attention"
                        value={counts.attention}
                        hint="Maintenance or offline"
                        tone="amber"
                    />
                    <Stat
                        icon={Archive}
                        label="Drawers"
                        value={counts.total}
                        hint="In the cabinet"
                        tone="neutral"
                    />
                </div>

                <div className="bg-card rounded-xl border p-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px] flex-1">
                            <Search
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                aria-hidden
                            />
                            <Input
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Find a drawer, e.g. A-06"
                                aria-label="Search drawers"
                                className="pl-9"
                            />
                        </div>
                        <Toggle
                            pressed={availableOnly}
                            onPressedChange={setAvailableOnly}
                            variant="outline"
                            size="sm"
                            aria-label="Show free drawers only"
                            className="gap-1.5 data-[state=on]:border-emerald-300 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700 dark:data-[state=on]:border-emerald-800 dark:data-[state=on]:bg-emerald-950/40 dark:data-[state=on]:text-emerald-300"
                        >
                            <CheckCircle2 className="size-3.5" aria-hidden />
                            Free only
                        </Toggle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void fetchDrawers()}
                            disabled={loading}
                        >
                            <RefreshCw
                                className={cn(
                                    'size-4',
                                    loading && 'animate-spin',
                                )}
                                aria-hidden
                            />
                            {loading ? 'Checking…' : 'Refresh'}
                        </Button>
                    </div>

                    <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                        <span className="inline-flex items-center gap-1.5">
                            <span
                                className="size-1.5 rounded-full bg-emerald-500"
                                aria-hidden
                            />
                            Free
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span
                                className="size-1.5 rounded-full bg-slate-400"
                                aria-hidden
                            />
                            In use
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span
                                className="size-1.5 rounded-full bg-amber-500"
                                aria-hidden
                            />
                            Maintenance or not ready
                        </span>
                        {lastChecked && (
                            <span className="ml-auto">
                                Checked at{' '}
                                {lastChecked.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        )}
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/20"
                    >
                        <div className="flex items-start gap-3">
                            <TriangleAlert
                                className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400"
                                aria-hidden
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    Could not load the cabinet
                                </p>
                                <p className="mt-1 text-xs break-words text-red-700/80 dark:text-red-300/80">
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
                                    , then try again.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={() => void fetchDrawers()}
                        >
                            <RefreshCw className="size-4" aria-hidden />
                            Try again
                        </Button>
                    </div>
                )}

                {loading && !hasDrawers ? (
                    <div
                        className="space-y-3"
                        aria-busy="true"
                        aria-label="Loading drawers"
                    >
                        <Skeleton className="h-14 rounded-xl" />
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-[112px] rounded-lg"
                                />
                            ))}
                        </div>
                    </div>
                ) : zones.length === 0 ? (
                    <div className="bg-card flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
                        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                            <Archive
                                className="text-muted-foreground size-6"
                                aria-hidden
                            />
                        </div>
                        <h2 className="mt-3 text-sm font-semibold">
                            {!hasDrawers
                                ? 'No drawers loaded'
                                : filter
                                  ? 'No drawers match your search'
                                  : 'No free drawers right now'}
                        </h2>
                        <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                            {!hasDrawers
                                ? 'Refresh to ask the locker for its drawers. If it still fails, check Settings.'
                                : filter
                                  ? `Nothing matched “${filter}”. Try a different code, or clear the search.`
                                  : 'Every drawer is either in use or needs attention. Show all drawers to see the full cabinet.'}
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {filter && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setFilter('')}
                                >
                                    Clear search
                                </Button>
                            )}
                            {availableOnly && hasDrawers && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAvailableOnly(false)}
                                >
                                    Show all drawers
                                </Button>
                            )}
                            {!hasDrawers && (
                                <Button
                                    size="sm"
                                    onClick={() => void fetchDrawers()}
                                >
                                    <RefreshCw className="size-4" aria-hidden />
                                    Refresh
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4" aria-busy={loading}>
                        {zones.map(([zone, list]) => {
                            const totalInZone =
                                zoneTotals.get(zone) ?? list.length;
                            const freeInZone = zoneFree.get(zone) ?? 0;

                            return (
                                <section
                                    key={zone}
                                    className="bg-card overflow-hidden rounded-2xl border shadow-sm"
                                >
                                    <div className="bg-muted/20 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-background flex size-9 items-center justify-center rounded-lg border font-mono text-sm font-bold shadow-sm">
                                                {zone}
                                            </span>
                                            <div>
                                                <h2 className="text-sm font-semibold">
                                                    Cabinet {zone}
                                                </h2>
                                                <p className="text-muted-foreground text-[11px]">
                                                    {totalInZone} drawers ·{' '}
                                                    {freeInZone} free
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-[11px]',
                                                freeInZone > 0
                                                    ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {freeInZone} available
                                        </Badge>
                                    </div>

                                    <div className="p-3 md:p-4">
                                        <div className="from-muted/50 to-muted/10 dark:from-muted/20 rounded-xl border bg-gradient-to-b p-3 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] dark:to-transparent">
                                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                                                {list.map((drawer) => (
                                                    <DrawerTile
                                                        key={drawer.code}
                                                        drawer={drawer}
                                                        onCopy={copyCode}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}

                <p className="text-muted-foreground text-center text-[11px]">
                    Tip: click any drawer to copy its code.
                </p>
            </div>
        </>
    );
}

DrawersPage.layout = {
    breadcrumbs: [{ title: 'Free Drawers', href: '/admin/locker/drawers' }],
} as const;
