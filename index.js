const express = require('express');
const fs = require('fs');
const path = require('path');
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

// 📈 New: Provide stats to the mobile app
app.get('/stats', (req, res) => {
    res.json(latestStatsData);
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running at http://0.0.0.0:${PORT}`);
});

