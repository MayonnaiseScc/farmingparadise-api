const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8080;

app.use(express.json());

const dataFolder = path.join(__dirname, 'data');
if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);

const namesPath = path.join(dataFolder, 'player_names.json');
const statsPath = path.join(dataFolder, 'player_stats.json');
const mainStatsPath = path.join(dataFolder, 'main_stats.json');

let latestPlayerNames = fs.existsSync(namesPath) ? require(namesPath) : {};
let latestStatsData = fs.existsSync(statsPath) ? require(statsPath) : [];
let latestMainStats = fs.existsSync(mainStatsPath) ? require(mainStatsPath) : [];
let pendingLinks = {};
let linkedAccounts = {};
let chatMessages = [];
let latestEventStatus = {};

let latestRustData = {
    server_online: false,
    server_name: "",
    players_online: 0,
    max_players: 0,
    map: ""
};

app.post('/server', (req, res) => {
    latestRustData = req.body;
    console.log('[Server] Info received:', latestRustData);
    res.status(200).json({ message: 'Server info received successfully' });
});

app.get('/serverinfo', (req, res) => {
    res.json(latestRustData);
});

app.post('/mainstats', (req, res) => {
    latestMainStats = req.body;
    fs.writeFileSync(mainStatsPath, JSON.stringify(latestMainStats, null, 2));
    console.log('[MainStats] Updated main stats.');
    res.status(200).json({ message: 'Main stats received successfully' });
});

app.get('/mainstats', (req, res) => {
    if (!latestMainStats || latestMainStats.length === 0) return res.json({ players: [] });

    const simplified = latestMainStats.map(player => ({
        steamId: String(player.SteamID),
        name: latestPlayerNames[String(player.SteamID)] || player.SteamName || "Unknown",
        level: Math.floor(player.MainStats?.Level || 0),
        money: Math.floor(player.MainStats?.Money || 0),
        playtime: Math.floor(player.MainStats?.PlaytimeHours || 0),
    }));

    res.json({ players: simplified });
});

app.post('/stats', (req, res) => {
    latestStatsData = req.body;
    fs.writeFileSync(statsPath, JSON.stringify(latestStatsData, null, 2));
    console.log('[Stats] Received full stats update.');
    res.status(200).json({ message: 'Stats data received successfully' });
});

app.get('/stats', (req, res) => {
    if (!latestStatsData || latestStatsData.length === 0) return res.json({ players: [], yourStats: null });

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

    if (!code || !steamId || !name) return res.status(400).json({ error: 'Code, SteamID, and name are required.' });

    steamId = String(steamId);
    if (!/^\d{17}$/.test(steamId)) return res.status(400).json({ error: 'Invalid SteamID format.' });

    pendingLinks[code] = steamId;
    latestPlayerNames[steamId] = name;
    fs.writeFileSync(namesPath, JSON.stringify(latestPlayerNames, null, 2));

    console.log(`[LinkAPI] Saved: Code=${code}, SteamID=${steamId}, Name=${name}`);
    res.json({ success: true });
});

app.post('/linkcode', (req, res) => {
    const { code, passcode } = req.body;

    if (!code || !passcode) return res.status(400).json({ error: 'Code and passcode are required.' });

    const steamId = pendingLinks[code];
    if (!steamId) return res.status(404).json({ error: 'Invalid or expired link code.' });

    const name = latestPlayerNames[steamId] || "UnknownPlayer";
    const passcodeHash = crypto.createHash('sha256').update(passcode).digest('hex');

    linkedAccounts[steamId] = { passcodeHash, playerName: name };
    delete pendingLinks[code];

    console.log(`[LinkAPI] Linked: SteamID=${steamId} | PlayerName=${name}`);
    res.json({ SteamID: steamId.toString(), PlayerName: name });
});

app.get('/chat', (req, res) => {
    const cutoff = Date.now() - (48 * 60 * 60 * 1000); // 48 hours
    const recent = chatMessages
        .filter(msg => typeof msg === 'string' || (msg.timestamp && msg.timestamp > cutoff))
        .map(msg => typeof msg === 'string' ? msg : msg.text);

    res.json(recent);
});

app.post('/chat/send', (req, res) => {
    let { name, message } = req.body;

    if (!name || !message) return res.status(400).json({ error: 'Missing name or message' });

    const resolvedName = latestPlayerNames[name] || linkedAccounts[name]?.playerName || name;
    const formattedMessage = `${resolvedName}: ${message}`;

    chatMessages.push({
        text: formattedMessage,
        timestamp: Date.now()
    });

    if (chatMessages.length > 100) chatMessages.shift();

    console.log(`[Chat] ${formattedMessage}`);
    res.status(200).json({ success: true });
});

app.get('/names', (req, res) => {
    res.json(latestPlayerNames);
});

app.post('/events', (req, res) => {
    latestEventStatus = req.body;
    console.log('[Events] Received event status:', latestEventStatus);
    res.status(200).json({ message: 'Event status received successfully' });
});

app.get('/events', (req, res) => {
    res.json(latestEventStatus);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ API Server running at http://0.0.0.0:${PORT}`);
});
