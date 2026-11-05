import { Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact drawer indicator used outside the cabinet page.
 * The subtle inset highlight and handle keep the same physical-drawer
 * language as the Free Drawers cabinet without taking over the layout.
 */
export function DrawerTag({
    code,
    emptyLabel = 'Not stored',
    className,
}: {
    code?: string | null;
    emptyLabel?: string;
    className?: string;
}) {
    if (!code) {
        return (
            <span
                className={cn(
                    'text-muted-foreground inline-flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1 text-xs',
                    className,
                )}
            >
                <Archive className="size-3.5" aria-hidden />
                {emptyLabel}
            </span>
        );
    }

    return (
        <span
            className={cn(
                'from-muted/60 to-muted/20 inline-flex items-center gap-1.5 rounded-md border bg-gradient-to-b px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
                className,
            )}
        >
            <Archive className="text-muted-foreground size-3.5" aria-hidden />
            <span className="font-mono text-xs font-semibold tracking-tight">
                {code}
            </span>
            <span
                aria-hidden
                className="bg-foreground/20 h-0.5 w-3 rounded-full shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]"
            />
        </span>
    );
}
