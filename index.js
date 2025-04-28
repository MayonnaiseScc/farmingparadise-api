const express = require('express');
const app = express();
const PORT = 8080;

const gamedig = require('gamedig');

// API Endpoint
app.get('/serverinfo', async (req, res) => {
    try {
        const state = await gamedig.query({
            type: 'rust',
            host: '89.213.214.15',  // <-- Your Rust server IP
            port: 28021             // <-- Your query port (usually gameport + 1)
        });

        res.json({
            server_online: true,
            server_name: state.name,
            players_online: state.players.length,
            max_players: state.maxplayers,
            map: state.map
        });
    } catch (error) {
        console.error('Failed to query server:', error);
        res.status(500).json({ error: "Server offline or unreachable" });
    }
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running at http://0.0.0.0:${PORT}`);
});
