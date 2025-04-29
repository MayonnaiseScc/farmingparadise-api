const express = require('express');
const crypto = require('crypto'); // For hashing passcodes
const app = express();
const PORT = 8080;

app.use(express.json());

// Store latest server info
let latestRustData = {
    server_online: false,
    server_name: "",
    players_online: 0,
    max_players: 0,
    map: ""
};

// Store latest stats data
let latestStatsData = [];

// Store pending link codes (code => SteamID)
let pendingLinks = {};

// Store linked accounts (SteamID => passcodeHash)
let linkedAccounts = {};

// Receive updated server info from Rust plugin
app.post('/server', (req, res) => {
    const data = req.body;
    console.log('Received data from Rust plugin (from /server):', data);

    latestRustData = data;
    res.status(200).json({ message: 'Server info received successfully' });
});

// Provide server info to the mobile app
app.get('/serverinfo', (req, res) => {
    res.json(latestRustData);
});

// Receive updated stats from Rust plugin
app.post('/stats', (req, res) => {
    const data = req.body;
    console.log('Received stats data from Rust plugin:', data);

    latestStatsData = data;
    res.status(200).json({ message: 'Stats data received successfully' });
});

// Provide formatted stats to the mobile app
app.get('/stats', (req, res) => {
    if (!latestStatsData || latestStatsData.length === 0) {
        return res.json({ players: [], yourStats: null });
    }

    const simplifyPlayer = (player) => ({
        name: player.SteamName,
        plantsGathered: Math.floor(player.KillSaves?.PlantsGathered || 0),
        hempGathered: Math.floor(player.KillSaves?.HempGathered || 0),
        berriesGathered: Math.floor(player.KillSaves?.BerriesGathered || 0),
        pumpkinsGathered: Math.floor(player.KillSaves?.PumpkinsGathered || 0),
        cornGathered: Math.floor(player.KillSaves?.CornGathered || 0),
        potatoGathered: Math.floor(player.KillSaves?.PotatoGathered || 0),
        wheatGathered: Math.floor(player.KillSaves?.WheatGathered || 0),
        npcKills: Math.floor(player.KillSaves?.NPCKills || 0),
        sulfurFarmed: Math.floor(player.KillSaves?.Sulfur_Ore_Farmed || 0),
        stonesFarmed: Math.floor(player.KillSaves?.Stones_Farmed || 0),
        metalFarmed: Math.floor(player.KillSaves?.Metal_Ore_Farmed || 0),
        lootContainerKills: Math.floor(player.KillSaves?.LootContainerKills || 0),
        rocketBasicFired: Math.floor(player.KillSaves?.rocket_basic_fired || 0),
        rocketHvFired: Math.floor(player.KillSaves?.rocket_hv_fired || 0),
        explosiveTimedThrown: Math.floor(player.KillSaves?.['explosive.timed.deployed.thrown'] || 0)
    });

    const topPlayers = latestStatsData.map(simplifyPlayer);

    const yourSteamId = 76561199223465913; // <-- Replace this with YOUR real SteamID if needed
    const yourStatsRaw = latestStatsData.find(p => p.SteamID === yourSteamId);
    const yourStats = yourStatsRaw ? simplifyPlayer(yourStatsRaw) : null;

    res.json({
        players: topPlayers,
        yourStats: yourStats
    });
});

// 📩 Receive pending link codes from Rust plugin
app.post('/pendinglink', (req, res) => {
    const { code, steamId } = req.body;

    if (!code || !steamId) {
        return res.status(400).json({ error: 'Code and SteamID are required.' });
    }

    pendingLinks[code] = steamId;
    console.log(`Saved pending link: Code=${code}, SteamID=${steamId}`);
    res.json({ success: true });
});

// 📲 Handle account linking from mobile app
app.post('/linkcode', (req, res) => {
    const { code, passcode } = req.body;

    if (!code || !passcode) {
        return res.status(400).json({ error: 'Code and passcode are required.' });
    }

    console.log(`Received link attempt: Code=${code}, Passcode=${passcode}`);

    const steamId = pendingLinks[code];

    if (!steamId) {
        return res.status(404).json({ error: 'Invalid or expired link code.' });
    }

    // Hash the passcode
    const passcodeHash = crypto.createHash('sha256').update(passcode).digest('hex');

    linkedAccounts[steamId] = { passcodeHash };

    // Clear the pending code now that it's linked
    delete pendingLinks[code];

    console.log(`Linked SteamID ${steamId} with hashed passcode.`);
    res.json({ success: true });
});

// In-memory chat storage
let chatMessages = [];

// GET /chat - return chat history
app.get('/chat', (req, res) => {
    res.json(chatMessages);
});

// POST /chat/send - receive a message from mobile
app.post('/chat/send', (req, res) => {
    const { steamId, message } = req.body;

    if (!steamId || !message) {
        return res.status(400).json({ error: 'Missing steamId or message' });
    }

    // Format it properly
    const formattedMessage = `${steamId}: ${message}`;

    // Save to chat messages array
    chatMessages.push(formattedMessage);

    // (Optional) Keep chat history trimmed
    if (chatMessages.length > 100) {
        chatMessages.shift();
    }

    console.log(`Saved chat: ${formattedMessage}`);

    // Reply success back to the client (DO NOT save this to chat)
    res.status(200).json({ success: true });
});

let latestPlayerNames = {};

app.post('/namesync', (req, res) => {
    const names = req.body;
    if (!names || typeof names !== 'object') {
        return res.status(400).json({ error: 'Invalid names data' });
    }

    latestPlayerNames = names;
    console.log("[NameSync] Updated", Object.keys(names).length, "names.");
    res.status(200).json({ success: true });
});

app.get('/names', (req, res) => {
    res.json(latestPlayerNames);
});

app.get('/names', (req, res) => {
    res.json(latestPlayerNames);
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running at http://0.0.0.0:${PORT}`);
});

