import { createBot } from './bot.js';
import { loadConfig } from './config.js';

// Load settings from the .env file next to package.json, if there is one.
// Variables already set in the environment (e.g. by a hosting service) win.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const client = createBot(config);

client.login(config.token).catch((error) => {
  console.error('Could not log in to Discord:', error.message);
  if (/intent/i.test(error.message)) {
    console.error(
      'Turn on "Server Members Intent" in the Developer Portal: your application > Bot > Privileged Gateway Intents.',
    );
  }
  process.exit(1);
});
