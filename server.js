const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const LEDGER_PATH = path.join(__dirname, 'ledger.json');

if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify({ totalRevenue: 0, orderCount: 0 }));
}

app.use(express.static('public'));

app.get('/api/valuation-stats', (req, res) => {
    let ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const sde = ledger.totalRevenue * 0.25;
    res.json({
        totalRevenue: ledger.totalRevenue.toFixed(2),
        uplift: ((sde * 4.0) - (sde * 2.5)).toFixed(2)
    });
});

app.listen(3000, () => console.log('AGI System Online!'));

const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = express();

const LEDGER_PATH = path.join(__dirname, 'ledger.json');
const SECRET_KEY = "supersecretkey"; // replace with env variable in production

app.use(express.json());
app.use(express.static('public'));

// --- Authentication middleware ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- Role-based check ---
function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) return res.sendStatus(403);
        next();
    };
}

// --- Login endpoint ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Demo users — replace with DB later
    const users = {
        "founder": { password: "agi2026", role: "founder" },
        "investor": { password: "investor2026", role: "investor" },
        "ops": { password: "ops2026", role: "ops" }
    };

    if (users[username] && users[username].password === password) {
        const user = { name: username, role: users[username].role };
        const token = jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, role: user.role });
    } else {
        res.sendStatus(401);
    }
});

// --- Example: founder-only update ---
app.post('/api/update/:entityId/cash', authenticateToken, authorizeRoles("founder"), (req, res) => {
    const { amount } = req.body;
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const entity = ledger.entities.find(e => e.id === req.params.entityId);
    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    entity.cash = amount;
    ledger.lastUpdated = new Date().toISOString();
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));

    res.json({ status: 'ok', entityId: entity.id, cash: entity.cash });
});

// --- Example: ops can update burn ---
app.post('/api/update/:entityId/burn', authenticateToken, authorizeRoles("founder", "ops"), (req, res) => {
    const { amount } = req.body;
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const entity = ledger.entities.find(e => e.id === req.params.entityId);
    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    entity.monthlyBurn = amount;
    ledger.lastUpdated = new Date().toISOString();
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));

    res.json({ status: 'ok', entityId: entity.id, monthlyBurn: entity.monthlyBurn });
});

// --- Example: investors are read-only ---
app.get('/api/valuation/:entityId', authenticateToken, authorizeRoles("founder", "investor", "ops"), (req, res) => {
    const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    const entity = ledger.entities.find(e => e.id === req.params.entityId);
    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    const latest = entity.revenue[entity.revenue.length - 1];
    const sde = latest.amount * entity.sdeMargin;
    const valuation = {
        low: sde * entity.multiples.low,
        base: sde * entity.multiples.base,
        high: sde * entity.multiples.high
    };

    res.json({
        entityId: entity.id,
        year: latest.year,
        revenue: latest.amount,
        sde: sde.toFixed(2),
        valuation
    });
});

app.listen(3000, () => console.log('AGI Multi-User Valuation Engine Online'));
