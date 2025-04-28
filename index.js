const express = require('express');
const app = express();
const PORT = 8080;

// Middleware to parse JSON bodies
app.use(express.json());  // For parsing application/json

// API Endpoint to receive data from the Rust plugin
app.post('/serverinfo', (req, res) => {
    const data = req.body;  // This is the data sent from the plugin

    console.log('Received data from Rust plugin:', data);

    // Process the data as needed (e.g., save it to a database, log it, etc.)
    // For now, we'll just send a success response
    res.status(200).json({ message: 'Data received successfully' });
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running at http://0.0.0.0:${PORT}`);
});

