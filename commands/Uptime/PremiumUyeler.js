const db = require('croxydb');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { BotData } = require('../../data/Bot');

const allowedUserId = ''; // Komutu Kullanabilecek Kişi ID Leri

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium-üyeler')
        .setDescription('Premium Üyeler Listesini Gösterir'),
    async execute(interaction) {
        
        if (interaction.user.id !== allowedUserId) {
          
            if (!BotData.owners.includes(interaction.user.id)) {
                return interaction.reply({ 
                    content: '**Bu komutu sadece bot sahipleri kullanabilir!**', 
                    ephemeral: true 
                });
            }
        }

      
        const premiums = db.get('uptime.premiums') || [];
        if (premiums.length === 0) {
            return interaction.reply({ 
                content: 'Hiç premium üye yok.', 
                ephemeral: true 
            });
        }

        
        const premiumMembers = premiums.map(premium => {
            const userId = premium.userId;
            let expiry = premium.expiry; 

           
            if (expiry === 'unlimited') {
                return `Kullanıcı: <@${userId}> - Süresi: Sınırsız`;
            } else if (expiry) {
                expiry = new Date(expiry); 
                const expiryTimestamp = Math.floor(expiry.getTime() / 1000); 
                return `Kullanıcı: <@${userId}> - Süresi: <t:${expiryTimestamp}:D>`; 
            } else {
                return `Kullanıcı: <@${userId}> - Süresi: Sınırsız`; 
            }
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('Premium Üyeler')
            .setDescription(premiumMembers);

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
