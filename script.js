const LUNAR_MONTH = 29.530588853;

// 1. Calculate Moon Phase
function getMoonPhase() {
    const now = new Date();
    const refDate = new Date(2000, 0, 6, 18, 14, 0); // Known New Moon
    const diff = (now - refDate) / (1000 * 60 * 60 * 24);
    const phase = (diff / LUNAR_MONTH) % 1;
    
    let name = "";
    let icon = "";
    let psychology = "";

    if (phase < 0.06 || phase > 0.94) {
        name = "New Moon"; icon = "🌑"; psychology = "Risk-On: New Beginnings";
    } else if (phase < 0.25) {
        name = "Waxing Crescent"; icon = "🌒"; psychology = "Building Momentum";
    } else if (phase < 0.31) {
        name = "First Quarter"; icon = "🌓"; psychology = "Decision Point";
    } else if (phase < 0.50) {
        name = "Waxing Gibbous"; icon = "🌔"; psychology = "Greed Rising";
    } else if (phase < 0.56) {
        name = "Full Moon"; icon = "🌕"; psychology = "High Volatility / Reversal";
    } else {
        name = "Waning"; icon = "🌘"; psychology = "Profit Taking / Caution";
    }

    document.getElementById('moon-icon').innerText = icon;
    document.getElementById('phase-name').innerText = name;
    document.getElementById('market-sentiment').innerText = psychology;
    return { name, phase };
}



// New Sentiment Database
const LUNAR_INTUITION = {
  "New Moon": {
      psych: "Traders feel a sense of 'reset'. Optimism is quiet but building.",
      crowd: "Low emotional exhaustion. Ideal for spotting fresh trend reversals.",
      bias: "ACCUMULATION"
  },
  "Waxing": {
      psych: "Confidence is growing. 'Fear of Missing Out' (FOMO) begins to itch.",
      crowd: "Retail starts chasing green candles. Greed is increasing.",
      bias: "BULLISH MOMENTUM"
  },
  "Full Moon": {
      psych: "Peak emotional tension. 'Lunacy' leads to erratic, impulsive exits.",
      crowd: "Extreme volatility. High probability of 'Blow-off Tops'.",
      bias: "VOLATILITY ALERT"
  },
  "Waning": {
      psych: "Sobriety returns. Rational profit-taking replaces euphoria.",
      crowd: "Smart money exits while retail holds the bag. Fading energy.",
      bias: "DISTRIBUTION / RISK-OFF"
  }
};

function updateLunarDashboard() {
  const now = new Date();
  const refDate = new Date(2000, 0, 6, 18, 14, 0); 
  const diff = (now - refDate) / (1000 * 60 * 60 * 24);
  const phase = (diff / 29.530588) % 1;

  // Calculate Illumination (Simple approximation of the sine wave of the phase)
  // 0 = New Moon, 0.5 = Full Moon
  const illumination = Math.abs(Math.sin(phase * Math.PI)) * 100;
  
  // Determine Phase Key
  let key = "Waning";
  if (phase < 0.05 || phase > 0.95) key = "New Moon";
  else if (phase >= 0.05 && phase < 0.45) key = "Waxing";
  else if (phase >= 0.45 && phase <= 0.55) key = "Full Moon";

  const data = LUNAR_INTUITION[key];

  // Update UI
  document.getElementById('illumination-val').innerText = illumination.toFixed(1);
  document.getElementById('illumination-progress').style.width = `${illumination}%`;
  document.getElementById('psych-detail').innerText = data.psych;
  document.getElementById('crowd-detail').innerText = data.crowd;
  
  const badge = document.getElementById('market-sentiment-badge');
  badge.innerText = data.bias;
  badge.className = `bias-badge ${key.replace(' ', '-').toLowerCase()}`;
}


function getLunarExtras(phase, now) {
    // 1. Simple Zodiac Approximation (based on 27.3 day sidereal month)
    const zodiacs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    const siderealDays = 27.321;
    const refDate = new Date(2000, 0, 6); 
    const daysSince = (now - refDate) / 86400000;
    const zodiacIndex = Math.floor((daysSince / siderealDays % 1) * 12);
    
    // 2. Countdown to Next Major Phase (approx 7.4 days per quarter)
    const daysRemaining = (0.25 - (phase % 0.25)) * 29.53;
    const hoursRemaining = (daysRemaining % 1) * 24;

    // 3. Cycle Dates (Last New Moon to Next New Moon)
    const lastNM = new Date(now.getTime() - (phase * 29.53 * 86400000));
    const nextNM = new Date(now.getTime() + ((1 - phase) * 29.53 * 86400000));

    // Update UI
    document.getElementById('m-zodiac').innerText = zodiacs[zodiacIndex];
    document.getElementById('m-countdown').innerText = `${Math.floor(daysRemaining)}d ${Math.floor(hoursRemaining)}h`;
    document.getElementById('m-cycle-range').innerText = `${lastNM.toLocaleDateString('en-GB')} - ${nextNM.toLocaleDateString('en-GB')}`;
}

// Run update every time the page loads
updateLunarDashboard();




// 2. OKX Live Price Connection
const socket = new WebSocket("wss://ws.okx.com:8443/ws/v5/public");

// MERGED ONOPEN: This handles both the status UI and the subscription
socket.onopen = () => {
    console.log("WebSocket Connection Opened");
    
    // 1. Update the Footer UI immediately
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    
    if (dot && text) {
        dot.className = 'dot online';
        text.innerText = 'OKX Live';
    }

    // 2. Send the subscription message
    socket.send(JSON.stringify({
        "op": "subscribe",
        "args": [
            { "channel": "tickers", "instId": "BTC-USDT-SWAP" },
            { "channel": "tickers", "instId": "XRP-USDT-SWAP" },
            { "channel": "tickers", "instId": "CELO-USDT-SWAP" }
        ]
    }));
};

socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.data) {
        const d = msg.data[0];
        const priceEl = document.getElementById(`${d.instId}-price`);
        const biasEl = document.getElementById(`${d.instId.split('-')[0]}-bias`);
        
        if (priceEl) priceEl.innerText = parseFloat(d.last).toLocaleString();
        
        // Update Moon and Bias labels
        const moon = updateLunarDashboard();
        if (biasEl) {
            if (moon.name === "New Moon") {
                biasEl.innerText = "LUNAR BUY";
                biasEl.style.backgroundColor = "var(--up-green)";
            } else if (moon.name === "Full Moon") {
                biasEl.innerText = "LUNAR CAUTION";
                biasEl.style.backgroundColor = "var(--down-red)";
            } else {
                biasEl.innerText = "NEUTRAL";
                biasEl.style.backgroundColor = "gray";
            }
        }
    }
};

socket.onclose = () => {
    document.getElementById('status-dot').className = 'dot offline';
    document.getElementById('status-text').innerText = 'Disconnected';
};

socket.onerror = (err) => {
    console.error("Socket Error:", err);
    document.getElementById('status-dot').className = 'dot offline';
    document.getElementById('status-text').innerText = 'Connection Error';
};


// Initialize
getMoonPhase();



