const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot-bilgi')
        .setDescription('Bot Hakkındaki Bilgileri Gösterir')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Mesaj Özelmi Olsun')
        ),
    async execute(interaction) {
       
        const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;

       
        await interaction.deferReply({ ephemeral: isEphemeral });

        const client = interaction.client;

      
        const botName = client.user.username;
        const botAvatar = client.user.displayAvatarURL({ dynamic: true });
        const serverCount = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const botOwnerIds = ['983793704701681674', '991409937022468169']; 
        const botOwnerTags = botOwnerIds.map(id => `<@${id}>`).join(', ');
        const creationDate = `<t:${Math.floor(client.user.createdTimestamp / 1000)}:F>`;
        const uptime = formatDuration(client.uptime);

        
        const apiPing = client.ws.ping;
        const wsPing = Date.now() - interaction.createdTimestamp;

        
        const botVersion = '1.3.4 - Stable';
        const nodeVersion = process.version;
        const discordJsVersion = require('discord.js').version;

        
        const botInfoEmbed = new EmbedBuilder()
            .setAuthor({ name: botName, iconURL: botAvatar })
            .setDescription('> **Slayer Uptime Bot Hakkındaki Bilgiler**')
            .addFields(
                { name: '👤 **Bot Sahipleri**', value: botOwnerTags, inline: true },
                { name: '🌐 **Sunucu Sayısı**', value: `${serverCount}`, inline: true },
                { name: '👥 **Kullanıcı Sayısı**', value: `${totalUsers}`, inline: true },
                { name: '📅 **Oluşturulma Tarihi**', value: creationDate, inline: false },
                { name: '⏳ **Çalışma Süresi**', value: uptime, inline: false },
                { name: '⚙️ **Versiyon Bilgisi**', value: `Bot: v${botVersion}\nNode.js: ${nodeVersion}\nDiscord.js: v${discordJsVersion}`, inline: false },
                { name: '📡 **API Ping**', value: `${apiPing}ms`, inline: true },
                { name: '⚡ **WebSocket Ping**', value: `${wsPing}ms`, inline: true },
                { name: '🔗 **Destek Sunucusu**', value: '[Tıkla ve Katıl!](https://discord.gg/JdR3a5ZryR)', inline: false }
            )
            .setColor('Blue')
            .setThumbnail(botAvatar)
            .setFooter({ text: botName, iconURL: botAvatar })
            .setTimestamp();

        
        return interaction.editReply({
            embeds: [botInfoEmbed]
        });
    }
};


function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    return `${days} Gün, ${hours} Saat, ${minutes} Dakika, ${seconds} Saniye`;
}