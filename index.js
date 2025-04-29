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

// Receive updated server info from Rust plugin
app.post('/server', (req, res) => {
    const data = req.body;
    console.log('Received data from Rust plugin (from /server):', data);

    // Save the incoming data
    latestRustData = data;

    res.status(200).json({ message: 'Data received successfully' });
});

// Provide server info to the mobile app
app.get('/serverinfo', (req, res) => {
    res.json(latestRustData);
});

// 📈 New route to serve player stats
app.get('/stats', (req, res) => {
    const filePath = path.join(__dirname, 'oxide', 'data', 'statscontroller.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading stats file:', err);
            return res.status(500).json({ error: 'Failed to read stats file' });
        }

        try {
            const stats = JSON.parse(data);
            res.json(stats);
        } catch (parseErr) {
            console.error('Error parsing stats JSON:', parseErr);
            res.status(500).json({ error: 'Failed to parse stats data' });
        }
    });
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running at http://0.0.0.0:${PORT}`);
});
