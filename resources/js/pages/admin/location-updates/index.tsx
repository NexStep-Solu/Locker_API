import { Head, Link, router } from '@inertiajs/react';
import { DrawerTag } from '@/components/drawer-tag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';

type LocationEvent = {
    id: number;
    event_id: string;
    bag_no: string;
    voucher_no: string;
    old_location: string | null;
    new_location: string | null;
    old_drawer_code: string | null;
    new_drawer_code: string | null;
    movement_type: string;
    occurred_at: string;
    status: string;
};

type Paginator = {
    data: LocationEvent[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total?: number;
    from?: number | null;
    to?: number | null;
};

const movementLabel = (movement: string) => {
    switch ((movement ?? '').toUpperCase()) {
        case 'CONSOLIDATION':
            return 'Tidying up';
        case 'IN':
            return 'Stored';
        case 'OUT':
            return 'Collected';
        case 'RELOCATION':
            return 'Moved';
        default:
            return movement || 'Moved';
    }
};

const statusLabel = (status: string) => {
    switch ((status ?? '').toUpperCase()) {
        case 'PROCESSED':
            return 'Done';
        case 'RECEIVED':
            return 'Received';
        case 'DUPLICATE':
            return 'Already done';
        default:
            return status;
    }
};

const statusVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    switch ((status ?? '').toUpperCase()) {
        case 'PROCESSED':
            return 'default';
        case 'DUPLICATE':
            return 'secondary';
        default:
            return 'outline';
    }
};

export default function LocationUpdatesIndex({
    events,
    filters,
}: {
    events: Paginator;
    filters: { search?: string; movementType?: string; status?: string };
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [movementType, setMovementType] = useState(
        filters.movementType || 'all',
    );
    const [status, setStatus] = useState(filters.status || 'all');

    const apply = () => {
        router.get(
            '/admin/location-updates',
            {
                search: search || undefined,
                movementType: movementType === 'all' ? undefined : movementType,
                status: status === 'all' ? undefined : status,
            },
            { preserveState: true, replace: true },
        );
    };

    const clear = () => {
        setSearch('');
        setMovementType('all');
        setStatus('all');
        router.get(
            '/admin/location-updates',
            {},
            { preserveState: true, replace: true },
        );
    };

    const hasFilters =
        Boolean(filters.search) ||
        Boolean(filters.movementType) ||
        Boolean(filters.status);
    const total = events.total ?? events.data.length;

    return (
        <>
            <Head title="Bag moves" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase">
                            <MapPin className="size-3.5" aria-hidden />
                            Bag moves
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Bags moved by locker staff
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            When staff move a bag to tidy up, the new drawer
                            shows here automatically.
                        </p>
                    </div>
                    <Badge variant="outline" className="mt-1 text-xs">
                        {total} move{total === 1 ? '' : 's'}
                    </Badge>
                </div>

                <div className="bg-card rounded-xl border p-3 shadow-sm">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply();
                        }}
                        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
                    >
                        <div className="relative min-w-[200px] flex-1">
                            <Search
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                aria-hidden
                            />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search bag or voucher…"
                                aria-label="Search bag moves"
                                className="pl-9"
                            />
                        </div>
                        <Select
                            value={movementType}
                            onValueChange={setMovementType}
                        >
                            <SelectTrigger
                                className="w-full sm:w-[160px]"
                                aria-label="Filter by reason"
                            >
                                <SelectValue placeholder="All reasons" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All reasons</SelectItem>
                                <SelectItem value="CONSOLIDATION">
                                    Tidying up
                                </SelectItem>
                                <SelectItem value="IN">Stored</SelectItem>
                                <SelectItem value="OUT">Collected</SelectItem>
                                <SelectItem value="RELOCATION">
                                    Moved
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger
                                className="w-full sm:w-[140px]"
                                aria-label="Filter by result"
                            >
                                <SelectValue placeholder="All results" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All results</SelectItem>
                                <SelectItem value="PROCESSED">Done</SelectItem>
                                <SelectItem value="RECEIVED">
                                    Received
                                </SelectItem>
                                <SelectItem value="DUPLICATE">
                                    Already done
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {hasFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={clear}
                            >
                                <X className="size-4" aria-hidden />
                                Clear
                            </Button>
                        )}
                        <Button type="submit" variant="secondary">
                            <Search className="size-4" aria-hidden />
                            Search
                        </Button>
                    </form>
                </div>

                <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 text-muted-foreground border-b text-left text-[11px] tracking-wider uppercase">
                                    <th className="px-4 py-3 font-medium">
                                        Bag
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Voucher
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Moved
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                                        Why
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Result
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                        When
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.data.map((event) => (
                                    <tr
                                        key={event.id}
                                        className="hover:bg-muted/40 border-b transition-colors last:border-0"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/admin/bags/${encodeURIComponent(event.bag_no)}`}
                                                className="font-mono text-sm font-medium underline-offset-4 hover:underline"
                                            >
                                                {event.bag_no}
                                            </Link>
                                        </td>
                                        <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">
                                            {event.voucher_no || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-muted-foreground font-mono text-xs">
                                                    {event.old_drawer_code ||
                                                        event.old_location ||
                                                        '—'}
                                                </span>
                                                <ArrowRight
                                                    className="text-muted-foreground size-3"
                                                    aria-hidden
                                                />
                                                <DrawerTag
                                                    code={
                                                        event.new_drawer_code ||
                                                        event.new_location
                                                    }
                                                    emptyLabel="—"
                                                />
                                            </div>
                                        </td>
                                        <td className="hidden px-4 py-3 md:table-cell">
                                            <Badge
                                                variant="outline"
                                                className="text-[11px]"
                                            >
                                                {movementLabel(
                                                    event.movement_type,
                                                )}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={statusVariant(
                                                    event.status,
                                                )}
                                            >
                                                {statusLabel(event.status)}
                                            </Badge>
                                        </td>
                                        <td className="text-muted-foreground hidden px-4 py-3 text-xs lg:table-cell">
                                            {new Date(
                                                event.occurred_at,
                                            ).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}

                                {events.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-16 text-center"
                                        >
                                            <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
                                                <MapPin
                                                    className="text-muted-foreground size-6"
                                                    aria-hidden
                                                />
                                            </div>
                                            <h2 className="mt-3 text-sm font-semibold">
                                                {hasFilters
                                                    ? 'No moves match'
                                                    : 'No moves yet'}
                                            </h2>
                                            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">
                                                {hasFilters
                                                    ? 'Try a different bag, reason or result.'
                                                    : 'Moves will appear here when locker staff tidy up.'}
                                            </p>
                                            {hasFilters && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mt-4"
                                                    onClick={clear}
                                                >
                                                    Clear filters
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-xs">
                            {typeof events.total === 'number' ? (
                                <>
                                    Showing{' '}
                                    <span className="text-foreground font-medium">
                                        {events.from ?? 0}–{events.to ?? 0}
                                    </span>{' '}
                                    of{' '}
                                    <span className="text-foreground font-medium">
                                        {events.total}
                                    </span>{' '}
                                    moves
                                </>
                            ) : (
                                `${events.data.length} moves`
                            )}
                        </p>

                        <div className="flex flex-wrap items-center gap-1">
                            {events.links.map((link, index) => {
                                const isPrevious =
                                    link.label.includes('Previous');
                                const isNext = link.label.includes('Next');

                                return (
                                    <Button
                                        key={index}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() =>
                                            link.url && router.visit(link.url)
                                        }
                                        aria-current={
                                            link.active ? 'page' : undefined
                                        }
                                        aria-label={
                                            isPrevious
                                                ? 'Previous page'
                                                : isNext
                                                  ? 'Next page'
                                                  : undefined
                                        }
                                        className={cn(
                                            'min-w-8 px-2',
                                            link.active &&
                                                'pointer-events-none',
                                        )}
                                    >
                                        {isPrevious ? (
                                            <ChevronLeft
                                                className="size-4"
                                                aria-hidden
                                            />
                                        ) : isNext ? (
                                            <ChevronRight
                                                className="size-4"
                                                aria-hidden
                                            />
                                        ) : (
                                            <span
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

LocationUpdatesIndex.layout = {
    breadcrumbs: [{ title: 'Bag Moves', href: '/admin/location-updates' }],
} as const;
