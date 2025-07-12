// events/interactionCreate.modals.js
const {
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType
} = require('discord.js');
const db = require("croxydb");
const axios = require('axios');
const { UserData } = require('../data/User');
const { BotData } = require('../data/Bot');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        const { customId, user, guild, client } = interaction;
        const guildData = db.fetch(`uptime.guilds.guild_${guild.id}.channel`);
        const userId = user.id;
        const logChannel = await client.channels.fetch(BotData.uptimeLogChannel).catch(() => null);
        if (!logChannel) console.error(`Log kanalı bulunamadı: ${BotData.uptimeLogChannel}`);
        if (!guildData) {
            return interaction.reply({
                ephemeral: true,
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Bu sunucuda uptime sistemi kapalı!`)
                        .setColor('Red')
                ]
            });
        }

        async function validateURL(url) {
            return new Promise(resolve => {
                let errored = false;
                const timeout = setTimeout(() => { if (!errored) resolve(true); }, 15000);
                axios.get(url, {
                    timeout: 15000,
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    validateStatus: () => true
                }).then(res => {
                    if (typeof res.data === 'string' && (
                        res.data.includes('Well, you found a glitch.') ||
                        res.data.includes("Oops! This project isn't running.")
                    )) {
                        errored = true;
                        clearTimeout(timeout);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }).catch(() => {
                    if (!errored) resolve(true);
                });
            });
        }

        async function createServerInvite(guild) {
            const ch = guild.channels.cache.find(c =>
                c.type === ChannelType.GuildText &&
                c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.CreateInstantInvite)
            );
            if (!ch) return 'Davet linki oluşturulamadı.';
            try {
                return (await ch.createInvite({
                    maxUses: 0,
                    maxAge: 0,
                    unique: true,
                    reason: 'Link işlemi için davet linki.'
                })).url;
            } catch {
                return 'Davet linki oluşturulamadı.';
            }
        }

        async function sendLogEmbed(action, user, guild, link) {
            if (!logChannel) return;
            const serverInvite = await createServerInvite(guild);
            let parsed = 'unknown';
            try { parsed = new URL(link).hostname.split('.')[0]; } catch {}
            const button = new ButtonBuilder()
                .setLabel('Projeyi İncele')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://glitch.com/edit/#!/${parsed}`);
            const embed = new EmbedBuilder()
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setTitle(action === 'sil' ? 'Link Silindi' : 'Link Eklendi')
                .addFields(
                    { name: 'Kullanıcı', value: `• ${user.tag} (\`${user.id}\`)`, inline: true },
                    { name: 'Sunucu',   value: `• ${guild.name} (\`${guild.id}\`)`, inline: true },
                    { name: 'Davet Linki', value: serverInvite, inline: false },
                    { name: action === 'sil' ? 'Silinen Link' : 'Eklenen Link', value: link, inline: false }
                )
                .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) || undefined })
                .setTimestamp()
                .setColor(action === 'sil' ? 'Red' : 'Green');
            await logChannel.send({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(button)]
            }).catch(console.error);
        }

        if (customId === "addLinkForm") {
            const link = interaction.fields.getTextInputValue("addLinkText");
            const userLinks = db.get(`uptime.user_${userId}.links`) || [];
            const allLinks  = db.get(`uptime.links`) || [];
            const premiumUsers = db.get(`uptime.premiums`) || [];

            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription('> ⏳ Linkiniz kontrol ediliyor, lütfen bekleyin…')
                        .setColor('Yellow')
                ]
            });

            const exists = userLinks.includes(link) || allLinks.some(item =>
                typeof item === 'object' ? item.link === link : item === link
            );
            if (exists) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Eklemeye çalıştığınız link zaten sistemde var!`)
                            .setColor('Red')
                    ]
                });
            }

            const isPremium = premiumUsers.some(u => u.userId === userId);
            const maxLinks = isPremium ? UserData.premiumMaxAddLink : UserData.maxAddLink;
            if (userLinks.length >= maxLinks) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Sisteme en fazla **${maxLinks}** proje ekleyebilirsiniz!`)
                            .setColor('Red')
                    ]
                });
            }

            if (!link.startsWith('https://')) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Linkin başında \`https://\` olmalı!`)
                            .setColor('Red')
                    ]
                });
            }

            if (!UserData.allowedDomains.some(d => link.endsWith(d))) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Geçerli bir domain uzantısı kullanmalısınız: ${UserData.allowedDomains.map(x => `\`${x}\``).join(', ')}`)
                            .setColor('Red')
                    ]
                });
            }

            try {
                const valid = await validateURL(link);
                if (!valid) {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`> ${client.emoji.error} Proje linki geçersiz veya erişilemez durumda!`)
                                .setColor('Red')
                        ]
                    });
                }

                const obj = { link, userId, addedAt: Date.now() };
                db.push(`uptime.links`, obj);
                db.push(`uptime.user_${userId}.links`, link);

                // Başarılı ekleme embed’i
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.success} **${link}** başarıyla sisteme eklendi!`)
                            .addFields(
                                { name: 'Sunucu Konumu', value: '🇩🇪 Frankfurt, Germany (West) EU Central', inline: true },
                                { name: 'Gecikme',        value: `${client.ws.ping}ms`,             inline: true }
                            )
                            .setColor('Green')
                    ]
                });

                await sendLogEmbed('ekle', user, guild, link);
            } catch {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Bir hata oluştu! Lütfen daha sonra tekrar deneyin.`)
                            .setColor('Red')
                    ]
                });
            }
        }

        if (customId === "removeLinkForm") {
            const linkToRemove = interaction.fields.getTextInputValue("removeLinkText");
            const userLinks   = db.get(`uptime.user_${userId}.links`) || [];
            const globalLinks = db.get(`uptime.links`) || [];

            const belongsToUser = userLinks.includes(linkToRemove);
            const existsInGlobal = globalLinks.some(x => x.link === linkToRemove && x.userId === userId);
            if (!belongsToUser || !existsInGlobal) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Bu link size ait değil veya sistemde bulunamadı!`)
                            .setColor('Red')
                    ]
                });
            }

            // Kullanıcı listesinden sil
            const ui = userLinks.indexOf(linkToRemove);
            userLinks.splice(ui, 1);
            if (userLinks.length) {
                db.set(`uptime.user_${userId}.links`, userLinks);
            } else {
                db.delete(`uptime.user_${userId}`);
            }

            // Global listeden sil
            const gi = globalLinks.findIndex(x => x.link === linkToRemove && x.userId === userId);
            if (gi > -1) {
                globalLinks.splice(gi, 1);
                db.set(`uptime.links`, globalLinks);
            }

            await interaction.reply({
                ephemeral: true,
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`> ${client.emoji.success} **${linkToRemove}** başarıyla sistemden silindi!`)
                        .setColor('Green')
                ]
            });

            await sendLogEmbed('sil', user, guild, linkToRemove);
        }
    }
};
