import { Head, Link, router } from '@inertiajs/react';
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
    ChevronLeft,
    ChevronRight,
    Package,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';

const friendlyStatus = (status: string) => {
    switch (status) {
        case 'COMPLETED':
            return 'Stored';
        case 'PARTIAL':
            return 'Partly stored';
        case 'FAILED':
            return 'Needs attention';
        case 'PENDING':
            return 'Waiting';
        case 'PROCESSING':
            return 'Sending…';
        case 'RETRYING':
            return 'Retrying…';
        default:
            return status;
    }
};

const statusVariant = (
    status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
        case 'COMPLETED':
            return 'default';
        case 'FAILED':
            return 'destructive';
        case 'PARTIAL':
            return 'secondary';
        default:
            return 'outline';
    }
};

type BatchRow = {
    id: number;
    batch_no: string;
    total: number;
    accepted: number;
    rejected: number;
    status: string;
    created_at: string;
};

type Paginator = {
    data: BatchRow[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total?: number;
    from?: number | null;
    to?: number | null;
};

export default function StorageBatchesIndex({
    batches,
    filters,
}: {
    batches: Paginator;
    filters: { status?: string; search?: string };
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');

    const apply = () => {
        router.get(
            '/admin/storage-batches',
            {
                search: search || undefined,
                status: status === 'all' ? undefined : status,
            },
            { preserveState: true, replace: true },
        );
    };

    const clear = () => {
        setSearch('');
        setStatus('all');
        router.get(
            '/admin/storage-batches',
            {},
            { preserveState: true, replace: true },
        );
    };

    const hasFilters = Boolean(filters.search) || Boolean(filters.status);
    const total = batches.total ?? batches.data.length;

    return (
        <>
            <Head title="Store Bags" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase">
                            <Package className="size-3.5" aria-hidden />
                            Store bags
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Storage lists
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            Each list is a group of bags you sent to the locker
                            together.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {total} list{total === 1 ? '' : 's'}
                        </Badge>
                        <Link href="/admin/storage-batches/create">
                            <Button size="sm">
                                <Plus className="size-4" aria-hidden />
                                Store new bags
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="bg-card rounded-xl border p-3 shadow-sm">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply();
                        }}
                        className="flex flex-col gap-2 sm:flex-row"
                    >
                        <div className="relative flex-1">
                            <Search
                                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                aria-hidden
                            />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by list number…"
                                aria-label="Search storage lists"
                                className="pl-9"
                            />
                        </div>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger
                                className="w-full sm:w-[180px]"
                                aria-label="Filter by result"
                            >
                                <SelectValue placeholder="All results" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All results</SelectItem>
                                <SelectItem value="PENDING">Waiting</SelectItem>
                                <SelectItem value="PROCESSING">
                                    Sending…
                                </SelectItem>
                                <SelectItem value="COMPLETED">
                                    Stored
                                </SelectItem>
                                <SelectItem value="PARTIAL">
                                    Partly stored
                                </SelectItem>
                                <SelectItem value="FAILED">
                                    Needs attention
                                </SelectItem>
                                <SelectItem value="RETRYING">
                                    Retrying…
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
                                        List
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Bags
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Stored OK
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Need fix
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Result
                                    </th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">Open</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.data.map((batch) => {
                                    const percent =
                                        batch.total > 0
                                            ? Math.round(
                                                  (batch.accepted /
                                                      batch.total) *
                                                      100,
                                              )
                                            : 0;

                                    return (
                                        <tr
                                            key={batch.id}
                                            className="group hover:bg-muted/40 border-b transition-colors last:border-0"
                                        >
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/admin/storage-batches/${batch.id}`}
                                                    className="font-mono text-sm font-medium underline-offset-4 hover:underline"
                                                >
                                                    {batch.batch_no}
                                                </Link>
                                                <div className="bg-muted mt-1 h-1 w-24 overflow-hidden rounded-full">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full',
                                                            batch.rejected > 0
                                                                ? 'bg-amber-500'
                                                                : 'bg-emerald-500',
                                                        )}
                                                        style={{
                                                            width: `${percent}%`,
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="text-muted-foreground hidden px-4 py-3 text-xs sm:table-cell">
                                                {new Date(
                                                    batch.created_at,
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-center tabular-nums">
                                                {batch.total}
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
                                                {batch.accepted}
                                            </td>
                                            <td
                                                className={cn(
                                                    'px-4 py-3 text-center font-medium tabular-nums',
                                                    batch.rejected > 0
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {batch.rejected}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={statusVariant(
                                                        batch.status,
                                                    )}
                                                >
                                                    {friendlyStatus(
                                                        batch.status,
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={`/admin/storage-batches/${batch.id}`}
                                                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
                                                    aria-label={`Open list ${batch.batch_no}`}
                                                >
                                                    <ChevronRight
                                                        className="size-4 transition-transform group-hover:translate-x-0.5"
                                                        aria-hidden
                                                    />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {batches.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-16 text-center"
                                        >
                                            <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
                                                <Package
                                                    className="text-muted-foreground size-6"
                                                    aria-hidden
                                                />
                                            </div>
                                            <h2 className="mt-3 text-sm font-semibold">
                                                {hasFilters
                                                    ? 'No lists match'
                                                    : 'No lists yet'}
                                            </h2>
                                            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">
                                                {hasFilters
                                                    ? 'Try a different list number or result filter.'
                                                    : 'Store your first group of bags to see it here.'}
                                            </p>
                                            <div className="mt-4 flex justify-center gap-2">
                                                {hasFilters ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={clear}
                                                    >
                                                        Clear filters
                                                    </Button>
                                                ) : (
                                                    <Link href="/admin/storage-batches/create">
                                                        <Button size="sm">
                                                            <Plus
                                                                className="size-4"
                                                                aria-hidden
                                                            />
                                                            Store new bags
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-xs">
                            {typeof batches.total === 'number' ? (
                                <>
                                    Showing{' '}
                                    <span className="text-foreground font-medium">
                                        {batches.from ?? 0}–{batches.to ?? 0}
                                    </span>{' '}
                                    of{' '}
                                    <span className="text-foreground font-medium">
                                        {batches.total}
                                    </span>{' '}
                                    lists
                                </>
                            ) : (
                                `${batches.data.length} lists`
                            )}
                        </p>

                        <div className="flex flex-wrap items-center gap-1">
                            {batches.links.map((link, index) => {
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

StorageBatchesIndex.layout = {
    breadcrumbs: [{ title: 'Store Bags', href: '/admin/storage-batches' }],
} as const;
