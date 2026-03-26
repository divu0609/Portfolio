const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve the portfolio static files (index.html, style.css, etc.)
app.use(express.static(__dirname));

// ── Helpers ───────────────────────────────────────────────

/**
 * Read data.json. Returns parsed object, or {} if missing / corrupt.
 */
function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.log('[server] data.json not found – creating empty file.');
            fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');
            return {};
        }
        const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
        if (!raw) return {};
        return JSON.parse(raw);
    } catch (err) {
        console.error('[server] Failed to read data.json:', err.message);
        return {};
    }
}

/**
 * Write data to data.json. Returns true on success, false on error.
 */
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[server] Failed to write data.json:', err.message);
        return false;
    }
}

// ── Routes ────────────────────────────────────────────────

// GET /data  — return latest portfolio data
app.get('/data', (req, res) => {
    console.log('[GET /data] Request received');
    const data = readData();
    res.json(data);
});

// POST /update  — save new portfolio data
app.post('/update', (req, res) => {
    console.log('[POST /update] Request received');

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid JSON body.' });
    }

    const ok = writeData(payload);
    if (!ok) {
        return res.status(500).json({ success: false, error: 'Failed to save data.' });
    }

    console.log('[POST /update] Data saved successfully.');
    res.json({ success: true, message: 'Data saved successfully.' });
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Portfolio CMS server running at http://localhost:${PORT}`);
    console.log(`   GET  http://localhost:${PORT}/data`);
    console.log(`   POST http://localhost:${PORT}/update`);
    console.log(`   Static files served from: ${__dirname}\n`);
});
