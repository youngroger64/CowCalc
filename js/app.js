(() => {
  const $ = id => document.getElementById(id);
  const inputs = [...document.querySelectorAll('input, select')];
  const money = n => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(Number.isFinite(n)?n:0);
  const num = (id) => Number($(id).value) || 0;
  const set = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };
  const signedClass = (el, n) => {
  if (!el) return;
  el.classList.toggle('positive', n >= 0);
  el.classList.toggle('negative', n < 0);
};

  let officialPrices = null;
  const categoryNames = {steer:'Steer',heifer:'Heifer',cow:'Cow',youngBull:'Young bull',bull:'Bull'};

  function applySuggestedPrice(useIt = false) {
    if (!officialPrices) return;
    const category = $('animalCategory').value;
    const value = Number(officialPrices.prices?.[category]);
    if (!Number.isFinite(value)) return;
    $('suggestedPrice').value = value.toFixed(2);
    if (useIt) $('basePrice').value = value.toFixed(2);
    if ($('quickFactoryPrice')) $('quickFactoryPrice').value = value.toFixed(2);
    calculate();
  }

  async function loadOfficialPrices() {
    const dot = $('priceStatusDot');
    try {
      const response = await fetch('data/beef-prices.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Price file unavailable');
      officialPrices = await response.json();
      applySuggestedPrice(false);
      const isLive = officialPrices.status === 'verified' && officialPrices.updatedAt;
      dot.classList.add(isLive ? 'ok' : 'warn');
      $('priceStatusTitle').textContent = isLive ? 'Official cattle prices available' : 'Suggested demo prices loaded';
      const week = officialPrices.weekEnding ? `Week ending ${officialPrices.weekEnding}` : 'No verified update has run yet';
      $('priceStatusText').textContent = `${week}. Your expected price remains editable.`;
      $('inlinePriceSource').textContent = `${officialPrices.source || 'Price source'} · ${week}`;
    } catch (error) {
      dot.classList.add('fail');
      $('priceStatusTitle').textContent = 'Automatic price unavailable';
      $('priceStatusText').textContent = 'Continue using your own expected factory price.';
      $('inlinePriceSource').textContent = 'Manual price mode';
      $('suggestedPrice').value = '';
    }
  }


  let quickDays = 90;

  function syncQuickCategory() {
    const category = $('quickCategory').value;
    $('animalCategory').value = category;
    applySuggestedPrice(false);

    if (officialPrices) {
      const value = Number(officialPrices.prices?.[category]);
      if (Number.isFinite(value)) {
        $('quickFactoryPrice').value = value.toFixed(2);
        $('basePrice').value = value.toFixed(2);
      }
    }
  }

  function calculateQuick() {
    const weight = Number($('quickWeight').value) || 0;
    const currentBid = Number($('quickCurrentBid').value) || 0;
    const targetProfit = Number($('quickProfitSlider').value) || 0;

    $('purchaseWeight').value = weight;
    $('martPriceKg').value = weight > 0 ? (currentBid / weight).toFixed(4) : 0;
    $('daysFed').value = quickDays;
    $('marginPerDay').value = quickDays > 0 ? (targetProfit / quickDays).toFixed(4) : 0;

    calculate();

    // Read the underlying values directly from the same model.
    const liveGain = (Number($('dailyGain').value) || 0) * quickDays;
    const finalWeight = weight + liveGain;
    const carcass = finalWeight * ((Number($('killout').value) || 0) / 100);

    const feeds = [
      [Number($('silageTonne').value)||0, Number($('silageKg').value)||0],
      [Number($('rationTonne').value)||0, Number($('rationKg').value)||0],
      [Number($('strawTonne').value)||0, Number($('strawKg').value)||0],
      [Number($('maizeTonne').value)||0, Number($('maizeKg').value)||0]
    ];
    const feedDay = feeds.reduce((sum,[tonne,kg]) => sum + tonne/1000*kg,0);
    const purchaseForInterest = currentBid;
    const interest = purchaseForInterest * ((Number($('interestRate').value)||0)/100) / 365 * quickDays;
    const finishing =
      (Number($('transport').value)||0) +
      (Number($('dose').value)||0) +
      (Number($('vet').value)||0) +
      (Number($('losses').value)||0) +
      interest +
      ((Number($('overheadDay').value)||0) * quickDays) +
      (feedDay * quickDays);

    const paidPrice =
      (Number($('quickFactoryPrice').value)||0) +
      (Number($('breedBonus').value)||0) +
      (Number($('qpsBonus').value)||0);

    const netFactory = carcass * paidPrice - (Number($('factoryCharges').value)||0);
    const maxPurchase = netFactory - finishing - targetProfit;
    const maxKg = weight > 0 ? maxPurchase / weight : 0;
    const actualProfit = netFactory - finishing - currentBid;
    const difference = maxPurchase - currentBid;

    $('quickMaxPrice').textContent = money(maxPurchase);
    $('quickMaxKg').textContent = money(maxKg) + '/kg liveweight';
    $('quickProfit').textContent = money(actualProfit);
    $('quickProfitLabel').textContent = money(targetProfit).replace('.00','');
    $('quickDifference').textContent =
      difference >= 0
        ? money(difference) + ' below limit'
        : money(Math.abs(difference)) + ' over limit';

    const decision = $('quickDecision');
    decision.className = 'quick-decision';

    if (!currentBid) {
      decision.textContent = 'Enter a bid';
      decision.classList.add('neutral');
      $('quickStatus').textContent = 'Ready';
    } else if (difference >= 50) {
      decision.textContent = 'Bid';
      decision.classList.add('buy');
      $('quickStatus').textContent = 'Good margin';
    } else if (difference >= 0) {
      decision.textContent = 'Caution';
      decision.classList.add('caution');
      $('quickStatus').textContent = 'Near limit';
    } else {
      decision.textContent = 'Stop';
      decision.classList.add('stop');
      $('quickStatus').textContent = 'Over limit';
    }

    signedClass($('quickProfit'), actualProfit);
  }

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

    signedClass($('rMargin'), actualMargin);
    signedClass($('rMarginDay'), marginDay);

    const badge = $('decisionBadge');
    if (badge) badge.className = 'decision';
    if (!bidKg) {
      if (badge) badge.textContent = 'Enter a mart price';
      if (badge) badge.classList.add('decision-neutral');
    } else {
      const difference = maxBid - bidKg;
      if (difference >= .10) {
        if (badge) badge.textContent = 'Within buying range';
        if (badge) badge.classList.add('decision-buy');
      } else if (difference >= 0) {
        if (badge) badge.textContent = 'Close to your limit';
        if (badge) badge.classList.add('decision-caution');
      } else {
        if (badge) badge.textContent = 'Above maximum bid';
        if (badge) badge.classList.add('decision-stop');
      }
    }
  }

  inputs.forEach(input => input.addEventListener('input', calculate));
  $('animalCategory').addEventListener('change', () => applySuggestedPrice(false));
  $('useSuggestedBtn').addEventListener('click', () => {
    applySuggestedPrice(true);
    toast(`${categoryNames[$('animalCategory').value]} suggested price applied`);
  });


  ['quickWeight','quickCurrentBid','quickProfitSlider'].forEach(id => {
    $(id).addEventListener('input', calculateQuick);
  });

  $('quickCategory').addEventListener('change', () => {
    syncQuickCategory();
    calculateQuick();
  });

  document.querySelectorAll('.day-buttons button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.day-buttons button').forEach(b => b.classList.remove('is-active'));
      button.classList.add('is-active');
      quickDays = Number(button.dataset.days);
      calculateQuick();
    });
  });

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

  loadOfficialPrices().then(() => { syncQuickCategory(); calculateQuick(); });
  calculate();
})();
