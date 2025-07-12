const db = require('croxydb');
const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { UserData } = require('../../data/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Sunucuya uptime sistemi kurar.')
        .addSubcommand(x => x
            .setName("ayarla").setDescription("Sunucuya Uptime Sistemi Kurar.")
            .addChannelOption(x =>
                x.setName("channel").setDescription("Uptime sistemi hangi kanala kurulacak?").setRequired(true).addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(x => x
            .setName("sıfırla").setDescription("Sunucudaki Uptime Sistemini Kapatır"))
        .addSubcommand(x => x
            .setName("sayı").setDescription("Uptime Sistemindeki Link Sayısını Gösterir")),
    async execute(interaction) {
        const client = interaction.client;
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Bu komutu sen kullanamazsın!`)
                ],
                ephemeral: true
            });
        }

        const cmd = interaction.options.getSubcommand();
        if (cmd == "ayarla") {
            const data = db.fetch(`uptime.guilds.guild_${interaction.guild.id}.channel`);
            if (!data) {
                const channel = interaction.options.getChannel("channel");
                const row1 = new ActionRowBuilder()
                .addComponents(
                        new ButtonBuilder()
                            .setCustomId("add_link")
                            .setLabel("Link Ekle")
                            .setEmoji(client.emoji.online)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId("delete_link")
                            .setLabel("Link Sil")
                            .setEmoji(client.emoji.offline)
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId("list_link")
                            .setLabel("Linklerim")
                            .setEmoji(client.emoji.link)
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId("refresh")
                            .setEmoji("<:yenile:1295525502802722857>")
                            .setLabel("Yenile")
                            .setStyle(ButtonStyle.Secondary)
                    );
                
                const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setURL("https://top.gg/bot/1238552811269263567/vote")
                        .setEmoji("<:topgg:1295525681408774176>")
                        .setLabel("Oy Ver")
                        .setStyle(ButtonStyle.Link),
                    new ButtonBuilder()
                        .setURL("https://discord.gg/ps9XJrJneC")
                        .setEmoji("<:mdestek1:1287083338242457632>")
                        .setLabel("Destek")
                        .setStyle(ButtonStyle.Link)
                    );
                
                
                db.set(`uptime.guilds.guild_${interaction.guild.id}.channel`, channel.id);
                interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.success} Uptime sistemi başarıyla ${channel} kanalına ayarlandı!`)
                    ],
                    ephemeral: true
                });

                channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#49c5df')
                            .setTitle(interaction.guild.name)
                            .setThumbnail(interaction.guild.iconURL())
                            .setImage("https://media.discordapp.net/attachments/1076802612386615386/1286808167946129418/standard_16.gif?ex=66ef40fe&is=66edef7e&hm=3481273ebc10edf9f7f44e7b003d515f104ccf1713d28c3a9d8d719f0475db18&")
                            .setDescription(`
> ${client.emoji.bot} Projeni **7/24** yapmak için alttaki butonları kullanabilirsin!

> ${client.emoji.online} Aşağıdaki **Link Ekle** butonuna tıklayarak projeni ekleyebilirsin!

> ${client.emoji.offline} Aşağıdaki **Link Sil** butonuna tıklayarak projeni kaldırabilirsin!

> ${client.emoji.link} Aşağıdaki **Linklerim** butonuna tıklayarak eklemiş olduğun projeleri görürsün!

> <:topgg:1295525681408774176> Aşağıdaki **Oy Ver** butonuna tıklayarak bize destek olabilirsin!

> <:mdestek1:1287083338242457632> Aşağıdaki **Destek** butonuna tıklayarak sorunların hakkında destek alabilirsin!
`)
                            .setFooter({ text: `${client.user.username} ~ Lerox Inc ✨ 2025`, iconURL: client.user.displayAvatarURL() })
                    ],
                    components: [row1, row2]
                });
            } else {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Uptime sistemi zaten bu sunucuda ayarlı! Sıfırlamak için \`/uptime sıfırla\` komutunu kullanın!`)
                    ],
                    ephemeral: true
                });
            }
        } else if (cmd == "sıfırla") {
            const data = db.fetch(`uptime.guilds.guild_${interaction.guild.id}.channel`);
            if (data) {
                db.delete(`uptime.guilds.guild_${interaction.guild.id}.channel`);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.success} Uptime sistemi başarıyla sıfırlandı!`)
                    ],
                    ephemeral: true
                });
            } else {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`> ${client.emoji.error} Uptime sistemi zaten bu sunucuda ayarlı değil!`)
                    ],
                    ephemeral: true
                });
            }
        } else if (cmd == "sayı") {
            const data = db.fetch('uptime.links') || [];
            const linkCount = data.length;

            const embed = new EmbedBuilder()
                .setColor('#49c5df')
                .setDescription(`Uptime sisteminde şu anda **${linkCount}** link bulunmaktadır.`);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
