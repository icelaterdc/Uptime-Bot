const db = require('croxydb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link-görüntüle')
        .setDescription('Başka Bir Kullanıcının Uptime Sistemindeki Linklerini Gösterir')
        .addUserOption(option => 
            option.setName('kullanıcı')
            .setDescription('Linklerini görmek istediğiniz kullanıcıyı seçin')
            .setRequired(true)
        ),
    async execute(interaction) {
        const client = interaction.client;
        const userId = interaction.user.id;

        
        const authorizedIds = ['', '', '','']; // Komutu Kullanabilecek Kişi ID Leri

       
        if (!authorizedIds.includes(userId)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`> ${client.emoji.error} Bu komutu yalnızca geliştiriciler kullanabilir!`)
                        .setColor('Red')
                ],
                ephemeral: true
            });
        }

      
        const selectedUser = interaction.options.getUser('kullanıcı');
        const selectedUserLinks = db.get(`uptime.user_${selectedUser.id}.links`) || [];

       
        if (selectedUserLinks.length === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`> Seçilen kullanıcı için sistemde herhangi bir proje bulunmamaktadır.`)
                        .setColor('Random')
                ],
                ephemeral: true
            });
        }

        
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${selectedUser.username} adlı kullanıcının eklediği projeler`)
                    .setDescription(selectedUserLinks.map((link, index) => `\`${index + 1}.\` ${link}`).join("\n"))
                    .setColor('Green')
            ],
            ephemeral: true
        });
    }
};
