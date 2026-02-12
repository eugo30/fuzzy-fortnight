let priceHistory = [];
const WINDOW_SIZE = 15;
let tradeLogs = JSON.parse(localStorage.getItem('celo_logs')) || [];
let audioEnabled = false;


const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function enableAudio() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        audioEnabled = true;
        document.getElementById("audio-note").innerText = "Sound Alerts Active ✅";
    }

    function playAlert(type) {
        if (!audioEnabled) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        // High beep for Buy, lower for Sell
        osc.frequency.value = type === 'buy' ? 880 : 440;
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }



async function fetchPrice() {
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd");
        const data = await response.json();
        const price = data.celo.usd;

// 1. PnL Logic
const entry = parseFloat(document.getElementById("buy-price").value);
const amt = parseFloat(document.getElementById("amt").value);
const pnl = ((price - entry) / entry) * amt;
const pnlDiv = document.getElementById("pnl-display");
pnlDiv.innerText = (pnl >= 0 ? "+" : "") + `$${pnl.toFixed(2)}`;
pnlDiv.className = pnl >= 0 ? "profit" : "loss";




// Z-Score Logic (Window of 20)
        priceHistory.push(price);
        if (priceHistory.length > WINDOW_SIZE) priceHistory.shift();

        document.getElementById("price-val").innerText = `$${price.toFixed(4)}`;

        if (priceHistory.length >= WINDOW_SIZE) {
            const mean = priceHistory.reduce((a, b) => a + b) / priceHistory.length;
            const sqDiff = priceHistory.map(p => Math.pow(p - mean, 2));
            const stdDev = Math.sqrt(sqDiff.reduce((a, b) => a + b) / priceHistory.length);
            const zScore = stdDev > 0 ? (price - mean) / stdDev : 0;
            
            document.getElementById("z-val").innerText = zScore.toFixed(2);
            document.getElementById("mean-val").innerText = mean.toFixed(4);
            updateSignal(zScore, price);
        }
    } catch (e) { console.error("Update failed"); }
}


function updateSignal(z, price) {
    const box = document.getElementById("signal-display");
    if (z < -2.0) {
        box.innerText = "🚨 BUY SIGNAL"; box.className = "signal-box buy";
        addLog(`Oversold Alert @ $${price}`, "buy");
    } else if (z > 2.0) {
        box.innerText = "🔥 SELL SIGNAL"; box.className = "signal-box sell";
        addLog(`Overbought Alert @ $${price}`, "sell");
    } else {
        box.innerText = "⚖️ SCANNING"; box.className = "signal-box wait";
    }
}

function addLog(msg, type) {
    const logEntry = { time: new Date().toLocaleTimeString(), msg, type };
    tradeLogs.unshift(logEntry);
    if (tradeLogs.length > 30) tradeLogs.pop();
    localStorage.setItem('celo_logs', JSON.stringify(tradeLogs));
    renderLogs();
}

function renderLogs() {
    document.getElementById("log-window").innerHTML = tradeLogs.map(l => 
        `<div class="log-entry log-msg-${l.type}"><span>[${l.time}]</span> ${l.msg}</div>`
    ).join('');
}

function downloadCSV() {
    let csv = "Time,Message,Type\n" + tradeLogs.map(l => `${l.time},${l.msg},${l.type}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'celo_trade_history.csv'; a.click();
}

function clearLogs() { localStorage.removeItem('celo_logs'); tradeLogs = []; renderLogs(); }

setInterval(fetchPrice, 10000);
fetchPrice();
renderLogs();