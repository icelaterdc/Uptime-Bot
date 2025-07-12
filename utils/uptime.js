const axios = require("axios");
const db = require("croxydb");
const { EmbedBuilder } = require("discord.js");
const chalk = require("chalk");

let client;
const notifiedLinks = new Set();

function setClient(c) {
    client = c;
}

async function checkAndUpdateTime() {
    if (!client) {
        throw new Error("Client not set. Call setClient(client) first.");
    }

    const links = await db.fetch("uptime.links");
    if (!links) return;

    const potentialInvalid = [];
    for (const linkData of links) {
        const link = typeof linkData === "object" ? linkData.link : linkData;
        const userId = typeof linkData === "object" ? linkData.userId : null;
        try {
            const res = await axios.get(link, {
                validateStatus: () => true,
                headers: { "User-Agent": "Mozilla/5.0" },
                timeout: 10000,
            });
            if (typeof res.data === "string" && (
                res.data.includes("Well, you found a glitch.") ||
                res.data.includes("Oops! This project isn't running.")
            )) {
                potentialInvalid.push({ link, userId });
            }
        } catch {
        }
    }

    const uniqueInvalid = Array.from(
        new Map(potentialInvalid.map(x => [x.link, x])).values()
    );
    for (const { link, userId } of uniqueInvalid) {
        try {
            const res2 = await axios.get(link, {
                validateStatus: () => true,
                headers: { "User-Agent": "Mozilla/5.0" },
                timeout: 10000,
            });
            if (typeof res2.data === "string" && (
                res2.data.includes("Well, you found a glitch.") ||
                res2.data.includes("Oops! This project isn't running.")
            )) {
                await handleInvalidLink(link, userId);
            }
        } catch {
        }
    }
}

async function handleInvalidLink(link, userId) {
    if (notifiedLinks.has(link)) return;
    notifiedLinks.add(link);

    if (!userId) {
        const allLinks = (await db.fetch("uptime.links")) || [];
        const found = allLinks.find(item =>
            typeof item === "object" ? item.link === link : item === link
        );
        if (found && typeof found === "object") {
            userId = found.userId;
        }
    }

    if (!userId) return;

    try {
        const user = await client.users.fetch(userId);

        const allLinks = (await db.fetch("uptime.links")) || [];
        const updatedGlobal = allLinks.filter(item =>
            typeof item === "object" ? item.link !== link : item !== link
        );
        await db.set("uptime.links", updatedGlobal);

        const userKey = `uptime.user_${userId}`;
        const userLinks = (await db.fetch(`${userKey}.links`)) || [];
        const updatedUser = userLinks.filter(u => u !== link);
        if (updatedUser.length === 0) {
            await db.delete(`uptime.user_${userId}`);
        } else {
            await db.set(`${userKey}.links`, updatedUser);
        }

        console.log(
            `${chalk.green(user.tag)} link geçersiz olduğu için kaldırıldı: ${chalk.cyan(link)}`
        );

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Hatalı Link" })
            .setDescription("**🗑 Sistemdeki bir linkiniz geçersiz olduğu için kaldırıldı!**")
            .addFields({ name: "🚀 Kaldırılan Link:", value: link })
            .setTimestamp()
            .setColor("#49c5df");

        await user.send({ embeds: [embed] }).catch(() => {});

    } catch (err) {
        console.error("Error handling invalid link:", err);
    }
}

module.exports = { checkAndUpdateTime, setClient };
