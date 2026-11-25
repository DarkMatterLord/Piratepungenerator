import { GuildSystemChannelFlags, MessageType, PermissionFlagsBits } from 'discord.js';
import { buildNotice } from './notice.js';

const REQUIRED_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
];

// Discord's clock and the member's join time can differ slightly.
const CLOCK_SKEW_MS = 5_000;

/** The configured welcome channel if it is in this server, otherwise the System Messages channel. */
export function resolveChannel(guild, config) {
  if (config.welcomeChannelId) {
    const channel = guild.channels.cache.get(config.welcomeChannelId);
    if (channel?.isTextBased()) return channel;
  }
  return guild.systemChannel;
}

/**
 * Returns a test that recognises the normal welcome message for this member in this channel,
 * or null when no welcome message will show up there (so there is nothing to wait for).
 */
export function welcomeMatcher(member, channel, config) {
  const since = member.joinedTimestamp - CLOCK_SKEW_MS;

  if (config.welcomeBotIds.length > 0) {
    // A welcome bot's message: skip ones that clearly greet someone else.
    return (message) =>
      config.welcomeBotIds.includes(message.author.id) &&
      message.createdTimestamp >= since &&
      (message.mentions.users.size === 0 || message.mentions.users.has(member.id));
  }

  const guild = member.guild;
  const joinMessagesPostedHere =
    channel.id === guild.systemChannelId &&
    !guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotifications);
  if (!joinMessagesPostedHere) return null;

  // Discord's built-in "X joined the server" message is authored by the member who joined.
  return (message) =>
    message.type === MessageType.UserJoin &&
    message.author.id === member.id &&
    message.createdTimestamp >= since;
}

/** Resolves with the first message in `channel` that passes `filter`, or null after `timeoutMs`. */
export function waitForMessage(channel, filter, timeoutMs) {
  return new Promise((resolve) => {
    const collector = channel.createMessageCollector({ filter, max: 1, time: timeoutMs });
    collector.once('end', (collected) => resolve(collected.first() ?? null));

    // The welcome may have arrived before we started listening.
    const alreadyPosted = channel.messages.cache.find((message) => filter(message));
    if (alreadyPosted) {
      resolve(alreadyPosted);
      collector.stop('already-posted');
    }
  });
}

/** Waits for the normal welcome message for `member`, then posts the self-promotion notice under it. */
export async function postNotice(member, config, log = console) {
  if (member.user.bot) return;

  const guild = member.guild;
  const channel = resolveChannel(guild, config);
  if (!channel) {
    log.warn(
      `[${guild.name}] Nowhere to post: set WELCOME_CHANNEL_ID, or pick a System Messages channel ` +
        'in your Server Settings.',
    );
    return;
  }

  const missing = channel.permissionsFor(guild.members.me)?.missing(REQUIRED_PERMISSIONS);
  if (!missing || missing.length > 0) {
    log.warn(
      `[${guild.name}] Can't post in #${channel.name}. Missing permissions: ` +
        `${missing?.join(', ') ?? 'unknown'}.`,
    );
    return;
  }

  const isWelcome = welcomeMatcher(member, channel, config);
  if (isWelcome) {
    const welcome = await waitForMessage(channel, isWelcome, config.waitTimeoutMs);
    if (!welcome) {
      log.warn(
        `[${guild.name}] No welcome message for ${member.user.tag} within ` +
          `${config.waitTimeoutMs / 1000}s, posting the notice anyway.`,
      );
    }
  }

  // Don't ping someone who left while we were waiting.
  if (!guild.members.cache.has(member.id)) return;

  await channel.send(buildNotice(member));
  log.info(`[${guild.name}] Posted the self-promotion notice for ${member.user.tag} in #${channel.name}.`);
}
