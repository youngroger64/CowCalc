function calc(){
let w=+weight.value,d=+days.value,g=+gain.value,k=+kill.value/100;
let feedCost=+feed.value*d;
let otherCost=+other.value;
let fp=+factory.value;
let target=+profit.value;

let finalWeight=w+(d*g);
let carcass=finalWeight*k;
let factoryValue=carcass*fp;
let finishCost=feedCost+otherCost;
let maxPurchase=factoryValue-finishCost-target;
let maxKg=maxPurchase/w;

cw.textContent=carcass.toFixed(1);
fv.textContent=factoryValue.toFixed(2);
fc.textContent=finishCost.toFixed(2);
pp.textContent=maxPurchase.toFixed(2);
kg.textContent=maxKg.toFixed(2);
}
calc();
