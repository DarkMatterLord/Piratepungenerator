import { EmbedBuilder } from 'discord.js';

// ---------------------------------------------------------------------------
// Edit the wording of the notice here. **text** is bold in Discord.
// ---------------------------------------------------------------------------

export const NOTICE_TITLE = '🚫 No Self-Promotion';

export const NOTICE_BODY = [
  'Self-promotion is **not allowed** in this server. This includes:',
  '',
  '• Looking for or advertising art commissions',
  '• Promoting your own channel, stream or social media',
  '• Anything else meant to benefit you personally, whether that is your financial situation or your social image',
  '',
  'Self-promotion of **any kind** is not allowed. If you want to advertise something, ' +
    'you must first get permission from the mods and/or the server owner.',
].join('\n');

// The colour of the bar on the left of the notice (Discord red).
export const NOTICE_COLOR = 0xed4245;

/** Builds the message posted for a member who just joined. */
export function buildNotice(member) {
  return {
    content: `<@${member.id}>, before you start posting, please read this:`,
    embeds: [
      new EmbedBuilder()
        .setTitle(NOTICE_TITLE)
        .setDescription(NOTICE_BODY)
        .setColor(NOTICE_COLOR),
    ],
    // Ping only the new member, never @everyone or roles.
    allowedMentions: { users: [member.id] },
  };
}
