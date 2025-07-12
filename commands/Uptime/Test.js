const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');

const botOwners = ['', '', '']; // Komutu Kullanabilecek Kişi ID Leri

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test Premium Süresi Verir')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Premium verilecek kullanıcı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('süre')
                .setDescription('Premium süresi')
                .setRequired(true)
                .addChoices(
                    { name: '3 gün 5 dakika', value: '3d5m' },
                    { name: '5 dakika', value: '5m' }
                )),

    async execute(interaction) {
       
        if (!botOwners.includes(interaction.user.id)) {
            return interaction.reply({ content: '**Bu komutu sadece bot geliştiricileri kullanabilir!**', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('süre');

        
        let expiryDate;
        if (duration === '3d5m') {
            expiryDate = Date.now() + (3 * 24 * 60 * 60 * 1000) + (5 * 60 * 1000); 
        } else if (duration === '5m') {
            expiryDate = Date.now() + (5 * 60 * 1000); 
        }

        
        const premiums = db.get('uptime.premiums') || [];
        const userPremiumIndex = premiums.findIndex(p => p.userId === user.id);

        if (userPremiumIndex !== -1) {
            
            premiums[userPremiumIndex].expiry = expiryDate;
            premiums[userPremiumIndex].giverId = interaction.user.id;
            premiums[userPremiumIndex].givenAt = Date.now();
        } else {
            
            premiums.push({
                userId: user.id,
                expiry: expiryDate,
                giverId: interaction.user.id,
                givenAt: Date.now()
            });
        }

        db.set('uptime.premiums', premiums);

        
        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('Test Premium Verildi')
            .setDescription(`${user.tag} kullanıcısına ${duration === '3d5m' ? '3 gün 5 dakika' : '5 dakika'} süreli test premium verildi.`)
            .addFields(
                { name: 'Kullanıcı', value: `<@${user.id}>`, inline: true },
                { name: 'Süre', value: duration === '3d5m' ? '3 gün 5 dakika' : '5 dakika', inline: true },
                { name: 'Bitiş Tarihi', value: `<t:${Math.floor(expiryDate / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

      
        const logChannelId = '1286320712826490975'; // Log Kanal ID Si
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('Test Premium Verildi')
                .setDescription(`${interaction.user.tag} tarafından ${user.tag} kullanıcısına test premium verildi.`)
                .addFields(
                    { name: 'Kullanıcı', value: `<@${user.id}>`, inline: true },
                    { name: 'Süre', value: duration === '3d5m' ? '3 gün 5 dakika' : '5 dakika', inline: true },
                    { name: 'Bitiş Tarihi', value: `<t:${Math.floor(expiryDate / 1000)}:F>`, inline: true },
                    { name: 'Veren Yetkili', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
        }
    },
};