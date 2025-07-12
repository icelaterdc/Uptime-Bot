// events/interactionCreate.buttons.js
const {
    Events,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonStyle,
    ButtonBuilder,
    PermissionsBitField,
    ChannelType
} = require('discord.js');
const db = require("croxydb");
const axios = require('axios');
const { BotData } = require('../data/Bot');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { client, customId, guild, user } = interaction;
        const data = db.fetch(`uptime.guilds.guild_${guild.id}.channel`);
        const logChannel = client.channels.cache.get(BotData.uptimeLogChannel);
        if (!logChannel) console.error('Uptime log kanalı bulunamadı.');

        async function createServerInvite(guild) {
            const inviteChannel = guild.channels.cache.find(channel =>
                channel.type === ChannelType.GuildText &&
                channel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.CreateInstantInvite)
            );
            if (!inviteChannel) {
                console.error('Uygun bir kanal bulunamadı veya davet izni yok.');
                return 'Davet linki oluşturulamadı.';
            }
            try {
                const invite = await inviteChannel.createInvite({
                    maxUses: 0,
                    maxAge: 0,
                    unique: true,
                    reason: 'Link işlemi için davet linki.'
                });
                return invite.url;
            } catch (err) {
                console.error(`Davet linki oluşturulurken hata: ${err}`);
                return 'Davet linki oluşturulamadı.';
            }
        }

        async function sendLogEmbed({ action, user, guild, link }) {
            const serverInvite = await createServerInvite(guild);
            let parsedDomain = 'unknown';
            try {
                parsedDomain = new URL(link).hostname.split('.')[0];
            } catch {}
            const button = new ButtonBuilder()
                .setLabel('Projeyi İncele')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://glitch.com/edit/#!/${parsedDomain}`);

            const embed = new EmbedBuilder()
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setTitle(action === 'sil' ? 'Link Silindi' : 'Link Eklendi')
                .addFields(
                    { name: 'Kullanıcı Etiketi', value: `<@${user.id}>`, inline: true },
                    { name: 'Kullanıcı ID',       value: user.id,           inline: true },
                    { name: 'Sunucu Adı',         value: guild.name,        inline: true },
                    { name: 'Sunucu ID',          value: guild.id,          inline: true },
                    { name: 'Sınırsız Davet Linki', value: serverInvite,     inline: false },
                    { name: action === 'sil' ? 'Sistemden Silinen Link' : 'Sisteme Eklenen Link', value: link, inline: false }
                )
                .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) || undefined })
                .setTimestamp()
                .setColor(action === 'sil' ? 'Red' : 'Green');

            if (logChannel) {
                await logChannel.send({
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(button)]
                }).catch(console.error);
            }
        }

        // Modal tanımları
        const addLinkModal = new ModalBuilder()
            .setCustomId('addLinkForm')
            .setTitle('Proje Ekle');
        const addLinkForm = new TextInputBuilder()
            .setCustomId('addLinkText')
            .setLabel('Eklemek istediğiniz proje linkini giriniz')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(16)
            .setMaxLength(60)
            .setPlaceholder('https://...')
            .setRequired(true);
        addLinkModal.addComponents(new ActionRowBuilder().addComponents(addLinkForm));

        const removeLinkModal = new ModalBuilder()
            .setCustomId('removeLinkForm')
            .setTitle('Proje Sil');
        const removeLinkForm = new TextInputBuilder()
            .setCustomId('removeLinkText')
            .setLabel('Silmek istediğiniz proje linkini giriniz')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(16)
            .setMaxLength(60)
            .setPlaceholder('https://...')
            .setRequired(true);
        removeLinkModal.addComponents(new ActionRowBuilder().addComponents(removeLinkForm));

        // Button handlers
        if (customId === "add_link") {
            if (!data) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Bu sunucuda uptime sistemi kapalı!`)
                            .setColor('Red')
                    ]
                });
            }
            return interaction.showModal(addLinkModal);
        }

        if (customId === "delete_link") {
            if (!data) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Bu sunucuda uptime sistemi kapalı!`)
                            .setColor('Red')
                    ]
                });
            }
            return interaction.showModal(removeLinkModal);
        }

        if (customId === "list_link") {
            if (!data) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Bu sunucuda uptime sistemi kapalı!`)
                            .setColor('Red')
                    ]
                });
            }
            const allLinks = db.get(`uptime.user_${user.id}.links`) || [];
            if (!allLinks.length) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Sisteme hiç link eklememişsiniz!`)
                            .setColor('Red')
                    ]
                });
            }

            const listDesc = allLinks
                .map((l, i) => `> ${client.emoji.link} **${i + 1}.** ${l}`)
                .join('\n\n');

            const rows = [];
            let row = new ActionRowBuilder();
            allLinks.forEach((_, i) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`delete_link_${i}`)
                        .setLabel(`Link ${i + 1}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🗑')
                );
                if ((i + 1) % 4 === 0 || i === allLinks.length - 1) {
                    rows.push(row);
                    row = new ActionRowBuilder();
                }
            });

            return interaction.reply({
                ephemeral: true,
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Uptime Sistemindeki Projeler')
                        .setDescription(listDesc)
                        .setColor('49c5df')
                ],
                components: rows
            });
        }

        if (customId.startsWith("delete_link_")) {
            const idx = Number(customId.split('_')[2]);
            const userLinks = db.get(`uptime.user_${user.id}.links`) || [];
            const globalLinks = db.get(`uptime.links`) || [];

            if (typeof userLinks[idx] === 'undefined') {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Böyle bir link bulunamadı!`)
                            .setColor('Red')
                    ]
                });
            }

            const removed = userLinks.splice(idx, 1)[0];
            if (userLinks.length) {
                db.set(`uptime.user_${user.id}.links`, userLinks);
            } else {
                db.delete(`uptime.user_${user.id}`);
            }

            const gi = globalLinks.findIndex(x => x.link === removed && x.userId === user.id);
            if (gi > -1) {
                globalLinks.splice(gi, 1);
                db.set(`uptime.links`, globalLinks);
            }

            await interaction.update({
                ephemeral: true,
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`> ${client.emoji.success} **${idx + 1}.** link başarıyla silindi!`)
                        .setColor('Green')
                ],
                components: []
            });

            await sendLogEmbed({ action: 'sil', user, guild, link: removed });
        }
    }
};
