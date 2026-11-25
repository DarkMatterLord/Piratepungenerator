import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { GuildSystemChannelFlags, PermissionFlagsBits } from 'discord.js';
import { NOTICE_BODY, NOTICE_TITLE } from '../src/notice.js';
import { OTHER_CHANNEL_ID, SYSTEM_CHANNEL_ID, WELCOME_BOT_ID, startFakeDiscord, tick } from './fake-discord.js';

const ALICE = '200000000000000001';
const BOB = '200000000000000002';

let discord;
afterEach(() => discord?.stop());

test('posts the notice right after Discord’s own join message, not before', async () => {
  discord = startFakeDiscord({});
  discord.join(ALICE);
  await tick(200);
  assert.equal(discord.sent.length, 0, 'should wait for the normal welcome');

  const send = discord.nextSend();
  discord.systemJoinMessage(ALICE);
  const { channelId, body } = await send;

  assert.equal(channelId, SYSTEM_CHANNEL_ID);
  assert.equal(body.content, `<@${ALICE}>, before you start posting, please read this:`);
  assert.equal(body.embeds[0].title, NOTICE_TITLE);
  assert.equal(body.embeds[0].description, NOTICE_BODY);
  assert.deepEqual(body.allowed_mentions, { users: [ALICE] });
});

test('the notice text covers everything that counts as self-promotion', () => {
  for (const phrase of [
    'art commissions',
    'channel',
    'social media',
    'financial situation',
    'social image',
    'any kind',
    'permission from the mods and/or the server owner',
  ]) {
    assert.ok(NOTICE_BODY.includes(phrase), `notice should mention "${phrase}"`);
  }
});

test('posts straight away if the join message arrived before the join event', async () => {
  discord = startFakeDiscord({});
  const send = discord.nextSend(500);
  discord.systemJoinMessage(ALICE);
  discord.join(ALICE);
  assert.equal((await send).channelId, SYSTEM_CHANNEL_ID);
});

test('ignores join messages for other people', async () => {
  discord = startFakeDiscord({ waitTimeoutMs: 10_000 });
  discord.join(ALICE);
  discord.systemJoinMessage(BOB);
  await tick(200);
  assert.equal(discord.sent.length, 0);
});

test('waits for the configured welcome bot instead, skipping its welcomes for other people', async () => {
  discord = startFakeDiscord({ welcomeBotIds: [WELCOME_BOT_ID] });
  discord.join(ALICE);
  discord.systemJoinMessage(ALICE); // Discord's message doesn't count when a welcome bot is set
  discord.botMessage(WELCOME_BOT_ID, { mentions: [BOB] }); // someone else's welcome
  discord.botMessage('100000000000000077'); // an unrelated bot
  await tick(200);
  assert.equal(discord.sent.length, 0);

  const send = discord.nextSend();
  discord.botMessage(WELCOME_BOT_ID, { mentions: [ALICE] });
  assert.equal((await send).body.allowed_mentions.users[0], ALICE);
});

test('posts anyway once the wait times out', async () => {
  discord = startFakeDiscord({ waitTimeoutMs: 300 });
  const started = Date.now();
  const send = discord.nextSend();
  discord.join(ALICE);
  await send;
  assert.ok(Date.now() - started >= 290, 'should have waited for the timeout');
  await tick(10);
  assert.match(discord.logs.find(([level]) => level === 'warn')[1], /No welcome message .* within 0\.3s/);
});

test('does not wait when the server has join messages turned off', async () => {
  discord = startFakeDiscord(
    { waitTimeoutMs: 10_000 },
    { systemChannelFlags: GuildSystemChannelFlags.SuppressJoinNotifications },
  );
  const send = discord.nextSend(500);
  discord.join(ALICE);
  await send;
});

test('posts in WELCOME_CHANNEL_ID when set, without waiting for a join message that never goes there', async () => {
  discord = startFakeDiscord({ welcomeChannelId: OTHER_CHANNEL_ID, waitTimeoutMs: 10_000 });
  const send = discord.nextSend(500);
  discord.join(ALICE);
  assert.equal((await send).channelId, OTHER_CHANNEL_ID);
});

test('waits for rules screening to be accepted before posting', async () => {
  discord = startFakeDiscord({});
  discord.join(ALICE, { pending: true });
  discord.systemJoinMessage(ALICE);
  await tick(200);
  assert.equal(discord.sent.length, 0, 'should not post while the member is still pending');

  const send = discord.nextSend();
  discord.acceptRules(ALICE);
  assert.equal((await send).body.allowed_mentions.users[0], ALICE);
});

test('ignores bots joining', async () => {
  discord = startFakeDiscord({ waitTimeoutMs: 100 });
  discord.join(BOB, { bot: true });
  await tick(300);
  assert.equal(discord.sent.length, 0);
});

test('does not ping someone who left before the welcome showed up', async () => {
  discord = startFakeDiscord({ waitTimeoutMs: 200 });
  discord.join(ALICE);
  discord.leave(ALICE);
  await tick(400);
  assert.equal(discord.sent.length, 0);
});

test('explains which permissions are missing instead of crashing', async () => {
  discord = startFakeDiscord(
    { waitTimeoutMs: 100 },
    { everyonePermissions: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages },
  );
  discord.join(ALICE);
  await tick(50);
  assert.equal(discord.sent.length, 0);
  assert.deepEqual(discord.logs, [['warn', '[Test Server] Can\'t post in #welcome. Missing permissions: EmbedLinks.']]);
});
