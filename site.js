// The hero deck: flip a card, swipe it right if you know it and left if you don't.
// Known cards leave and carve a notch into the tally stick; missed ones come back
// at a random spot, as in the app's Cram mode.
(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;

  const deck = demo.querySelector('[data-deck]');
  const cards = [...deck.querySelectorAll('.card')];
  const done = deck.querySelector('[data-done]');
  const speakBtn = deck.querySelector('[data-speak]');
  const flipBtn = demo.querySelector('[data-flip]');
  const answerBtns = [...demo.querySelectorAll('[data-answer]')];
  const stick = demo.querySelector('[data-stick]');
  const tally = demo.querySelector('[data-tally]');
  const count = demo.querySelector('[data-count]');
  const status = demo.querySelector('[data-status]');
  const total = cards.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  const FLY_MS = 420;

  // Words the script adds, in the page's language (/ is English, /ua/ Ukrainian).
  const STRINGS = {
    en: {
      know: 'Know', miss: 'Don’t know', front: 'Front', back: 'Back',
      done: (n) => `All ${n} cards carved.`,
      count: (k, n) => `${k} of ${n} carved`,
    },
    uk: {
      know: 'Знаю', miss: 'Не знаю', front: 'Лице', back: 'Зворот',
      done: (n) => `Усі ${n} карток закарбовано.`,
      count: (k, n) => `${k} з ${n} закарбовано`,
    },
  };
  const str = STRINGS[document.documentElement.lang] || STRINGS.en;
  // The language the backs of the cards are read in.
  const backLang = deck.dataset.backLang || 'en-US';

  let queue = cards.map((_, i) => i);
  let known = 0;
  let busy = false;
  let drag = null;

  for (const card of cards) {
    for (const [cls, label] of [['badge badge-know', str.know], ['badge badge-miss', str.miss]]) {
      const badge = document.createElement('span');
      badge.className = cls;
      badge.textContent = label;
      badge.setAttribute('aria-hidden', 'true');
      card.append(badge);
    }
  }

  const top = () => (queue.length ? cards[queue[0]] : null);
  const isFlipped = (card) => card.classList.contains('is-flipped');

  function render() {
    cards.forEach((card, i) => {
      if (card.classList.contains('fly-know') || card.classList.contains('fly-miss')) return;
      const pos = queue.indexOf(i);
      card.dataset.pos = pos === -1 ? 'gone' : String(Math.min(pos, 3));
      card.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      card.querySelector('.face-front').setAttribute('aria-hidden', String(isFlipped(card)));
      card.querySelector('.face-back').setAttribute('aria-hidden', String(!isFlipped(card)));
    });
    const finished = queue.length === 0;
    done.hidden = !finished;
    speakBtn.hidden = finished || !canSpeak;
    flipBtn.disabled = finished;
    for (const b of answerBtns) b.disabled = finished;
  }

  function announce() {
    const card = top();
    if (!card) {
      status.textContent = str.done(total);
      return;
    }
    const face = isFlipped(card) ? '.face-back' : '.face-front';
    const side = isFlipped(card) ? str.back : str.front;
    status.textContent = `${side}: ${card.querySelector(`${face} .card-word`).textContent}`;
  }

  function updateCount() {
    count.textContent = str.count(known, total);
    tally.setAttribute('aria-valuenow', String(known));
  }

  // One faint mark per card; knowing a card carves its mark.
  const notches = cards.map(() => {
    const notch = document.createElement('span');
    notch.className = 'notch';
    stick.append(notch);
    return notch;
  });

  function carve() {
    notches[known].classList.add('is-carved');
    known += 1;
    updateCount();
  }

  function resetDrag(card) {
    card.classList.remove('is-dragging');
    card.style.transform = '';
    card.style.removeProperty('--drag');
  }

  function flip() {
    const card = top();
    if (!card || busy) return;
    card.classList.toggle('is-flipped');
    render();
    announce();
  }

  function answer(kind) {
    const card = top();
    if (!card || busy) return;
    busy = true;
    const index = queue.shift();
    resetDrag(card);
    card.classList.add(kind === 'know' ? 'fly-know' : 'fly-miss');

    if (kind === 'know') {
      carve();
    } else {
      // Back in the deck at a random spot, never straight back on top while others wait.
      const at = queue.length === 0 ? 0 : 1 + Math.floor(Math.random() * queue.length);
      queue.splice(at, 0, index);
    }
    render();

    window.setTimeout(() => {
      const inner = card.querySelector('.card-inner');
      inner.style.transition = 'none';
      card.classList.remove('fly-know', 'fly-miss', 'is-flipped');
      void inner.offsetWidth;
      inner.style.transition = '';
      render();
      announce();
      busy = false;
      if (queue.length === 0) done.querySelector('[data-restart]').focus({ preventScroll: true });
    }, reduce.matches ? 0 : FLY_MS);
  }

  function restart() {
    queue = cards.map((_, i) => i);
    known = 0;
    for (const notch of notches) notch.classList.remove('is-carved');
    updateCount();
    for (const card of cards) card.classList.remove('is-flipped');
    render();
    announce();
    flipBtn.focus({ preventScroll: true });
  }

  // Pointer: a tap flips, a drag past 30% of the card's width answers.
  deck.addEventListener('pointerdown', (e) => {
    const card = top();
    if (!card || busy || e.button !== 0 || !card.contains(e.target)) return;
    drag = { card, id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, moved: false };
    card.setPointerCapture(e.pointerId);
  });

  deck.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) {
        if (Math.abs(dy) > 12) drag = null;
        return;
      }
      drag.moved = true;
      drag.card.classList.add('is-dragging');
    }
    drag.dx = dx;
    drag.card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    drag.card.style.setProperty('--drag', (dx / deck.offsetWidth).toFixed(3));
  });

  const endDrag = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, dx, moved } = drag;
    drag = null;
    if (!moved) {
      if (!cancelled) flip();
      return;
    }
    if (!cancelled && Math.abs(dx) > deck.offsetWidth * 0.3) {
      answer(dx > 0 ? 'know' : 'miss');
    } else {
      resetDrag(card);
    }
  };
  deck.addEventListener('pointerup', (e) => endDrag(e, false));
  deck.addEventListener('pointercancel', (e) => endDrag(e, true));

  flipBtn.addEventListener('click', flip);
  for (const b of answerBtns) b.addEventListener('click', () => answer(b.dataset.answer));
  done.querySelector('[data-restart]').addEventListener('click', restart);

  // Keyboard, while focus is inside the demo: arrows answer, as in the app.
  demo.addEventListener('keydown', (e) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      answer('know');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      answer('miss');
    }
  });

  // Read aloud with the device's own voices, like the app.
  speakBtn.addEventListener('click', () => {
    const card = top();
    if (!card) return;
    const back = isFlipped(card);
    const text = card.querySelector(back ? '.face-back .card-word' : '.face-front .card-word').textContent;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = back ? backLang : card.dataset.lang;
    utterance.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });

  render();
  updateCount();
})();
