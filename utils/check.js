const axios = require("axios");

async function CheckURL(url) {
    try {
        await axios.get(url).then(() => {
            return true
        }).catch((e) => {
            console.log(e);
            return false;
        });
    } catch (error) {
        console.log(error);
        return false;
    }
}

module.exports = { CheckURL }