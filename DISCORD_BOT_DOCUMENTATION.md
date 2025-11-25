# Qube IA Discord Bot Documentation

## Overview
Enhanced Discord bot with AI-powered command creation and moderation capabilities using Google Gemini. This bot manages server commands dynamically, handles moderation, and provides AI-powered features for the Qube IA Discord community.

## Features

### Core Functionality
- **Dynamic Command Creation**: Create custom commands on-the-fly using AI (Google Gemini)
- **Server Management**: Store per-guild configurations in separate JSONBin databases
- **Welcome/Goodbye Messages**: Automatic member join/leave with custom images
- **Moderation Tools**: Built-in moderation commands with visual feedback
- **AI Integration**: Google Gemini API for intelligent command parsing and generation

### Technical Features
- Dual storage system: Root JSONBin + per-guild JSONBins
- Robust error handling with retry mechanisms
- Asynchronous command processing
- Custom image generation for member events
- Defensive JSON reads/writes with fallback handling
- Regex-based command parsing with heuristics

## Configuration

### Required Environment Variables
```
DISCORD_TOKEN          # Discord bot token from Discord Developer Portal
JSONBIN_MASTER_KEY     # JSONBin master API key
ROOT_BIN_ID            # JSONBin ID for root configuration storage
GEMINI_API_KEY         # Google Gemini API key (optional for AI features)
```

### Setup Instructions
1. Create a `.env` file with all required environment variables
2. Install dependencies:
   ```bash
   pip install -U discord.py aiohttp python-dotenv google-generativeai Pillow requests flask
   ```
3. Run the bot:
   ```bash
   python discord_bot_gemini.py
   ```

## Architecture

### Storage System
- **Root JSONBin**: Stores guild configurations and bin mappings
- **Guild JSONBins**: Each guild has its own JSONBin for storing:
  - Dynamic commands with code and descriptions
  - Guild-specific settings and configurations
  - Member data and statistics

### Data Structure

#### Guild Configuration
```json
{
  "guild_bin_configs": {
    "guild_id": {
      "bin_id": "jsonbin_id",
      "master_key": "master_key"
    }
  }
}
```

#### Guild Data
```json
{
  "dynamic_commands": {
    "command_name": {
      "code": "command_code",
      "description": "command_description"
    }
  }
}
```

## API Endpoints

### JSONBin Operations
- **GET** `https://api.jsonbin.io/v3/b/{bin_id}/latest` - Retrieve bin data
- **PUT** `https://api.jsonbin.io/v3/b/{bin_id}` - Update bin data
- Headers: `X-Master-Key: {master_key}`

## Key Components

### Image Generation
- **Welcome Images**: Custom gradient background with user avatar (circle frame), username, server info
- **Goodbye Images**: Grayscale avatar effect with red accent frame
- Auto-scales to 1000x300 pixels
- Uses PIL (Python Imaging Library) for rendering

### Command System
- Dynamic command storage and retrieval
- AI-powered command generation and parsing
- Per-guild command isolation
- Description and code storage

### Moderation Features
- Custom Discord emojis for visual feedback
- Approved/Denied status indicators
- Bell notifications
- Message logging
- Ban/mute functionality

## Emoji References
```
EMOJI_LOCK     = <:lock:1440661112273109067>
EMOJI_CODE     = <:codex:1440659763804242011>
EMOJI_THINK    = <:link:1440659767696818328>
EMOJI_BIN      = <:bin:1440659765909917816>
EMOJI_BELL     = <:bell:1440659771463176312>
EMOJI_CLOCK    = <:clock:1440659762051026985>
EMOJI_HAMMER   = <:pin:1440659769642975364>
EMOJI_GAME     = <:game:1440659750005248091>
EMOJI_APPROVED = <:Approved:1429498035217371287>
EMOJI_DENIED   = <:Denied:1429498036903477248>
EMOJI_MESSAGE  = <:message:1429116387560915067>
EMOJI_BIN2     = <:book:1440659751771045959>
EMOJI_EXCL     = <:exclamation_mark:1440659747937456148>
EMOJI_CHECK    = <:Tick:1441423145650356305>
```

## Error Handling

### Retry Logic
- JSONBin operations retry up to 3 times with 1-second delays
- 10-15 second timeouts for API calls
- Graceful fallback to empty dictionaries on failure
- Comprehensive logging of all failures

### Defensive Practices
- Null checks on all JSON data
- Empty dictionary defaults
- Try-catch blocks around async operations
- Logging for debugging and monitoring

## Function Reference

### JSONBin Helpers
- `_jsonbin_get(session, bin_id, master_key)` - Fetch data with retries
- `_jsonbin_put(session, bin_id, master_key, record)` - Save data with retries
- `get_root_record()` - Get root configuration
- `save_root_record(record)` - Save root configuration

### Guild Management
- `get_guild_bin_config(guild_id)` - Get guild's bin configuration
- `save_guild_bin_config(guild_id, bin_id, master_key)` - Register guild's bin
- `load_guild_data(guild_id)` - Fetch guild-specific data
- `save_guild_data(guild_id, guild_data)` - Save guild data with caching

### Command Management
- `save_dynamic_command(guild_id, cmd_name, code, description)` - Create/update command
- `delete_dynamic_command_from_store(guild_id, cmd_name)` - Remove command

### Image Generation
- `create_welcome_image(member, message_text)` - Generate welcome card
- `create_goodbye_image(member, message_text)` - Generate goodbye card

### Data Loading
- `load_all_from_bin()` - Load all guild data on startup
- Populates `dynamic_commands_cache` and `guild_cache`

## Caching System

### In-Memory Caches
- `dynamic_commands_cache`: Command definitions by guild
- `guild_cache`: Full guild data

### Cache Strategy
- Load all guild data on bot startup
- Update cache on every save operation
- Guild-specific cache isolation
- Fallback to database on cache miss

## Dependencies

### Core Libraries
- `discord.py` - Discord API wrapper
- `aiohttp` - Async HTTP client
- `google-generativeai` - Google Gemini API client
- `Pillow (PIL)` - Image processing
- `requests` - HTTP requests
- `python-dotenv` - Environment variable loading

### Discord.py Extensions
- `discord.ext.commands` - Command framework
- `discord.ui` - UI components (buttons, views)
- `discord.app_commands` - Slash commands support

## Logging

- Configured at INFO level
- Logger name: "bot"
- Logs all JSONBin operations
- Logs all errors and exceptions with full tracebacks
- Tracks guild loading and command saves

## Integration Points

### With Qube IA Forums
- User data synchronization possible via JSONBin
- Moderation decisions can be logged to forum database
- Bot events can trigger forum notifications
- Dynamic commands can integrate with forum features

## Security Considerations

- Master keys stored in environment variables only
- No hardcoded secrets
- Secure token handling through discord.py
- Per-guild isolation with separate keys
- Async operations prevent blocking

## Performance Notes

- Caching reduces API calls
- Async operations for concurrent command handling
- Retry logic prevents cascading failures
- Image generation runs in executor to prevent blocking
- JSONBin operations include timeout limits

## Maintenance

### Regular Tasks
- Monitor error logs for failed operations
- Verify JSONBin API connectivity
- Update dependencies for security patches
- Clean up unused dynamic commands

### Troubleshooting
- Check `.env` file for missing variables
- Verify JSONBin keys and bin IDs
- Monitor network connectivity to JSONBin
- Check Gemini API quota and limits
- Review logs for detailed error information
