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
