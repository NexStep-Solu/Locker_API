import { Head, Link, router } from '@inertiajs/react';
import { DrawerTag } from '@/components/drawer-tag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    ArrowUpRight,
    Boxes,
    ChevronLeft,
    ChevronRight,
    Download,
    PackageOpen,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';

type BagRow = {
    id: number;
    bag_no: string;
    voucher_no: string | null;
    voucher_date: string | null;
    current_location: string | null;
    current_drawer_code: string | null;
    last_locker_event_id: string | null;
    updated_at: string;
};

type Paginator = {
    data: BagRow[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total?: number;
    from?: number | null;
    to?: number | null;
    current_page?: number;
    last_page?: number;
};

export default function BagsIndex({
    bags,
    filters,
}: {
    bags: Paginator;
    filters: { search?: string };
}) {
    const [search, setSearch] = useState(filters.search || '');

    const apply = (value = search) => {
        router.get(
            '/admin/bags',
            { search: value || undefined },
            { preserveState: true, replace: true },
        );
    };

    const clear = () => {
        setSearch('');
        router.get('/admin/bags', {}, { preserveState: true, replace: true });
    };

    const total = bags.total ?? bags.data.length;

    return (
        <>
            <Head title="Bags" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase">
                            <Boxes className="size-3.5" aria-hidden />
                            Bag locations
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Where is each bag?
                        </h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            Search by bag, voucher or drawer. Use this when a
                            customer comes to collect.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {total} bag{total === 1 ? '' : 's'}
                        </Badge>
                        <a href="/admin/bags/export">
                            <Button size="sm" variant="outline">
                                <Download className="size-4" aria-hidden />
                                Export
                            </Button>
                        </a>
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
                                placeholder="Bag, voucher or drawer — e.g. BAG-00125"
                                aria-label="Search bags"
                                className="pl-9"
                            />
                        </div>
                        {filters.search && (
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
                    {filters.search && (
                        <p className="text-muted-foreground mt-2 text-xs">
                            Showing results for{' '}
                            <span className="text-foreground font-medium">
                                “{filters.search}”
                            </span>
                        </p>
                    )}
                </div>

                <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 text-muted-foreground border-b text-left text-[11px] tracking-wider uppercase">
                                    <th className="px-4 py-3 font-medium">
                                        Bag
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Voucher
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Current drawer
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Last updated
                                    </th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">Open</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {bags.data.map((bag) => (
                                    <tr
                                        key={bag.id}
                                        className="group hover:bg-muted/40 border-b transition-colors last:border-0"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/admin/bags/${encodeURIComponent(bag.bag_no)}`}
                                                className="inline-flex items-center gap-1.5 font-mono text-sm font-medium underline-offset-4 hover:underline"
                                            >
                                                {bag.bag_no}
                                                <ArrowUpRight
                                                    className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                                                    aria-hidden
                                                />
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-xs">
                                                {bag.voucher_no || '—'}
                                            </div>
                                            <div className="text-muted-foreground text-[11px]">
                                                {bag.voucher_date || ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <DrawerTag
                                                code={
                                                    bag.current_drawer_code ||
                                                    bag.current_location
                                                }
                                            />
                                        </td>
                                        <td className="text-muted-foreground hidden px-4 py-3 text-xs sm:table-cell">
                                            {new Date(
                                                bag.updated_at,
                                            ).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/admin/bags/${encodeURIComponent(bag.bag_no)}`}
                                                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
                                                aria-label={`Open ${bag.bag_no}`}
                                            >
                                                <ChevronRight
                                                    className="size-4 transition-transform group-hover:translate-x-0.5"
                                                    aria-hidden
                                                />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}

                                {bags.data.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-16 text-center"
                                        >
                                            <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
                                                <PackageOpen
                                                    className="text-muted-foreground size-6"
                                                    aria-hidden
                                                />
                                            </div>
                                            <h2 className="mt-3 text-sm font-semibold">
                                                {filters.search
                                                    ? 'No bags match your search'
                                                    : 'No bags yet'}
                                            </h2>
                                            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">
                                                {filters.search
                                                    ? `Nothing matched “${filters.search}”. Try a bag number, voucher or drawer code.`
                                                    : 'Bags will appear here after you store them in the locker.'}
                                            </p>
                                            <div className="mt-4 flex justify-center gap-2">
                                                {filters.search ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={clear}
                                                    >
                                                        Clear search
                                                    </Button>
                                                ) : (
                                                    <Link href="/admin/storage-batches/create">
                                                        <Button size="sm">
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
                            {typeof bags.total === 'number' ? (
                                <>
                                    Showing{' '}
                                    <span className="text-foreground font-medium">
                                        {bags.from ?? 0}–{bags.to ?? 0}
                                    </span>{' '}
                                    of{' '}
                                    <span className="text-foreground font-medium">
                                        {bags.total}
                                    </span>{' '}
                                    bags
                                </>
                            ) : (
                                `${bags.data.length} bags`
                            )}
                        </p>

                        <div className="flex flex-wrap items-center gap-1">
                            {bags.links.map((link, index) => {
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

BagsIndex.layout = {
    breadcrumbs: [{ title: 'Bags', href: '/admin/bags' }],
} as const;
