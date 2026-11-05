type LockerErrorPayload = {
    message?: unknown;
    errorCode?: unknown;
};

/**
 * Turn a Locker proxy error into language shop staff can act on.
 * Raw cURL messages are useful in logs, not at the counter.
 */
export function friendlyLockerError(
    payload: LockerErrorPayload | null | undefined,
    fallback: string,
): string {
    if (payload?.errorCode === 'LOCKER_UNAVAILABLE') {
        return 'The locker is not responding. Check that the locker machine is on and connected.';
    }

    if (typeof payload?.message === 'string' && payload.message.trim() !== '') {
        return payload.message;
    }

    return fallback;
}
