document.addEventListener("DOMContentLoaded", function(){

  document.querySelectorAll(".faq-item").forEach(item=>{
    item.querySelector(".faq-q").addEventListener("click", ()=> item.classList.toggle("open"));
  });

  const cards = document.querySelectorAll(".card");
  const revealObs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{ if(entry.isIntersecting) entry.target.classList.add("visible"); });
  }, {threshold:0.15});
  cards.forEach(c=> revealObs.observe(c));

  const progress = document.getElementById("progress");
  const toTop = document.getElementById("toTop");
  const navLinks = document.querySelectorAll("nav a");
  const sections = ["home","about","services","horn","faq","contact"].map(id=>document.getElementById(id));

  window.addEventListener("scroll", function(){
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    progress.style.width = scrolled + "%";
    toTop.classList.toggle("show", h.scrollTop > 400);
    let current = sections[0].id;
    sections.forEach(sec=>{ if(sec.getBoundingClientRect().top <= 100) current = sec.id; });
    navLinks.forEach(a=> a.classList.toggle("active", a.getAttribute("href") === "#"+current));
  });
  toTop.addEventListener("click", ()=> window.scrollTo({top:0, behavior:"smooth"}));

  const phrases = ["One Band, One Sound", "Pocket & Serving", "Trombonist · NADAMB"];
  const tagEl = document.getElementById("rotatingTag");
  let pi = 0, ci = 0, deleting = false;
  function typeLoop(){
    const word = phrases[pi];
    ci += deleting ? -1 : 1;
    tagEl.textContent = word.slice(0, ci);
    let delay = deleting ? 40 : 90;
    if(!deleting && ci === word.length){ delay = 1400; deleting = true; }
    else if(deleting && ci === 0){ deleting = false; pi = (pi+1) % phrases.length; delay = 300; }
    setTimeout(typeLoop, delay);
  }
  typeLoop();

  const notesWrap = document.getElementById("notes");
  const symbols = ["♪","♫","♬","♩"];
  for(let i=0;i<14;i++){
    const n = document.createElement("div");
    n.className = "note";
    n.textContent = symbols[Math.floor(Math.random()*symbols.length)];
    n.style.left = Math.random()*100 + "%";
    n.style.fontSize = (14 + Math.random()*20) + "px";
    n.style.animationDuration = (6 + Math.random()*8) + "s";
    n.style.animationDelay = (Math.random()*8) + "s";
    notesWrap.appendChild(n);
  }

  /* brass-style synth for trombone pads — sustains until tapped again, one note at a time */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let actx = null, limiter = null;
  function ctx(){
    if(!actx){
      actx = new AudioCtx();
      limiter = actx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      limiter.connect(actx.destination);
    }
    return actx;
  }
  const activePads = {};

  function startPad(padEl, freq){
    const c = ctx(), t = c.currentTime;
    const master = c.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(0.22, t + 0.15);

    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq * 3;
    filter.Q.value = 0.8;
    master.connect(filter).connect(limiter);

    const lfo = c.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfo.start(t);

    const oscillators = [];
    [0, -4, 4].forEach((detune, i)=>{
      const osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      lfoGain.connect(osc.detune);
      const g = c.createGain();
      g.gain.value = i === 0 ? 0.7 : 0.3;
      osc.connect(g).connect(master);
      osc.start(t);
      oscillators.push(osc);
    });

    activePads[padEl.dataset.padId] = { master, oscillators, lfo };
    padEl.classList.add("playing");
  }

  function stopPad(padEl){
    const active = activePads[padEl.dataset.padId];
    if(!active) return;
    const c = ctx(), t = c.currentTime;
    active.master.gain.cancelScheduledValues(t);
    active.master.gain.setValueAtTime(active.master.gain.value, t);
    active.master.gain.linearRampToValueAtTime(0, t + 0.4);
    active.oscillators.forEach(osc=> osc.stop(t + 0.5));
    active.lfo.stop(t + 0.5);
    delete activePads[padEl.dataset.padId];
    padEl.classList.remove("playing");
  }

  document.querySelectorAll(".pad").forEach((pad, i)=>{
    pad.dataset.padId = "pad" + i;
    pad.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      const freq = Number(pad.getAttribute("data-freq"));
      if(activePads[pad.dataset.padId]){ stopPad(pad); return; }
      Object.keys(activePads).forEach(id=>{
        const otherPad = document.querySelector('[data-pad-id="'+id+'"]');
        if(otherPad) stopPad(otherPad);
      });
      startPad(pad, freq);
    });
  });
});