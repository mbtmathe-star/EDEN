/* Eden site behaviour: header state, menu + booking overlays, scroll reveals, parallax band,
   gallery strip + lightbox, enquiry forms (FormSubmit). No dependencies. */
(function () {
  var d = document, root = d.documentElement, body = d.body;
  root.classList.remove('no-js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header: transparent over the hero, solid once scrolled */
  var hdr = d.querySelector('.hdr');
  if (hdr && !hdr.classList.contains('plain')) {
    var onScroll = function () { hdr.classList.toggle('solid', window.scrollY > 60); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* overlays (menu + booking panel) */
  var lastFocus = null;
  function openLayer(el) {
    lastFocus = d.activeElement; el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
    body.classList.add('locked');
    var f = el.querySelector('input,select,button,a'); if (f) setTimeout(function () { f.focus(); }, 60);
  }
  function closeLayer(el) {
    el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); body.classList.remove('locked');
    if (lastFocus) lastFocus.focus();
  }
  d.querySelectorAll('[data-open]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      var el = d.getElementById(b.getAttribute('data-open')); if (!el) return;
      e.preventDefault(); openLayer(el);
    });
  });
  d.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { closeLayer(b.closest('.menu,.book')); });
  });
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var o = d.querySelector('.menu.open,.book.open'); if (o) closeLayer(o);
  });

  /* booking panel: trampoline goes straight to its own booking site; everything else
     hands its details to the contact form */
  var bf = d.getElementById('bookForm');
  if (bf) {
    var kind = bf.querySelector('[name=kind]'), dates = bf.querySelector('.dates');
    var sync = function () {
      var v = kind.value;
      dates.style.display = (v === 'Trampoline Park') ? 'none' : '';
      bf.querySelector('.lbl-in').textContent = v === 'Accommodation' ? 'Check-in' : 'Date';
      bf.querySelector('.lbl-out').parentNode.style.display = v === 'Accommodation' ? '' : 'none';
      var bn = bf.querySelector('.bk-note'); if (bn) bn.style.display = v === 'Accommodation' ? '' : 'none';
    };
    kind.addEventListener('change', sync); sync();
    var today = new Date().toISOString().slice(0, 10);
    bf.querySelectorAll('input[type=date]').forEach(function (i) { i.min = today; });
    bf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (kind.value === 'Trampoline Park') { location.href = '/trampoline-park/'; return; }
      var q = new URLSearchParams();
      ['kind', 'arrive', 'depart', 'guests'].forEach(function (n) {
        var el = bf.querySelector('[name=' + n + ']'); if (el && el.value && el.offsetParent !== null) q.set(n, el.value);
      });
      location.href = bf.getAttribute('action') + '?' + q.toString() + '#enquire';
    });
  }

  /* reveal on scroll */
  var rv = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* home: smooth, gliding scroll like the reference (native scroll position is kept) */
  if (window.Lenis && !reduce && body.classList.contains('home')) {
    var lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    d.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = d.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -60 }); }
      });
    });
  }

  /* home: photos settle from 1.1 to 1 and words ease in as they enter (reference behaviour) */
  var settle = d.querySelectorAll('[data-anim],[data-fade]');
  if ('IntersectionObserver' in window && !reduce) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add(en.target.hasAttribute('data-anim') ? 'a1' : 'in');
        sio.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    settle.forEach(function (el) { sio.observe(el); });
  } else settle.forEach(function (el) { el.classList.add(el.hasAttribute('data-anim') ? 'a1' : 'in'); });

  /* photos open like a curtain as they come into view */
  var reveals = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    /* watch the frame, not the clipped photo: a fully clipped element never reports as visible */
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var r = en.target.querySelector('.reveal'); if (r) r.classList.add('in');
        rio.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { rio.observe(el.parentNode); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });

  /* photo frames drift slightly slower than the page (reference-style parallax) */
  var drift = d.querySelectorAll('[data-speed]');
  if (drift.length && !reduce && window.matchMedia('(min-width: 761px)').matches) {
    var dTick = false;
    var move = function () {
      var vh = window.innerHeight;
      drift.forEach(function (el) {
        var r = el.parentNode.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
        el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
      });
      dTick = false;
    };
    window.addEventListener('scroll', function () { if (!dTick) { dTick = true; requestAnimationFrame(move); } }, { passive: true });
    window.addEventListener('resize', move);
    move();
  }

  /* gentle parallax on full-bleed bands */
  var bands = d.querySelectorAll('.band img');
  if (bands.length && !reduce) {
    var tick = false;
    var par = function () {
      bands.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect(), vh = window.innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
        img.style.transform = 'translate3d(0,' + (p * -18).toFixed(2) + '%,0)';
      });
      tick = false;
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(par); } }, { passive: true });
    par();
  }

  /* horizontal strip arrows */
  d.querySelectorAll('[data-strip]').forEach(function (nav) {
    var s = d.getElementById(nav.getAttribute('data-strip'));
    nav.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        s.scrollBy({ left: (b.dataset.dir === 'prev' ? -1 : 1) * s.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  });

  /* lightbox for any [data-lb] group */
  var groups = {};
  d.querySelectorAll('a[data-lb]').forEach(function (a) {
    var g = a.getAttribute('data-lb'); (groups[g] = groups[g] || []).push(a);
  });
  if (Object.keys(groups).length) {
    var lb = d.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<img alt=""><button class="x" aria-label="Close">&#x2715;</button><button class="pv" aria-label="Previous photo">&#8592;</button><button class="nx" aria-label="Next photo">&#8594;</button><div class="cnt"></div>';
    body.appendChild(lb);
    var cur = [], idx = 0, im = lb.querySelector('img'), cnt = lb.querySelector('.cnt'), opener = null;
    var show = function (i) {
      idx = (i + cur.length) % cur.length; var a = cur[idx];
      im.src = a.href; im.alt = (a.querySelector('img') || {}).alt || '';
      cnt.textContent = (idx + 1) + ' / ' + cur.length;
    };
    var close = function () { lb.classList.remove('open'); body.classList.remove('locked'); if (opener) opener.focus(); };
    Object.keys(groups).forEach(function (g) {
      groups[g].forEach(function (a, i) {
        a.addEventListener('click', function (e) {
          e.preventDefault(); opener = a; cur = groups[g]; show(i);
          lb.classList.add('open'); body.classList.add('locked'); lb.querySelector('.x').focus();
        });
      });
    });
    lb.querySelector('.x').onclick = close;
    lb.querySelector('.pv').onclick = function () { show(idx - 1); };
    lb.querySelector('.nx').onclick = function () { show(idx + 1); };
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    d.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* enquiry form: prefill from the booking panel, send through FormSubmit */
  var ef = d.getElementById('enquiryForm');
  if (ef) {
    var qs = new URLSearchParams(location.search);
    ['kind', 'arrive', 'depart', 'guests'].forEach(function (n) {
      var el = ef.querySelector('[name=' + n + ']'); if (el && qs.get(n)) el.value = qs.get(n);
    });
    var msg = ef.querySelector('.form-msg'), btn = ef.querySelector('button[type=submit]');
    ef.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ef.reportValidity()) return;
      btn.disabled = true; var label = btn.innerHTML; btn.textContent = 'Sending…';
      msg.className = 'form-msg';
      fetch('https://formsubmit.co/ajax/contact@welcometoeden.co.za', {
        method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(ef)
      }).then(function (r) {
        return r.json().then(function (j) { if (!r.ok || String(j.success) === 'false') throw j; });
      }).then(function () {
        ef.reset(); msg.className = 'form-msg ok';
        msg.textContent = 'Thank you! Your enquiry has been sent and we will contact you shortly.';
      }).catch(function () {
        msg.className = 'form-msg err';
        msg.textContent = 'Sorry, your enquiry could not be sent. Please call or WhatsApp us on +27 60 333 9333.';
      }).then(function () { btn.disabled = false; btn.innerHTML = label; });
    });
  }

  /* gallery tabs: highlight the group in view */
  var gnav = d.querySelector('.gal-nav');
  if (gnav && 'IntersectionObserver' in window) {
    var tabs = gnav.querySelectorAll('a');
    var gio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        tabs.forEach(function (t) { t.classList.toggle('on', t.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    d.querySelectorAll('.gal-group').forEach(function (g) { gio.observe(g); });
  }

  var y = d.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
})();
