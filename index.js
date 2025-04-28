const express = require('express');
const app = express();
const PORT = 8080;

app.use(express.json());

// Store latest data here
let latestRustData = {
    server_online: false,
    server_name: "",
    players_online: 0,
    max_players: 0,
    map: ""
};

// Receive data from the Rust plugin
app.post('/uploadRustData', (req, res) => {
    const data = req.body;
    console.log('Received data from Rust plugin:', data);

    // Save incoming data
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
