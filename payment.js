const wallet =
  'TRTrSXwbrtELFr6ivpPUxMaoNGdYUNoPma';


/* =========================
   TELEGRAM
========================= */

const tg =
  window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}


/* =========================
   URL PARAMETERS
========================= */

const p =
  new URLSearchParams(
    window.location.search
  );


const orderId =
  p.get('order') || '';


const plan =
  (
    p.get('plan') ||
    'STARTER'
  ).toUpperCase();


const amount =
  p.get('amount') || '60';


/* =========================
   TELEGRAM DATA
========================= */

const telegramUserId =
  p.get('telegram_user_id') ||
  (
    tg?.initDataUnsafe?.user?.id
      ? String(
          tg.initDataUnsafe.user.id
        )
      : ''
  );


const telegramInitData =
  p.get('tg_init_data') ||
  tg?.initData ||
  '';


/* =========================
   PLAN DETAILS
========================= */

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


const x =
  plans[plan] ||
  plans.STARTER;


/* =========================
   DISPLAY PLAN
========================= */

document.getElementById(
  'plan'
).textContent =
  x[0];


document.getElementById(
  'price'
).textContent =
  '$' +
  amount.replace('$', '');


document.getElementById(
  'details'
).textContent =
  x[1];


/* =========================
   QR CODE
========================= */

new QRCode(
  document.getElementById('qr'),
  {
    text: wallet,
    width: 196,
    height: 196
  }
);


/* =========================
   COPY WALLET
========================= */

document.getElementById(
  'copy'
).onclick = async () => {

  try {

    await navigator.clipboard.writeText(
      wallet
    );

    document.getElementById(
      'msg'
    ).textContent =
      'Address copied.';

  } catch (e) {

    document.getElementById(
      'msg'
    ).textContent =
      'Long-press the address to copy.';

  }

};


/* =========================
   PAYMENT INPUT
========================= */

const paidButton =
  document.getElementById('paid');


const txBox =
  document.createElement('div');


txBox.style.marginTop =
  '15px';


txBox.innerHTML = `

  <input
    id="txHash"
    type="text"
    placeholder="Paste TRON TXID or Binance payment reference"
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

  <div
    style="
      margin-top:8px;
      font-size:12px;
      line-height:1.5;
      color:#aaa;
    "
  >
    TRON payment:
    paste the complete 64-character TXID.

    <br>

    Binance Off-Chain payment:
    paste the Binance payment reference.
  </div>

`;


paidButton.parentNode.insertBefore(
  txBox,
  paidButton
);


/* =========================
   VERIFY PAYMENT
========================= */

paidButton.onclick =
  async () => {

    const txHash =
      document
        .getElementById('txHash')
        .value
        .trim();


    const status =
      document.getElementById(
        'status'
      );


    /* =========================
       ORDER CHECK
    ========================= */

    if (!orderId) {

      status.textContent =
        '❌ Order ID is missing. Please return and select your plan again.';

      return;

    }


    /* =========================
       TELEGRAM USER CHECK
    ========================= */

    if (!telegramUserId) {

      status.textContent =
        '❌ Telegram user information is missing. Please open this page from Telegram.';

      return;

    }


    /* =========================
       TELEGRAM AUTH CHECK
    ========================= */

    if (!telegramInitData) {

      status.textContent =
        '❌ Telegram authentication data is missing. Please open this page from Telegram.';

      return;

    }


    /* =========================
       PAYMENT REFERENCE CHECK
    ========================= */

    if (!txHash) {

      status.textContent =
        '❌ Please enter your TRON TXID or Binance payment reference.';

      return;

    }


    /*
       Real TRON TXID = 64 hexadecimal characters.

       Binance off-chain references are NOT
       TRON blockchain TXIDs.

       We therefore allow both formats here.
    */

    const isTronTx =
      /^[a-fA-F0-9]{64}$/.test(
        txHash
      );


    const isBinanceReference =
      /^(\d{6,20}|[A-Za-z0-9_-]{6,100})$/.test(
        txHash
      );


    if (
      !isTronTx &&
      !isBinanceReference
    ) {

      status.textContent =
        '❌ Invalid payment reference. Please check the TRON TXID or Binance payment reference.';

      return;

    }


    /* =========================
       BUTTON STATE
    ========================= */

    paidButton.disabled =
      true;

    paidButton.textContent =
      'VERIFYING...';


    status.textContent =
      isTronTx
        ? '🔎 Checking TRON blockchain transaction...'
        : '🔎 Checking Binance payment reference...';


    /* =========================
       SEND TO SUPABASE
    ========================= */

    try {

      const response =
        await fetch(

          'https://kqshqlgprneqiuohjsyd.supabase.co/functions/v1/verify-payment',

          {

            method:
              'POST',

            headers: {

              'Content-Type':
                'application/json'

            },

            body:
              JSON.stringify({

                order_id:
                  orderId,

                plan:
                  plan,

                tx_hash:
                  txHash,

                telegram_user_id:
                  telegramUserId,

                telegram_init_data:
                  telegramInitData,

                payment_method:
                  isTronTx
                    ? 'TRON'
                    : 'BINANCE_OFFCHAIN'

              })

          }

        );


      /* =========================
         READ RESPONSE
      ========================= */

      const result =
        await response.json();


      console.log(
        'Payment verification response:',
        result
      );


      /* =========================
         SUCCESS
      ========================= */

      if (
        result.ok &&
        result.status === 'paid'
      ) {

        status.textContent =
          '✅ PAYMENT VERIFIED! Your subscription is activated.';


        paidButton.textContent =
          'PAYMENT VERIFIED ✓';


        paidButton.disabled =
          true;


        return;

      }


      /* =========================
         ERROR
      ========================= */

      status.textContent =
        '❌ ' +
        (
          result.message ||
          'Payment not verified.'
        );


      paidButton.disabled =
        false;


      paidButton.textContent =
        'VERIFY PAYMENT';


    } catch (error) {

      console.error(
        'Payment verification error:',
        error
      );


      status.textContent =
        '❌ Unable to connect to payment verification server.';


      paidButton.disabled =
        false;


      paidButton.textContent =
        'VERIFY PAYMENT';

    }

  };


/* =========================
   TELEGRAM READY
========================= */

window.Telegram?.WebApp?.ready();

window.Telegram?.WebApp?.expand();
