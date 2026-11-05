import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { copyText } from '@/lib/clipboard';
import { friendlyLockerError } from '@/lib/locker-errors';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Copy,
    History,
    MapPin,
    Printer,
    QrCode,
    RefreshCw,
    TriangleAlert,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type Bag = {
    bag_no: string;
    voucher_no: string | null;
    voucher_date: string | null;
    current_location: string | null;
    current_drawer_code: string | null;
    last_locker_event_id: string | null;
    last_locker_update_at: string | null;
};

type BagEvent = {
    event_id: string;
    old_location: string | null;
    new_location: string | null;
    old_drawer_code: string | null;
    new_drawer_code: string | null;
    movement_type: string;
    occurred_at: string;
    status: string;
};

type LockerBag = {
    bagNo?: string;
    voucherNo?: string | null;
    status?: string | null;
    drawerCode?: string | null;
    updatedAt?: string | null;
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

const eventVariant = (status: string): 'default' | 'secondary' | 'outline' => {
    switch ((status ?? '').toUpperCase()) {
        case 'PROCESSED':
            return 'default';
        case 'DUPLICATE':
            return 'secondary';
        default:
            return 'outline';
    }
};

const eventStatusLabel = (status: string) => {
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

const escapeHtml = (value: string) =>
    value.replace(
        /[&<>"']/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[character] ?? character,
    );

export default function BagShow({
    bag,
    events,
}: {
    bag: Bag;
    events: BagEvent[];
}) {
    const printRef = useRef<HTMLDivElement>(null);
    const [lockerBag, setLockerBag] = useState<LockerBag | null>(null);
    const [lockerLoading, setLockerLoading] = useState(false);
    const [lockerError, setLockerError] = useState<string | null>(null);

    const drawer = bag.current_drawer_code || bag.current_location;
    const outQrValue = bag.bag_no;

    const copyBagNo = async () => {
        try {
            await copyText(bag.bag_no);
            toast.success('Bag number copied');
        } catch {
            toast.error('Could not copy the bag number');
        }
    };

    const verifyWithLocker = async () => {
        setLockerLoading(true);
        setLockerError(null);
        setLockerBag(null);

        try {
            const r = await fetch(
                `/admin/locker/bags/${encodeURIComponent(bag.bag_no)}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );
            const j = await r.json().catch(() => null);

            if (j?.success && j.data) {
                setLockerBag(j.data as LockerBag);
            } else {
                setLockerError(
                    friendlyLockerError(j, 'Not found in the locker'),
                );
            }
        } catch (e) {
            setLockerError(e instanceof Error ? e.message : String(e));
        } finally {
            setLockerLoading(false);
        }
    };

    const handlePrint = () => {
        const el = printRef.current;
        if (!el) return;

        const w = window.open('', '_blank', 'width=320,height=480');
        if (!w) return;

        w.document.write(
            `<html><head><title>OUT QR ${escapeHtml(bag.bag_no)}</title><style>body{font-family:monospace;text-align:center;padding:20px} h1{font-size:14px} p{font-size:10px;color:#666} @media print{button{display:none}}</style></head><body>${el.innerHTML}<p>Bag: ${escapeHtml(bag.bag_no)}<br/>Voucher: ${escapeHtml(bag.voucher_no || '-')}<br/>Drawer: ${escapeHtml(drawer || '-')}<br/>Printed: ${escapeHtml(new Date().toLocaleString())}</p><button onclick="window.print()">Print</button></body></html>`,
        );
        w.document.close();
        setTimeout(() => w.print(), 300);
    };

    const agrees =
        Boolean(lockerBag?.drawerCode) && lockerBag?.drawerCode === drawer;

    return (
        <>
            <Head title={`Bag ${bag.bag_no}`} />
            <div className="space-y-6 p-4 md:p-6">
                <div>
                    <Link
                        href="/admin/bags"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
                    >
                        <ArrowLeft className="size-3.5" aria-hidden />
                        All bags
                    </Link>

                    <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="font-mono text-2xl font-semibold tracking-tight">
                                    {bag.bag_no}
                                </h1>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={() => void copyBagNo()}
                                    aria-label="Copy bag number"
                                >
                                    <Copy className="size-3.5" aria-hidden />
                                </Button>
                                <Badge variant={drawer ? 'default' : 'outline'}>
                                    {drawer ? 'In locker' : 'Not stored'}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Voucher {bag.voucher_no || '—'}
                                {bag.voucher_date
                                    ? ` · ${bag.voucher_date}`
                                    : ''}
                            </p>
                        </div>

                        <Button size="sm" onClick={handlePrint}>
                            <Printer className="size-4" aria-hidden />
                            Print pickup QR
                        </Button>
                    </div>
                </div>

                <Card className="overflow-hidden py-0">
                    <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="p-5 md:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
                                        Current drawer
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        The locker reports this location.
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void verifyWithLocker()}
                                    disabled={lockerLoading}
                                >
                                    {lockerLoading ? (
                                        <Spinner />
                                    ) : (
                                        <RefreshCw
                                            className="size-4"
                                            aria-hidden
                                        />
                                    )}
                                    Double-check with locker
                                </Button>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-5">
                                <div
                                    className={cn(
                                        'relative flex h-28 w-48 flex-col justify-between rounded-xl border-2 p-3 shadow-inner',
                                        drawer
                                            ? 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-emerald-100/60 dark:border-emerald-800/70 dark:from-emerald-950/40 dark:to-emerald-900/20'
                                            : 'bg-muted/30 border-dashed',
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xl font-bold tracking-tight">
                                            {drawer || '—'}
                                        </span>
                                        <span
                                            className={cn(
                                                'size-2.5 rounded-full',
                                                drawer
                                                    ? 'bg-emerald-500'
                                                    : 'bg-zinc-400',
                                            )}
                                            aria-hidden
                                        />
                                    </div>
                                    <div
                                        aria-hidden
                                        className="bg-foreground/15 ring-background/60 mx-auto h-2 w-20 rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.18)] ring-1"
                                    />
                                    <span
                                        className={cn(
                                            'text-[11px] font-medium',
                                            drawer
                                                ? 'text-emerald-700 dark:text-emerald-300'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {drawer
                                            ? 'Bag stored here'
                                            : 'No drawer recorded'}
                                    </span>
                                </div>

                                <div className="max-w-sm space-y-1 text-sm">
                                    <p className="flex items-center gap-2 font-medium">
                                        <MapPin
                                            className="text-muted-foreground size-4"
                                            aria-hidden
                                        />
                                        {drawer
                                            ? 'This is where staff will find the bag.'
                                            : 'The locker has not reported a drawer yet.'}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        If the customer is at the counter,
                                        double-check the location with the
                                        locker before opening a drawer.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted/20 border-t p-5 md:border-t-0 md:border-l">
                            <dl className="space-y-3 text-sm">
                                <div>
                                    <dt className="text-muted-foreground text-[11px] tracking-wider uppercase">
                                        Voucher
                                    </dt>
                                    <dd className="mt-0.5 font-mono">
                                        {bag.voucher_no || '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground text-[11px] tracking-wider uppercase">
                                        Voucher date
                                    </dt>
                                    <dd className="mt-0.5">
                                        {bag.voucher_date || '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground text-[11px] tracking-wider uppercase">
                                        Last locker update
                                    </dt>
                                    <dd className="mt-0.5 text-xs">
                                        {bag.last_locker_update_at
                                            ? new Date(
                                                  bag.last_locker_update_at,
                                              ).toLocaleString()
                                            : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground text-[11px] tracking-wider uppercase">
                                        Last event ID
                                    </dt>
                                    <dd className="mt-0.5 truncate font-mono text-[11px]">
                                        {bag.last_locker_event_id || '—'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </Card>

                {lockerError && (
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
                                {lockerError}
                            </p>
                        </div>
                    </div>
                )}

                {lockerBag && (
                    <div
                        className={cn(
                            'flex items-start gap-3 rounded-xl border p-4',
                            agrees
                                ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                                : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
                        )}
                    >
                        {agrees ? (
                            <CheckCircle2
                                className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                aria-hidden
                            />
                        ) : (
                            <TriangleAlert
                                className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
                                aria-hidden
                            />
                        )}
                        <div>
                            <p
                                className={cn(
                                    'text-sm font-medium',
                                    agrees
                                        ? 'text-emerald-800 dark:text-emerald-200'
                                        : 'text-amber-800 dark:text-amber-200',
                                )}
                            >
                                {agrees
                                    ? 'Locker agrees'
                                    : 'The locker sees a different drawer'}
                            </p>
                            <p
                                className={cn(
                                    'mt-0.5 text-xs',
                                    agrees
                                        ? 'text-emerald-700/80 dark:text-emerald-300/80'
                                        : 'text-amber-700/80 dark:text-amber-300/80',
                                )}
                            >
                                {agrees
                                    ? `The bag is in ${drawer}.`
                                    : `Locker says ${lockerBag.drawerCode || '—'}, this page shows ${drawer || '—'}. The locker is always right.`}
                            </p>
                            {!agrees && (
                                <Link
                                    href="/admin/locker/bags"
                                    className="mt-1 inline-block text-xs underline underline-offset-2"
                                >
                                    Search in the locker →
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-2">
                            <div>
                                <CardTitle className="text-sm">
                                    Pickup QR
                                </CardTitle>
                                <CardDescription>
                                    For the customer — scan at the locker to
                                    open the drawer.
                                </CardDescription>
                            </div>
                            <QrCode
                                className="text-muted-foreground size-4 shrink-0"
                                aria-hidden
                            />
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                                <div
                                    ref={printRef}
                                    className="mx-auto rounded-xl border bg-white p-4 text-center shadow-sm"
                                >
                                    <QRCodeSVG value={outQrValue} size={160} />
                                    <div className="mt-2 font-mono text-xs text-neutral-900">
                                        {outQrValue}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <p className="text-muted-foreground text-xs">
                                        Print this only if the shop printer is
                                        not working. Normally the shop computer
                                        prints it.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" onClick={handlePrint}>
                                            <Printer
                                                className="size-4"
                                                aria-hidden
                                            />
                                            Print
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => void copyBagNo()}
                                        >
                                            <Copy
                                                className="size-4"
                                                aria-hidden
                                            />
                                            Copy bag number
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">
                                Pickup checklist
                            </CardTitle>
                            <CardDescription>
                                Quick steps at the counter.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-3 text-sm">
                                {[
                                    'Ask for the bag number or voucher.',
                                    'Check the drawer shown on this page.',
                                    'Scan the pickup QR at the locker.',
                                    'Hand the bag to the customer.',
                                ].map((step, index) => (
                                    <li
                                        key={step}
                                        className="flex items-start gap-3"
                                    >
                                        <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                                            {index + 1}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                            {step}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <History className="size-4" aria-hidden />
                                Bag history
                            </CardTitle>
                            <CardDescription>
                                Every move reported by the locker.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {events.length} move{events.length === 1 ? '' : 's'}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {events.length === 0 ? (
                            <div className="py-10 text-center">
                                <div className="bg-muted mx-auto flex size-10 items-center justify-center rounded-full">
                                    <History
                                        className="text-muted-foreground size-5"
                                        aria-hidden
                                    />
                                </div>
                                <p className="mt-2 text-sm font-medium">
                                    No moves yet
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    Moves will appear here when locker staff
                                    store or tidy this bag.
                                </p>
                            </div>
                        ) : (
                            <ol className="border-border/70 relative space-y-5 border-l pl-5">
                                {events.map((event) => (
                                    <li
                                        key={event.event_id}
                                        className="relative"
                                    >
                                        <span
                                            className="border-background bg-muted-foreground/40 absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2"
                                            aria-hidden
                                        />
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 font-mono text-sm">
                                                <span className="text-muted-foreground">
                                                    {event.old_drawer_code ||
                                                        event.old_location ||
                                                        '—'}
                                                </span>
                                                <ArrowRight
                                                    className="text-muted-foreground size-3.5"
                                                    aria-hidden
                                                />
                                                <span className="font-semibold">
                                                    {event.new_drawer_code ||
                                                        event.new_location ||
                                                        '—'}
                                                </span>
                                            </div>
                                            <Badge
                                                variant={eventVariant(
                                                    event.status,
                                                )}
                                            >
                                                {eventStatusLabel(event.status)}
                                            </Badge>
                                        </div>
                                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                            <span>
                                                {new Date(
                                                    event.occurred_at,
                                                ).toLocaleString()}
                                            </span>
                                            <span aria-hidden>·</span>
                                            <span>
                                                {movementLabel(
                                                    event.movement_type,
                                                )}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

BagShow.layout = {
    breadcrumbs: [
        { title: 'Bags', href: '/admin/bags' },
        { title: 'Details', href: '#' },
    ],
} as const;
