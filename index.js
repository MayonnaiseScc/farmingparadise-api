// ✨ Required modules
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8080;

app.use(express.json());

// 📁 Ensure data folder exists
const dataFolder = path.join(__dirname, 'data');
if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);

// 📁 Data file paths
const namesPath = path.join(dataFolder, 'player_names.json');
const statsPath = path.join(dataFolder, 'player_stats.json');
const mainStatsPath = path.join(dataFolder, 'main_stats.json');

// 🧠 Load saved data
let latestPlayerNames = fs.existsSync(namesPath) ? require(namesPath) : {};
let latestStatsData = fs.existsSync(statsPath) ? require(statsPath) : [];
let latestMainStats = fs.existsSync(mainStatsPath) ? require(mainStatsPath) : [];

// Store pending link codes
let pendingLinks = {};
let linkedAccounts = {};

let latestRustData = {
    server_online: false,
    server_name: "",
    players_online: 0,
    max_players: 0,
    map: ""
};

app.post('/server', (req, res) => {
    const data = req.body;
    console.log('Received data from Rust plugin (from /server):', data);

    latestRustData = data;
    res.status(200).json({ message: 'Server info received successfully' });
});

app.post('/mainstats', (req, res) => {
    const data = req.body;
    console.log('Received main page stats data:', data);

    latestMainStats = data;
    fs.writeFileSync(mainStatsPath, JSON.stringify(latestMainStats, null, 2));
    res.status(200).json({ message: 'Main stats received successfully' });
});

app.get('/mainstats', (req, res) => {
    if (!latestMainStats || latestMainStats.length === 0) {
        return res.json({ players: [] });
    }

    const simplified = latestMainStats.map(player => ({
        steamId: player.SteamID,
        name: player.SteamName,
        level: Math.floor(player.MainStats?.Level || 0),
        money: Math.floor(player.MainStats?.Money || 0),
        playtime: Math.floor(player.MainStats?.PlaytimeHours || 0),
    }));

    res.json({ players: simplified });
});

app.get('/serverinfo', (req, res) => {
    res.json(latestRustData);
});

app.post('/stats', (req, res) => {
    const data = req.body;
    console.log('Received stats data from Rust plugin:', data);

    latestStatsData = data;
    fs.writeFileSync(statsPath, JSON.stringify(latestStatsData, null, 2));
    res.status(200).json({ message: 'Stats data received successfully' });
});

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
    res.json({ players: topPlayers });
});

app.post('/pendinglink', (req, res) => {
    let { code, steamId, name } = req.body;

    if (!code || !steamId || !name) {
        return res.status(400).json({ error: 'Code, SteamID, and name are required.' });
    }

    steamId = String(steamId); // 🔒 Force string to prevent precision loss

    if (!/^\d{17}$/.test(steamId)) {
        return res.status(400).json({ error: 'Invalid SteamID format.' });
    }

    pendingLinks[code] = steamId;
    latestPlayerNames[steamId] = name;

    fs.writeFileSync(namesPath, JSON.stringify(latestPlayerNames, null, 2));

    console.log(`[LinkAPI] Saved pending link: Code=${code}, SteamID=${steamId}, Name=${name}`);
    res.json({ success: true });
});

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

    const name = latestPlayerNames[steamId] || "UnknownPlayer";
    const passcodeHash = crypto.createHash('sha256').update(passcode).digest('hex');

    linkedAccounts[steamId] = { passcodeHash, playerName: name };
    delete pendingLinks[code];

    console.log(`Linked SteamID ${steamId} (${name}) with hashed passcode.`);
    res.json({ SteamID: steamId.toString(), PlayerName: name });
});

let chatMessages = [];

app.get('/chat', (req, res) => {
    res.json(chatMessages);
});

app.post('/chat/send', (req, res) => {
    const { name, message } = req.body;

    if (!name || !message) {
        return res.status(400).json({ error: 'Missing name or message' });
    }

    // Attempt to resolve display name if `name` is actually a SteamID
    const displayName = latestPlayerNames[name] || linkedAccounts[name]?.playerName || name;

    const formattedMessage = `${displayName}: ${message}`;
    chatMessages.push(formattedMessage);

    if (chatMessages.length > 100) {
        chatMessages.shift();
    }

    console.log(`Saved chat: ${formattedMessage}`);
    res.status(200).json({ success: true });
});

app.get('/names', (req, res) => {
    res.json(latestPlayerNames);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running at http://0.0.0.0:${PORT}`);
});

