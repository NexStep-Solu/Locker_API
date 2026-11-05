import { Head, Link, router } from '@inertiajs/react';
import { DrawerTag } from '@/components/drawer-tag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    CheckCircle2,
    Package,
    RefreshCw,
    TriangleAlert,
} from 'lucide-react';

type BatchItem = {
    id: number;
    voucher_no: string;
    voucher_date: string;
    bag_no: string;
    location: string | null;
    drawer_code: string | null;
    status: string;
    error_code: string | null;
    error_message: string | null;
};

type Batch = {
    id: number;
    batch_no: string;
    request_id: string;
    total: number;
    accepted: number;
    rejected: number;
    status: string;
    sent_at: string | null;
    response_at: string | null;
    created_at: string;
    items: BatchItem[];
};

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

const itemLabel = (status: string) => {
    switch (status) {
        case 'ACCEPTED':
            return 'Stored';
        case 'REJECTED':
            return 'Fix drawer';
        case 'FAILED':
            return 'Failed';
        default:
            return status;
    }
};

const itemVariant = (
    status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
        case 'ACCEPTED':
            return 'default';
        case 'REJECTED':
        case 'FAILED':
            return 'destructive';
        default:
            return 'outline';
    }
};

export default function StorageBatchShow({ batch }: { batch: Batch }) {
    const canRetry = ['FAILED', 'PARTIAL', 'RETRYING'].includes(batch.status);
    const percent =
        batch.total > 0 ? Math.round((batch.accepted / batch.total) * 100) : 0;

    return (
        <>
            <Head title={`List ${batch.batch_no}`} />
            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <Link
                        href="/admin/storage-batches"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
                    >
                        <ArrowLeft className="size-3.5" aria-hidden />
                        All storage lists
                    </Link>

                    <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="font-mono text-2xl font-semibold tracking-tight">
                                    {batch.batch_no}
                                </h1>
                                <Badge variant={statusVariant(batch.status)}>
                                    {friendlyStatus(batch.status)}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {batch.accepted} of {batch.total} bags stored OK
                                {batch.rejected > 0
                                    ? `, ${batch.rejected} need${batch.rejected === 1 ? 's' : ''} a fix`
                                    : ''}
                                .
                            </p>
                        </div>

                        {canRetry && (
                            <Button
                                size="sm"
                                onClick={() =>
                                    router.post(
                                        `/admin/storage-batches/${batch.id}/retry`,
                                    )
                                }
                            >
                                <RefreshCw className="size-4" aria-hidden />
                                Try failed ones again
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                                <Package className="size-5" aria-hidden />
                            </span>
                            <div>
                                <div className="text-2xl leading-none font-semibold tabular-nums">
                                    {batch.total}
                                </div>
                                <div className="mt-1 text-xs font-medium">
                                    Bags in list
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <CheckCircle2 className="size-5" aria-hidden />
                            </span>
                            <div>
                                <div className="text-2xl leading-none font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
                                    {batch.accepted}
                                </div>
                                <div className="mt-1 text-xs font-medium">
                                    Stored OK
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span
                                className={cn(
                                    'flex size-10 items-center justify-center rounded-lg',
                                    batch.rejected > 0
                                        ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                                        : 'bg-muted text-muted-foreground',
                                )}
                            >
                                <TriangleAlert className="size-5" aria-hidden />
                            </span>
                            <div>
                                <div
                                    className={cn(
                                        'text-2xl leading-none font-semibold tabular-nums',
                                        batch.rejected > 0
                                            ? 'text-red-700 dark:text-red-300'
                                            : 'text-foreground',
                                    )}
                                >
                                    {batch.rejected}
                                </div>
                                <div className="mt-1 text-xs font-medium">
                                    Need a fix
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <div className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                            Sent to locker
                        </div>
                        <div className="mt-2 text-xs">
                            {batch.sent_at
                                ? new Date(batch.sent_at).toLocaleString()
                                : 'Not sent yet'}
                        </div>
                        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                            <div
                                className={cn(
                                    'h-full rounded-full',
                                    batch.rejected > 0
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500',
                                )}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <CardTitle className="text-sm">
                            Bags in this list
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                            {batch.items.length} item
                            {batch.items.length === 1 ? '' : 's'}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 text-muted-foreground border-y text-left text-[11px] tracking-wider uppercase">
                                        <th className="px-4 py-3 font-medium">
                                            Bag
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Voucher
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium md:table-cell">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Drawer
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Result
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            What went wrong
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batch.items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-muted/40 border-b transition-colors last:border-0"
                                        >
                                            <td className="px-4 py-3 font-mono text-sm">
                                                {item.bag_no}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {item.voucher_no}
                                            </td>
                                            <td className="text-muted-foreground hidden px-4 py-3 text-xs md:table-cell">
                                                {item.voucher_date}
                                            </td>
                                            <td className="px-4 py-3">
                                                <DrawerTag
                                                    code={
                                                        item.drawer_code ||
                                                        item.location
                                                    }
                                                    emptyLabel="—"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={itemVariant(
                                                        item.status,
                                                    )}
                                                >
                                                    {itemLabel(item.status)}
                                                </Badge>
                                            </td>
                                            <td className="text-muted-foreground max-w-[280px] px-4 py-3 text-xs">
                                                <span
                                                    className="block truncate"
                                                    title={
                                                        item.error_message ||
                                                        (item.status ===
                                                        'ACCEPTED'
                                                            ? undefined
                                                            : 'Check the drawer and try again')
                                                    }
                                                >
                                                    {item.error_message ||
                                                        (item.status ===
                                                        'ACCEPTED'
                                                            ? '—'
                                                            : 'Check the drawer and try again')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}

                                    {batch.items.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="text-muted-foreground px-6 py-12 text-center text-xs"
                                            >
                                                No bags in this list.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/storage-batches">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="size-4" aria-hidden />
                            Back to all lists
                        </Button>
                    </Link>
                    {canRetry && (
                        <Button
                            size="sm"
                            onClick={() =>
                                router.post(
                                    `/admin/storage-batches/${batch.id}/retry`,
                                )
                            }
                        >
                            <RefreshCw className="size-4" aria-hidden />
                            Try failed ones again
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}

StorageBatchShow.layout = {
    breadcrumbs: [
        { title: 'Store Bags', href: '/admin/storage-batches' },
        { title: 'Details', href: '#' },
    ],
} as const;
