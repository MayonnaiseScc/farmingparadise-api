const express = require('express');
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

// 📈 New: Receive updated stats from Rust plugin
app.post('/stats', (req, res) => {
    const data = req.body;
    console.log('Received stats data from Rust plugin:', data);

    latestStatsData = data;
    res.status(200).json({ message: 'Stats data received successfully' });
});

// 📈 New: Provide formatted stats to the mobile app
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

app.post('/linkcode', (req, res) => {
    const { code, passcode } = req.body;

    if (!code || !passcode) {
        return res.status(400).json({ error: 'Code and passcode are required.' });
    }

    console.log(`Received link attempt: Code=${code}, Passcode=${passcode}`);

    // ❗ TEMPORARY FAKE MATCH for testing
    const fakeValidCodes = {
        "ABC123": "76561198000000001",
        "XYZ789": "76561198000000002"
    };

    const steamId = fakeValidCodes[code];

    if (!steamId) {
        return res.status(404).json({ error: 'Invalid link code.' });
    }

    // Hash the passcode
    const passcodeHash = crypto.createHash('sha256').update(passcode).digest('hex');

    linkedAccounts[steamId] = { passcodeHash };

    console.log(`Linked SteamID ${steamId} with hashed passcode.`);
    res.json({ success: true });
});
// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running at http://0.0.0.0:${PORT}`);
});

