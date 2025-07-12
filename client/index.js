const { Client, IntentsBitField, Collection, REST, Routes, ChannelType, ActivityType, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const { BotData } = require("../data/Bot");
const fs = require("fs");
const path = require('path');
const { checkAndUpdateTime, setClient } = require('../utils/uptime');

const db = require('croxydb');

module.exports = class Bot {
  constructor() {
    this.client = new Client({
      intents: [
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildModeration,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildVoiceStates,
      ]
    });
    this.client.commands = new Collection();
    this.commands = [];
      
      ///// EMOJİ BÖLÜMÜ \\\\\
    this.client.emoji = {
      "success": "<:yesil_basarili:1285985840501096498>", // Tik Emojisi
      "error": "<:carpi:1285986193393057824>", // Çarpı Emojii
      "online": "<:arti:1285986576811430056>", // Online Emojisi
      "offline": "<:eksi:1285986988998000662>", // Offline Emojisi
      "link": "<:duzenleme:1285987307853316169>", // Link Emojisi
      "bot": "<a:bots:1238566179778465864>" // Bot Emojisi
    };
  }

    ///// EVENT TANIMLARI \\\\\
  async init() {
    this.AntiCrash();
    this.StartBot();
    this.LoadCommands();
    this.LoadEvents();
    this.client.on("ready", async () => {
      this.PostCommandsToAPI();
    });
    this.UptimeLinks();
    setInterval(() => this.checkPremiumExpirations(), 10000);
  }

    ///// READY EVENTİ \\\\\
  async StartBot() {
    this.client.on('ready', async () => {
      setClient(this.client);
      console.log(`Bot ${this.client.user.tag} olarak giriş yaptı!`);

      this.client.user.setPresence({
        activities: [{ name: 'Slayer Uptime Yeniden Başlatılıyor...', type: ActivityType.Playing }],
        status: 'dnd',
      });

      const premiumUsers = db.get('uptime.premiums') || [];
      console.log(`Sistemde ${premiumUsers.length} premium üye bulunuyor.`);

        ///// BOT DURUMU \\\\\
      setTimeout(() => {
        const statuses = [
          { name: '🔋 | Slayer Uptime', type: ActivityType.Listening },
          { name: '🔋 | 7/24 Aktif', type: ActivityType.Watching },
        ];

        let index = 0;
        setInterval(() => {
          const uptimeData = db.get('uptime');
          const linkCount = uptimeData?.links?.length || 0;

          statuses[2] = { name: `🔋 | ${linkCount} Linki Aktif Tutuyorum`, type: ActivityType.Playing };

          this.client.user.setPresence({
            activities: [{ name: statuses[index].name, type: statuses[index].type }],
            status: 'dnd',
          });
          index = (index + 1) % statuses.length;
        }, 12000);
      }, 10000);

        ///// SESLİ KANALA KATILMA \\\\\
      const voiceChannelId = BotData.voiceChannel;
      try {
        const voiceChannel = await this.client.channels.fetch(voiceChannelId);
        if (voiceChannel && voiceChannel.type === ChannelType.GuildVoice) {
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          });
          console.log(`Sesli kanala katıldım: ${voiceChannel.name}`);
        } else {
          console.error('Sesli kanal bulunamadı veya geçersiz.');
        }
      } catch (error) {
        console.error(`Sesli kanala katılamadım: ${error.message}`);
      }

        ///// YENİDEN BAŞLATILMA LOGU \\\\\
      const textChannelId = BotData.statusChannel;
      try {
        const textChannel = await this.client.channels.fetch(textChannelId);
        if (textChannel && textChannel.type === ChannelType.GuildText) {
          const currentTime = Math.floor(Date.now() / 1000);
          const uptimeMessage = `**<a:online:1286768949941375062> Yeniden Başlatıldım (<t:${currentTime}:R>)**`;
          await textChannel.send(uptimeMessage);
          console.log(`Mesaj başarıyla gönderildi: ${uptimeMessage}`);
        } else {
          console.error('Yeniden başlatılma logu için kanal bulunamadı veya geçersiz.');
        }
      } catch (error) {
        console.error(`Mesaj atılamadı: ${error.message}`);
      }

      this.checkPremiumExpirations();
    });

    try {
      await this.client.login(BotData.token);
      console.log('Bot başarılı bir şekilde giriş yaptı.');
    } catch (error) {
      console.error(`Bot giriş yapamadı: ${error.message}`);
    }
  }

    ///// COMMAND LOADER \\\\\
  async LoadCommands() {
    const foldersPath = path.join(__dirname, '../commands');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
      const commandsPath = path.join(foldersPath, folder);
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          this.client.commands.set(command.data.name, command);
          this.commands.push(command.data.toJSON());
        } else {
          console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
      }
    }
  }

    ///// DISCORD API İSTEĞİ \\\\\
  async PostCommandsToAPI() {
    const rest = new REST().setToken(BotData.token);

    try {
      console.log(`Started refreshing ${this.commands.length} application (/) commands.`);

      const data = await rest.put(
        Routes.applicationCommands(BotData.clientID),
        { body: this.commands },
      );

      console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
      console.error(error);
    }
  }

    ///// EVENTS LOADER \\\\\
  async LoadEvents() {
    const eventsPath = path.join(__dirname, '../events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      this.client.on(event.name, (...args) => event.execute(...args));
    }
  }

  async UptimeLinks() {
    setInterval(checkAndUpdateTime, 120000);
  }

  AntiCrash() {
    process.on("unhandledRejection", (reason, promise) => {
      console.log(reason);
      return;
    });
    process.on("uncaughtException", (err, origin) => {
      console.log(err.name);
      return;
    });
    process.on("uncaughtExceptionMonitor", (err, origin) => {
      console.log(err.name);
      return;
    });
 
    process.on("warning", (warn) => {
      console.log(warn.name);
      return;
    });
    this.client.on("error", (err) => {
      console.log(err.name);
      return;
    });
  }

    ///// PREMİUM KONTROL \\\\\
  async checkPremiumExpirations() {
    const premiums = db.get('uptime.premiums') || [];
    const now = Date.now();
    let updatedPremiums = false;

    for (let i = 0; i < premiums.length; i++) {
      const premium = premiums[i];
      if (premium.expiry && premium.expiry !== 'unlimited') {
        const timeLeft = premium.expiry - now;
        
        // 3 GÜN KALDIYSA UYARI MESAJI GÖNDEREN BÖLÜM
        if (timeLeft > 0 && timeLeft <= 3 * 24 * 60 * 60 * 1000) {
          if (!premium.warningThreeDaysSent) {
            const user = await this.client.users.fetch(premium.userId).catch(() => null);
            if (user) {
              const warningEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('Premium Süresi Bitiyor')
                .setDescription(`Merhaba <@${premium.userId}>, Slayer Premium özelliğinin bitmesine 3 gün kaldı! Premium süresini uzatmazsanız 3 gün sonra sistemdeki premium ile eklediğiniz linkler silinecektir!`);
              
              try {
                await user.send({ embeds: [warningEmbed] });
                console.log(`3 gün kala uyarı mesajı gönderildi: ${user.tag}`);
                premiums[i].warningThreeDaysSent = true;
                updatedPremiums = true;
              } catch (error) {
                console.error(`Kullanıcıya 3 gün kala DM gönderilemedi: ${error}`);
              }
            }
          }
        }
        
        // SÜRE DOLDUĞUNDA İŞLEMLERİ YAPAN BÖLÜM
        if (timeLeft <= 0) {
          const userLinks = db.get(`uptime.user_${premium.userId}.links`) || [];
          
          // İLK 3 LİNK HARİÇ TÜM LİNKLERİ SİLME BÖLÜMÜ
          if (userLinks.length > 3) {
            const linksToKeep = userLinks.slice(0, 3);
            const linksToRemove = userLinks.slice(3);
            
            // LİNKLERİ GÜNCELLEME BÖLÜMÜ 
            db.set(`uptime.user_${premium.userId}.links`, linksToKeep);
            
            // LİNKLERİ SİLME BÖLÜMÜ 
            const allLinks = db.get('uptime.links') || [];
            const updatedAllLinks = allLinks.filter(link => !linksToRemove.includes(link));
            db.set('uptime.links.link', updatedAllLinks);
            
            // PREMİUM DOLDU BİLDİRİMİ GÖNDERME BÖLÜMÜ
            if (!premium.expiryNotificationSent) {
              const user = await this.client.users.fetch(premium.userId).catch(() => null);
              if (user) {
                const expiryEmbed = new EmbedBuilder()
                  .setColor('Red')
                  .setTitle('Premium Süresi Doldu')
                  .setDescription(`Merhaba <@${premium.userId}>, Slayer Premium süreniz doldu. İlk 3 link hariç diğer linkleriniz sistemden silindi. Premium'u yenilemek için lütfen yetkililere başvurun.`);
                
                try {
                  await user.send({ embeds: [expiryEmbed] });
                  console.log(`Premium süresi doldu bildirimi gönderildi: ${user.tag}`);
                  premiums[i].expiryNotificationSent = true;
                  updatedPremiums = true;
                } catch (error) {
                  console.error(`Kullanıcıya premium süresi doldu bildirimi gönderilemedi: ${error}`);
                }
              }
            }
          }
          
          console.log(`Premium süresi doldu ve kaldırıldı: ${premium.userId}`);
          premiums.splice(i, 1); 
          i--; 
          updatedPremiums = true;
        }
      }
    }

    if (updatedPremiums) {
      db.set('uptime.premiums', premiums);
    }
  }
}