import type { EditorToHostMessage } from '../protocol/messages';

const SYNC_DEBUG_STORAGE_KEY = 'markdownLiveEditor.syncDebug';

export interface SyncDebugLogger {
	setEnabled(enabled: boolean): void;
	isEnabled(): boolean;
	log(event: string, payload?: Record<string, unknown>): void;
}

// Debug logger for the webview<->host sync pipeline. Logs are gated by a
// runtime flag (persisted in localStorage) so they stay silent by default
// and can be toggled without reloading the webview.
export function createSyncDebugLogger(
	postMessage: (message: EditorToHostMessage) => void,
): SyncDebugLogger {
	let enabled = false;
	let seq = 0;

	function setEnabled(next: boolean): void {
		enabled = next;
		try {
			window.localStorage.setItem(SYNC_DEBUG_STORAGE_KEY, next ? '1' : '0');
		} catch {
			// Ignore localStorage failures in constrained webview environments.
		}
	}

	function isEnabled(): boolean {
		if (enabled) return true;
		try {
			return window.localStorage.getItem(SYNC_DEBUG_STORAGE_KEY) === '1';
		} catch {
			return false;
		}
	}

	function log(event: string, payload: Record<string, unknown> = {}): void {
		if (!isEnabled()) return;
		seq += 1;
		const ts = Date.now();
		console.debug(`[MLE:view:${seq}] ${event}`, { ts, ...payload });
		postMessage({
			type: 'syncDebugLog',
			source: 'view',
			event,
			seq,
			ts,
			payload,
		});
	}

	return { setEnabled, isEnabled, log };
}
