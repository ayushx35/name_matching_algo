const express = require('express');
const natural = require('natural');

const app = express();
app.use(express.json());

const dm = new natural.DoubleMetaphone();

function calculateMatchScore(target, candidate) {
    const clean = (str) => str.toLowerCase().replace(/[.,]/g, '').trim();
    const n1 = clean(target);
    const n2 = clean(candidate);

    if (n1 === n2) return 1.0;

    const n1NoSpace = n1.replace(/\s+/g, '');
    const n2NoSpace = n2.replace(/\s+/g, '');
    if (n1NoSpace === n2NoSpace) return 1.0;

    const dm1 = dm.process(n1);
    const dm2 = dm.process(n2);
    const phoneticMatch = (dm1[0] === dm2[0] || dm1[1] === dm2[1]) ? 1 : 0;

    const jaroWinklerSim = natural.JaroWinklerDistance(n1, n2);

    const tokens1 = n1.split(/\s+/).filter(t => t);
    const tokens2 = n2.split(/\s+/).filter(t => t);

    const combined1 = tokens1.join('');
    const combined2 = tokens2.join('');
    const combinedSim = natural.JaroWinklerDistance(combined1, combined2);

    let matchCount = 0;
    tokens1.forEach(t1 => {
        let bestTokenScore = 0;
        tokens2.forEach(t2 => {
            let score = 0;
            if (t1 === t2) score = 1;
            else if (t1.length === 1 && t2.startsWith(t1)) score = 0.9;
            else if (t2.length === 1 && t1.startsWith(t2)) score = 0.9;
            else score = natural.JaroWinklerDistance(t1, t2);

            if (score > bestTokenScore) bestTokenScore = score;
        });
        matchCount += bestTokenScore;
    });

    const tokenSim = matchCount / Math.max(tokens1.length, tokens2.length);

    const weights = {
        phonetic: 0.10,
        jaroWinkler: 0.25,
        combined: 0.35,
        token: 0.30
    };

    const finalScore =
        (phoneticMatch * weights.phonetic) +
        (jaroWinklerSim * weights.jaroWinkler) +
        (combinedSim * weights.combined) +
        (tokenSim * weights.token);

    return parseFloat(Math.min(finalScore, 1).toFixed(4));
}

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.post('/match', (req, res) => {
    const { target, candidates } = req.body;
    if (!target || !Array.isArray(candidates)) {
        return res.status(400).json({ error: "Provide 'target' and 'candidates' array." });
    }

    const results = candidates.map(name => {
        const score = calculateMatchScore(target, name);
        return {
            name: name,
            score: (score * 100).toFixed(2) + '%',
        };
    }).sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    res.json({ target, results });
});

app.post('/match-bulk', (req, res) => {
    const { data } = req.body;
    if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Provide a 'data' array of {Name1, Name2} objects." });
    }

    const results = data.map(row => {
        const name1 = row.Name1 || row.name1 || '';
        const name2 = row.Name2 || row.name2 || '';
        const score = calculateMatchScore(name1, name2);
        return {
            Name1: name1,
            Name2: name2,
            Score: (score * 100).toFixed(2) + '%'
        };
    });

    res.json(results);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`API is running on http://localhost:${PORT}`));