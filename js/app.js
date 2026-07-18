(() => {
  const $ = id => document.getElementById(id);
  const inputs = [...document.querySelectorAll('input')];
  const money = n => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(Number.isFinite(n)?n:0);
  const num = (id) => Number($(id).value) || 0;
  const set = (id, text) => { $(id).textContent = text; };
  const signedClass = (el, n) => { el.classList.toggle('positive', n >= 0); el.classList.toggle('negative', n < 0); };

  function calculate() {
    const weight = num('purchaseWeight');
    const bidKg = num('martPriceKg');
    const days = num('daysFed');
    const gainDay = num('dailyGain');
    const killout = num('killout') / 100;

    const purchase = weight * bidKg;
    const liveGain = gainDay * days;
    const finalWeight = weight + liveGain;
    const carcass = finalWeight * killout;

    const feeds = [
      ['silage', num('silageTonne'), num('silageKg')],
      ['ration', num('rationTonne'), num('rationKg')],
      ['straw', num('strawTonne'), num('strawKg')],
      ['maize', num('maizeTonne'), num('maizeKg')]
    ];
    let feedDay = 0;
    feeds.forEach(([name, tonne, kg]) => {
      const day = tonne / 1000 * kg;
      feedDay += day;
      set(name + 'Day', money(day));
    });
    const feedPeriod = feedDay * days;

    const transport = num('transport');
    const dose = num('dose');
    const vet = num('vet');
    const losses = num('losses');
    const interest = purchase * (num('interestRate') / 100) / 365 * days;
    const overhead = num('overheadDay') * days;
    const finishing = transport + dose + feedPeriod + vet + losses + interest + overhead;

    const paidPrice = num('basePrice') + num('breedBonus') + num('qpsBonus');
    const grossFactory = carcass * paidPrice;
    const netFactory = grossFactory - num('factoryCharges');

    const targetMargin = num('marginPerDay') * days;
    const maxPurchase = netFactory - finishing - targetMargin;
    const maxBid = weight > 0 ? maxPurchase / weight : 0;

    const totalCost = purchase + finishing;
    const actualMargin = netFactory - totalCost;
    const marginDay = days > 0 ? actualMargin / days : 0;
    const breakEven = carcass > 0 ? (totalCost + num('factoryCharges')) / carcass : 0;

    set('purchaseCost', money(purchase));
    set('finalWeight', finalWeight.toFixed(1) + ' kg');
    set('carcassWeight', carcass.toFixed(1) + ' kg');
    set('paidPrice', money(paidPrice) + '/kg');
    set('grossFactory', money(grossFactory));
    set('netFactory', money(netFactory));
    set('feedPerDay', money(feedDay));
    set('feedPeriod', money(feedPeriod));
    set('interestCost', money(interest));
    set('otherCosts', money(transport + dose + vet + losses + interest + overhead));
    set('finishingCosts', money(finishing));
    set('targetMargin', money(targetMargin));

    set('maxBidHero', money(maxBid) + '/kg');
    set('maxPurchaseHero', 'Maximum purchase price ' + money(maxPurchase));
    set('factoryReturnHero', money(netFactory));
    set('targetMarginHero', money(targetMargin));
    set('actualMarginHero', money(actualMargin));

    set('rPurchaseWeight', weight.toFixed(0) + ' kg');
    set('rPurchasePrice', money(purchase));
    set('rLiveGain', liveGain.toFixed(1) + ' kg');
    set('rFinalWeight', finalWeight.toFixed(1) + ' kg');
    set('rCarcass', carcass.toFixed(1) + ' kg');
    set('rFactory', money(netFactory));
    set('rFinishing', money(finishing));
    set('rTotalCost', money(totalCost));
    set('rMargin', money(actualMargin));
    set('rMarginDay', money(marginDay));
    set('rBreakEven', money(breakEven) + '/kg');
    set('rMaxBid', money(maxBid) + '/kg');

    signedClass($('actualMarginHero'), actualMargin);
    signedClass($('rMargin'), actualMargin);
    signedClass($('rMarginDay'), marginDay);

    const badge = $('decisionBadge');
    badge.className = 'decision';
    if (!bidKg) {
      badge.textContent = 'Enter a mart price';
      badge.classList.add('decision-neutral');
    } else {
      const difference = maxBid - bidKg;
      if (difference >= .10) {
        badge.textContent = 'Within buying range';
        badge.classList.add('decision-buy');
      } else if (difference >= 0) {
        badge.textContent = 'Close to your limit';
        badge.classList.add('decision-caution');
      } else {
        badge.textContent = 'Above maximum bid';
        badge.classList.add('decision-stop');
      }
    }
  }

  inputs.forEach(input => input.addEventListener('input', calculate));

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    $(tab.dataset.tab).classList.add('is-active');
  }));

  function toast(message) {
    const t = $('toast');
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  $('saveBtn').addEventListener('click', () => {
    const state = {};
    inputs.forEach(i => state[i.id] = i.value);
    localStorage.setItem('cowcalc-demo', JSON.stringify(state));
    toast('Calculation saved on this device');
  });

  $('printBtn').addEventListener('click', () => window.print());

  const saved = localStorage.getItem('cowcalc-demo');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      inputs.forEach(i => { if (state[i.id] !== undefined) i.value = state[i.id]; });
    } catch (_) {}
  }

  calculate();
})();
