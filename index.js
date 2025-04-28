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

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running at http://0.0.0.0:${PORT}`);
});

