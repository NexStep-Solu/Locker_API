import { Head, Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { dashboard, login } from '@/routes';
import {
    ArrowDown,
    ArrowLeftRight,
    ArrowRight,
    ArrowUpRight,
    CheckCircle2,
    FileText,
    ListChecks,
    MapPin,
    Package,
    Plus,
    QrCode,
    ScanLine,
    Search,
    ShieldCheck,
    WifiOff,
} from 'lucide-react';

type WelcomeProps = {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        } | null;
    };
    name: string;
};

const steps = [
    {
        number: '01',
        icon: ScanLine,
        title: 'Scan the bags',
        description:
            'Use a USB scanner, the camera, or type the bag number. Add the voucher and choose a drawer for each bag.',
    },
    {
        number: '02',
        icon: ListChecks,
        title: 'Send to the locker',
        description:
            'Review the list and send it. The screen shows which bags were stored and which ones need another look.',
    },
    {
        number: '03',
        icon: Search,
        title: 'Find it later',
        description:
            'Search by bag or voucher number. Open the bag to see its current drawer and every move made by locker staff.',
    },
];

const features = [
    {
        icon: Package,
        title: 'Store a whole batch at once',
        description:
            'Scan several bags in one go, add the vouchers, and send the list together. Clear results show what was stored and what still needs attention.',
    },
    {
        icon: Search,
        title: 'Find any bag in seconds',
        description:
            'Search by bag number or voucher number. The bag page shows the exact drawer, even if the bag has moved since it was first stored.',
    },
    {
        icon: ArrowLeftRight,
        title: 'Follow every locker move',
        description:
            'When locker staff move a bag to a new drawer, the updated location appears here automatically. No phone calls or sticky notes needed.',
    },
    {
        icon: ShieldCheck,
        title: 'Catch problems early',
        description:
            'Check the locker connection, see failed sends, and read the reason in plain language, before a small issue slows down the counter.',
    },
];

const faqs = [
    {
        question: 'Do we need an internet connection?',
        answer: 'No. Pawn Locker runs on your shop’s local network. You can keep scanning, storing, and looking up bags without an internet connection.',
    },
    {
        question: 'What happens if the locker does not respond?',
        answer: 'The list is saved. Bags that were not stored wait for another try, and sending the same list again will not create duplicates. Open the batch to see exactly what needs attention.',
    },
    {
        question: 'How do I find a bag for a customer?',
        answer: 'Open Bags and search for the bag or voucher number. The bag page shows the current drawer and every move made by locker staff.',
    },
    {
        question: 'A bag was moved. Do I need to update anything?',
        answer: 'No. When locker staff move a bag inside the locker, the new drawer appears here automatically. The locker always opens the current drawer, even if an old printed slip shows a different one.',
    },
    {
        question: 'Who can get a login?',
        answer: 'Each staff member should use their own login. Ask your shop manager if you need an account or help signing in.',
    },
];

const guides = [
    {
        title: 'Shop guide',
        description: 'POS, counter, and bag storage',
        href: '/docs/pos',
    },
    {
        title: 'Locker guide',
        description: 'Locker setup and callbacks',
        href: '/docs/locker',
    },
];

export default function Welcome() {
    const { auth, name } = usePage().props as unknown as WelcomeProps;
    const appName = name || 'Pawn Locker';
    const loggedIn = Boolean(auth.user);
    const primaryHref = loggedIn ? dashboard() : login();
    const primaryLabel = loggedIn
        ? 'Open the dashboard'
        : 'Log in to get started';
    const year = new Date().getFullYear();

    return (
        <>
            <Head title="Bag storage made simple">
                <meta
                    name="description"
                    content="Scan pawn shop bags, store them in the locker, and find any bag in seconds. Pawn Locker works on your shop's local network."
                />
            </Head>

            <div className="bg-background text-foreground min-h-screen">
                <header className="bg-background/85 sticky top-0 z-50 border-b backdrop-blur-md">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                        <Link
                            href="/"
                            className="focus-visible:ring-ring focus-visible:ring-offset-background flex min-w-0 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                            <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                                <AppLogoIcon className="size-5 fill-current" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold tracking-tight">
                                    {appName}
                                </span>
                                <span className="text-muted-foreground hidden text-[11px] sm:block">
                                    Bag storage for pawn shops
                                </span>
                            </span>
                        </Link>

                        <nav
                            aria-label="Page sections"
                            className="text-muted-foreground hidden items-center gap-7 text-sm md:flex"
                        >
                            <a
                                className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                                href="#how-it-works"
                            >
                                How it works
                            </a>
                            <a
                                className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                                href="#features"
                            >
                                What you can do
                            </a>
                            <a
                                className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                                href="#help"
                            >
                                Help
                            </a>
                        </nav>

                        <Button asChild size="sm">
                            <Link href={primaryHref}>
                                {loggedIn ? 'Dashboard' : 'Log in'}
                                <ArrowRight />
                            </Link>
                        </Button>
                    </div>
                </header>

                <main>
                    <section className="relative overflow-hidden">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl"
                        />

                        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:pt-24 lg:pb-24">
                            <div>
                                <div className="bg-muted/50 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    Bag storage for pawn shops
                                </div>

                                <h1 className="mt-6 text-4xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.5rem]">
                                    Know exactly where{' '}
                                    <span className="underline decoration-emerald-500/50 decoration-[3px] underline-offset-[6px]">
                                        every bag
                                    </span>{' '}
                                    is.
                                </h1>

                                <p className="text-muted-foreground mt-5 max-w-xl text-base leading-7 sm:text-[17px]">
                                    Scan bags at the counter, send them to the
                                    locker, and find any bag in seconds. No
                                    spreadsheets, no guessing, and no internet
                                    required.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="h-11 px-5 text-[15px]"
                                    >
                                        <Link href={primaryHref}>
                                            {primaryLabel}
                                            <ArrowRight />
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="outline"
                                        className="h-11 px-5 text-[15px]"
                                    >
                                        <a href="#how-it-works">
                                            See how it works
                                            <ArrowDown />
                                        </a>
                                    </Button>
                                </div>

                                <div className="text-muted-foreground mt-5 flex items-center gap-2 text-xs">
                                    <ShieldCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    Built for staff, not IT. If you can scan a
                                    barcode, you can use it.
                                </div>
                            </div>

                            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                                <div
                                    aria-hidden="true"
                                    className="absolute -inset-4 rounded-[2rem] bg-emerald-500/[0.06]"
                                />

                                <div className="bg-card relative overflow-hidden rounded-3xl border shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
                                    <div className="flex items-center justify-between border-b border-dashed px-5 py-4 sm:px-6">
                                        <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.16em] uppercase">
                                            <Package className="size-3.5" />
                                            Bag record
                                        </div>
                                        <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-medium">
                                            Example
                                        </span>
                                    </div>

                                    <div className="px-5 py-5 sm:px-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-muted-foreground text-xs">
                                                    Bag number
                                                </p>
                                                <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                                                    BAG-00482
                                                </p>
                                            </div>
                                            <div className="bg-muted/40 flex size-12 items-center justify-center rounded-xl border">
                                                <QrCode className="text-muted-foreground size-6" />
                                            </div>
                                        </div>

                                        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4">
                                            <div>
                                                <p className="text-muted-foreground text-xs">
                                                    Voucher
                                                </p>
                                                <p className="mt-0.5 font-mono text-sm">
                                                    PV-2026-1042
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">
                                                    Stored
                                                </p>
                                                <p className="mt-0.5 text-sm">
                                                    Today, 9:41 AM
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-muted/30 mt-5 rounded-2xl border p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-muted-foreground text-xs">
                                                    Current drawer
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                                    Up to date
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-baseline gap-2">
                                                <span className="text-3xl font-semibold tracking-tight">
                                                    D014
                                                </span>
                                                <span className="text-muted-foreground text-xs">
                                                    Zone C · Row 1
                                                </span>
                                            </div>
                                        </div>

                                        <ol className="mt-5 space-y-4">
                                            <li className="flex gap-3">
                                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Stored from the counter
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        Today, 9:41 AM
                                                    </p>
                                                </div>
                                            </li>
                                            <li className="flex gap-3">
                                                <ArrowLeftRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Moved by locker staff
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        Today, 10:12 AM · D008 →
                                                        D014
                                                    </p>
                                                </div>
                                            </li>
                                            <li className="flex gap-3">
                                                <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Ready when the customer
                                                        returns
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        The locker keeps this
                                                        location current.
                                                    </p>
                                                </div>
                                            </li>
                                        </ol>
                                    </div>

                                    <div className="bg-muted/40 text-muted-foreground border-t px-5 py-3 text-xs sm:px-6">
                                        Every scan and drawer move stays in the
                                        full history.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-muted/30 border-y">
                        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:grid-cols-3 sm:gap-0 sm:px-6">
                            <div className="flex gap-3 sm:pr-6">
                                <WifiOff className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div>
                                    <p className="text-sm font-medium">
                                        Works offline
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                                        The shop keeps working when the internet
                                        does not.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 sm:border-l sm:px-6">
                                <ScanLine className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div>
                                    <p className="text-sm font-medium">
                                        Fits your counter
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                                        Use a USB scanner, the camera, or type.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 sm:border-l sm:pl-6">
                                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div>
                                    <p className="text-sm font-medium">
                                        One clear record
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                                        Every bag keeps its own location and
                                        history.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="how-it-works" className="scroll-mt-20">
                        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
                            <div className="max-w-2xl">
                                <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-400">
                                    How it works
                                </p>
                                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                    From the counter to the drawer.
                                </h2>
                                <p className="text-muted-foreground mt-4 text-base leading-7">
                                    No new hardware, no complicated setup. If
                                    you can scan a barcode, you can store a bag.
                                </p>
                            </div>

                            <div className="mt-12 grid gap-8 md:grid-cols-3">
                                {steps.map((step) => (
                                    <div
                                        key={step.number}
                                        className="border-t pt-6"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground font-mono text-xs">
                                                {step.number}
                                            </span>
                                            <step.icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <h3 className="mt-4 text-base font-semibold">
                                            {step.title}
                                        </h3>
                                        <p className="text-muted-foreground mt-2 text-sm leading-6">
                                            {step.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section
                        id="features"
                        className="bg-muted/30 scroll-mt-20 border-y"
                    >
                        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
                            <div className="lg:sticky lg:top-24 lg:self-start">
                                <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-400">
                                    What you can do
                                </p>
                                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Everything your counter needs.
                                </h2>
                                <p className="text-muted-foreground mt-4 text-base leading-7">
                                    From the first scan to the customer’s
                                    pickup, the details stay in one place and
                                    stay up to date.
                                </p>
                                <Link
                                    href={primaryHref}
                                    className="group focus-visible:ring-ring focus-visible:ring-offset-background mt-6 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none dark:text-emerald-400 dark:hover:text-emerald-300"
                                >
                                    {loggedIn
                                        ? 'Open the dashboard'
                                        : 'Log in to explore'}
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            </div>

                            <div className="divide-y">
                                {features.map((feature) => (
                                    <div
                                        key={feature.title}
                                        className="flex gap-4 py-6 first:pt-0 last:pb-0 sm:gap-5"
                                    >
                                        <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-xl border">
                                            <feature.icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-semibold">
                                                {feature.title}
                                            </h3>
                                            <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="help" className="scroll-mt-20">
                        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-400">
                                    Help at the counter
                                </p>
                                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Questions we hear a lot.
                                </h2>
                                <p className="text-muted-foreground mt-4 text-base leading-7">
                                    Short answers for busy days. If something is
                                    still unclear, your shop manager can help.
                                </p>

                                <div className="bg-card mt-8 rounded-2xl border p-5">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                                        Setup guides
                                    </div>
                                    <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                                        Step-by-step instructions for the shop
                                        computer and the locker machine.
                                    </p>
                                    <div className="mt-4 grid gap-2">
                                        {guides.map((guide) => (
                                            <a
                                                key={guide.href}
                                                href={guide.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group bg-background hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                            >
                                                <span>
                                                    <span className="block text-sm font-medium">
                                                        {guide.title}
                                                    </span>
                                                    <span className="text-muted-foreground block text-xs">
                                                        {guide.description}
                                                    </span>
                                                </span>
                                                <ArrowUpRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="border-y">
                                {faqs.map((faq) => (
                                    <details
                                        key={faq.question}
                                        className="group border-b py-5 last:border-b-0"
                                    >
                                        <summary className="focus-visible:ring-ring focus-visible:ring-offset-background flex cursor-pointer list-none items-start justify-between gap-4 rounded-sm text-[15px] font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                                            {faq.question}
                                            <Plus className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform duration-200 group-open:rotate-45" />
                                        </summary>
                                        <p className="text-muted-foreground mt-3 max-w-xl pr-8 text-sm leading-6">
                                            {faq.answer}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
                        <div className="bg-foreground text-background relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 lg:px-12">
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-emerald-400/15 blur-3xl"
                            />
                            <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
                                <div className="max-w-xl">
                                    <p className="text-background/60 text-xs font-semibold tracking-[0.18em] uppercase">
                                        Ready when you are
                                    </p>
                                    <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                                        Less searching. More time with
                                        customers.
                                    </h2>
                                    <p className="text-background/70 mt-2 text-sm leading-6">
                                        Log in to store bags, find a bag, or see
                                        what needs attention today.
                                    </p>
                                </div>
                                <Button
                                    asChild
                                    size="lg"
                                    className="bg-background text-foreground hover:bg-background/90 h-11 shrink-0 px-5 text-[15px]"
                                >
                                    <Link href={primaryHref}>
                                        {primaryLabel}
                                        <ArrowRight />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-t">
                    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                                <AppLogoIcon className="size-4 fill-current" />
                            </span>
                            <div>
                                <p className="text-sm font-medium">{appName}</p>
                                <p className="text-muted-foreground text-xs">
                                    Bag storage for pawn shops
                                </p>
                            </div>
                        </div>

                        <nav
                            aria-label="Footer"
                            className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm"
                        >
                            <a
                                className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                                href="#how-it-works"
                            >
                                How it works
                            </a>
                            <a
                                className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                                href="#help"
                            >
                                Help
                            </a>
                            <a
                                className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                                href="/docs/pos"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Shop guide
                                <ArrowUpRight className="size-3" />
                            </a>
                            <a
                                className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                                href="/docs/locker"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Locker guide
                                <ArrowUpRight className="size-3" />
                            </a>
                        </nav>
                    </div>

                    <div className="border-t">
                        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <p>
                                © {year} {appName}
                            </p>
                            <p className="inline-flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Runs on your shop’s local network
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
