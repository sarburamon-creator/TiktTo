// index.js - Main Discord Bot
const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');
const express = require('express');

// Configuration
const BOT_TOKEN = 'YOUR_DISCORD_BOT_TOKEN';
const CHANNEL_ID = 'YOUR_CHANNEL_ID'; // Channel where bot operates

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Store user sessions
const userSessions = new Map();

// X-Gorgon calculation functions
function hexString(num) {
    let tmpString = num.toString(16);
    if (tmpString.length < 2) {
        tmpString = '0' + tmpString;
    }
    return tmpString;
}

function RBIT(num) {
    let binary = num.toString(2).padStart(8, '0');
    let reversed = binary.split('').reverse().join('');
    return parseInt(reversed, 2);
}

function reverse(num) {
    let hex = num.toString(16).padStart(2, '0');
    return parseInt(hex[1] + hex[0], 16);
}

class XGorgon {
    constructor(debug) {
        this.length = 0x14;
        this.debug = debug;
        this.hex_CE0 = [
            0x05, 0x00, 0x50, 
            Math.floor(Math.random() * 0xFF),
            0x47, 0x1e, 0x00, 
            Math.floor(Math.random() * 0xFF) & 0xf0
        ];
    }

    addr_BA8() {
        const hex_BA8 = Array.from({ length: 0x100 }, (_, i) => i);
        let tmp = null;

        for (let i = 0; i < 0x100; i++) {
            let A;
            if (i === 0) {
                A = 0;
            } else if (tmp !== null) {
                A = tmp;
            } else {
                A = hex_BA8[i - 1];
            }

            const B = this.hex_CE0[i % 8];
            if (A === 0x05 && i !== 1 && tmp !== 0x05) {
                A = 0;
            }

            let C = A + i + B;
            while (C >= 0x100) {
                C -= 0x100;
            }

            if (C < i) {
                tmp = C;
            } else {
                tmp = null;
            }

            const D = hex_BA8[C];
            hex_BA8[i] = D;
        }

        return hex_BA8;
    }

    initial(debug, hex_BA8) {
        const tmp_hex = [...hex_BA8];
        const tmp_add = [];
        const result = [...debug];

        for (let i = 0; i < this.length; i++) {
            const A = result[i];
            const B = tmp_add.length > 0 ? tmp_add[tmp_add.length - 1] : 0;
            let C = hex_BA8[i + 1] + B;
            
            while (C >= 0x100) {
                C -= 0x100;
            }
            
            tmp_add.push(C);
            const D = tmp_hex[C];
            tmp_hex[i + 1] = D;
            let E = D + D;
            
            while (E >= 0x100) {
                E -= 0x100;
            }
            
            const F = tmp_hex[E];
            result[i] = A ^ F;
        }

        return result;
    }

    calculate(debug) {
        const result = [...debug];

        for (let i = 0; i < this.length; i++) {
            const A = result[i];
            const B = reverse(A);
            const C = result[(i + 1) % this.length];
            const D = B ^ C;
            const E = RBIT(D);
            const F = E ^ this.length;
            let G = ~F;
            
            while (G < 0) {
                G += 0x100000000;
            }
            
            const H = parseInt(G.toString(16).slice(-2), 16);
            result[i] = H;
        }

        return result;
    }

    generate() {
        const ba8 = this.addr_BA8();
        const init = this.initial(this.debug, ba8);
        const calc = this.calculate(init);
        
        const result = calc.map(item => hexString(item)).join('');
        
        return `8404${hexString(this.hex_CE0[7])}${hexString(this.hex_CE0[3])}${hexString(this.hex_CE0[1])}${hexString(this.hex_CE0[6])}${result}`;
    }
}

function generateXGorgon(param = "", stub = "", cookie = "") {
    const gorgon = [];
    const timestamp = Math.floor(Date.now() / 1000);
    const khronos = timestamp.toString(16);
    
    // MD5 of URL param
    const urlMd5 = crypto.createHash('md5').update(param).digest('hex');
    for (let i = 0; i < 4; i++) {
        gorgon.push(parseInt(urlMd5.slice(i * 2, i * 2 + 2), 16));
    }
    
    // Stub
    if (stub) {
        for (let i = 0; i < 4; i++) {
            gorgon.push(parseInt(stub.slice(i * 2, i * 2 + 2), 16));
        }
    } else {
        gorgon.push(0, 0, 0, 0);
    }
    
    // Cookie
    if (cookie) {
        const cookieMd5 = crypto.createHash('md5').update(cookie).digest('hex');
        for (let i = 0; i < 4; i++) {
            gorgon.push(parseInt(cookieMd5.slice(i * 2, i * 2 + 2), 16));
        }
    } else {
        gorgon.push(0, 0, 0, 0);
    }
    
    // Static values
    gorgon.push(0x01, 0x01, 0x02, 0x04);
    
    // Khronos timestamp
    for (let i = 0; i < 4; i++) {
        gorgon.push(parseInt(khronos.slice(i * 2, i * 2 + 2) || '00', 16));
    }
    
    const xg = new XGorgon(gorgon);
    return {
        'X-Gorgon': xg.generate(),
        'X-Khronos': timestamp.toString()
    };
}

// TikTok API Functions
async function getTikTokProfile(sessionId, deviceId, iid) {
    try {
        const params = new URLSearchParams({
            device_id: deviceId,
            iid: iid,
            id: 'kaa',
            version_code: '34.0.0',
            language: 'en',
            app_name: 'lite',
            app_version: '34.0.0',
            carrier_region: 'SA',
            tz_offset: '10800',
            mcc_mnc: '42001',
            locale: 'en',
            sys_region: 'SA',
            aid: '473824',
            screen_width: '1284',
            os_api: '18',
            ac: 'WIFI',
            os_version: '17.3',
            app_language: 'en',
            tz_name: 'Asia/Riyadh',
            carrier_region1: 'SA',
            build_number: '340002',
            device_platform: 'iphone',
            device_type: 'iPhone13,4'
        });

        const url = `https://api16.tiktokv.com/aweme/v1/user/profile/self/?${params}`;
        
        const response = await axios.get(url, {
            headers: {
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': `sessionid=${sessionId}`,
                'sdk-version': '2',
                'user-agent': 'com.zhiliaoapp.musically/432424234 (Linux; U; Android 5; en; fewfwdw; Build/PI;tt-ok/3.12.13.1)'
            }
        });

        return response.data.user.unique_id;
    } catch (error) {
        console.error('Error getting profile:', error);
        return null;
    }
}

async function changeTikTokUsername(sessionId, deviceId, iid, lastUsername, newUsername) {
    try {
        const data = `aid=364225&unique_id=${encodeURIComponent(newUsername)}`;
        const params = new URLSearchParams({
            aid: '364225',
            residence: '',
            device_id: deviceId,
            version_name: '1.1.0',
            os_version: '17.4.1',
            iid: iid,
            app_name: 'tiktok_snail',
            locale: 'en',
            ac: '4G',
            sys_region: 'SA',
            version_code: '1.1.0',
            channel: 'App Store',
            op_region: 'SA',
            os_api: '18',
            device_brand: 'iPad',
            idfv: '16045E07-1ED5-4350-9318-77A1469C0B89',
            device_platform: 'iPad',
            device_type: 'iPad13,4',
            carrier_region1: '',
            tz_name: 'Asia/Riyadh',
            account_region: 'sa',
            build_number: '11005',
            tz_offset: '10800',
            app_language: 'en',
            carrier_region: '',
            current_region: '',
            aid: '364225',
            mcc_mnc: '',
            screen_width: '1284',
            uoo: '1',
            content_language: '',
            language: 'en',
            cdid: 'B75649A607DA449D8FF2ADE97E0BC3F1',
            openudid: '7b053588b18d61b89c891592139b68d918b44933',
            app_version: '1.1.0'
        });

        const url = `https://api16.tiktokv.com/aweme/v1/commit/user/?${params}`;
        const stub = crypto.createHash('md5').update(data).digest('hex');
        const sig = generateXGorgon(params.toString(), stub, null);

        const response = await axios.post(url, data, {
            headers: {
                'Connection': 'keep-alive',
                'User-Agent': 'Whee 1.1.0 rv:11005 (iPad; iOS 17.4.1; en_SA@calendar=gregorian) Cronet',
                'Cookie': `sessionid=${sessionId}`,
                'X-Gorgon': sig['X-Gorgon'],
                'X-Khronos': sig['X-Khronos']
            }
        });

        // Verify username change
        const currentUser = await getTikTokProfile(sessionId, deviceId, iid);
        
        if (currentUser === newUsername) {
            return {
                success: true,
                message: `✅ Username successfully changed to: **${newUsername}**`,
                newUsername: newUsername
            };
        } else {
            return {
                success: false,
                message: '❌ Failed to change username. Please check your session ID.',
                error: response.data
            };
        }
    } catch (error) {
        console.error('Error changing username:', error);
        return {
            success: false,
            message: '❌ An error occurred while changing username.',
            error: error.message
        };
    }
}

// Discord Bot Setup
client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    
    // Register slash commands
    const guild = client.guilds.cache.first();
    
    // Create commands
    const commands = [
        new SlashCommandBuilder()
            .setName('font_method')
            .setDescription('Change TikTok username using font method')
            .addStringOption(option =>
                option.setName('session_id')
                    .setDescription('Your TikTok session ID')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('check_username')
            .setDescription('Check current TikTok username')
            .addStringOption(option =>
                option.setName('session_id')
                    .setDescription('Your TikTok session ID')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Show help information')
    ];

    // Register commands
    client.application.commands.set(commands);
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, user } = interaction;

    if (commandName === 'font_method') {
        const sessionId = interaction.options.getString('session_id');
        
        // Store session ID
        userSessions.set(user.id, { sessionId });
        
        // Create embed for instructions
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🎨 Font Method - Change TikTok Username')
            .setDescription('Please enter your **new username** using the button below.')
            .addFields(
                { name: '📝 Session ID Saved', value: `\`${sessionId.slice(0, 10)}...\`` },
                { name: '⚠️ Note', value: 'Make sure your session ID is valid and your account is not restricted.' }
            )
            .setFooter({ text: 'Made by ogurs | https://discord.gg/25Dg3kUUwP' });

        // Create button to open username modal
        const button = new ButtonBuilder()
            .setCustomId('open_username_modal')
            .setLabel('✏️ Enter New Username')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }

    if (commandName === 'check_username') {
        const sessionId = interaction.options.getString('session_id');
        const deviceId = Math.floor(Math.random() * (999999999999 - 777777788 + 1)) + 777777788;
        const iid = Math.floor(Math.random() * (999999999999 - 777777788 + 1)) + 777777788;

        await interaction.deferReply({ ephemeral: true });

        try {
            const username = await getTikTokProfile(sessionId, deviceId, iid);
            
            if (username) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('📱 TikTok Account Info')
                    .addFields(
                        { name: '👤 Current Username', value: `**${username}**` },
                        { name: '🔐 Session Status', value: '✅ Valid' }
                    )
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({
                    content: '❌ Invalid session ID or account not found.',
                    ephemeral: true
                });
            }
        } catch (error) {
            await interaction.editReply({
                content: '❌ Error checking username. Please verify your session ID.',
                ephemeral: true
            });
        }
    }

    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('🆘 Font Method Bot - Help')
            .setDescription('How to use the TikTok Username Changer bot:')
            .addFields(
                { name: '1️⃣ Get Session ID', value: 'Use browser developer tools or a session extractor to get your TikTok `sessionid` cookie.' },
                { name: '2️⃣ Use /font_method', value: 'Run `/font_method` and enter your session ID' },
                { name: '3️⃣ Enter New Username', value: 'Click the button to enter your desired username' },
                { name: '4️⃣ Verify Change', value: 'Use `/check_username` to verify the change' }
            )
            .addFields(
                { name: '⚠️ Important Notes', value: '• Username must be available\n• Account must not be restricted\n• Session ID expires after some time' }
            )
            .setFooter({ text: 'Made by ogurs | https://discord.gg/25Dg3kUUwP' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});

// Handle button clicks
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'open_username_modal') {
        const modal = new ModalBuilder()
            .setCustomId('username_modal')
            .setTitle('Change TikTok Username');

        const usernameInput = new TextInputBuilder()
            .setCustomId('new_username')
            .setLabel('Enter new TikTok username')
            .setStyle(TextInputStyle.Short)
            .setMinLength(2)
            .setMaxLength(30)
            .setPlaceholder('e.g., nexxyo1036vt')
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(usernameInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    }
});

// Handle modal submissions
client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'username_modal') {
        await interaction.deferReply({ ephemeral: true });
        
        const newUsername = interaction.fields.getTextInputValue('new_username');
        const userData = userSessions.get(interaction.user.id);
        
        if (!userData || !userData.sessionId) {
            await interaction.editReply({
                content: '❌ No session ID found. Please run `/font_method` again.',
                ephemeral: true
            });
            return;
        }

        const sessionId = userData.sessionId;
        const deviceId = Math.floor(Math.random() * (999999999999 - 777777788 + 1)) + 777777788;
        const iid = Math.floor(Math.random() * (999999999999 - 777777788 + 1)) + 777777788;

        // Get current username first
        const lastUsername = await getTikTokProfile(sessionId, deviceId, iid);
        
        if (!lastUsername) {
            await interaction.editReply({
                content: '❌ Invalid session ID or account not accessible.',
                ephemeral: true
            });
            return;
        }

        // Create processing embed
        const processingEmbed = new EmbedBuilder()
            .setColor(0xffaa00)
            .setTitle('⏳ Processing...')
            .setDescription(`Changing username from **${lastUsername}** to **${newUsername}**`)
            .addFields(
                { name: '📊 Status', value: 'Sending request to TikTok...' }
            );

        await interaction.editReply({ embeds: [processingEmbed] });

        // Change username
        const result = await changeTikTokUsername(sessionId, deviceId, iid, lastUsername, newUsername);

        if (result.success) {
            const successEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Username Changed Successfully!')
                .addFields(
                    { name: '👤 Old Username', value: lastUsername },
                    { name: '✨ New Username', value: newUsername },
                    { name: '🔗 Profile URL', value: `https://tiktok.com/@${newUsername}` }
                )
                .setTimestamp()
                .setFooter({ text: 'Font Method Bot | TikTok' });

            await interaction.editReply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ Failed to Change Username')
                .addFields(
                    { name: 'Error', value: result.message },
                    { name: 'Possible Reasons', value: '• Session ID expired\n• Username taken\n• Account restricted\n• Rate limited' }
                );

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

// Login
client.login(BOT_TOKEN);

// Optional: Web server for health checks
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ status: 'Bot is running', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});
