import { Client, Events, GatewayIntentBits } from 'discord.js';
import { postNotice } from './welcome.js';

/** Creates the Discord client with the join handlers attached (not logged in yet). */
export function createBot(config, log = console) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // join events (privileged: enable "Server Members Intent")
      GatewayIntentBits.GuildMessages, // to see the normal welcome message being posted
    ],
  });

  function notify(member) {
    postNotice(member, config, log).catch((error) => {
      log.error(`[${member.guild.name}] Failed to post the notice for ${member.user.tag}:`, error);
    });
  }

  client.on(Events.GuildMemberAdd, (member) => {
    // Servers with rules screening: wait until the member has accepted the rules.
    if (!member.pending) notify(member);
  });

  client.on(Events.GuildMemberUpdate, (before, after) => {
    if (before.pending && !after.pending) notify(after);
  });

  client.once(Events.ClientReady, (ready) => {
    log.info(`Logged in as ${ready.user.tag}, watching ${ready.guilds.cache.size} server(s).`);
  });

  return client;
}
