const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun Ping Değerini Gösterir'),
    async execute(interaction) {
        const ping = interaction.client.ws.ping;
        await interaction.reply(`**Gecikme Sürem ${ping}ms** 🛰️`);
    },
};
