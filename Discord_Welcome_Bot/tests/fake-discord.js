// Runs the real bot client offline: raw gateway packets go in through discord.js's own
// packet handlers, and anything the bot would send to Discord's API is captured instead.
import { MessageType, PermissionFlagsBits, SnowflakeUtil, Status } from 'discord.js';
import { createBot } from '../src/bot.js';

export const GUILD_ID = '100000000000000001';
export const SYSTEM_CHANNEL_ID = '100000000000000002';
export const OTHER_CHANNEL_ID = '100000000000000003';
export const BOT_ID = '100000000000000004';
export const WELCOME_BOT_ID = '100000000000000005';

const CAN_POST =
  PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.EmbedLinks;

const user = (id, extra = {}) => ({ id, username: `user${id.slice(-4)}`, discriminator: '0', ...extra });
const snowflake = (timestamp = Date.now()) => SnowflakeUtil.generate({ timestamp }).toString();

export function startFakeDiscord(config, { everyonePermissions = CAN_POST, systemChannelFlags = 0 } = {}) {
  const logs = [];
  const log = {
    info: (...args) => logs.push(['info', args.join(' ')]),
    warn: (...args) => logs.push(['warn', args.join(' ')]),
    error: (...args) => logs.push(['error', args.join(' ')]),
  };
  const client = createBot({ token: 'fake', welcomeChannelId: null, welcomeBotIds: [], waitTimeoutMs: 15_000, ...config }, log);

  const sent = [];
  let onSend = () => {};
  client.rest.post = async (route, { body }) => {
    const [, channelId] = route.match(/^\/channels\/(\d+)\/messages$/) ?? [];
    if (!channelId) throw new Error(`Unexpected API call: POST ${route}`);
    sent.push({ channelId, body, at: Date.now() });
    onSend();
    return { ...rawMessage({ channelId, author: user(BOT_ID, { bot: true }) }), content: body.content };
  };

  const shard = { id: 0, status: Status.Ready, checkReady() {} };
  client.ws.status = Status.Ready;
  const dispatch = (t, d) => client.ws.handlePacket({ op: 0, t, d }, shard);

  dispatch('READY', { user: user(BOT_ID, { bot: true }), guilds: [], application: { id: BOT_ID, flags: 0 } });
  dispatch('GUILD_CREATE', {
    id: GUILD_ID,
    name: 'Test Server',
    owner_id: '100000000000000099',
    system_channel_id: SYSTEM_CHANNEL_ID,
    system_channel_flags: systemChannelFlags,
    roles: [{ id: GUILD_ID, name: '@everyone', permissions: everyonePermissions.toString(), position: 0 }],
    channels: [
      { id: SYSTEM_CHANNEL_ID, type: 0, name: 'welcome', position: 0, permission_overwrites: [] },
      { id: OTHER_CHANNEL_ID, type: 0, name: 'rules', position: 1, permission_overwrites: [] },
    ],
    members: [{ user: user(BOT_ID, { bot: true }), roles: [], joined_at: new Date().toISOString() }],
    member_count: 1,
  });

  function rawMessage({ channelId = SYSTEM_CHANNEL_ID, author, type = MessageType.Default, mentions = [] }) {
    const now = Date.now();
    return {
      id: snowflake(now),
      channel_id: channelId,
      guild_id: GUILD_ID,
      author,
      type,
      content: '',
      timestamp: new Date(now).toISOString(),
      mentions: mentions.map((id) => user(id)),
      mention_roles: [],
      embeds: [],
      attachments: [],
    };
  }

  return {
    client,
    sent,
    logs,
    /** Someone joins the server. */
    join(id, { bot = false, pending = false } = {}) {
      dispatch('GUILD_MEMBER_ADD', {
        guild_id: GUILD_ID,
        user: user(id, { bot }),
        roles: [],
        joined_at: new Date().toISOString(),
        pending,
      });
    },
    /** A member who was waiting on rules screening accepts the rules. */
    acceptRules(id) {
      dispatch('GUILD_MEMBER_UPDATE', { guild_id: GUILD_ID, user: user(id), roles: [], pending: false });
    },
    leave(id) {
      dispatch('GUILD_MEMBER_REMOVE', { guild_id: GUILD_ID, user: user(id) });
    },
    /** Discord's built-in "X joined the server" system message. */
    systemJoinMessage(memberId, channelId = SYSTEM_CHANNEL_ID) {
      dispatch('MESSAGE_CREATE', rawMessage({ channelId, author: user(memberId), type: MessageType.UserJoin }));
    },
    /** A message from another bot, e.g. MEE6's welcome. */
    botMessage(botId, { mentions = [], channelId = SYSTEM_CHANNEL_ID } = {}) {
      dispatch('MESSAGE_CREATE', rawMessage({ channelId, author: user(botId, { bot: true }), mentions }));
    },
    /** Resolves on the next message the bot sends, or rejects after `ms`. */
    nextSend(ms = 2_000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`bot sent nothing within ${ms}ms`)), ms);
        onSend = () => {
          clearTimeout(timer);
          resolve(sent.at(-1));
        };
      });
    },
    stop() {
      client.removeAllListeners();
      client.destroy();
    },
  };
}

export const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
