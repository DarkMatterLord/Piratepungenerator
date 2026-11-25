import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config.js';

test('only the token is required', () => {
  assert.deepEqual(loadConfig({ DISCORD_TOKEN: ' abc ' }), {
    token: 'abc',
    welcomeChannelId: null,
    welcomeBotIds: [],
    waitTimeoutMs: 15_000,
  });
});

test('reads every optional setting', () => {
  const config = loadConfig({
    DISCORD_TOKEN: 'abc',
    WELCOME_CHANNEL_ID: '123456789012345678',
    WELCOME_BOT_ID: '159985870458322944, 235148962103951360',
    WAIT_TIMEOUT_SECONDS: '7.5',
  });
  assert.equal(config.welcomeChannelId, '123456789012345678');
  assert.deepEqual(config.welcomeBotIds, ['159985870458322944', '235148962103951360']);
  assert.equal(config.waitTimeoutMs, 7_500);
});

test('rejects a missing token or values that are not IDs', () => {
  assert.throws(() => loadConfig({}), /DISCORD_TOKEN is not set/);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'abc', WELCOME_CHANNEL_ID: '#welcome' }), /WELCOME_CHANNEL_ID must be a Discord ID/);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'abc', WELCOME_BOT_ID: 'MEE6' }), /WELCOME_BOT_ID must be a Discord ID/);
  assert.throws(() => loadConfig({ DISCORD_TOKEN: 'abc', WAIT_TIMEOUT_SECONDS: 'soon' }), /WAIT_TIMEOUT_SECONDS/);
});
