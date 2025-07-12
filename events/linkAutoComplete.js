const { Events } = require('discord.js');
const db = require("croxydb")
module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				if (interaction.options.getSubcommand() === 'sil') {
					const userId = interaction.user.id;
					const links = db.get(`uptime.user_${userId}.links`) || [];
					const linkOptions = links.map(link => ({ name: link, value: link }));
					return await interaction.respond(linkOptions).catch(() => { });

				}
			} catch (error) {
				console.error(error);
			}
		}
	},
};