# Self-Promotion Notice Bot

A Discord bot that posts a **no self-promotion** notice whenever someone joins your server.
It waits for your normal welcome message to appear first, then posts the notice directly
underneath it, pinging the new member:

> **@NewMember**, before you start posting, please read this:
>
> **🚫 No Self-Promotion**
> Self-promotion is **not allowed** in this server. This includes:
>
> • Looking for or advertising art commissions
> • Promoting your own channel, stream or social media
> • Anything else meant to benefit you personally, whether that is your financial situation or your social image
>
> Self-promotion of **any kind** is not allowed. If you want to advertise something, you must
> first get permission from the mods and/or the server owner.

To change the wording or colour, edit the top of [`src/notice.js`](src/notice.js).

## Setup

### 1. Create the bot in Discord

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Open the **Bot** tab:
   - Click **Reset Token** and copy the token. Keep it secret: anyone with it can control your bot.
   - Under **Privileged Gateway Intents**, turn on **Server Members Intent** and save.
     Without it, the bot never hears about people joining.
3. Invite the bot to your server by opening this link, with `YOUR_APPLICATION_ID` replaced by the
   **Application ID** from the **General Information** tab:

   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot&permissions=19456
   ```

   This asks for only what the bot needs: View Channels, Send Messages and Embed Links. If your
   welcome channel is private, also give the bot's role access to it.

### 2. Run it

You need [Node.js](https://nodejs.org) 20.12 or newer.

```bash
cd Discord_Welcome_Bot
npm install
cp .env.example .env     # on Windows: copy .env.example .env
```

Open `.env`, paste your token after `DISCORD_TOKEN=`, then start the bot:

```bash
npm start
```

You should see `Logged in as YourBot#1234, watching 1 server(s).` The bot only works while this
is running, so for a permanent setup, run it on a machine or hosting service that stays on.
Most Node.js hosts let you set the `.env` values as environment variables instead.

## Settings (`.env`)

| Setting | Required | What it does |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Your bot's token. |
| `WELCOME_CHANNEL_ID` | No | The channel to post in. Leave blank to use the server's **System Messages** channel (chosen in your Server Settings), which is where Discord's own "X joined the server" messages go. |
| `WELCOME_BOT_ID` | No | If a bot such as MEE6 or Carl-bot posts your normal welcome, put its user ID here so the notice waits for that bot's message. Separate several IDs with commas. |
| `WAIT_TIMEOUT_SECONDS` | No | The most seconds to wait for the normal welcome before posting anyway. Default `15`. |

To copy IDs, turn on **Developer Mode** (User Settings > Advanced), then right-click a channel or bot and choose **Copy ID**.

## How it decides when to post

- **Welcome from Discord itself** (the default): the bot waits for Discord's
  "X joined the server" message for that member, then posts right after it.
- **Welcome from another bot** (`WELCOME_BOT_ID` set): the bot waits for that bot's next message,
  skipping welcomes that mention someone else, then posts right after it.
- **No welcome appears** within `WAIT_TIMEOUT_SECONDS`: it posts anyway. If join messages are
  turned off, or the notice goes to a different channel than the join messages, there is nothing
  to wait for, so it posts straight away.

The bot also:

- waits until new members accept the rules, if your server uses rules screening;
- ignores bots joining;
- skips the notice if the person leaves before it is posted;
- logs a clear warning if it can't post, for example because a permission is missing.

## Testing

To see it for real, have a friend or a second account join the server.

The automated tests run the bot offline against simulated Discord events:

```bash
npm test
```
