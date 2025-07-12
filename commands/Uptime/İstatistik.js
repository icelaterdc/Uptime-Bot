const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');
const ms = require('ms');
const { version } = require('../../package.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('istatistik')
        .setDescription('Botun İstatistik Verilerini Gösterir'),
    async execute(interaction) {
        const client = interaction.client;
        const startTime = Date.now();

        try {
            await interaction.deferReply();

            const totalGuilds = client.guilds.cache.size;
            const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const ping = client.ws.ping;
            const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            const cpuUsage = (os.loadavg()[0]).toFixed(2);
            const nodeVersion = process.version;
            const commandCount = client.commands?.size || 0;
            
            const uptimeSeconds = Math.floor(client.uptime / 1000);
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = uptimeSeconds % 60;
            const formattedUptime = `${days} gün ${hours} saat ${minutes} dakika ${seconds} saniye`;

			const createBar = (percent, size = 10) => {
                const progress = Math.round(percent / 100 * size);
                return `[${'▰'.repeat(progress)}${'▱'.repeat(size - progress)}] ${percent}%`;
            };

            const embed = new EmbedBuilder()
                .setColor('#6B8CE6')
                .setAuthor({
                    name: `${client.user.username} •İstatistikleri`,
                    iconURL: client.user.displayAvatarURL({ size: 256 })
                })
                .setThumbnail(client.user.displayAvatarURL({ size: 1024, dynamic: true }))
                .setDescription(`**${client.user.username} Botunun Gerçek Zamanlı İstatistikleri**`)
                .addFields(
                    {
                        name: 'Genel Bilgiler',
                        value: [
                            `• **Sunucu Sayısı:** \`${totalGuilds}\` adet`,
                            `• **Toplam Kullanıcı:** \`${totalUsers}\` kişi`,
                            `• **Komut Sayısı:** \`${commandCount}\` komut`,
                            `• **Çalışma Süresi:** \`${formattedUptime}\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: 'Sistem Performansı',
                        value: [
                            `• **Bot Gecikmesi:** \`${ping}ms\``,
                            `• **Bellek Kullanımı:** \`${memoryUsage} MB\``,
                            `• **CPU Yükü:** ${createBar(cpuUsage * 10)}`,
                            `• **Node.js Versiyon:** \`${nodeVersion}\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: 'Sistem Kaynakları',
                        value: [
                            `• **Toplam Bellek:** \`${totalMemory} GB\``,
                            `• **Boş Bellek:** \`${freeMemory} GB\``,
                            `• **İşletim Sistemi:** \`${os.type()} ${os.arch()}\``,
                            `• **Platform:** \`${os.platform()}\``
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({
                    text: `${interaction.user.username} tarafından istendi • v${version}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            const responseTime = Date.now() - startTime;
            embed.addFields({
                name: 'Yanıt Süresi',
                value: `\`${responseTime}ms\``,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('İstatistik komutu hatası:', error);
            await interaction.editReply({
                content: 'İstatistik Komutunda Bir Hata Oluştu',
                flags: 64
            });
        }
    }
};