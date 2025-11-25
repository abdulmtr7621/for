import { Client, GatewayIntentBits, ChannelType } from 'discord.js';

let discordClient: Client | null = null;
let isConnecting = false;

export function getDiscordClient() {
  return discordClient;
}

export async function initializeDiscordBot() {
  if (isConnecting || discordClient) return;
  
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log('[Discord Bot] No token provided, skipping initialization');
    return;
  }

  isConnecting = true;

  try {
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    discordClient.once('ready', () => {
      console.log(`[Discord Bot] Connected as ${discordClient?.user?.tag}`);
    });

    discordClient.on('error', (error) => {
      console.error('[Discord Bot] Error:', error);
    });

    discordClient.on('warn', (info) => {
      console.warn('[Discord Bot] Warning:', info);
    });

    await discordClient.login(token);
  } catch (error) {
    console.error('[Discord Bot] Failed to initialize:', error);
    isConnecting = false;
    discordClient = null;
  }
}

export async function shutdownDiscordBot() {
  if (discordClient) {
    try {
      await discordClient.destroy();
      discordClient = null;
      console.log('[Discord Bot] Disconnected');
    } catch (error) {
      console.error('[Discord Bot] Error during shutdown:', error);
    }
  }
}

export async function getDiscordUserStats(userId: string) {
  if (!discordClient) {
    return null;
  }

  try {
    const user = await discordClient.users.fetch(userId);
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatarURL(),
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error('[Discord Bot] Error fetching user:', error);
    return null;
  }
}

export async function verifyUserInGuild(userId: string): Promise<boolean> {
  if (!discordClient) {
    console.log('[Discord Bot] Bot not initialized, skipping verification');
    return false;
  }

  try {
    // Check all guilds the bot is in
    const guilds = await discordClient.guilds.fetch();
    
    for (const [, guild] of guilds) {
      try {
        const fetchedGuild = await guild.fetch();
        const member = await fetchedGuild.members.fetch(userId).catch(() => null);
        if (member) {
          console.log(`[Discord Bot] User ${userId} found in guild ${fetchedGuild.name}`);
          return true;
        }
      } catch (error) {
        // Guild fetch or member fetch failed, continue to next guild
        continue;
      }
    }
    
    console.log(`[Discord Bot] User ${userId} not found in any guild`);
    return false;
  } catch (error) {
    console.error('[Discord Bot] Error verifying user in guild:', error);
    return false;
  }
}
