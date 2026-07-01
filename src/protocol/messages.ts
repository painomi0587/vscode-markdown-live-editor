export interface HeadingItem {
	text: string;
	level: number;
	pos: number;
}

export interface WordCountValue {
	words: number;
	characters: number;
}

export interface ReadyMessage {
	type: 'ready';
}

export interface UpdateMessage {
	type: 'update';
	body: string;
}

export interface InitMessage {
	type: 'init';
	body: string;
	documentDirUri: string;
	visualLineNumbers: boolean;
	syncDebugLogs: boolean;
}

export interface ScrollToHeadingMessage {
	type: 'scrollToHeading';
	pos: number;
}

export interface RequestHeadingsMessage {
	type: 'requestHeadings';
}

export interface RequestWordCountMessage {
	type: 'requestWordCount';
}

export interface SetSyncDebugLogsMessage {
	type: 'setSyncDebugLogs';
	enabled: boolean;
}

export interface HeadingsMessage {
	type: 'headings';
	items: HeadingItem[];
}

export interface WordCountMessage {
	type: 'wordCount';
	words: number;
	characters: number;
	selection: WordCountValue | null;
}

export type ExportMode = 'clipboard' | 'file';

export interface RequestExportHtmlMessage {
	type: 'requestExportHtml';
	mode: ExportMode;
	style: string;
	customStyle: string;
}

export interface ExportHtmlMessage {
	type: 'exportHtml';
	html: string;
	mode: ExportMode;
}

export interface RequestExportMessage {
	type: 'requestExport';
	mode: ExportMode;
}

export interface SyncDebugLogMessage {
	type: 'syncDebugLog';
	source: 'view';
	event: string;
	seq: number;
	ts: number;
	payload: Record<string, unknown>;
}

export interface SaveImageMessage {
	type: 'saveImage';
	/** Correlates the async save reply back to the pending insertion. */
	requestId: string;
	/** Base64-encoded image bytes (no data: URI prefix). */
	data: string;
	/** Image MIME type, e.g. "image/png". */
	mimeType: string;
	/** Original filename for dropped files, or null for clipboard pastes. */
	name: string | null;
}

export interface ImageSavedMessage {
	type: 'imageSaved';
	requestId: string;
	/** Relative Markdown src to insert. */
	src: string;
	/** Suggested alt text. */
	alt: string;
}

export interface ImageSaveFailedMessage {
	type: 'imageSaveFailed';
	requestId: string;
	error: string;
}

export type HostToEditorMessage =
	| InitMessage
	| RequestHeadingsMessage
	| RequestWordCountMessage
	| SetSyncDebugLogsMessage
	| ScrollToHeadingMessage
	| UpdateMessage
	| ImageSavedMessage
	| ImageSaveFailedMessage
	| RequestExportHtmlMessage;

export type EditorToHostMessage =
	| HeadingsMessage
	| ReadyMessage
	| UpdateMessage
	| WordCountMessage
	| ExportHtmlMessage
	| RequestExportMessage
	| SaveImageMessage
	| SyncDebugLogMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isHeadingItem(value: unknown): value is HeadingItem {
	if (!isRecord(value)) return false;
	return (
		typeof value.text === 'string' &&
		typeof value.level === 'number' &&
		typeof value.pos === 'number'
	);
}

function isWordCountValue(value: unknown): value is WordCountValue {
	if (!isRecord(value)) return false;
	return (
		typeof value.words === 'number' && typeof value.characters === 'number'
	);
}

export function isHostToEditorMessage(
	value: unknown,
): value is HostToEditorMessage {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	switch (value.type) {
		case 'init':
			return (
				typeof value.body === 'string' &&
				typeof value.documentDirUri === 'string' &&
				typeof value.visualLineNumbers === 'boolean' &&
				typeof value.syncDebugLogs === 'boolean'
			);
		case 'update':
			return typeof value.body === 'string';
		case 'scrollToHeading':
			return typeof value.pos === 'number';
		case 'imageSaved':
			return (
				typeof value.requestId === 'string' &&
				typeof value.src === 'string' &&
				typeof value.alt === 'string'
			);
		case 'imageSaveFailed':
			return (
				typeof value.requestId === 'string' && typeof value.error === 'string'
			);
		case 'requestHeadings':
		case 'requestWordCount':
			return true;
		case 'setSyncDebugLogs':
			return typeof value.enabled === 'boolean';
		case 'requestExportHtml':
			return (
				typeof value.mode === 'string' &&
				(value.mode === 'clipboard' || value.mode === 'file') &&
				typeof value.style === 'string' &&
				typeof value.customStyle === 'string'
			);
		default:
			return false;
	}
}

export function isEditorToHostMessage(
	value: unknown,
): value is EditorToHostMessage {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	switch (value.type) {
		case 'ready':
			return true;
		case 'update':
			return typeof value.body === 'string';
		case 'headings':
			return Array.isArray(value.items) && value.items.every(isHeadingItem);
		case 'wordCount':
			return (
				typeof value.words === 'number' &&
				typeof value.characters === 'number' &&
				(value.selection === null || isWordCountValue(value.selection))
			);
		case 'exportHtml':
			return (
				typeof value.html === 'string' &&
				typeof value.mode === 'string' &&
				(value.mode === 'clipboard' || value.mode === 'file')
			);
		case 'requestExport':
			return (
				typeof value.mode === 'string' &&
				(value.mode === 'clipboard' || value.mode === 'file')
			);
		case 'saveImage':
			return (
				typeof value.requestId === 'string' &&
				typeof value.data === 'string' &&
				typeof value.mimeType === 'string' &&
				(value.name === null || typeof value.name === 'string')
			);
		case 'syncDebugLog':
			return (
				value.source === 'view' &&
				typeof value.event === 'string' &&
				typeof value.seq === 'number' &&
				typeof value.ts === 'number' &&
				isRecord(value.payload)
			);
		default:
			return false;
	}
}
