import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSyncDebugLogger } from '../../src/view/syncDebugLog';

describe('createSyncDebugLogger', () => {
	it('is disabled by default and drops log calls', () => {
		const sent: unknown[] = [];
		const logger = createSyncDebugLogger((m) => sent.push(m));
		assert.equal(logger.isEnabled(), false);
		logger.log('event');
		assert.deepEqual(sent, []);
	});

	it('logs and posts a message once enabled', () => {
		const sent: unknown[] = [];
		const logger = createSyncDebugLogger((m) => sent.push(m));
		logger.setEnabled(true);
		assert.equal(logger.isEnabled(), true);
		logger.log('event', { foo: 'bar' });
		assert.equal(sent.length, 1);
		assert.deepEqual(sent[0], {
			type: 'syncDebugLog',
			source: 'view',
			event: 'event',
			seq: 1,
			ts: (sent[0] as { ts: number }).ts,
			payload: { foo: 'bar' },
		});
	});

	it('increments seq across calls and stops after being disabled again', () => {
		const sent: unknown[] = [];
		const logger = createSyncDebugLogger((m) => sent.push(m));
		logger.setEnabled(true);
		logger.log('first');
		logger.log('second');
		logger.setEnabled(false);
		logger.log('third');
		assert.equal(sent.length, 2);
		assert.equal((sent[0] as { seq: number }).seq, 1);
		assert.equal((sent[1] as { seq: number }).seq, 2);
	});
});
