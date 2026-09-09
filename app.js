const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe?.user;

  if (user) {
    const display =
      [user.first_name, user.last_name]
        .filter(Boolean)
        .join(' ');

    document.getElementById('userName').textContent =
      display ||
      user.username ||
      `Telegram ${user.id}`;
  }
}


/* =========================
   CHECKOUT ELEMENTS
========================= */

const checkout =
  document.getElementById('checkout');

const planCards =
  document.querySelector('.plans');

const sectionHead =
  document.querySelector('.section-head');

const checkoutPlan =
  document.getElementById('checkoutPlan');

const checkoutPrice =
  document.getElementById('checkoutPrice');

const orderIdEl =
  document.getElementById('orderId');

const payButton =
  document.getElementById('payButton');

const backButton =
  document.getElementById('backButton');


let selectedOrder = null;


/* =========================
   CREATE ORDER ID
========================= */

function createOrderId() {

  return (
    'QMAI-' +
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );

}


/* =========================
   PLAN SELECTION
========================= */

document
  .querySelectorAll('[data-plan]')
  .forEach(btn => {

    btn.addEventListener(
      'click',
      () => {

        const plan =
          btn.dataset.plan.toUpperCase();

        const price =
          btn.dataset.price;

        const orderId =
          createOrderId();


        selectedOrder = {

          plan,
          price,
          orderId

        };


        checkoutPlan.textContent =
          `${plan} PLAN`;

        checkoutPrice.textContent =
          `$${price}`;

        orderIdEl.textContent =
          orderId;


        planCards.classList.add(
          'hidden'
        );

        sectionHead.classList.add(
          'hidden'
        );

        checkout.classList.remove(
          'hidden'
        );


        tg?.HapticFeedback
          ?.impactOccurred(
            'medium'
          );

      }
    );

  });


/* =========================
   BACK BUTTON
========================= */

backButton.addEventListener(
  'click',
  () => {

    checkout.classList.add(
      'hidden'
    );

    planCards.classList.remove(
      'hidden'
    );

    sectionHead.classList.remove(
      'hidden'
    );

  }
);


/* =========================
   PAYMENT PAGE
========================= */

payButton.addEventListener(
  'click',
  () => {

    if (!selectedOrder) {
      return;
    }


    const paymentPage =
      'https://hehe-creator93.github.io/quotex-market-analyzer-ai/payment.html';


    const params =
      new URLSearchParams();


    params.set(
      'order',
      selectedOrder.orderId
    );

    params.set(
      'plan',
      selectedOrder.plan
    );

    params.set(
      'amount',
      selectedOrder.price
    );


    /*
      Keep Telegram authentication
      available on the payment page.
    */

    if (tg?.initData) {

      params.set(
        'tg_init_data',
        tg.initData
      );

    }


    if (
      tg?.initDataUnsafe?.user?.id
    ) {

      params.set(
        'telegram_user_id',
        String(
          tg.initDataUnsafe.user.id
        )
      );

    }


    const url =
      paymentPage +
      '?' +
      params.toString();


    /*
      Navigate inside the same
      Mini App instead of opening
      an external browser.
    */

    window.location.href =
      url;

  }
);
