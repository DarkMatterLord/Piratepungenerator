const SNOWFLAKE = /^\d{17,20}$/;

function readId(name, value) {
  if (!SNOWFLAKE.test(value)) {
    throw new Error(
      `${name} must be a Discord ID (a 17-20 digit number), got "${value}". ` +
        'Turn on Developer Mode in Discord (Settings > Advanced) and use "Copy ID".',
    );
  }
  return value;
}

/** Reads the bot's settings from environment variables (see .env.example). */
export function loadConfig(env = process.env) {
  const token = env.DISCORD_TOKEN?.trim();
  if (!token) {
    throw new Error('DISCORD_TOKEN is not set. Copy .env.example to .env and put your bot token in it.');
  }

  const channelId = env.WELCOME_CHANNEL_ID?.trim();
  const botIds = (env.WELCOME_BOT_ID ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => readId('WELCOME_BOT_ID', id));

  const timeoutRaw = env.WAIT_TIMEOUT_SECONDS?.trim() || '15';
  const timeoutSeconds = Number(timeoutRaw);
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 0) {
    throw new Error(`WAIT_TIMEOUT_SECONDS must be a number of seconds, got "${timeoutRaw}".`);
  }

  return {
    token,
    welcomeChannelId: channelId ? readId('WELCOME_CHANNEL_ID', channelId) : null,
    welcomeBotIds: botIds,
    waitTimeoutMs: timeoutSeconds * 1000,
  };
}
