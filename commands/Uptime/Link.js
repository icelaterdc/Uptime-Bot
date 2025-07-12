// commands/link.js
const db = require('croxydb');
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType
} = require('discord.js');
const { UserData } = require('../../data/User');
const { BotData } = require('../../data/Bot');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Uptime sistemimize projenizi ekleyin.')
        .addSubcommand(sub => sub
            .setName('ekle')
            .setDescription('Uptime Sistemimize Proje Eklersiniz')
            .addStringOption(opt =>
                opt.setName('link')
                   .setDescription('Projenizin Linki')
                   .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('sil')
            .setDescription('Uptime Sistemimizden Projenizi Silersiniz')
            .addStringOption(opt =>
                opt.setName('link')
                   .setDescription('Projenizin Linki')
                   .setRequired(true)
                   .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('listele')
            .setDescription('Eklediğiniz Tüm Projeleri Listeler')
        ),

    async execute(interaction) {
        const client = interaction.client;
        const cmd = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guild = interaction.guild;
        const logChannel = await client.channels.fetch(BotData.uptimeLogChannel).catch(() => null);
        if (!logChannel) console.error(`Log kanalı bulunamadı: ${BotData.uptimeLogChannel}`);

        async function validateURL(url) {
            return new Promise(resolve => {
                let errored = false;
                const timer = setTimeout(() => { if (!errored) resolve(true); }, 15000);
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
                        clearTimeout(timer);
                        resolve(false);
                    } else {
                        clearTimeout(timer);
                        resolve(true);
                    }
                }).catch(() => {
                    if (!errored) {
                        clearTimeout(timer);
                        resolve(true);
                    }
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
                    reason: 'Link ekleme/silme işlemi için davet linki.'
                })).url;
            } catch {
                return 'Davet linki oluşturulamadı.';
            }
        }

        async function sendLogEmbed({ action, user, guild, link }) {
            if (!logChannel) return;
            const serverInvite = await createServerInvite(guild);
            let domain = 'unknown';
            try { domain = new URL(link).hostname.split('.')[0]; } catch {}
            const button = new ButtonBuilder()
                .setLabel('Projeyi İncele')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://glitch.com/edit/#!/${domain}`);
            const embed = new EmbedBuilder()
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setTitle(action === 'ekle' ? 'Link Eklendi' : 'Link Silindi')
                .addFields(
                    { name: 'Kullanıcı Bilgileri', value: `• Etiket: <@${user.id}>\n• ID: ${user.id}`, inline: true },
                    { name: 'Sunucu Bilgileri',   value: `• Ad: ${guild.name}\n• ID: ${guild.id}`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true },
                    { name: 'Sunucu Sınırsız Davet Linki', value: serverInvite, inline: false },
                    { name: action === 'ekle' ? 'Sisteme Eklenen Link' : 'Sistemden Silinen Link',
                      value: `${link}\nEkleyen: <@${user.id}> (\`${user.id}\`)`, inline: false }
                )
                .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) || undefined })
                .setTimestamp()
                .setColor(action === 'ekle' ? 'Green' : 'Red');
            await logChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] }).catch(console.error);
        }

        if (cmd === 'ekle') {
            const link = interaction.options.getString('link');
            const userLinks = db.get(`uptime.user_${userId}.links`) || [];
            const allLinks  = db.get(`uptime.links`) || [];
            const premiums  = db.get(`uptime.premiums`) || [];

            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply({
                embeds: [ new EmbedBuilder()
                    .setDescription('> ⏳ Linkiniz kontrol ediliyor, lütfen bekleyin…')
                    .setColor('Yellow')
                ]
            });

            const exists = userLinks.includes(link) || allLinks.some(x =>
                typeof x === 'object' ? x.link === link : x === link
            );
            if (exists) {
                return interaction.editReply({
                    embeds: [ new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Eklemeye çalıştığınız link zaten sistemde var!`)
                        .setColor('Red')
                    ]
                });
            }

            const isPremium = premiums.some(u => u.userId === userId);
            const limit = isPremium ? UserData.premiumMaxAddLink : UserData.maxAddLink;
            if (userLinks.length >= limit) {
                return interaction.editReply({
                    embeds: [ new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Sisteme en fazla **${limit}** proje ekleyebilirsiniz${!isPremium ? ', premium ile artırabilirsiniz.' : '!'}`)
                        .setColor('Red')
                    ]
                });
            }

            if (!link.startsWith('https://')) {
                return interaction.editReply({
                    embeds: [ new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Linkin başında \`https://\` olmalı!`)
                        .setColor('Red')
                    ]
                });
            }

            if (!UserData.allowedDomains.some(d => link.endsWith(d))) {
                return interaction.editReply({
                    embeds: [ new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Geçerli bir domain uzantısı kullanmalısınız: ${UserData.allowedDomains.map(x=>`*\`${x}\`*`).join(', ')}`)
                        .setColor('Red')
                    ]
                });
            }

            const valid = await validateURL(link);
            if (!valid) {
                return interaction.editReply({
                    embeds: [ new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Proje linki geçersiz veya erişilemez durumda!`)
                        .setColor('Red')
                    ]
                });
            }

            // Ekleme
            db.push(`uptime.links`, { link, userId, addedAt: Date.now() });
            db.push(`uptime.user_${userId}.links`, link);

            await interaction.editReply({
                embeds: [ new EmbedBuilder()
                    .setDescription(`> ${client.emoji.success} **${link}** başarıyla sisteme eklendi!`)
                    .addFields(
                        { name: 'Sunucu Konumu', value: '🇩🇪 Germany / Frankfurt', inline: true },
                        { name: 'Gecikme',        value: `${client.ws.ping}ms`,             inline: true }
                    )
                    .setColor('Green')
                ]
            });

            await sendLogEmbed({ action: 'ekle', user: interaction.user, guild, link });
        }

        else if (cmd === 'sil') {
            const link = interaction.options.getString('link');
            const userLinks  = db.get(`uptime.user_${userId}.links`) || [];
            const globalList = db.get(`uptime.links`) || [];

            if (!userLinks.includes(link)) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [ new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Bu link sistemde bulunamadı veya size ait değil!`)
                        .setColor('Red')
                    ]
                });
            }

            // Kullanıcı listesinden sil
            const idxU = userLinks.indexOf(link);
            userLinks.splice(idxU, 1);
            if (userLinks.length) db.set(`uptime.user_${userId}.links`, userLinks);
            else            db.delete(`uptime.user_${userId}`);

            // Global listeden sil
            const idxG = globalList.findIndex(x => x.link === link && x.userId === userId);
            if (idxG > -1) {
                globalList.splice(idxG, 1);
                db.set(`uptime.links`, globalList);
            }

            await interaction.reply({
                ephemeral: true,
                embeds: [ new EmbedBuilder()
                    .setDescription(`> ${client.emoji.success} **${link}** başarıyla sistemden silindi!`)
                    .setColor('Green')
                ]
            });

            await sendLogEmbed({ action: 'sil', user: interaction.user, guild, link });
        }

        else if (cmd === 'listele') {
            const userLinks = db.get(`uptime.user_${userId}.links`) || [];
            if (!userLinks.length) {
                return interaction.reply({
                    ephemeral: true,
                    embeds: [ new EmbedBuilder()
                        .setDescription('> Sistemde henüz herhangi bir proje bulunmamaktadır.')
                        .setColor('Random')
                    ]
                });
            }

            await interaction.reply({
                ephemeral: true,
                embeds: [ new EmbedBuilder()
                    .setTitle(`${interaction.user.username} adlı kullanıcının projeleri`)
                    .setDescription(userLinks.map((l,i) => `\`${i+1}.\` ${l}`).join('\n'))
                    .setColor('Green')
                ]
            });
        }
    }
};
