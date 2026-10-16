/* WINKS London - lightweight browser enhancements, no app framework required. */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const weatherLabel = (code) => {
  if (code === 0) return 'CLEAR';
  if ([1, 2].includes(code)) return 'PARTLY CLOUDY';
  if (code === 3) return 'OVERCAST';
  if ([45, 48].includes(code)) return 'MISTY';
  if ([51, 53, 55, 56, 57].includes(code)) return 'LIGHT RAIN';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'RAIN';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'SNOW';
  if ([95, 96, 99].includes(code)) return 'STORMY';
  return 'LONDON';
};

const updateClock = () => {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date()).replace(' ', '');
  $$('[data-uk-time]').forEach((node) => { node.textContent = time; });
};

const updateWeather = async () => {
  const output = $$('[data-uk-weather]');
  if (!output.length) return;
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,weather_code&timezone=Europe%2FLondon', { mode: 'cors' });
    if (!response.ok) throw new Error('Weather unavailable');
    const data = await response.json();
    const temp = Math.round(data.current.temperature_2m);
    const unit = data.current_units?.temperature_2m || '°C';
    output.forEach((node) => { node.textContent = `LONDON · ${temp}${unit} · ${weatherLabel(data.current.weather_code)}`; });
    $$('[data-uk-weather]').forEach((node) => {
      const icon = node.parentElement?.querySelector('i');
      if (icon) icon.className = data.current.weather_code === 0 ? 'bi bi-sun' : 'bi bi-cloud-sun';
    });
  } catch (error) {
    output.forEach((node) => { node.textContent = 'LONDON · WEATHER LIVE'; });
  }
};

updateClock();
setInterval(updateClock, 1000);
updateWeather();

// Give the sticky header a little depth once the page starts moving.
const header = $('#site-header');
const updateHeader = () => header?.classList.toggle('site-header--scrolled', window.scrollY > 18);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

// Age gate: the confirmation is stored locally so returning visitors are not interrupted.
const ageGate = $('[data-age-gate]');
const hideAgeGate = () => {
  if (!ageGate) return;
  ageGate.hidden = true;
  document.body.classList.remove('age-gate-open');
};
if (ageGate) {
  let confirmed = false;
  try { confirmed = localStorage.getItem('winks-age-confirmed') === 'true'; } catch (_) { /* private browsing can block storage */ }
  if (confirmed) hideAgeGate();
  else window.setTimeout(() => { ageGate.hidden = false; }, 450);
  $('[data-age-enter]', ageGate)?.addEventListener('click', () => {
    try { localStorage.setItem('winks-age-confirmed', 'true'); } catch (_) { /* continue without storage */ }
    hideAgeGate();
    startAmbient();
  });
}

// Soft instrumental-style ambient pad generated in-browser. It begins only after a user gesture.
let ambientContext;
let ambientMaster;
let ambientTimer;
let ambientPlaying = false;
const ambientScales = [146.83, 164.81, 196.0, 220.0, 246.94, 293.66, 329.63];

const playAmbientNote = () => {
  if (!ambientContext || !ambientMaster || ambientContext.state !== 'running') return;
  const now = ambientContext.currentTime;
  const root = ambientScales[Math.floor(Math.random() * ambientScales.length)];
  const oscillator = ambientContext.createOscillator();
  const gain = ambientContext.createGain();
  oscillator.type = Math.random() > .65 ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(root / 2, now);
  oscillator.detune.setValueAtTime((Math.random() * 8) - 4, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.055, now + 2.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 8.5);
  oscillator.connect(gain).connect(ambientMaster);
  oscillator.start(now);
  oscillator.stop(now + 9);
  ambientTimer = window.setTimeout(playAmbientNote, 4200 + Math.random() * 3400);
};

function startAmbient() {
  if (ambientPlaying) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  ambientContext ||= new AudioContext();
  ambientMaster ||= ambientContext.createGain();
  ambientMaster.gain.value = 0.24;
  ambientMaster.connect(ambientContext.destination);
  ambientContext.resume().then(() => {
    ambientPlaying = true;
    playAmbientNote();
    updateMusicButton();
  }).catch(() => {});
}

function stopAmbient() {
  window.clearTimeout(ambientTimer);
  if (ambientContext) ambientContext.suspend().catch(() => {});
  ambientPlaying = false;
  updateMusicButton();
}

function updateMusicButton() {
  $$('[data-music-toggle]').forEach((button) => {
    button.classList.toggle('is-playing', ambientPlaying);
    button.setAttribute('aria-pressed', String(ambientPlaying));
    const icon = button.querySelector('i');
    if (icon) icon.className = ambientPlaying ? 'bi bi-volume-up' : 'bi bi-volume-mute';
    const label = button.querySelector('span');
    if (label) label.textContent = ambientPlaying ? 'AMBIENT ON' : 'AMBIENT';
    button.title = ambientPlaying ? 'Pause ambient sound' : 'Play ambient sound';
  });
}

$$('[data-music-toggle]').forEach((button) => {
  button.addEventListener('click', () => ambientPlaying ? stopAmbient() : startAmbient());
});

// Time slots are intentionally simple buttons so the reservation page feels like a calendar-led request flow.
const timeSlots = $('[data-time-slots]');
const timeField = $('[data-time-field]');
if (timeSlots && timeField) {
  const makeTime = (hour, minute) => {
    const date = new Date(2000, 0, 1, hour, minute);
    return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');
  };
  for (let hour = 13; hour <= 23; hour += 1) {
    for (const minute of [0, 30]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-slot';
      button.textContent = makeTime(hour, minute);
      button.addEventListener('click', () => {
        $$('.time-slot', timeSlots).forEach((slot) => slot.classList.remove('is-selected'));
        button.classList.add('is-selected');
        timeField.value = button.textContent;
      });
      timeSlots.appendChild(button);
    }
  }
  for (const minute of [0, 30]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'time-slot';
    button.textContent = makeTime(0, minute);
    button.addEventListener('click', () => {
      $$('.time-slot', timeSlots).forEach((slot) => slot.classList.remove('is-selected'));
      button.classList.add('is-selected');
      timeField.value = button.textContent;
    });
    timeSlots.appendChild(button);
  }
}

const dateInputs = $$('input[type="date"]');
const today = new Date();
const isoToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
dateInputs.forEach((input) => { if (!input.min) input.min = isoToday; });

// Demo forms: the UI is fully interactive now; connect the submit handlers to your preferred backend later.
const showToast = (message) => {
  const toast = $('[data-site-toast]');
  const messageNode = $('[data-toast-message]');
  if (!toast || !messageNode) return;
  messageNode.textContent = message;
  if (window.bootstrap?.Toast) window.bootstrap.Toast.getOrCreateInstance(toast, { delay: 5000 }).show();
  else toast.classList.add('show');
};
window.showWinksToast = showToast;

$$('[data-demo-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      showToast('Please check the highlighted details.');
      return;
    }
    const success = $('[data-form-success]', form);
    const message = form.dataset.successMessage || 'Your note has been received. The WINKS team will reply privately.';
    if (success) {
      success.textContent = message;
      success.classList.add('is-visible');
    }
    form.reset();
    form.classList.remove('was-validated');
    $$('.time-slot', form).forEach((slot) => slot.classList.remove('is-selected'));
    showToast('Message received — thank you.');
  });
});

// A service can be pre-selected from a collection card using ?experience=slug.
const experienceSelect = $('[data-experience-select]');
if (experienceSelect) {
  const requested = new URLSearchParams(window.location.search).get('experience');
  if (requested) {
    const option = [...experienceSelect.options].find((item) => item.dataset.slug === requested || item.value === requested);
    if (option) option.selected = true;
  }
}

// Auto-start ambient sound on the first meaningful interaction if the visitor has already passed the age gate.
const warmUpAmbient = () => {
  if (ageGate && !ageGate.hidden) return;
  startAmbient();
  window.removeEventListener('pointerdown', warmUpAmbient);
  window.removeEventListener('keydown', warmUpAmbient);
};
window.addEventListener('pointerdown', warmUpAmbient, { once: true, passive: true });
window.addEventListener('keydown', warmUpAmbient, { once: true });

// Booking calendar wizard. Availability can be supplied through data-reserved-slots or
// window.WINKS_RESERVED_SLOTS when a real booking backend is connected.
const bookingCurrency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const padNumber = (number) => String(number).padStart(2, '0');
const dateKey = (date) => `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
const parseDateKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const dateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const displayDate = (key, options = { weekday: 'short', day: 'numeric', month: 'short' }) => parseDateKey(key).toLocaleDateString('en-GB', options);
const money = (amount) => amount === null || amount === undefined ? 'To be confirmed' : bookingCurrency.format(amount);
const makeReturningRate = (amount, discount) => amount === null || amount === undefined ? null : Math.round((amount * (1 - discount)) / 5) * 5;
const timeValues = () => {
  const values = [];
  for (let hour = 13; hour <= 23; hour += 1) for (const minute of [0, 30]) values.push(`${padNumber(hour)}:${padNumber(minute)}`);
  for (let hour = 0; hour <= 1; hour += 1) for (const minute of [0, 30]) values.push(`${padNumber(hour)}:${padNumber(minute)}`);
  return values;
};
const displayTime = (value) => {
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date(2000, 0, 1, hour, minute);
  return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');
};
const addDays = (date, amount) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const demoReservedSlots = () => {
  const today = dateOnly(new Date());
  const result = {};
  [[1, ['19:00', '20:30', '22:00']], [2, ['18:00', '21:30']], [4, ['20:00', '22:30']], [6, ['17:30', '19:00']]].forEach(([offset, slots]) => {
    result[dateKey(addDays(today, offset))] = slots;
  });
  return result;
};

const mergeReservedSlots = (base, incoming) => {
  Object.entries(incoming || {}).forEach(([day, slots]) => {
    base[day] = [...new Set([...(base[day] || []), ...(Array.isArray(slots) ? slots : [])])];
  });
  return base;
};

const initBookingWidgets = () => {
  $$('[data-booking-widget]').forEach((widget) => {
    let catalog = [];
    try { catalog = JSON.parse(widget.dataset.rateCatalog || '[]'); } catch (_) { catalog = []; }
    const servicesBySlug = new Map(catalog.map((service) => [service.slug, service]));
    const discount = Number(widget.dataset.returningDiscount || .1);
    const today = dateOnly(new Date());
    const state = {
      step: 1,
      customerType: 'new',
      service: null,
      duration: null,
      rate: null,
      selectedDate: null,
      selectedTime: null,
      month: new Date(today.getFullYear(), today.getMonth(), 1),
    };
    let reservedSlots = demoReservedSlots();
    try {
      if (widget.dataset.reservedSlots) reservedSlots = mergeReservedSlots(reservedSlots, JSON.parse(widget.dataset.reservedSlots));
      if (window.WINKS_RESERVED_SLOTS) reservedSlots = mergeReservedSlots(reservedSlots, window.WINKS_RESERVED_SLOTS);
    } catch (_) { /* keep the local availability fallback */ }

    const steps = $$('[data-booking-step]', widget);
    const progressItems = $$('[data-progress-item]', widget);
    const experienceSelect = $('[data-booking-experience]', widget);
    const ratePanel = $('[data-rate-panel]', widget);
    const calendarGrid = $('[data-calendar-grid]', widget);
    const calendarMonth = $('[data-calendar-month]', widget);
    const slotList = $('[data-slot-list]', widget);
    const slotEmpty = $('[data-slot-empty]', widget);
    const nextToCalendar = $('[data-booking-next="1"]', widget);
    const nextToDetails = $('[data-booking-next="2"]', widget);
    const selectedDateLabel = $('[data-selected-date-label]', widget);
    const selectedSlotSummary = $('[data-selected-slot-summary]', widget);
    const selectedSummaryBox = $('[data-calendar-selection-summary]', widget);
    const validationMessage = $('[data-booking-validation]', widget);

    const currentRate = () => {
      if (!state.service || !state.duration) return null;
      const base = state.service.rates?.[state.duration];
      return state.customerType === 'existing' ? makeReturningRate(base, discount) : base;
    };

    const renderRatePanel = () => {
      if (!state.service) {
        ratePanel.innerHTML = '<div class="booking-empty-state"><span class="booking-empty-state__icon">✦</span><span>Select an experience to see available durations and rates.</span></div>';
        state.duration = null;
        state.rate = null;
        return;
      }
      const durations = Object.keys(state.service.rates || {}).filter((key) => /^\\d+$/.test(key)).sort((a, b) => Number(a) - Number(b));
      if (!durations.includes(state.duration)) state.duration = durations[0] || null;
      state.rate = currentRate();
      const guestLabel = state.customerType === 'existing' ? `Returning guest · ${Math.round(discount * 100)}% rate` : 'New guest · standard rate';
      const options = durations.map((duration) => {
        const base = state.service.rates[duration];
        const value = state.customerType === 'existing' ? makeReturningRate(base, discount) : base;
        const selected = duration === state.duration ? ' is-selected' : '';
        const disabled = base === null || base === undefined ? ' disabled' : '';
        const small = base === null || base === undefined ? 'Price confirmed privately' : guestLabel;
        return `<button type="button" class="booking-rate-option${selected}" data-duration="${duration}"${disabled}><span class="booking-rate-option__duration">${duration} minutes</span><strong>${money(value)}</strong><small>${small}</small></button>`;
      }).join('');
      const addOn = state.service.rates.addOnLabel ? `<p class="booking-rate-note">${state.service.rates.addOnLabel}. Transport, Central London taxi and any out-of-hours surcharge are confirmed privately.</p>` : '<p class="booking-rate-note">Transport and any out-of-hours surcharge are confirmed privately.</p>';
      ratePanel.innerHTML = `<div class="booking-rate-panel__top"><span>${state.service.name}</span><strong>${guestLabel}</strong></div><div class="booking-rate-options">${options}</div>${addOn}`;
      state.rate = currentRate();
      $$('.booking-rate-option', ratePanel).forEach((button) => button.addEventListener('click', () => {
        state.duration = button.dataset.duration;
        state.rate = currentRate();
        renderRatePanel();
      }));
    };

    const renderCalendar = () => {
      if (!calendarGrid) return;
      const year = state.month.getFullYear();
      const month = state.month.getMonth();
      if (calendarMonth) calendarMonth.textContent = state.month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      calendarGrid.innerHTML = '';
      for (let index = 0; index < firstDayOffset; index += 1) {
        const blank = document.createElement('span');
        blank.className = 'booking-day is-outside';
        blank.setAttribute('aria-hidden', 'true');
        calendarGrid.appendChild(blank);
      }
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const key = dateKey(date);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'booking-day';
        button.textContent = String(day);
        button.setAttribute('aria-label', displayDate(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        if (date.getTime() < today.getTime()) {
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
        }
        if (date.getTime() === today.getTime()) button.classList.add('is-today');
        if (state.selectedDate === key) button.classList.add('is-selected');
        button.addEventListener('click', () => {
          state.selectedDate = key;
          state.selectedTime = null;
          renderCalendar();
          renderSlots();
          updateNextState();
        });
        calendarGrid.appendChild(button);
      }
      const previousButton = $('[data-calendar-prev]', widget);
      if (previousButton) previousButton.disabled = state.month.getTime() <= new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    };

    const renderSlots = () => {
      if (!slotList) return;
      if (!state.selectedDate) {
        slotList.innerHTML = '';
        slotEmpty.hidden = false;
        if (selectedDateLabel) selectedDateLabel.textContent = 'Select a date';
        if (selectedSummaryBox) selectedSummaryBox.hidden = true;
        return;
      }
      slotEmpty.hidden = true;
      if (selectedDateLabel) selectedDateLabel.textContent = displayDate(state.selectedDate, { weekday: 'short', day: 'numeric', month: 'short' });
      const unavailable = new Set(reservedSlots[state.selectedDate] || []);
      slotList.innerHTML = '';
      timeValues().forEach((time) => {
        const reserved = unavailable.has(time);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `booking-slot${state.selectedTime === time ? ' is-selected' : ''}`;
        button.disabled = reserved;
        button.innerHTML = `<span>${displayTime(time)}</span><small>${reserved ? 'Reserved' : 'Available'}</small>`;
        if (reserved) button.setAttribute('aria-label', `${displayTime(time)} reserved`);
        else button.addEventListener('click', () => {
          state.selectedTime = time;
          renderSlots();
          updateNextState();
        });
        slotList.appendChild(button);
      });
      if (selectedSummaryBox) selectedSummaryBox.hidden = !state.selectedTime;
      if (selectedSlotSummary) selectedSlotSummary.textContent = state.selectedTime ? `${displayDate(state.selectedDate)} · ${displayTime(state.selectedTime)}` : '—';
    };

    fetch('/data/reserved-slots.json', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((availability) => {
      if (!availability) return;
      mergeReservedSlots(reservedSlots, availability.reservedSlots || availability);
      renderCalendar();
      renderSlots();
    }).catch(() => {});

    const updateNextState = () => {
      if (nextToCalendar) nextToCalendar.disabled = !state.service || !state.duration;
      if (nextToDetails) nextToDetails.disabled = !state.selectedDate || !state.selectedTime;
    };

    const setStep = (step) => {
      state.step = step;
      steps.forEach((section) => { section.hidden = Number(section.dataset.bookingStep) !== step; section.classList.toggle('is-active', Number(section.dataset.bookingStep) === step); });
      progressItems.forEach((item) => { const number = Number(item.dataset.progressItem); item.classList.toggle('is-active', number === step); item.classList.toggle('is-complete', number < step); });
      if (step === 3) {
        $('[data-summary-experience]', widget).textContent = state.service?.name || '—';
        $('[data-summary-rate]', widget).textContent = `${state.duration || '—'} min · ${money(state.rate)}`;
        $('[data-summary-slot]', widget).textContent = state.selectedDate && state.selectedTime ? `${displayDate(state.selectedDate)} · ${displayTime(state.selectedTime)}` : '—';
      }
      widget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const showBookingError = (message) => {
      if (validationMessage) { validationMessage.textContent = message; validationMessage.hidden = false; }
      showToast(message);
    };

    const buildMessage = () => {
      const name = $('[data-booking-name]', widget).value.trim();
      const phone = $('[data-booking-phone]', widget).value.trim();
      const email = $('[data-booking-email]', widget).value.trim();
      const guests = $('[data-booking-guests]', widget).value;
      const area = $('[data-booking-area]', widget).value.trim();
      const setting = $('[data-booking-setting]', widget).value;
      const notes = $('[data-booking-notes]', widget).value.trim() || 'None';
      return [
        'WINKS LONDON BOOKING REQUEST',
        '----------------------------',
        `Experience: ${state.service.name}`,
        `Duration: ${state.duration} minutes`,
        `Rate: ${money(state.rate)}${state.customerType === 'existing' ? ' (returning guest rate)' : ''}`,
        `Guest status: ${state.customerType === 'existing' ? 'Existing guest' : 'New guest'}`,
        `Date: ${displayDate(state.selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
        `Time: ${displayTime(state.selectedTime)}`,
        `Guests: ${guests}`,
        `Area / location: ${area}`,
        `Setting: ${setting}`,
        '',
        `Name: ${name}`,
        `Phone / WhatsApp: ${phone}`,
        `Email: ${email}`,
        `Notes: ${notes}`,
        '',
        'Please confirm availability, final travel costs and the next step.'
      ].join('\\n');
    };

    const submitBooking = () => {
      const required = ['[data-booking-name]', '[data-booking-phone]', '[data-booking-email]', '[data-booking-guests]', '[data-booking-area]', '[data-booking-setting]'].map((selector) => $(selector, widget));
      const invalid = required.find((field) => !field || !field.value.trim() || !field.checkValidity());
      const consent = $('[data-booking-consent]', widget);
      if (invalid) { invalid?.focus(); showBookingError('Please complete your name, contact, guest count, area and setting.'); return; }
      if (!state.service || !state.duration || !state.selectedDate || !state.selectedTime) { showBookingError('Please complete the experience, date, time and rate selection first.'); return; }
      if (consent && !consent.checked) { consent.focus(); showBookingError('Please confirm that you are 18 or over.'); return; }
      if (validationMessage) validationMessage.hidden = true;
      const message = buildMessage();
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${widget.dataset.whatsapp}?text=${encodedMessage}`;
      const subject = encodeURIComponent(`WINKS booking request · ${state.service.name} · ${displayDate(state.selectedDate)}`);
      const emailUrl = `mailto:${widget.dataset.email}?subject=${subject}&body=${encodedMessage}`;
      const finalSummary = $('[data-final-summary]', widget);
      if (finalSummary) finalSummary.textContent = message;
      const whatsappLink = $('[data-whatsapp-link]', widget);
      const emailLink = $('[data-email-link]', widget);
      if (whatsappLink) whatsappLink.href = whatsappUrl;
      if (emailLink) { emailLink.href = emailUrl; emailLink.target = '_blank'; }
      setStep(4);
      // Best effort: browsers may block one of two automatic external launches; the two visible links remain available.
      window.setTimeout(() => { try { window.open(whatsappUrl, '_blank', 'noopener'); } catch (_) {} }, 80);
      window.setTimeout(() => { try { window.open(emailUrl, '_blank', 'noopener'); } catch (_) {} }, 220);
    };

    experienceSelect?.addEventListener('change', () => {
      state.service = servicesBySlug.get(experienceSelect.value) || null;
      state.duration = null;
      state.rate = null;
      renderRatePanel();
      updateNextState();
    });
    $$('[data-customer-type]', widget).forEach((button) => button.addEventListener('click', () => {
      state.customerType = button.dataset.customerType;
      $$('[data-customer-type]', widget).forEach((choice) => choice.classList.toggle('is-selected', choice === button));
      renderRatePanel();
    }));
    $('[data-calendar-prev]', widget)?.addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderCalendar(); });
    $('[data-calendar-next]', widget)?.addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderCalendar(); });
    $('[data-booking-next="1"]', widget)?.addEventListener('click', () => { if (!state.service || !state.duration) return showBookingError('Please select an experience and duration.'); setStep(2); });
    $('[data-booking-next="2"]', widget)?.addEventListener('click', () => { if (!state.selectedDate || !state.selectedTime) return showBookingError('Please select an available date and time.'); setStep(3); });
    $$('[data-booking-back]', widget).forEach((button) => button.addEventListener('click', () => setStep(Number(button.dataset.bookingBack) - 1)));
    $('[data-booking-submit]', widget)?.addEventListener('click', submitBooking);
    $('[data-booking-start-over]', widget)?.addEventListener('click', () => {
      state.step = 1; state.service = null; state.duration = null; state.rate = null; state.selectedDate = null; state.selectedTime = null; state.month = new Date(today.getFullYear(), today.getMonth(), 1);
      if (experienceSelect) experienceSelect.value = '';
      renderRatePanel(); renderCalendar(); renderSlots(); updateNextState(); setStep(1);
    });

    const requestedExperience = new URLSearchParams(window.location.search).get('experience');
    if (requestedExperience && servicesBySlug.has(requestedExperience)) {
      experienceSelect.value = requestedExperience;
      experienceSelect.dispatchEvent(new Event('change'));
    }
    renderRatePanel();
    renderCalendar();
    renderSlots();
    updateNextState();
  });
};

initBookingWidgets();
