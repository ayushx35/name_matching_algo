const natural = require('natural');

const dm = new natural.DoubleMetaphone();

function calculateMatchScore(target, candidate) {
    // --- STEP 1: Direct comparison (Case-sensitive) ---
    if (target === candidate) return 100.0;

    // --- STEP 2: Basic normalization and comparison ---
    const clean = (str) => str.toLowerCase().replace(/[.,]/g, '').trim();
    const n1 = clean(target);
    const n2 = clean(candidate);

    console.log("n1:", n1);
    console.log("n2:", n2);

    if (n1 === n2) return 100.0;

    // --- STEP 3: Proceed to the Algorithm ---

    // 1. Phonetic Score 
    const code1 = dm.process(n1)[0];
    const code2 = dm.process(n2)[0];
    const phoneticMatch = (code1 === code2 && code1 !== "") ? 1 : 0;

    // 2. Levenshtein Distance 
    const levDist = natural.LevenshteinDistance(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);
    const levenshteinSim = maxLen === 0 ? 0 : 1 - (levDist / maxLen);

    // 3. Jaro-Winkler Distance
    const jaroWinklerSim = natural.JaroWinklerDistance(n1, n2);

    // 4. Token Matching
    const tokens1 = n1.split(/\s+/).filter(t => t).sort();
    const tokens2 = n2.split(/\s+/).filter(t => t).sort();

    let matchCount = 0;
    const usedIn2 = new Set();

    tokens1.forEach(t1 => {
        tokens2.forEach((t2, index) => {
            if (usedIn2.has(index)) return;

            if (t1 === t2) {
                matchCount += 1;
                usedIn2.add(index);
            } else if ((t1.length === 1 && t2.startsWith(t1)) || (t2.length === 1 && t1.startsWith(t2))) {
                matchCount += 0.9;
                usedIn2.add(index);
            }
        });
    });

    const tokenSim = matchCount / Math.max(tokens1.length, tokens2.length);

    const weights = {
        phonetic: 0.10,
        levenshtein: 0.15,
        jaroWinkler: 0.15,
        token: 0.50
    };

    const finalScore =
        (phoneticMatch * weights.phonetic) +
        (levenshteinSim * weights.levenshtein) +
        (jaroWinklerSim * weights.jaroWinkler) +
        (tokenSim * weights.token);

    return parseFloat(Math.min(finalScore, 1).toFixed(4));
}

console.log(calculateMatchScore("Dodla Krishna Vamsi", "DODLA KRISHNAVAMSI"));
