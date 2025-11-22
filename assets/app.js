/* =========================
   منطق الواجهة التفاعلية
   ========================= */
(function() {
  const form = document.getElementById('receiptForm');
  const stepper = document.getElementById('stepper');
  const steps = Array.from(document.querySelectorAll('.form-step'));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const finishBtn = document.getElementById('finishBtn');
  const receiptSection = document.getElementById('receiptSection');
  const editBtn = document.getElementById('editBtn');
  const printBtn = document.getElementById('printBtn');
  const printerWidth = document.getElementById('printerWidth');
  const resetAll = document.getElementById('resetAll');
  const themeToggle = document.getElementById('themeToggle');
  const reviewData = document.getElementById('reviewData');
  const AUTO_TOTAL_FIELDS = ['waterFee','sewerFee','garbageFee','rawWaterFee','meterInstallFee','commission'];

  let currentStep = 0;
  let touched = new Set();

  /* ===== Helpers ===== */
  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const isNumeric = v => /^\d+$/.test(v.trim());
  // إيقاف تنسيق الفواصل في الطباعة (المثال المرفق بدون فواصل آلاف)
  const formatNumber = v => {
    if(!v || !isNumeric(v)) return v;
    return v; // بدون فواصل آلاف
  };
  const unformat = v => v.replace(/,/g,'');

  function saveLocal() {
    const data = Object.fromEntries(new FormData(form).entries());
    try { localStorage.setItem('receiptData', JSON.stringify(data)); } catch(e) {}
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem('receiptData');
      if(!raw) return;
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([k,v]) => {
        const el = form.elements[k];
        if(el) el.value = v;
      });
      updateTotal();
    } catch(e) {}
  }
  function clearLocal() { try { localStorage.removeItem('receiptData'); } catch(e) {} }

  /* ===== Step Navigation ===== */
  function goTo(step) {
    if(step < 0 || step >= steps.length) return;
    steps.forEach(s => s.hidden = true);
    steps[step].hidden = false;
    currentStep = step;
    updateStepperUI();
    updateNavButtons();
    if(step === steps.length - 1) buildReview();
  }
  function updateStepperUI() {
    stepper.querySelectorAll('.step').forEach(li => {
      const idx = Number(li.dataset.step);
      li.classList.toggle('active', idx === currentStep);
      li.classList.toggle('completed', idx < currentStep);
    });
  }
  function updateNavButtons() {
    prevBtn.disabled = currentStep === 0;
    nextBtn.hidden = currentStep === steps.length - 1;
    finishBtn.hidden = currentStep !== steps.length - 1;
  }

  prevBtn.addEventListener('click', () => goTo(currentStep - 1));
  nextBtn.addEventListener('click', () => {
    if(!validateStep(currentStep)) return;
    goTo(currentStep + 1);
  });

  /* ===== Validation ===== */
  function validateField(el) {
    const val = el.value.trim();
    let valid = true;
    if(el.required && !val) valid = false;
    if(el.pattern && val && !new RegExp(el.pattern).test(val)) valid = false;
    if(el.classList.contains('calc') && val && !isNumeric(unformat(val))) valid = false;
    el.classList.toggle('error', !valid);
    el.classList.toggle('success', valid && val !== '');
    return valid;
  }
  function validateStep(stepIndex) {
    const stepEl = steps[stepIndex];
    const inputs = Array.from(stepEl.querySelectorAll('input'));
    let allValid = true;
    inputs.forEach(i => { if(!validateField(i)) allValid = false; });
    return allValid;
  }

  /* ===== Auto Total Calculation ===== */
  function updateTotal() {
    const totalField = form.elements['totalAmount'];
    if(!totalField) return;
    let sum = 0;
    AUTO_TOTAL_FIELDS.forEach(name => {
      const el = form.elements[name];
      if(!el) return;
      const raw = unformat(el.value || '');
      if(isNumeric(raw)) sum += Number(raw);
    });
    totalField.value = String(sum);
  }

  /* ===== Review Builder ===== */
  function buildReview() {
    reviewData.innerHTML = '';
    const data = Object.fromEntries(new FormData(form).entries());
    Object.entries(data).forEach(([k,v]) => {
      const item = document.createElement('div');
      item.className = 'review-item';
      item.innerHTML = `<span>${k}</span><strong>${formatNumber(v)}</strong>`;
      reviewData.appendChild(item);
    });
  }

  /* ===== Populate receipt fields from current form (shared) ===== */
  function fillReceiptFromForm() {
    const data = Object.fromEntries(new FormData(form).entries());
    Object.entries(data).forEach(([k,v]) => {
      const target = document.getElementById('r_' + k);
      if(target) target.textContent = formatNumber(v);
    });
  }

  /* ===== Final Submission ===== */
  form.addEventListener('submit', e => {
    e.preventDefault();
    if(!validateStep(currentStep)) return;
    fillReceiptFromForm();
    form.classList.add('fade-out');
    setTimeout(() => {
      form.hidden = true;
      // Hide other UI sections (header, stepper, footer) for receipt-only view
      const header = document.querySelector('.app-header');
      const footer = document.querySelector('.app-footer');
      if(header) header.style.display = 'none';
      if(stepper) stepper.style.display = 'none';
      if(footer) footer.style.display = 'none';
      receiptSection.hidden = false;
      document.body.classList.add('receipt-only');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 180);
  });

  editBtn?.addEventListener('click', () => {
    receiptSection.hidden = true;
    form.hidden = false;
    form.classList.remove('fade-out');
    // Restore hidden UI for editing again
    const header = document.querySelector('.app-header');
    const footer = document.querySelector('.app-footer');
    if(header) header.style.display = '';
    if(stepper) stepper.style.display = '';
    if(footer) footer.style.display = '';
    document.body.classList.remove('receipt-only');
    goTo(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  // Print button with dynamic width selection
  printBtn?.addEventListener('click', () => {
    applyPrintWidthClass();
    window.print();
  });

  function applyPrintWidthClass() {
    const size = printerWidth ? printerWidth.value : '58';
    document.body.classList.remove('print-58','print-72','print-80');
    if(size === '80') {
      document.body.classList.add('print-80');
    } else if(size === '72') {
      document.body.classList.add('print-72');
    } else {
      document.body.classList.add('print-58');
    }
    if(printerWidth) { try { localStorage.setItem('printerWidth', size); } catch(e) {} }
  }

  /* ===== Print only receipt even if wizard not finished ===== */
  window.addEventListener('beforeprint', () => {
    // If user prints before finishing, ensure receipt populated and forced visible in print
    fillReceiptFromForm();
    receiptSection.hidden = false; // will be hidden visually after print if not finished
    applyPrintWidthClass();
  });
  window.addEventListener('afterprint', () => {
    // Restore visibility if user hasn't finished (form still not hidden)
    if(!form.hidden && !document.body.classList.contains('receipt-only')) {
      receiptSection.hidden = true; // hide the preview again if print initiated early
    }
  });

  /* ===== Live Events ===== */
  form.addEventListener('input', e => {
    const t = e.target;
    if(t.matches('input')) {
      touched.add(t.name);
      validateField(t);
      if(t.classList.contains('calc')) {
        updateTotal();
      }
      saveLocal();
    }
  });

  /* ===== Theme Toggle ===== */
  themeToggle?.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'light';
    html.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
  });

  /* ===== Reset ===== */
  resetAll?.addEventListener('click', () => {
    if(!confirm('هل تريد تفريغ كافة الحقول؟')) return;
    form.reset();
    clearLocal();
    updateTotal();
    qsa('input').forEach(inp => inp.classList.remove('error','success'));
    goTo(0);
  });

  /* ===== Init ===== */
  loadLocal();
  updateStepperUI();
  updateNavButtons();
  updateTotal();
  // Restore saved printer width selection
  if(printerWidth){
    try { const saved = localStorage.getItem('printerWidth'); if(saved){ printerWidth.value = saved; } } catch(e) {}
  }
})();
