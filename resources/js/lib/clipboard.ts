/**
 * Copy text to the clipboard.
 *
 * `navigator.clipboard` is unavailable on plain-HTTP LAN origins, so fall
 * back to a hidden textarea + execCommand for shop-floor machines.
 */
export async function copyText(text: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Permission denied or insecure context — fall through to the legacy path.
        }
    }

    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(el);

    if (!copied) {
        throw new Error('Copy failed');
    }
}
