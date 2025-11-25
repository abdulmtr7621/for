"""
Enhanced Discord bot with AI-powered command creation and moderation using Google Gemini.

This is a converted version using Google Gemini AI instead of OpenAI.
Improvements included:
- Google Gemini API integration for all AI features
- More robust AI command parsing with regex and fallback heuristics
- Better error handling and helpful messages
- Defensive JSONBin reads/writes with retries
- Complete command handlers

Before running:
1. Create a .env with DISCORD_TOKEN, JSONBIN_MASTER_KEY, ROOT_BIN_ID, and GEMINI_API_KEY
2. Install dependencies:
   pip install -U discord.py aiohttp python-dotenv google-generativeai Pillow requests flask

Run with: python discord_bot_gemini.py
"""

import os
import sys
import logging
import asyncio
import inspect
import ast
import textwrap
import traceback
import re
from typing import Dict, Any, Optional

from dotenv import load_dotenv
load_dotenv()

import discord
from discord.ext import commands
from discord import app_commands
from discord.ui import View, button, Button
import aiohttp
import json
import google.generativeai as genai
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import requests

# --- Configuration ---
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
JSONBIN_MASTER_KEY = os.getenv("JSONBIN_MASTER_KEY")
ROOT_BIN_ID = os.getenv("ROOT_BIN_ID")

if not all([DISCORD_TOKEN, JSONBIN_MASTER_KEY, ROOT_BIN_ID]):
    print("ERROR: Missing configuration. Require: DISCORD_TOKEN, JSONBIN_MASTER_KEY, ROOT_BIN_ID")
    sys.exit(1)

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

JSONBIN_BASE = "https://api.jsonbin.io/v3/b"

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("bot")

intents = discord.Intents.default()
intents.members = True
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# Caches
dynamic_commands_cache: Dict[str, Dict[str, Any]] = {}
guild_cache: Dict[str, Dict[str, Any]] = {}

# Emojis
EMOJI_LOCK = "<:lock:1440661112273109067>"
EMOJI_CODE = "<:codex:1440659763804242011>"
EMOJI_THINK = "<:link:1440659767696818328>"
EMOJI_BIN = "<:bin:1440659765909917816>"
EMOJI_BELL = "<:bell:1440659771463176312>"
EMOJI_CLOCK = "<:clock:1440659762051026985>"
EMOJI_HAMMER = "<:pin:1440659769642975364>"
EMOJI_GAME = "<:game:1440659750005248091>"
EMOJI_APPROVED = "<:Approved:1429498035217371287>"
EMOJI_DENIED = "<:Denied:1429498036903477248>"
EMOJI_MESSAGE = "<:message:1429116387560915067>"
EMOJI_BIN2 = "<:book:1440659751771045959>"
EMOJI_EXCL = "<:exclamation_mark:1440659747937456148>"
EMOJI_CHECK = "<:Tick:1441423145650356305>"

# ---------------- JSONBin helpers ----------------
async def _jsonbin_get(session: aiohttp.ClientSession, bin_id: str, master_key: str) -> Dict[str, Any]:
    url = f"{JSONBIN_BASE}/{bin_id}/latest"
    headers = {"X-Master-Key": master_key}
    for attempt in range(3):
        try:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("record", {}) or {}
                else:
                    log.warning("JSONBin GET attempt %s failed: %s", attempt + 1, resp.status)
        except Exception as e:
            log.exception("JSONBin GET exception on attempt %s: %s", attempt + 1, e)
        await asyncio.sleep(1)
    log.error("JSONBin GET failed after retries for %s", bin_id)
    return {}

async def _jsonbin_put(session: aiohttp.ClientSession, bin_id: str, master_key: str, record: Dict[str, Any]) -> bool:
    url = f"{JSONBIN_BASE}/{bin_id}"
    headers = {"X-Master-Key": master_key, "Content-Type": "application/json"}
    payload = json.dumps(record)
    for attempt in range(3):
        try:
            async with session.put(url, headers=headers, data=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status in (200, 201):
                    return True
                else:
                    log.warning("JSONBin PUT attempt %s failed: %s", attempt + 1, resp.status)
        except Exception as e:
            log.exception("JSONBin PUT exception on attempt %s: %s", attempt + 1, e)
        await asyncio.sleep(1)
    log.error("JSONBin PUT failed after retries for %s", bin_id)
    return False

async def get_root_record() -> Dict[str, Any]:
    async with aiohttp.ClientSession() as session:
        return await _jsonbin_get(session, ROOT_BIN_ID, JSONBIN_MASTER_KEY)

async def save_root_record(record: Dict[str, Any]) -> bool:
    async with aiohttp.ClientSession() as session:
        return await _jsonbin_put(session, ROOT_BIN_ID, JSONBIN_MASTER_KEY, record)

async def load_all_from_bin():
    """Load guild bin configurations and cache data from each guild's bin."""
    global dynamic_commands_cache, guild_cache
    dynamic_commands_cache = {}
    guild_cache = {}

    record = await get_root_record()
    guild_configs = record.get("guild_bin_configs") or {}

    for guild_id in guild_configs.keys():
        guild_data = await load_guild_data(guild_id)
        guild_cache[guild_id] = guild_data

        if "dynamic_commands" in guild_data:
            dynamic_commands_cache[guild_id] = guild_data["dynamic_commands"]

    log.info("Loaded %d guilds from their own JSONBins", len(guild_cache))

async def get_guild_bin_config(guild_id: str) -> Optional[Dict[str, str]]:
    record = await get_root_record()
    guild_configs = record.get("guild_bin_configs") or {}
    return guild_configs.get(guild_id)

async def save_guild_bin_config(guild_id: str, bin_id: str, master_key: str) -> bool:
    record = await get_root_record()
    if "guild_bin_configs" not in record:
        record["guild_bin_configs"] = {}
    record["guild_bin_configs"][guild_id] = {
        "bin_id": bin_id,
        "master_key": master_key,
    }
    return await save_root_record(record)

async def load_guild_data(guild_id: str) -> Dict[str, Any]:
    if guild_id in guild_cache:
        return guild_cache[guild_id] or {}

    config = await get_guild_bin_config(guild_id)
    if not config:
        log.debug("No JSONBin config for guild %s", guild_id)
        guild_cache[guild_id] = {}
        return {}

    async with aiohttp.ClientSession() as session:
        data = await _jsonbin_get(session, config["bin_id"], config["master_key"])
        guild_cache[guild_id] = data or {}
        return guild_cache[guild_id]

async def save_guild_data(guild_id: str, guild_data: Dict[str, Any]) -> bool:
    guild_cache[guild_id] = guild_data

    config = await get_guild_bin_config(guild_id)
    if not config:
        log.error("No JSONBin config for guild %s", guild_id)
        return False

    async with aiohttp.ClientSession() as session:
        return await _jsonbin_put(session, config["bin_id"], config["master_key"], guild_data)

async def save_dynamic_command(guild_id: str, cmd_name: str, code: str, description: str = None) -> bool:
    if guild_id not in dynamic_commands_cache:
        dynamic_commands_cache[guild_id] = {}
    dynamic_commands_cache[guild_id][cmd_name] = {
        "code": code,
        "description": description or f"Dynamic command: {cmd_name}",
    }

    guild_data = await load_guild_data(guild_id)
    if "dynamic_commands" not in guild_data:
        guild_data["dynamic_commands"] = {}
    guild_data["dynamic_commands"][cmd_name] = {
        "code": code,
        "description": description or f"Dynamic command: {cmd_name}",
    }

    ok = await save_guild_data(guild_id, guild_data)
    if ok:
        log.info("Saved dynamic command %s/%s to guild's own bin", guild_id, cmd_name)
    return ok

async def delete_dynamic_command_from_store(guild_id: str, cmd_name: str) -> bool:
    if guild_id in dynamic_commands_cache:
        dynamic_commands_cache[guild_id].pop(cmd_name, None)

    guild_data = await load_guild_data(guild_id)
    if "dynamic_commands" in guild_data:
        guild_data["dynamic_commands"].pop(cmd_name, None)
        return await save_guild_data(guild_id, guild_data)
    return True

# ---------------- Image Generation for Join/Leave ----------------
async def create_welcome_image(member: discord.Member, message_text: str) -> discord.File:
    """Create a custom welcome image with user avatar."""
    try:
        width, height = 1000, 300
        img = Image.new('RGB', (width, height), color='#2C2F33')
        draw = ImageDraw.Draw(img)

        for i in range(height):
            shade = int(44 + (i / height) * 20)
            draw.rectangle([(0, i), (width, i + 1)], fill=f'#{shade:02x}{shade+3:02x}{shade+6:02x}')

        avatar_url = member.display_avatar.url
        response = await asyncio.get_event_loop().run_in_executor(
            None, lambda: requests.get(avatar_url, timeout=10)
        )
        avatar_img = Image.open(BytesIO(response.content)).convert('RGBA')

        avatar_size = 180
        avatar_img = avatar_img.resize((avatar_size, avatar_size), Image.Resampling.LANCZOS)

        mask = Image.new('L', (avatar_size, avatar_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, avatar_size, avatar_size), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(2))

        circle_img = Image.new('RGBA', (avatar_size + 10, avatar_size + 10), (0, 0, 0, 0))
        circle_draw = ImageDraw.Draw(circle_img)
        circle_draw.ellipse((0, 0, avatar_size + 10, avatar_size + 10), fill='#7289DA')
        circle_img.paste(avatar_img, (5, 5), mask)

        avatar_x = 50
        avatar_y = (height - avatar_size - 10) // 2
        img.paste(circle_img, (avatar_x, avatar_y), circle_img)

        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()

        text_x = avatar_x + avatar_size + 40
        text_y = height // 2 - 40
        draw.text((text_x, text_y), member.name, fill='#FFFFFF', font=font_large)

        msg_parts = message_text.replace('{user}', member.mention).replace('{server}', member.guild.name).split('\n')
        for idx, line in enumerate(msg_parts[:2]):
            draw.text((text_x, text_y + 50 + (idx * 35)), line[:50], fill='#99AAB5', font=font_small)

        member_text = f"Member #{member.guild.member_count}"
        draw.text((text_x, height - 50), member_text, fill='#7289DA', font=font_small)

        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return discord.File(buffer, filename='welcome.png')

    except Exception as e:
        log.exception("Error creating welcome image")
        return None


async def create_goodbye_image(member: discord.Member, message_text: str) -> discord.File:
    """Create a custom goodbye image with user avatar."""
    try:
        width, height = 1000, 300
        img = Image.new('RGB', (width, height), color='#2C2F33')
        draw = ImageDraw.Draw(img)

        for i in range(height):
            shade = int(44 + (i / height) * 20)
            draw.rectangle([(0, i), (width, i + 1)], fill=f'#{shade:02x}{shade+3:02x}{shade+6:02x}')

        avatar_url = member.display_avatar.url
        response = await asyncio.get_event_loop().run_in_executor(
            None, lambda: requests.get(avatar_url, timeout=10)
        )
        avatar_img = Image.open(BytesIO(response.content)).convert('RGBA')

        avatar_gray = avatar_img.convert('L').convert('RGBA')

        avatar_size = 180
        avatar_gray = avatar_gray.resize((avatar_size, avatar_size), Image.Resampling.LANCZOS)

        mask = Image.new('L', (avatar_size, avatar_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, avatar_size, avatar_size), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(2))

        circle_img = Image.new('RGBA', (avatar_size + 10, avatar_size + 10), (0, 0, 0, 0))
        circle_draw = ImageDraw.Draw(circle_img)
        circle_draw.ellipse((0, 0, avatar_size + 10, avatar_size + 10), fill='#ED4245')
        circle_img.paste(avatar_gray, (5, 5), mask)

        avatar_x = 50
        avatar_y = (height - avatar_size - 10) // 2
        img.paste(circle_img, (avatar_x, avatar_y), circle_img)

        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()

        text_x = avatar_x + avatar_size + 40
        text_y = height // 2 - 40
        draw.text((text_x, text_y), member.name, fill='#FFFFFF', font=font_large)

        msg_parts = message_text.replace('{user}', member.name).replace('{server}', member.guild.name).split('\n')
        for idx, line in enumerate(msg_parts[:2]):
            draw.text((text_x, text_y + 50 + (idx * 35)), line[:50], fill='#99AAB5', font=font_small)

        member_text = f"Members left: {member.guild.member_count}"
        draw.text((text_x, height - 50), member_text, fill='#ED4245', font=font_small)

        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return discord.File(buffer, filename='goodbye.png')

    except Exception as e:
        log.exception("Error creating goodbye image")
        return None


async def create_boost_image(member: discord.Member, boost_count: int) -> discord.File:
    """Create a custom boost image with user avatar."""
    try:
        width, height = 1000, 300
        img = Image.new('RGB', (width, height), color='#2C2F33')
        draw = ImageDraw.Draw(img)

        for i in range(height):
            r = int(255 - (i / height) * 100)
            g = int(105 - (i / height) * 50)
            b = int(180 - (i / height) * 80)
            draw.rectangle([(0, i), (width, i + 1)], fill=f'#{r:02x}{g:02x}{b:02x}')

        avatar_url = member.display_avatar.url
        response = await asyncio.get_event_loop().run_in_executor(
            None, lambda: requests.get(avatar_url, timeout=10)
        )
        avatar_img = Image.open(BytesIO(response.content)).convert('RGBA')

        avatar_size = 180
        avatar_img = avatar_img.resize((avatar_size, avatar_size), Image.Resampling.LANCZOS)

        mask = Image.new('L', (avatar_size, avatar_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, avatar_size, avatar_size), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(2))

        circle_img = Image.new('RGBA', (avatar_size + 10, avatar_size + 10), (0, 0, 0, 0))
        circle_draw = ImageDraw.Draw(circle_img)
        circle_draw.ellipse((0, 0, avatar_size + 10, avatar_size + 10), fill='#FF69B4')
        circle_img.paste(avatar_img, (5, 5), mask)

        avatar_x = 50
        avatar_y = (height - avatar_size - 10) // 2
        img.paste(circle_img, (avatar_x, avatar_y), circle_img)

        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        except:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()

        text_x = avatar_x + avatar_size + 40
        text_y = height // 2 - 50
        draw.text((text_x, text_y), member.name, fill='#FFFFFF', font=font_large)

        draw.text((text_x, text_y + 50), "just boosted the server!", fill='#FFB6C1', font=font_small)

        boost_text = f"Total Boosts: {boost_count}"
        draw.text((text_x, height - 50), boost_text, fill='#FF69B4', font=font_medium)

        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return discord.File(buffer, filename='boost.png')

    except Exception as e:
        log.exception("Error creating boost image")
        return None


# ---------------- Safety: AST validation ----------------
class UnsafeCodeError(Exception):
    pass

class SimpleASTValidator(ast.NodeVisitor):
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id in (
            "eval",
            "exec",
            "__import__",
            "compile",
            "execfile",
        ):
            raise UnsafeCodeError(f"Call to {node.func.id} not allowed.")
        self.generic_visit(node)

    def visit_Attribute(self, node):
        if isinstance(node.attr, str) and node.attr.startswith("__"):
            raise UnsafeCodeError("Access to dunder attributes not allowed.")
        self.generic_visit(node)

def validate_user_code(code: str):
    try:
        tree = ast.parse(textwrap.dedent(code))
    except Exception as e:
        raise UnsafeCodeError(f"Invalid Python syntax: {e}")
    SimpleASTValidator().visit(tree)
    if len(code) > 10000:
        raise UnsafeCodeError("Code too long (max 10000 characters).")
    found = False
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "run":
            found = True
            break
    if not found:
        raise UnsafeCodeError("You must define `async def run(interaction)` or `def run(interaction)`.")

# ---------------- Permission checks ----------------
def is_admin(interaction: discord.Interaction) -> bool:
    try:
        return interaction.user.guild_permissions.manage_guild or interaction.user.guild_permissions.administrator
    except Exception:
        return False

def is_moderator(interaction: discord.Interaction) -> bool:
    try:
        return interaction.user.guild_permissions.moderate_members or interaction.user.guild_permissions.administrator
    except Exception:
        return False

def is_owner(interaction: discord.Interaction) -> bool:
    try:
        return interaction.user.id == interaction.guild.owner_id
    except Exception:
        return False

def require_setup(func):
    """Decorator to require JSONBin setup before executing a command."""
    async def wrapper(interaction: discord.Interaction, *args, **kwargs):
        guild_id = str(interaction.guild.id)
        config = await get_guild_bin_config(guild_id)
        if not config:
            embed = discord.Embed(
                title=f"{EMOJI_EXCL} JSONBin Setup Required",
                description="This server hasn't been configured yet. Please set up data storage first.",
                color=discord.Color.red(),
            )
            embed.add_field(
                name="How to Set Up:",
                value=(
                    "1. Go to https://jsonbin.io\n"
                    "2. Create an account and log in\n"
                    "3. Click 'Create Bin' to create a new bin\n"
                    "4. Copy your **Bin ID** and **Master Key**\n"
                    "5. Run `/setup_jsonbin` with these credentials"
                ),
                inline=False,
            )
            embed.set_footer(text="Your data is stored on your own JSONBin account, not on our server!")
            return await interaction.response.send_message(embed=embed, ephemeral=True)
        return await func(interaction, *args, **kwargs)
    return wrapper

async def run_blocking(func, *args, timeout=60, **kwargs):
    loop = asyncio.get_running_loop()
    return await asyncio.wait_for(loop.run_in_executor(None, lambda: func(*args, **kwargs)), timeout=timeout)

# ---------------- AI helpers using Gemini ----------------
async def ai_chat(prompt: str, system_message: str = None) -> str:
    """Chat with Gemini AI."""
    if not GEMINI_API_KEY:
        return "❌ AI not configured. Please set GEMINI_API_KEY."

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        if system_message:
            full_prompt = f"{system_message}\n\nUser: {prompt}"
        else:
            full_prompt = prompt
        
        response = await asyncio.get_event_loop().run_in_executor(
            None, 
            lambda: model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=2000,
                    temperature=0.7,
                )
            )
        )
        
        return response.text

    except Exception as e:
        log.exception("AI chat error")
        return f"❌ AI error: {str(e)}"

async def ai_generate_code(description: str) -> tuple[Optional[str], Optional[str], str]:
    """
    Generate command code from natural language description using Gemini.
    Returns: (command_name, code, description_or_error)
    """
    if not GEMINI_API_KEY:
        return None, None, "❌ AI not configured. Please set GEMINI_API_KEY."

    system_prompt = textwrap.dedent("""
    You are a Discord bot command generator. Generate Python code for Discord slash commands.

    Rules:
    1. Code MUST define a complete `async def run(interaction)` function
    2. Use interaction.response.send_message() to respond
    3. You can use discord.Embed, discord.ui.Button, discord.ui.Select for rich interactions
    4. Access bot via the global `bot` variable
    5. Access discord module via global `discord` variable
    6. Import statements ARE allowed - you can import any standard or installed libraries
    7. Keep code safe and simple
    8. For buttons/selects, use discord.ui.View
    9. Do NOT use modals or text inputs
    10. ALWAYS include the COMPLETE function - do NOT truncate or use ellipsis

    Return format:
    COMMAND_NAME: <command_name>
    DESCRIPTION: <short description>
    CODE:
    ```python
    async def run(interaction):
        # Your complete code here
        await interaction.response.send_message("...")
    ```

    IMPORTANT: Make sure the code is COMPLETE and includes the entire async def run(interaction) function.
    """)

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        full_prompt = f"{system_prompt}\n\nGenerate a Discord bot command for: {description}"
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=3000,
                    temperature=0.7,
                )
            )
        )
        
        response_text = response.text

        cmd_name_match = re.search(r'COMMAND_NAME:\s*(\w+)', response_text, re.IGNORECASE)
        cmd_name = cmd_name_match.group(1) if cmd_name_match else None

        desc_match = re.search(r'DESCRIPTION:\s*(.+?)(?:\n|CODE:)', response_text, re.IGNORECASE | re.DOTALL)
        cmd_desc = desc_match.group(1).strip() if desc_match else "AI-generated command"

        code_match = re.search(r'```python\s*(.*?)\s*```', response_text, re.DOTALL)
        if code_match:
            code = code_match.group(1).strip()
        else:
            code_lines = []
            in_code = False
            for line in response_text.split('\n'):
                if 'async def run' in line or 'def run' in line:
                    in_code = True
                if in_code:
                    code_lines.append(line)
                    if line.strip() and not line.strip().startswith('#') and 'async def run' in '\n'.join(code_lines):
                        indent_count = len(code_lines[0]) - len(code_lines[0].lstrip())
                        if len(line) - len(line.lstrip()) == indent_count and line.strip() and not line.strip().startswith(' '):
                            break
            code = '\n'.join(code_lines) if code_lines else None

        if not cmd_name:
            words = description.lower().split()[:2]
            cmd_name = '_'.join(w for w in words if w.isalnum())[:20]
            if not cmd_name:
                cmd_name = "custom_cmd"

        if not code or 'async def run' not in code and 'def run' not in code:
            return None, None, "Failed to extract valid code from AI response."

        return cmd_name, code, cmd_desc

    except Exception as e:
        log.exception("AI generate code error")
        return None, None, f"❌ AI error: {str(e)}"

async def ai_fix_code_error(code: str, error: str) -> str:
    """Use Gemini to suggest a fix for code errors."""
    if not GEMINI_API_KEY:
        return "AI not configured."

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""The following Discord bot command code has an error. Suggest a fix.

Error:
{error}

Code:
```python
{code}
```

Provide a brief explanation of the issue and how to fix it."""
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=1000,
                    temperature=0.5,
                )
            )
        )
        
        return response.text

    except Exception as e:
        log.exception("AI fix code error")
        return f"Error getting AI suggestion: {str(e)}"

async def ai_moderate_message(content: str) -> tuple[bool, str]:
    """Use Gemini to check if message content violates rules."""
    if not GEMINI_API_KEY:
        return False, ""

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""Analyze this Discord message for rule violations (spam, harassment, explicit content, etc.).
Respond with ONLY "SAFE" or "UNSAFE: [reason]".

Message: {content}"""
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=100,
                    temperature=0.3,
                )
            )
        )
        
        result = response.text.strip().upper()
        
        if result.startswith("UNSAFE"):
            reason = result.replace("UNSAFE:", "").strip() or "inappropriate content"
            return True, reason
        return False, ""

    except Exception as e:
        log.exception("AI moderation error")
        return False, ""

# ---------------- Dynamic command registration ----------------
async def register_dynamic_command(guild_id: str, cmd_name: str, code: str, description: str = None):
    """Register a dynamic command for a guild."""
    try:
        validate_user_code(code)
    except UnsafeCodeError as e:
        return False, str(e)

    namespace = {
        "discord": discord,
        "bot": bot,
        "asyncio": asyncio,
        "interaction": None,
    }

    try:
        exec(textwrap.dedent(code), namespace)
    except Exception as e:
        return False, f"Execution error: {traceback.format_exc()}"

    run_func = namespace.get("run")
    if not run_func or not callable(run_func):
        return False, "No callable `run` function found."

    guild_obj = bot.get_guild(int(guild_id))
    if not guild_obj:
        return False, f"Guild {guild_id} not found."

    async def command_wrapper(interaction: discord.Interaction):
        try:
            if inspect.iscoroutinefunction(run_func):
                await run_func(interaction)
            else:
                await run_blocking(run_func, interaction)
        except Exception as e:
            log.exception(f"Error in dynamic command {cmd_name}")
            try:
                await interaction.response.send_message(f"❌ Command error: {str(e)}", ephemeral=True)
            except:
                try:
                    await interaction.followup.send(f"❌ Command error: {str(e)}", ephemeral=True)
                except:
                    pass

    cmd = app_commands.Command(
        name=cmd_name,
        description=description or f"Dynamic command: {cmd_name}",
        callback=command_wrapper,
    )

    bot.tree.add_command(cmd, guild=guild_obj)
    return True, None

async def sync_all_guild_commands():
    """Sync commands for all guilds with dynamic commands."""
    for guild_id in dynamic_commands_cache.keys():
        guild_obj = bot.get_guild(int(guild_id))
        if guild_obj:
            try:
                await bot.tree.sync(guild=guild_obj)
                log.info(f"Synced commands for guild {guild_id}")
            except Exception as e:
                log.exception(f"Failed to sync guild {guild_id}")

# ---------------- Bot Events ----------------
@bot.event
async def on_ready():
    log.info(f"Bot ready as {bot.user}")
    await load_all_from_bin()

    for guild_id, commands in dynamic_commands_cache.items():
        for cmd_name, cmd_data in commands.items():
            code = cmd_data.get("code") if isinstance(cmd_data, dict) else cmd_data
            desc = cmd_data.get("description", f"Dynamic command: {cmd_name}") if isinstance(cmd_data, dict) else f"Dynamic command: {cmd_name}"
            success, error = await register_dynamic_command(guild_id, cmd_name, code, desc)
            if not success:
                log.error(f"Failed to register {cmd_name} for guild {guild_id}: {error}")

    await sync_all_guild_commands()
    await bot.tree.sync()
    log.info("All commands synced")

@bot.event
async def on_member_join(member: discord.Member):
    gid = str(member.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)

    join_channel_id = guild_data.get("join_channel")
    if join_channel_id:
        channel = member.guild.get_channel(int(join_channel_id))
        if channel:
            message_text = guild_data.get("join_message", "Welcome {user} to {server}!")
            image_file = await create_welcome_image(member, message_text)
            if image_file:
                await channel.send(file=image_file)
            else:
                await channel.send(message_text.replace('{user}', member.mention).replace('{server}', member.guild.name))

    auto_role_id = guild_data.get("auto_role")
    if auto_role_id:
        role = member.guild.get_role(int(auto_role_id))
        if role:
            try:
                await member.add_roles(role)
            except Exception:
                log.exception("Failed to add auto-role")

@bot.event
async def on_member_remove(member: discord.Member):
    gid = str(member.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)

    leave_channel_id = guild_data.get("leave_channel")
    if leave_channel_id:
        channel = member.guild.get_channel(int(leave_channel_id))
        if channel:
            message_text = guild_data.get("leave_message", "Goodbye {user}!")
            image_file = await create_goodbye_image(member, message_text)
            if image_file:
                await channel.send(file=image_file)
            else:
                await channel.send(message_text.replace('{user}', member.name))

@bot.event
async def on_member_update(before: discord.Member, after: discord.Member):
    if before.premium_since is None and after.premium_since is not None:
        gid = str(after.guild.id)
        guild_data = guild_cache.get(gid) or await load_guild_data(gid)

        boost_channel_id = guild_data.get("boost_channel")
        if boost_channel_id:
            channel = after.guild.get_channel(int(boost_channel_id))
            if channel:
                boost_count = after.guild.premium_subscription_count
                image_file = await create_boost_image(after, boost_count)
                if image_file:
                    await channel.send(file=image_file)
                else:
                    await channel.send(f"🎉 {after.mention} just boosted the server! Total boosts: {boost_count}")

@bot.event
async def on_message(message: discord.Message):
    if message.author.bot:
        return

    if message.guild:
        gid = str(message.guild.id)
        guild_data = guild_cache.get(gid) or await load_guild_data(gid)

        if guild_data.get("ai_moderation", False):
            should_remove, reason = await ai_moderate_message(message.content)
            if should_remove:
                try:
                    await message.delete()
                    await message.channel.send(f"{message.author.mention} Your message was removed by AI moderation.", delete_after=5)
                except Exception:
                    log.exception("AI moderation delete failed")

    await bot.process_commands(message)

# ---------------- Commands: storage setup & AI ----------------
@bot.tree.command(name="setup_jsonbin", description="Configure your server's JSONBin storage (Owner only)")
@app_commands.describe(
    bin_id="Your JSONBin bin ID",
    master_key="Your JSONBin master key",
)
async def setup_jsonbin(interaction: discord.Interaction, bin_id: str, master_key: str):
    if not is_owner(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Server owner only.", ephemeral=True)

    await interaction.response.defer(thinking=True, ephemeral=True)

    guild_id = str(interaction.guild.id)

    async with aiohttp.ClientSession() as session:
        url = f"{JSONBIN_BASE}/{bin_id}/latest"
        headers = {"X-Master-Key": master_key}
        try:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return await interaction.followup.send(
                        f"❌ Invalid credentials or bin not found. Status: {resp.status}\n"
                        f"Please verify your Bin ID and Master Key.",
                        ephemeral=True,
                    )
        except Exception as e:
            return await interaction.followup.send(
                f"❌ Failed to connect to JSONBin: {str(e)}",
                ephemeral=True,
            )

    ok = await save_guild_bin_config(guild_id, bin_id, master_key)
    if not ok:
        return await interaction.followup.send("❌ Failed to save configuration. Please try again.", ephemeral=True)

    guild_data = {}
    guild_cache[guild_id] = guild_data
    await save_guild_data(guild_id, guild_data)

    embed = discord.Embed(
        title=f"{EMOJI_CHECK} JSONBin Configured!",
        description=f"Your server's data storage is now set up and ready to use.",
        color=discord.Color.green(),
    )
    embed.add_field(
        name="What's Next?",
        value=(
            "You can now use all bot features:\n"
            "• `/create_command` or `/describe_command` - Create custom commands\n"
            "• `/join` and `/leave` - Set up welcome/goodbye messages\n"
            "• `/toggle_moderation` - Enable AI moderation\n"
            "• And much more!"
        ),
        inline=False,
    )

    await interaction.followup.send(embed=embed, ephemeral=True)
    log.info("Configured JSONBin for guild %s", guild_id)

@bot.tree.command(name="help", description="Get comprehensive help about the bot")
@app_commands.describe(question="Your question about the bot")
async def cmd_help(interaction: discord.Interaction, question: str):
    await interaction.response.defer(thinking=True, ephemeral=True)
    
    faq_system = """You are a helpful Discord bot assistant. Answer questions about the bot's features.

**KEY INFORMATION:**
- Support: https://discord.gg/j7Ap4xUkG7
- Command Generator: https://qubeia.my.canva.site/command-generator
- Terms & Privacy: https://qubeia.my.canva.site/
- Forums: https://qubeia-forums.my.canva.site/forums

**HOW TO SETUP:**
If user asks why they can't create commands or features don't work:
1. Tell them they need to set up JSONBin storage
2. Instructions: Go to https://jsonbin.io → Create account → Create a bin → Copy Bin ID and Master Key → Use /setup_jsonbin {bin_id} {master_key}
3. After setup, all features unlock: create commands, set welcome/goodbye messages, enable moderation, etc.

**COMMAND FEATURES:**

/create_command - Upload a Python file to create custom commands
- Requires: Admin permission + JSONBin setup
- How to: Write Python code with `async def run(interaction)` function, upload as .py file
- Example: Bot executes your code when command runs

/describe_command - Generate commands from description using AI
- Requires: Admin permission + JSONBin setup
- How to: Describe what you want (e.g., "make a ping command")
- AI generates and creates the command automatically

/join & /leave - Set welcome/goodbye channels with custom images
- Requires: Admin permission + JSONBin setup
- How to: Use /join [channel] to send welcome images when members join
- Use /leave [channel] to send goodbye images when members leave

/boosts - Announce server boosts with custom images
- Requires: Admin permission + JSONBin setup
- How to: Use /boosts [channel] to announce who boosted and show total boosts

/toggle_moderation - Enable AI-powered message moderation
- Checks messages for spam, harassment, explicit content
- Removes rule-violating messages automatically

/code - Get coding help from AI (ephemeral/private)
- How to: Ask any coding question, response shows only to you

/chat - Chat with AI (ephemeral/private)
- How to: Have a conversation with AI, keeps chat history

All features are private unless you explicitly share them. Questions?"""
    
    response = await ai_chat(question, faq_system)
    await interaction.followup.send(f"💙 {response[:2000]}", ephemeral=True)

user_chat_history = {}

class ChatModal(discord.ui.Modal, title="Continue Chat"):
    message_input = discord.ui.TextInput(
        label="Your Message",
        style=discord.TextStyle.paragraph,
        placeholder="Type your message here...",
        required=True,
        max_length=2000
    )

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True, ephemeral=True)

        user_message = self.message_input.value

        history = user_chat_history.get(interaction.user.id, [])
        history.append({"role": "user", "content": user_message})

        response = await ai_chat(user_message, system_message="You are a helpful assistant.")

        history.append({"role": "assistant", "content": response})
        user_chat_history[interaction.user.id] = history[-20:]

        class ContinueView(View):
            def __init__(self):
                super().__init__(timeout=300)

            @button(label="Continue Chat", style=discord.ButtonStyle.primary)
            async def continue_chat(self, btn_interaction: discord.Interaction, button: Button):
                await btn_interaction.response.send_modal(ChatModal())

        await interaction.followup.send(
            f"💬 **AI Response:**\n{response[:1900]}", 
            view=ContinueView(),
            ephemeral=True
        )

@bot.tree.command(name="chat", description="Chat with AI")
@app_commands.describe(message="Your message to the AI")
async def cmd_chat(interaction: discord.Interaction, message: str):
    await interaction.response.defer(thinking=True, ephemeral=True)

    history = user_chat_history.get(interaction.user.id, [])
    history.append({"role": "user", "content": message})

    response = await ai_chat(message, system_message="You are a helpful assistant.")

    history.append({"role": "assistant", "content": response})
    user_chat_history[interaction.user.id] = history[-20:]

    class ContinueView(View):
        def __init__(self):
            super().__init__(timeout=300)

        @button(label="Continue Chat", style=discord.ButtonStyle.primary)
        async def continue_chat(self, btn_interaction: discord.Interaction, button: Button):
            await btn_interaction.response.send_modal(ChatModal())

    await interaction.followup.send(
        f"💬 **AI Response:**\n{response[:1900]}", 
        view=ContinueView(),
        ephemeral=True
    )
    

@bot.tree.command(name="code", description="Get coding help from AI")
@app_commands.describe(question="Your coding question")
async def cmd_code_help(interaction: discord.Interaction, question: str):
    await interaction.response.defer(thinking=True, ephemeral=True)
    system = "You are a helpful coding assistant. Provide clear, concise code examples and explanations."
    response = await ai_chat(question, system)
    await interaction.followup.send(f"💻 {response[:1900]}", ephemeral=True)

@bot.tree.command(name="describe_command", description="Generate a command from description using AI")
@app_commands.describe(description="Describe what the command should do")
async def describe_command(interaction: discord.Interaction, description: str):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    config = await get_guild_bin_config(guild_id)
    if not config:
        return await interaction.response.send_message(
            f"{EMOJI_EXCL} This server needs JSONBin setup first!\n"
            f"Server owner should use `/setup_jsonbin` to configure storage.",
            ephemeral=True,
        )

    await interaction.response.defer(thinking=True, ephemeral=True)

    cmd_name, code, cmd_desc = await ai_generate_code(description)

    if not cmd_name or not code:
        return await interaction.followup.send(f"❌ Failed to generate command: {cmd_desc}", ephemeral=True)

    success, error = await register_dynamic_command(guild_id, cmd_name, code, cmd_desc)

    if not success:
        ai_fix = await ai_fix_code_error(code, error)
        return await interaction.followup.send(
            f"""❌ Generated command has errors:\n```
{error[:500]}
```\n\n**AI Suggestion:**\n{ai_fix[:1000]}""",
            ephemeral=True,
        )

    saved = await save_dynamic_command(guild_id, cmd_name, code, cmd_desc)
    if not saved:
        return await interaction.followup.send("⚠️ Command created but failed to save to storage.", ephemeral=True)

    await sync_all_guild_commands()

    embed = discord.Embed(
        title=f"{EMOJI_THINK} Command Generated!",
        description=f"**Name:** `{cmd_name}`\n**Description:** {cmd_desc}",
        color=discord.Color.green(),
    )
    preview = code if len(code) <= 1000 else code[:1000] + "\n..."
    embed.add_field(name="Code Preview", value=f"```python\n{preview}\n```", inline=False)
    await interaction.followup.send(embed=embed, ephemeral=True)

@bot.tree.command(name="create_command", description="Upload a .py file to create a custom command")
@app_commands.describe(file="A .py file that defines async def run(interaction)")
async def create_command(interaction: discord.Interaction, file: discord.Attachment):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    config = await get_guild_bin_config(guild_id)
    if not config:
        return await interaction.response.send_message(
            f"{EMOJI_EXCL} This server needs JSONBin setup first!\n"
            f"Server owner should use `/setup_jsonbin` to configure storage.",
            ephemeral=True,
        )

    if not file.filename.endswith(".py"):
        return await interaction.response.send_message(f"{EMOJI_CODE} Upload a .py file.", ephemeral=True)

    await interaction.response.defer(thinking=True, ephemeral=True)

    try:
        content = await file.read()
        code = content.decode("utf-8")
        cmd_name = file.filename.rsplit(".", 1)[0].lower()

        success, error = await register_dynamic_command(guild_id, cmd_name, code)

        if not success:
            ai_fix = await ai_fix_code_error(code, error)
            embed = discord.Embed(
                title=f"{EMOJI_EXCL} Command Error",
                description="Your command has errors:",
                color=discord.Color.red(),
            )
            embed.add_field(name="Error", value=f"```\n{error[:500]}\n```", inline=False)
            embed.add_field(name="AI-Suggested Fix", value=ai_fix[:1000], inline=False)
            return await interaction.followup.send(embed=embed, ephemeral=True)

        saved = await save_dynamic_command(guild_id, cmd_name, code)
        if not saved:
            return await interaction.followup.send("⚠️ Command created but failed to save.", ephemeral=True)

        await sync_all_guild_commands()
        await interaction.followup.send(f"{EMOJI_THINK} Command `{cmd_name}` created successfully!", ephemeral=True)

    except Exception as e:
        log.exception("create_command error")
        return await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)

@bot.tree.command(name="delete_command", description="Delete a custom command")
@app_commands.describe(command_name="Name of the command to delete")
async def delete_command(interaction: discord.Interaction, command_name: str):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    guild_obj = interaction.guild

    if bot.tree.get_command(command_name, guild=guild_obj):
        try:
            bot.tree.remove_command(command_name, guild=guild_obj)
        except Exception:
            log.exception("Failed to remove command")

    ok = await delete_dynamic_command_from_store(guild_id, command_name)
    if not ok:
        return await interaction.response.send_message("⚠️ Failed to delete from storage.", ephemeral=True)

    await sync_all_guild_commands()
    await interaction.response.send_message(f"{EMOJI_BIN} Command `{command_name}` deleted.", ephemeral=True)

@bot.tree.command(name="rename_command", description="Rename a custom command")
@app_commands.describe(old_name="Current command name", new_name="New command name")
async def rename_command(interaction: discord.Interaction, old_name: str, new_name: str):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)

    if guild_id not in dynamic_commands_cache or old_name not in dynamic_commands_cache[guild_id]:
        return await interaction.response.send_message(f"{EMOJI_EXCL} Command `{old_name}` not found.", ephemeral=True)

    cmd_data = dynamic_commands_cache[guild_id][old_name]
    code = cmd_data.get("code") if isinstance(cmd_data, dict) else cmd_data
    desc = cmd_data.get("description", f"Dynamic command: {new_name}") if isinstance(cmd_data, dict) else f"Dynamic command: {new_name}"

    guild_obj = interaction.guild
    if bot.tree.get_command(old_name, guild=guild_obj):
        bot.tree.remove_command(old_name, guild=guild_obj)

    await delete_dynamic_command_from_store(guild_id, old_name)

    success, error = await register_dynamic_command(guild_id, new_name, code, desc)
    if not success:
        return await interaction.response.send_message(f"❌ Error: {error}", ephemeral=True)

    await save_dynamic_command(guild_id, new_name, code, desc)
    await sync_all_guild_commands()

    await interaction.response.send_message(f"{EMOJI_BIN2} Command `{old_name}` renamed to `{new_name}`.", ephemeral=True)

@bot.tree.command(name="rename_command_description", description="Update a command's description")
@app_commands.describe(command_name="Command name", new_description="New description")
async def rename_command_description(interaction: discord.Interaction, command_name: str, new_description: str):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Manage server permission required.", ephemeral=True)

    guild_id = str(interaction.guild.id)

    if guild_id not in dynamic_commands_cache or command_name not in dynamic_commands_cache[guild_id]:
        return await interaction.response.send_message(f"{EMOJI_EXCL} Command `{command_name}` not found.", ephemeral=True)

    cmd_data = dynamic_commands_cache[guild_id][command_name]
    code = cmd_data.get("code") if isinstance(cmd_data, dict) else cmd_data

    guild_obj = interaction.guild
    if bot.tree.get_command(command_name, guild=guild_obj):
        bot.tree.remove_command(command_name, guild=guild_obj)

    success, error = await register_dynamic_command(guild_id, command_name, code, new_description)
    if not success:
        return await interaction.response.send_message(f"❌ Error: {error}", ephemeral=True)

    await save_dynamic_command(guild_id, command_name, code, new_description)
    await sync_all_guild_commands()

    await interaction.response.send_message(f"{EMOJI_CHECK} Description updated for `{command_name}`.", ephemeral=True)

@bot.tree.command(name="list_commands", description="List all custom commands")
async def list_commands(interaction: discord.Interaction):
    guild_id = str(interaction.guild.id)

    if guild_id not in dynamic_commands_cache or not dynamic_commands_cache[guild_id]:
        return await interaction.response.send_message("No custom commands in this server.", ephemeral=True)

    embed = discord.Embed(title=f"{EMOJI_BIN2} Custom Commands", color=discord.Color.blue())

    for cmd_name, cmd_data in dynamic_commands_cache[guild_id].items():
        desc = cmd_data.get("description", "No description") if isinstance(cmd_data, dict) else "No description"
        embed.add_field(name=f"/{cmd_name}", value=desc, inline=False)

    await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="toggle_moderation", description="Toggle AI moderation (Moderate Members permission)")
async def toggle_moderation(interaction: discord.Interaction):
    if not is_moderator(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Moderate Members permission required.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    guild_data = guild_cache.get(guild_id) or await load_guild_data(guild_id)

    current = guild_data.get("ai_moderation", False)
    guild_data["ai_moderation"] = not current

    await save_guild_data(guild_id, guild_data)

    status = "enabled" if guild_data["ai_moderation"] else "disabled"
    await interaction.response.send_message(f"{EMOJI_HAMMER} AI moderation {status}.", ephemeral=True)

@bot.tree.command(name="name", description="Change bot nickname in this server (Owner only)")
@app_commands.describe(nickname="New nickname for the bot")
async def cmd_name(interaction: discord.Interaction, nickname: str):
    if not is_owner(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Server owner only.", ephemeral=True)

    try:
        await interaction.guild.me.edit(nick=nickname)
        await interaction.response.send_message(f"{EMOJI_CHECK} Bot nickname changed to: {nickname}", ephemeral=True)
    except Exception as e:
        await interaction.response.send_message(f"❌ Failed to change nickname: {str(e)}", ephemeral=True)

@bot.tree.command(name="join", description="Set welcome channel")
@app_commands.describe(channel="The channel for welcome messages")
async def cmd_join(interaction: discord.Interaction, channel: discord.TextChannel):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    config = await get_guild_bin_config(guild_id)
    if not config:
        embed = discord.Embed(
            title=f"{EMOJI_EXCL} JSONBin Setup Required",
            description="This server hasn't been configured yet. Please set up data storage first.",
            color=discord.Color.red(),
        )
        embed.add_field(
            name="How to Set Up:",
            value=(
                "1. Go to https://jsonbin.io\n"
                "2. Create an account and log in\n"
                "3. Click 'Create Bin' to create a new bin\n"
                "4. Copy your **Bin ID** and **Master Key**\n"
                "5. Run `/setup_jsonbin` with these credentials"
            ),
            inline=False,
        )
        embed.set_footer(text="Your data is stored on your own JSONBin account, not on our server!")
        return await interaction.response.send_message(embed=embed, ephemeral=True)

    await interaction.response.defer(ephemeral=True)

    gid = str(interaction.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)
    guild_data["join_channel"] = str(channel.id)
    await save_guild_data(gid, guild_data)
    await interaction.followup.send(f"{EMOJI_BELL} Welcome messages set to {channel.mention}", ephemeral=True)

@bot.tree.command(name="unjoin", description="Disable welcome messages")
async def cmd_unjoin(interaction: discord.Interaction):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    await interaction.response.defer(ephemeral=True)

    gid = str(interaction.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)
    guild_data.pop("join_channel", None)
    await save_guild_data(gid, guild_data)
    await interaction.followup.send(f"{EMOJI_CLOCK} Welcome disabled.", ephemeral=True)

@bot.tree.command(name="leave", description="Set goodbye channel")
@app_commands.describe(channel="The channel for goodbye messages")
async def cmd_leave(interaction: discord.Interaction, channel: discord.TextChannel):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    config = await get_guild_bin_config(guild_id)
    if not config:
        embed = discord.Embed(
            title=f"{EMOJI_EXCL} JSONBin Setup Required",
            description="This server hasn't been configured yet. Please set up data storage first.",
            color=discord.Color.red(),
        )
        embed.add_field(
            name="How to Set Up:",
            value=(
                "1. Go to https://jsonbin.io\n"
                "2. Create an account and log in\n"
                "3. Click 'Create Bin' to create a new bin\n"
                "4. Copy your **Bin ID** and **Master Key**\n"
                "5. Run `/setup_jsonbin` with these credentials"
            ),
            inline=False,
        )
        embed.set_footer(text="Your data is stored on your own JSONBin account, not on our server!")
        return await interaction.response.send_message(embed=embed, ephemeral=True)

    await interaction.response.defer(ephemeral=True)

    gid = str(interaction.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)
    guild_data["leave_channel"] = str(channel.id)
    await save_guild_data(gid, guild_data)
    await interaction.followup.send(f"{EMOJI_BELL} Leave messages set to {channel.mention}", ephemeral=True)

@bot.tree.command(name="unleave", description="Disable goodbye messages")
async def cmd_unleave(interaction: discord.Interaction):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    await interaction.response.defer(ephemeral=True)

    gid = str(interaction.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)
    guild_data.pop("leave_channel", None)
    await save_guild_data(gid, guild_data)
    await interaction.followup.send(f"{EMOJI_CLOCK} Leave disabled.", ephemeral=True)

@bot.tree.command(name="role_assign_on_join", description="Assign a role to new members")
@app_commands.describe(role="The role to assign to new members")
async def cmd_role_assign(interaction: discord.Interaction, role: discord.Role):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    config = await get_guild_bin_config(guild_id)
    if not config:
        embed = discord.Embed(
            title=f"{EMOJI_EXCL} JSONBin Setup Required",
            description="This server hasn't been configured yet. Please set up data storage first.",
            color=discord.Color.red(),
        )
        embed.add_field(
            name="How to Set Up:",
            value=(
                "1. Go to https://jsonbin.io\n"
                "2. Create an account and log in\n"
                "3. Click 'Create Bin' to create a new bin\n"
                "4. Copy your **Bin ID** and **Master Key**\n"
                "5. Run `/setup_jsonbin` with these credentials"
            ),
            inline=False,
        )
        embed.set_footer(text="Your data is stored on your own JSONBin account, not on our server!")
        return await interaction.response.send_message(embed=embed, ephemeral=True)

    await interaction.response.defer(ephemeral=True)

    gid = str(interaction.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)
    guild_data["auto_role"] = str(role.id)
    await save_guild_data(gid, guild_data)
    await interaction.followup.send(f"{EMOJI_GAME} New members will receive `{role.name}`", ephemeral=True)

@bot.tree.command(name="unroleassignonjoin", description="Disable auto role assign")
async def cmd_unroleassign(interaction: discord.Interaction):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    config = await get_guild_bin_config(guild_id)
    if not config:
        embed = discord.Embed(
            title=f"{EMOJI_EXCL} JSONBin Setup Required",
            description="This server hasn't been configured yet. Please set up data storage first.",
            color=discord.Color.red(),
        )
        embed.add_field(
            name="How to Set Up:",
            value=(
                "1. Go to https://jsonbin.io\n"
                "2. Create an account and log in\n"
                "3. Click 'Create Bin' to create a new bin\n"
                "4. Copy your **Bin ID** and **Master Key**\n"
                "5. Run `/setup_jsonbin` with these credentials"
            ),
            inline=False,
        )
        embed.set_footer(text="Your data is stored on your own JSONBin account, not on our server!")
        return await interaction.response.send_message(embed=embed, ephemeral=True)

    await interaction.response.defer(ephemeral=True)

    gid = str(interaction.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)
    guild_data.pop("auto_role", None)
    await save_guild_data(gid, guild_data)
    await interaction.followup.send(f"{EMOJI_HAMMER} Auto-role disabled.", ephemeral=True)

@bot.tree.command(name="boosts", description="Set boost announcement channel")
@app_commands.describe(channel="The channel for boost announcements")
async def cmd_boosts(interaction: discord.Interaction, channel: discord.TextChannel):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    guild_id = str(interaction.guild.id)
    config = await get_guild_bin_config(guild_id)
    if not config:
        embed = discord.Embed(
            title=f"{EMOJI_EXCL} JSONBin Setup Required",
            description="This server hasn't been configured yet. Please set up data storage first.",
            color=discord.Color.red(),
        )
        embed.add_field(
            name="How to Set Up:",
            value=(
                "1. Go to https://jsonbin.io\n"
                "2. Create an account and log in\n"
                "3. Click 'Create Bin' to create a new bin\n"
                "4. Copy your **Bin ID** and **Master Key**\n"
                "5. Run `/setup_jsonbin` with these credentials"
            ),
            inline=False,
        )
        embed.set_footer(text="Your data is stored on your own JSONBin account, not on our server!")
        return await interaction.response.send_message(embed=embed, ephemeral=True)

    await interaction.response.defer(ephemeral=True)

    gid = str(interaction.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)
    guild_data["boost_channel"] = str(channel.id)
    await save_guild_data(gid, guild_data)

    count = interaction.guild.premium_subscription_count
    await interaction.followup.send(
        f"<a:Boost:1428980068285157507> Boost announcements set to {channel.mention}\n"
        f"Current boosts: **{count}**",
        ephemeral=True
    )

@bot.tree.command(name="unboosts", description="Disable boost announcements")
async def cmd_unboosts(interaction: discord.Interaction):
    if not is_admin(interaction):
        return await interaction.response.send_message(f"{EMOJI_LOCK} Admin only.", ephemeral=True)

    await interaction.response.defer(ephemeral=True)

    gid = str(interaction.guild.id)
    guild_data = guild_cache.get(gid) or await load_guild_data(gid)
    guild_data.pop("boost_channel", None)
    await save_guild_data(gid, guild_data)
    await interaction.followup.send(f"{EMOJI_CLOCK} Boost announcements disabled.", ephemeral=True)


# ---------------- Flask Web Service ----------------
from flask import Flask, request, jsonify
from threading import Thread

app = Flask(__name__)

@app.route("/describe_command", methods=["POST"])
def describe_command_endpoint():
    """
    This endpoint receives JSON:
    {
        "guild_id": "123",
        "description": "make a ping command"
    }
    """
    data = request.get_json(force=True)
    guild_id = str(data.get("guild_id"))
    description = data.get("description")

    if not guild_id or not description:
        return jsonify({"error": "guild_id and description are required"}), 400

    async def run_task():
        name, code, desc = await ai_generate_code(description)
        return {"cmd_name": name, "code": code, "desc": desc}

    future = asyncio.run_coroutine_threadsafe(run_task(), bot.loop)
    result = future.result()

    return jsonify(result), 200


def run_flask():
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)


def start_flask():
    t = Thread(target=run_flask)
    t.daemon = True
    t.start()


start_flask()


# ---------------- Run ----------------
if __name__ == "__main__":
    try:
        bot.run(DISCORD_TOKEN)
    except Exception:
        log.exception("Failed to start bot")
        raise
