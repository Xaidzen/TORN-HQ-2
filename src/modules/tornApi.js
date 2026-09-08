const crypto = require("crypto");

const TORN_API = "https://api.torn.com";
const TORN_API_V2 = "https://api.torn.com/v2";

function encrypt(text, secret) {
    const iv = crypto.randomBytes(16);

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    return (
        iv.toString("hex") +
        ":" +
        encrypted.toString("hex")
    );
}

function decrypt(data, secret) {
    const [ivHex, encryptedHex] = data.split(":");

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        key,
        Buffer.from(ivHex, "hex")
    );

    return Buffer.concat([
        decipher.update(
            Buffer.from(
                encryptedHex,
                "hex"
            )
        ),
        decipher.final()
    ]).toString("utf8");
}

async function tornRequest(
    apiKey,
    selection,
    id = null
) {
    const url = id
        ? `${TORN_API}/user/${id}/?selections=${selection}&key=${encodeURIComponent(apiKey)}`
        : `${TORN_API}/user/?selections=${selection}&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Torn API HTTP ${response.status}`
        );
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(
            `Torn API ${data.error.code}: ${data.error.error}`
        );
    }

    return data;
}

async function tornV2Request(
    apiKey,
    endpoint,
    tornId
) {
    const url =
        `${TORN_API_V2}/user/${tornId}/${endpoint}?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Torn API v2 HTTP ${response.status}`
        );
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(
            `Torn API v2 ${data.error.code}: ${data.error.error}`
        );
    }

    return data;
}

async function verifyApiKey(apiKey) {
    try {
        const data = await tornRequest(
            apiKey.trim(),
            "basic"
        );

        if (
            !data.player_id ||
            !data.name
        ) {
            return {
                valid: false,
                error: "INVALID_KEY"
            };
        }

        return {
            valid: true,
            tornId: String(
                data.player_id
            ),
            tornUsername: data.name
        };

    } catch {
        return {
            valid: false,
            error: "INVALID_KEY"
        };
    }
}

async function getTornUser(
    apiKey,
    tornId
) {
    const basic = await tornRequest(
        apiKey,
        "basic",
        tornId
    );

    const profile = await tornV2Request(
        apiKey,
        "profile",
        tornId
    );

    const faction = await tornV2Request(
        apiKey,
        "faction",
        tornId
    ).catch(() => null);

    const property = await tornV2Request(
        apiKey,
        "property",
        tornId
    ).catch(() => null);

    /*
     * Torn v2 responses are wrapped
     * inside a data object.
     */
    const profileData =
        profile?.profile ||
        profile?.data ||
        profile ||
        {};

    const factionData =
        faction?.faction ||
        faction?.data ||
        faction ||
        {};

    const propertyData =
        property?.property ||
        property?.data ||
        property ||
        {};

    /*
     * Username
     */
    const username =
        profileData?.name ||
        basic?.name ||
        "Unknown";

    /*
     * Age
     */
    const age =
        profileData?.age ??
        "N/A";

    /*
     * Status
     */
    const statusData =
        profileData?.status ||
        {};

    let status = "Offline";

    if (
        statusData?.state === "Traveling" ||
        statusData?.state === "Traveling Abroad"
    ) {
        const country =
            statusData?.description ||
            statusData?.details ||
            "";

        status = country
            ? `Flying ${country}`
            : "Flying";
    } else if (
        statusData?.state === "Online"
    ) {
        status = "Online";
    } else if (
        statusData?.state === "Idle"
    ) {
        status = "Idle";
    } else if (
        statusData?.state
    ) {
        status = statusData.state;
    }

    /*
     * Faction
     */
    const factionName =
        factionData?.name ||
        factionData?.faction?.name ||
        "None";

    /*
     * Property
     */
    const propertyName =
        propertyData?.name ||
        propertyData?.property?.name ||
        profileData?.property?.name ||
        "None";

    /*
     * Life
     */
    const life =
        profileData?.life ||
        basic?.life ||
        {};

    /*
     * Friends and enemies
     */
    const friendsCount =
        typeof profileData?.friends === "number"
            ? profileData.friends
            : profileData?.friends?.count ??
              profileData?.friends?.total ??
              0;

    const enemiesCount =
        typeof profileData?.enemies === "number"
            ? profileData.enemies
            : profileData?.enemies?.count ??
              profileData?.enemies?.total ??
              0;

    /*
     * Profile picture
     */
    const profilePicture =
        profileData?.image ||
        profileData?.profile_image ||
        profileData?.profile_image_url ||
        null;

    return {
        id: String(
            profileData?.id ||
            basic?.player_id ||
            tornId
        ),

        username,

        age,

        status,

        profileLink:
            `https://www.torn.com/profiles.php?XID=${tornId}`,

        profilePicture,

        faction: factionName,

        property: propertyName,

        friendsCount,

        enemiesCount,

        lifeCurrent:
            life?.current ??
            "N/A",

        lifeMaximum:
            life?.maximum ??
            "N/A"
    };
}

module.exports = {
    encrypt,
    decrypt,
    verifyApiKey,
    getTornUser
};
