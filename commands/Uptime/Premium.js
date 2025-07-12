const db = require('croxydb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { BotData } = require('../../data/Bot');

const allowedGuildId = BotData.premiumManageGuild;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Premium komutları.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('ver')
                .setDescription('Bir Kullanıcıya Premium Verir')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Premium verilecek kullanıcı')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('süre')
                        .setDescription('Premium süresi')
                        .setRequired(true)
                        .addChoices(
                            { name: '1 Ay', value: '1m' },
                            { name: '3 Ay', value: '3m' },
                            { name: '6 Ay', value: '6m' },
                            { name: '1 Yıl', value: '1y' },
                            { name: 'Sınırsız', value: 'infinity' },
                        )))
        .addSubcommand(subcommand => 
            subcommand
                .setName('al')
                .setDescription('Bir kullanıcının premiumunu alır.')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Premium\'u alınacak kullanıcı.')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('link-sil')
                        .setDescription('Premium alındıktan sonra kullanıcının linklerini sil')
                        .setRequired(true)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('sürem')
                .setDescription('Kendi Veya Belirtilen Kişinin Premium Süresini Gösterir')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('Süresi kontrol edilecek kullanıcı'))),

    async execute(interaction) {
        const cmd = interaction.options.getSubcommand();
        const logChannelId = BotData.premiumLogChannel; 
        const logChannel = interaction.guild.channels.cache.get(logChannelId);

        if (cmd === "ver" || cmd === "al") {
           
            if (interaction.guild.id !== allowedGuildId) {
                return interaction.reply({
                    content: '**Üzgünüm, bu komutu https://discord.gg/JdR3a5ZryR Sunucusunda kullanabilirsiniz!**',
                    ephemeral: true
                });
            }

            if (cmd === "ver") {
                if (!BotData.owners.includes(interaction.user.id)) {
                    return interaction.reply({
                        content: '**Bu Komutu Sadece Bot Sahibi Kullanabilir!**',
                        ephemeral: true
                    });
                }

                const user = interaction.options.getUser('user');
                const duration = interaction.options.getString('süre');
                const premiums = db.get('uptime.premiums') || [];
                const userPremium = premiums.find(p => p.userId === user.id);

                
                if (userPremium) {
                    const premiumGivenAt = Math.floor(userPremium.givenAt / 1000); 
                    const giverId = userPremium.giverId;
                    return interaction.reply({
                        content: `**Bu kullanıcıya <@${giverId}> tarafından <t:${premiumGivenAt}:D> tarihinde premium verilmiştir! Tekrar premium vermek istiyorsanız önce kullanıcıda bulunan premiumu almanız gerekiyor!**`,
                        ephemeral: true
                    });
                }

                let expiryDate;

                switch (duration) {
                    case '1m':
                        expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000; 
                        break;
                    case '3m':
                        expiryDate = Date.now() + 90 * 24 * 60 * 60 * 1000;
                        break;
                    case '6m':
                        expiryDate = Date.now() + 180 * 24 * 60 * 60 * 1000; 
                        break;
                    case '1y':
                        expiryDate = Date.now() + 365 * 24 * 60 * 60 * 1000; 
                        break;
                    case 'infinity':
                        expiryDate = 'unlimited'; 
                        break;
                    default:
                        return interaction.reply({
                            content: '**Geçersiz Süre Seçeneği**',
                            ephemeral: true
                        });
                }

                
                premiums.push({ userId: user.id, expiry: expiryDate, giverId: interaction.user.id, givenAt: Date.now() }); 
                db.set('uptime.premiums', premiums);

                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setDescription(`${user.tag} adlı kullanıcıya premium verilmiştir. Süre: ${duration}`);
                await interaction.reply({ embeds: [embed], ephemeral: true });

                const premiumSuresi = duration === 'infinity' ? 'Sınırsız' : `<t:${Math.floor(expiryDate / 1000)}:D>`;
                const logEmbed = new EmbedBuilder()
                    .setColor('Blue')
                    .setThumbnail(user.displayAvatarURL())
                    .setAuthor({ name: "Premium Verildi", iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(
                        `**<:kullanici:1294638069089304577> Kullanıcı:** <@${user.id}>\n` +
                        `**<:yetkili_tools:1294638373855694952> Yetkili:** <@${interaction.user.id}>\n` +
                        `**<:ga_sure:1294638968767250524> Premium Süresi:** ${premiumSuresi}\n\n` +
                        `**<a:onaylanmis_em:1294665341074673705> Premium Verildi!**`
                    )
                    .setFooter({ text: `Kullanıcı ID: ${user.id}`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });

            } else if (cmd === "al") {
                if (!BotData.owners.includes(interaction.user.id)) {
                    return interaction.reply({
                        content: '**Bu Komutu Sadece Bot Sahibi Kullanabilir!**',
                        ephemeral: true
                    });
                }

                const user = interaction.options.getUser('user');
                const linkSil = interaction.options.getBoolean('link-sil');
                const premiums = db.get('uptime.premiums') || [];
                const userPremiumIndex = premiums.findIndex(p => p.userId === user.id);

                if (userPremiumIndex === -1) {
                    return interaction.reply({ content: '**Bu Kullanıcının Premiumu Yok**', ephemeral: true });
                }

                premiums.splice(userPremiumIndex, 1);
                db.set('uptime.premiums', premiums);

                let linksDeletedMessage = '';
                if (linkSil) {
                    
                    const userLinks = db.get(`uptime.user_${user.id}.links`) || [];
                    const allLinks = db.get(`uptime.links`) || [];
                    
                    const linksToKeep = userLinks.slice(0, 3);
                    const linksToRemove = userLinks.slice(3);
                    
                    db.set(`uptime.user_${user.id}.links`, linksToKeep);
                    
                   
                    const updatedAllLinks = allLinks.filter(link => !linksToRemove.includes(link));
                    db.set(`uptime.links`, updatedAllLinks);

                    linksDeletedMessage = ' ve ilk 3 link hariç tüm linkleri silindi';
                }

                await interaction.reply({ content: `${user.tag} adlı kullanıcının premiumu başarıyla alındı${linksDeletedMessage}.`, ephemeral: true });

                const logEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setThumbnail(user.displayAvatarURL())
                    .setAuthor({ name: "Premium Alındı", iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(
                        `**<:kullanici:1294638069089304577> Kullanıcı:** <@${user.id}>\n` +
                        `**<:yetkili_tools:1294638373855694952> Yetkili:** <@${interaction.user.id}>\n` +
                        `**<:ga_sure:1294638968767250524> Linkler Silindi:** ${linkSil ? 'Evet' : 'Hayır'}\n\n` +
                        `**<a:onaylanmis_em:1294665341074673705> Premium Alındı!**\n` +
                        (linkSil ? `**İlk 3 link hariç tüm linkler silindi.**` : '')
                    )
                    .setFooter({ text: `Kullanıcı ID: ${user.id}`, iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }
        } else if (cmd === "sürem") {
            const user = interaction.options.getUser('user') || interaction.user;
            const premiums = db.get('uptime.premiums') || [];
            const userPremium = premiums.find(p => p.userId === user.id);

            if (!userPremium) {
                return interaction.reply({ content: '**Bu Kullanıcının Premiumu Yok**', ephemeral: true });
            }

            const expiry = userPremium.expiry !== null ? new Date(userPremium.expiry) : null;
            let expiryString;

            if (expiry) {
                const timeLeft = expiry - Date.now();
                if (timeLeft > 0) {
                    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                    expiryString = `Sayın <@${user.id}> Premium Süreniz <t:${Math.floor(expiry.getTime() / 1000)}:D> tarihinde dolacak. **${daysLeft} Gün Kaldı!**`;
                } else {
                    expiryString = `Sayın <@${user.id}> Premium Süreniz **Sınırsız**.`;
                }
            } else {
                expiryString = `Sayın <@${user.id}> Premium Süreniz **Sınırsız**!`;
            }

            await interaction.reply({
                content: expiryString,
                ephemeral: true
            });
        }
    }
};