const wallet = 'TRTrSXwbrtELFr6ivpPUxMaoNGdYUNoPma';

const p = new URLSearchParams(location.search);

const orderId = p.get('order') || '';
const plan = (p.get('plan') || 'STARTER').toUpperCase();
const amount = p.get('amount') || '60';

const plans = {
  STARTER: [
    'STARTER',
    '15 Days • 30 Signals Daily • AI Signal Analysis • Chart Screenshot Upload'
  ],
  PRO: [
    'PRO',
    '1 Month • 100 Signals Daily • AI Signal Analysis • Chart Screenshot Upload'
  ],
  ELITE: [
    'ELITE',
    'Permanent • Unlimited Signals Daily • AI Signal Analysis • Chart Screenshot Upload'
  ]
};

const x = plans[plan] || plans.STARTER;

document.getElementById('plan').textContent = x[0];

document.getElementById('price').textContent =
  '$' + amount.replace('$', '');

document.getElementById('details').textContent = x[1];

new QRCode(document.getElementById('qr'), {
  text: wallet,
  width: 196,
  height: 196
});

document.getElementById('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(wallet);

    document.getElementById('msg').textContent =
      'Address copied.';
  } catch (e) {
    document.getElementById('msg').textContent =
      'Long-press the address to copy.';
  }
};


/* ================================
   TXID INPUT
================================ */

const paidButton = document.getElementById('paid');

const txBox = document.createElement('div');

txBox.style.marginTop = '15px';

txBox.innerHTML = `
  <input
    id="txHash"
    type="text"
    placeholder="Paste TRON Transaction ID (TXID)"
    autocomplete="off"
    style="
      width:100%;
      box-sizing:border-box;
      padding:14px;
      border-radius:10px;
      border:1px solid #444;
      background:#111;
      color:#fff;
      font-size:14px;
    "
  />
`;

paidButton.parentNode.insertBefore(txBox, paidButton);


/* ================================
   VERIFY PAYMENT
================================ */

paidButton.onclick = async () => {

  const txHash = document
    .getElementById('txHash')
    .value
    .trim();

  const status = document.getElementById('status');

  if (!orderId) {
    status.textContent =
      '❌ Order ID is missing. Please return and select your plan again.';
    return;
  }

  if (!txHash) {
    status.textContent =
      '❌ Please paste your TRON transaction ID (TXID).';
    return;
  }

  if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
    status.textContent =
      '❌ Invalid TXID. Please paste the complete TRON transaction ID.';
    return;
  }

  paidButton.disabled = true;
  paidButton.textContent = 'VERIFYING...';

  status.textContent =
    '🔎 Checking blockchain transaction...';

  try {

    const response = await fetch(
      'https://kqshqlgprneqiuohjsyd.supabase.co/functions/v1/verify-payment',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          order_id: orderId,
          plan: plan,
          tx_hash: txHash
        })
      }
    );

    const result = await response.json();

    if (result.ok && result.status === 'paid') {

      status.textContent =
        '✅ PAYMENT VERIFIED! Your subscription is activated.';

      paidButton.textContent =
        'PAYMENT VERIFIED ✓';

      paidButton.disabled = true;

      console.log('Payment verified:', result);

    } else {

      status.textContent =
        '❌ ' + (result.message || 'Payment not verified.');

      paidButton.disabled = false;
      paidButton.textContent = 'VERIFY PAYMENT';
    }

  } catch (error) {

    console.error(error);

    status.textContent =
      '❌ Unable to connect to payment verification server.';

    paidButton.disabled = false;
    paidButton.textContent = 'VERIFY PAYMENT';
  }
};


window.Telegram?.WebApp?.ready();
window.Telegram?.WebApp?.expand();
