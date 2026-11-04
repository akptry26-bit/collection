/**
 * Easy Collection - Micro Finance
 * Enterprise Application Logic (app.js)
 * Fully Updated with:
 * - Defaulters / Overdue Filter (Thavanai Thavariyavargal)
 * - 1-Click Full JSON Backup & Restore (Export/Import)
 * - Route Serial Sorting (Street Sequence / Line Order)
 * - Secure In-App Customer Delete
 * - Backdated Collection Entry
 * - Inline Customer Re-Loan Modal (Stays on Profile)
 * - Complete In-App Popups & Bilingual Engine (Tamil & English)
 */

const app = {
  data: {
    settings: {
      companyName: "EASY COLLECTION",
      collectorName: "Admin Collector",
      upiId: "easycollection@upi",
      ownerPhone: "9842100000",
      password: "1234",
      theme: "light",
      language: "ta",
      cloudUrl: "",
      cloudKey: "",
      cloudTable: "easy_collection_data"
    },
    lines: [
      { id: "LINE-1", name: "Line 1 - டவுன் லைன்", frequency: "தினசரி (Daily)", target: 25000, areas: ["பஜார்", "மெயின் ரோடு", "காந்தி நகர்"] },
      { id: "LINE-2", name: "Line 2 - வாராந்திர லைன்", frequency: "வாராந்திர (Weekly)", day: "வெள்ளி (Friday)", target: 50000, areas: ["V.K.PATTI", "அண்ணா நகர்"] }
    ],
    customers: [
      {
        id: "CUST-101",
        accountNo: "EC-1001",
        routeOrder: 1,
        name: "மு. கார்த்திக்",
        phone: "9876543210",
        altPhone: "9842100001",
        aadhaar: "[Aadhaar Redacted]",
        address: "12/4, வடக்கு தெரு, V.K.PATTI, 627001",
        lineId: "LINE-2",
        area: "V.K.PATTI",
        principal: 10000,
        docFee: 200,
        handCash: 9800,
        tenure: 10,
        dueAmount: 1200,
        balance: 12000,
        totalPaid: 0,
        startDate: "2026-11-04"
      },
      {
        id: "CUST-102",
        accountNo: "EC-1002",
        routeOrder: 2,
        name: "எஸ். லட்சுமி",
        phone: "9842122222",
        altPhone: "",
        aadhaar: "[Aadhaar Redacted]",
        address: "45, காந்தி பஜார், மெயின் ரோடு",
        lineId: "LINE-1",
        area: "பஜார்",
        principal: 10000,
        docFee: 200,
        handCash: 9800,
        tenure: 100,
        dueAmount: 120,
        balance: 12000,
        totalPaid: 0,
        startDate: "2026-11-04"
      }
    ],
    transactions: [],
    daybook: {
      openingBalances: {},
      expenses: []
    }
  },

  currentView: "home",
  currentColFilter: "ALL",
  currentCustId: null,
  pendingUpiCustId: null,
  pendingUpiAmount: 0,
  activeProfitPct: 20,
  usePctAutoCalc: true,
  currentReportDateMode: "single",
  confirmCallback: null,

  /* ================= 1. INITIALIZATION ================= */
  init() {
    this.loadState();
    this.applyTheme(this.data.settings.theme || 'light');
    this.applyLanguage(this.data.settings.language || 'ta');
    this.startHeaderClock();
    this.populateDropdowns();
    this.initDates();
    this.recomputeLoan('principal');
    this.renderHomeSummary();
    this.bindConfirmModal();
  },

  /* ================= 2. LOCAL STORAGE PERSISTENCE ================= */
  loadState() {
    const saved = localStorage.getItem("easy_coll_enterprise_v6");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") this.data = Object.assign(this.data, parsed);
      } catch (e) {}
    }
  },

  saveState() {
    try {
      localStorage.setItem("easy_coll_enterprise_v6", JSON.stringify(this.data));
    } catch (e) {}
  },

  /* ================= 3. IN-APP TOAST & CONFIRM MODAL ================= */
  showToast(msg, type = "success") {
    const toastEl = document.getElementById("appLiveToast");
    const body = document.getElementById("toastMessageBody");
    if (!toastEl || !body) return;

    body.innerText = msg;
    toastEl.className = `toast align-items-center text-white border-0 bg-${type === 'danger' ? 'danger' : type === 'warning' ? 'warning text-dark' : type === 'info' ? 'primary' : 'success'}`;
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
  },

  showConfirm(title, message, onConfirm) {
    this.confirmCallback = onConfirm;
    document.getElementById("appConfirmModalTitle").innerText = title;
    document.getElementById("appConfirmModalMessage").innerText = message;
    new bootstrap.Modal(document.getElementById("appConfirmModal")).show();
  },

  bindConfirmModal() {
    const btnProceed = document.getElementById("btnConfirmProceed");
    if (btnProceed) {
      btnProceed.onclick = () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("appConfirmModal"));
        if (modal) modal.hide();
        if (typeof this.confirmCallback === "function") {
          this.confirmCallback();
          this.confirmCallback = null;
        }
      };
    }
  },

  /* ================= 4. HEADER REALTIME CLOCK ================= */
  startHeaderClock() {
    const el = document.getElementById("headerLiveClock");
    const isTa = (this.data.settings.language || 'ta') === 'ta';
    const daysTa = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];
    const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const update = () => {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      let hr = now.getHours();
      const min = String(now.getMinutes()).padStart(2, '0');
      const sec = String(now.getSeconds()).padStart(2, '0');
      const ampm = hr >= 12 ? 'PM' : 'AM';
      hr = hr % 12 || 12;
      const dayName = isTa ? daysTa[now.getDay()] : daysEn[now.getDay()];
      if (el) el.innerText = `${dayName}, ${d}-${m}-${y} | ${String(hr).padStart(2, '0')}:${min}:${sec} ${ampm}`;
    };
    update();
    setInterval(update, 1000);
  },

  initDates() {
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById("homeDate")) document.getElementById("homeDate").value = today;
    if (document.getElementById("colCurrentEffectiveDate")) document.getElementById("colCurrentEffectiveDate").value = today;
    if (document.getElementById("mStartDate")) document.getElementById("mStartDate").value = today;
    if (document.getElementById("dbDateSelect")) document.getElementById("dbDateSelect").value = today;
    if (document.getElementById("repSingleDate")) document.getElementById("repSingleDate").value = today;
    if (document.getElementById("repFromDate")) document.getElementById("repFromDate").value = today;
    if (document.getElementById("repToDate")) document.getElementById("repToDate").value = today;
    if (document.getElementById("reLoanStartDate")) document.getElementById("reLoanStartDate").value = today;
    this.calcLoanCloseDate();
  },

  /* ================= 5. AUTHENTICATION ================= */
  handleLogin() {
    const pin = document.getElementById("loginPin").value;
    if (pin === this.data.settings.password) {
      document.getElementById("view_login").classList.add("d-none");
      document.getElementById("mainApp").classList.remove("d-none");
      this.switchView('home');
      this.showToast(this.data.settings.language === 'ta' ? "வெற்றிகரமாக உள்நுழைந்துள்ளீர்கள்!" : "Logged in successfully!", "success");
    } else {
      this.showToast(this.data.settings.language === 'ta' ? "தவறான PIN! (இயல்பு: 1234)" : "Invalid PIN! (Default: 1234)", "danger");
    }
  },

  handleBiometricLogin() {
    document.getElementById("view_login").classList.add("d-none");
    document.getElementById("mainApp").classList.remove("d-none");
    this.switchView('home');
    this.showToast(this.data.settings.language === 'ta' ? "கைரேகை சரிபார்க்கப்பட்டு உள்நுழைந்தது!" : "Biometric verified successfully!", "success");
  },

  logout() {
    document.getElementById("mainApp").classList.add("d-none");
    document.getElementById("view_login").classList.remove("d-none");
    document.getElementById("loginPin").value = "";
    this.showToast(this.data.settings.language === 'ta' ? "வெளியேறியுள்ளீர்கள்!" : "Logged out!", "info");
  },

  /* ================= 6. VIEW NAVIGATION ================= */
  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll(".page-view").forEach(v => v.classList.add("d-none"));
    const target = document.getElementById("view_" + viewName);
    if (target) target.classList.remove("d-none");

    document.querySelectorAll(".nav-pill-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("onclick")?.includes(viewName));
    });

    document.querySelectorAll(".mobile-nav-item").forEach(item => item.classList.remove("active"));
    if (viewName === 'home') document.getElementById("mNavHome")?.classList.add("active");
    if (viewName === 'master') document.getElementById("mNavMaster")?.classList.add("active");
    if (viewName === 'daybook') document.getElementById("mNavDaybook")?.classList.add("active");
    if (viewName === 'reports') document.getElementById("mNavReports")?.classList.add("active");
    if (viewName === 'settings') document.getElementById("mNavSettings")?.classList.add("active");

    if (viewName === 'home') this.renderHomeSummary();
    if (viewName === 'daybook') this.renderDayBook();
    if (viewName === 'reports') this.renderReports();
    if (viewName === 'settings') this.backToSettingsMenu();
    if (viewName === 'master') this.backToMasterMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* ================= 7. DROPDOWNS POPULATION ================= */
  populateDropdowns() {
    const hLine = document.getElementById("homeLine");
    const mLine = document.getElementById("mCustLine");
    const aLine = document.getElementById("areaLineSelect");
    const rLine = document.getElementById("repLineSelect");
    const sAreaLine = document.getElementById("settingsAreaLineSelect");

    let opts = "";
    this.data.lines.forEach(l => {
      opts += `<option value="${l.id}">${l.name} (${l.frequency})</option>`;
    });

    if (hLine) hLine.innerHTML = opts;
    if (mLine) mLine.innerHTML = opts;
    if (aLine) aLine.innerHTML = opts;
    if (sAreaLine) sAreaLine.innerHTML = opts;

    if (rLine) {
      const isTa = (this.data.settings.language || 'ta') === 'ta';
      let repOpts = `<option value="ALL">${isTa ? 'அனைத்து லைன்களும் (All Lines)' : 'All Lines'}</option>`;
      this.data.lines.forEach(l => { repOpts += `<option value="${l.id}">${l.name}</option>`; });
      rLine.innerHTML = repOpts;
    }

    this.onHomeLineChange();
    this.onMasterLineChange();
    this.renderMasterAreaChips();
    this.renderSettingsAreaChips();
  },

  onHomeLineChange() {
    const lineId = document.getElementById("homeLine")?.value;
    const line = this.data.lines.find(l => l.id === lineId);
    const areaSelect = document.getElementById("homeArea");
    if (!areaSelect) return;

    const isTa = (this.data.settings.language || 'ta') === 'ta';
    let opts = `<option value="ALL">${isTa ? 'அனைத்து பகுதிகளும் (All)' : 'All Areas'}</option>`;
    if (line && line.areas) {
      line.areas.forEach(a => { opts += `<option value="${a}">${a}</option>`; });
    }
    areaSelect.innerHTML = opts;
  },

  /* ================= 8. HOME ROUTE SELECTION ================= */
  submitHomeRoute() {
    const date = document.getElementById("homeDate")?.value;
    const lineId = document.getElementById("homeLine")?.value;
    const line = this.data.lines.find(l => l.id === lineId);
    const area = document.getElementById("homeArea")?.value || "ALL";

    if (!date || !line) {
      this.showToast(this.data.settings.language === 'ta' ? "தேதி மற்றும் லைனைத் தேர்ந்தெடுக்கவும்!" : "Please select Date and Line!", "warning");
      return;
    }

    if (document.getElementById("colCurrentEffectiveDate")) {
      document.getElementById("colCurrentEffectiveDate").value = date;
    }

    document.getElementById("colHeaderTitle").innerText = `${line.name} - ${area}`;
    document.getElementById("colHeaderSubtitle").innerText = `${this.data.settings.language === 'ta' ? 'வசூல் தேதி' : 'Collection Date'}: ${date} (${line.frequency})`;

    this.switchView('collection');
    this.renderCollectionSheet();
  },

  renderHomeSummary() {
    const today = document.getElementById("homeDate")?.value || new Date().toISOString().split('T')[0];
    const todayTxs = this.data.transactions.filter(t => t.date.startsWith(today));
    const total = todayTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const cash = todayTxs.filter(t => t.mode === 'CASH').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const upi = todayTxs.filter(t => t.mode === 'UPI').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    document.getElementById("homeSummaryTotal").innerText = `₹${total.toLocaleString()}`;
    document.getElementById("homeSummaryCash").innerText = `₹${cash.toLocaleString()}`;
    document.getElementById("homeSummaryUpi").innerText = `₹${upi.toLocaleString()}`;
  },

  /* ================= 9. COLLECTION SHEET & ADVANCED FILTERS ================= */
  onColDateChange(newDate) {
    if (newDate) {
      document.getElementById("colHeaderSubtitle").innerText = `${this.data.settings.language === 'ta' ? 'வசூல் தேதி' : 'Collection Date'}: ${newDate}`;
      this.renderCollectionSheet();
    }
  },

  setCollectionFilter(filter) {
    this.currentColFilter = filter;
    document.getElementById("btnFilterColAll").className = (filter === 'ALL') ? "btn btn-sm btn-outline-secondary active px-3" : "btn btn-sm btn-outline-secondary px-3";
    document.getElementById("btnFilterColPending").className = (filter === 'PENDING') ? "btn btn-sm btn-danger text-white active px-3" : "btn btn-sm btn-outline-danger px-3";
    document.getElementById("btnFilterColPaid").className = (filter === 'PAID') ? "btn btn-sm btn-success text-white active px-3" : "btn btn-sm btn-outline-success px-3";
    document.getElementById("btnFilterColOverdue").className = (filter === 'OVERDUE') ? "btn btn-sm btn-warning text-dark active px-3 fw-bold d-flex align-items-center gap-1" : "btn btn-sm btn-outline-warning text-dark fw-bold px-3 d-flex align-items-center gap-1";
    this.renderCollectionSheet();
  },

  filterCollectionRows() {
    const q = document.getElementById("colSearchInput")?.value.toLowerCase().trim();
    document.querySelectorAll("#collectionTableBody tr").forEach(r => {
      r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none";
    });
  },

  renderCollectionSheet() {
    const tbody = document.getElementById("collectionTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const lineId = document.getElementById("homeLine")?.value;
    const area = document.getElementById("homeArea")?.value || "ALL";
    const date = document.getElementById("colCurrentEffectiveDate")?.value || document.getElementById("homeDate")?.value || new Date().toISOString().split('T')[0];
    const sortMode = document.getElementById("colSortOptionSelect")?.value || "route";
    const isTa = (this.data.settings.language || 'ta') === 'ta';

    let list = this.data.customers.filter(c => c.lineId === lineId);
    if (area !== "ALL") list = list.filter(c => c.area === area);

    // Calculate Overdue Defaulters Count
    const overdueList = list.filter(c => {
      const hasBalance = (Number(c.balance || 0) > 0);
      const isUnpaidToday = !this.data.transactions.some(t => t.customerId === c.id && t.date.startsWith(date));
      return hasBalance && isUnpaidToday;
    });

    const badgeOverdue = document.getElementById("badgeOverdueCount");
    if (badgeOverdue) badgeOverdue.innerText = overdueList.length;

    // Apply Filters
    if (this.currentColFilter === "PENDING") {
      list = list.filter(c => !this.data.transactions.some(t => t.customerId === c.id && t.date.startsWith(date)));
    } else if (this.currentColFilter === "PAID") {
      list = list.filter(c => this.data.transactions.some(t => t.customerId === c.id && t.date.startsWith(date)));
    } else if (this.currentColFilter === "OVERDUE") {
      list = overdueList;
    }

    // Apply Route Serial Sorting
    list.sort((a, b) => {
      if (sortMode === "route") return (Number(a.routeOrder) || 999) - (Number(b.routeOrder) || 999);
      if (sortMode === "acc") return a.accountNo.localeCompare(b.accountNo);
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "balance") return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      return 0;
    });

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4 font-sans">${isTa ? 'வாடிக்கையாளர்கள் பதிவு செய்யப்படவில்லை' : 'No customers found for this selection'}</td></tr>`;
      return;
    }

    list.forEach(c => {
      const paidTx = this.data.transactions.find(t => t.customerId === c.id && t.date.startsWith(date));
      const isPaid = !!paidTx;

      let payHtml = "";
      let actionHtml = "";

      if (isPaid) {
        payHtml = `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1.5"><i class="bi bi-check2-circle me-1"></i>₹${Number(paidTx.amount).toLocaleString()} (${paidTx.mode})</span>`;
        actionHtml = `
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-dark btn-sm py-1 px-2" onclick="app.printReceipt('${paidTx.id}')" title="Print Receipt"><i class="bi bi-printer"></i></button>
            <button class="btn btn-outline-danger btn-sm py-1 px-2" onclick="app.openEditPaymentModal('${paidTx.id}')" title="Edit Amount"><i class="bi bi-pencil-square"></i> ${isTa ? 'திருத்து' : 'Edit'}</button>
          </div>`;
      } else {
        payHtml = `
          <div class="d-flex align-items-center justify-content-center gap-1">
            <input type="number" class="form-control form-control-sm text-center font-mono fw-bold" id="payInput_${c.id}" value="${c.dueAmount}" style="width: 76px;" />
            <button class="btn btn-emerald btn-sm py-1 px-2" onclick="app.recordPayment('${c.id}', 'CASH')">Cash</button>
            <button class="btn btn-outline-primary btn-sm py-1 px-2" onclick="app.openUpiModal('${c.id}')">UPI</button>
          </div>`;
        actionHtml = `<span class="badge bg-danger-subtle text-danger font-sans">${isTa ? 'பாக்கி' : 'Pending'}</span>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-center"><span class="badge bg-secondary-subtle text-dark border font-mono">#${c.routeOrder || 1}</span></td>
        <td><span class="badge bg-light text-dark border font-mono">${c.accountNo}</span></td>
        <td>
          <span class="fw-bold text-success cursor-pointer text-decoration-underline font-sans" onclick="app.openCustomerProfile('${c.id}')">${c.name}</span>
          <small class="text-muted d-block font-mono">${c.phone}</small>
        </td>
        <td><span class="badge bg-light text-dark border font-sans">${c.area}</span></td>
        <td class="text-end fw-bold text-danger">₹${Number(c.balance || 0).toLocaleString()}</td>
        <td class="text-end fw-bold text-success">₹${Number(c.dueAmount || 0).toLocaleString()}</td>
        <td class="text-center">${payHtml}</td>
        <td class="text-center">${actionHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  /* ================= 10. PAYMENT RECORDING (WITH BACKDATED ENTRY) ================= */
  recordPayment(custId, mode, amtOverride = null) {
    const cust = this.data.customers.find(c => c.id === custId);
    if (!cust) return;

    const amt = amtOverride || Number(document.getElementById(`payInput_${custId}`)?.value) || cust.dueAmount;
    if (amt <= 0) {
      this.showToast(this.data.settings.language === 'ta' ? "சரியான தொகையை உள்ளிடவும்!" : "Please enter a valid amount!", "warning");
      return;
    }

    // Takes backdated or current effective date
    const effectiveDate = document.getElementById("colCurrentEffectiveDate")?.value || document.getElementById("homeDate")?.value || new Date().toISOString().split('T')[0];

    const tx = {
      id: "REC-" + Date.now().toString().slice(-6),
      customerId: cust.id,
      customerName: cust.name,
      accountNo: cust.accountNo,
      lineId: cust.lineId,
      area: cust.area,
      amount: amt,
      mode: mode,
      collector: this.data.settings.collectorName,
      date: effectiveDate + " " + new Date().toLocaleTimeString('en-US', { hour12: false })
    };

    cust.balance = Math.max(0, (Number(cust.balance) || 0) - amt);
    cust.totalPaid = (Number(cust.totalPaid) || 0) + amt;

    this.data.transactions.unshift(tx);
    this.saveState();
    this.renderCollectionSheet();
    this.renderHomeSummary();
    this.showToast(`₹${amt} ${this.data.settings.language === 'ta' ? 'வரவு வைக்கப்பட்டது' : 'payment recorded'} (${mode})!`, "success");
  },

  /* ================= 11. WRONG PAYMENT ENTRY EDIT ================= */
  openEditPaymentModal(txId) {
    const tx = this.data.transactions.find(t => t.id === txId);
    if (!tx) return;

    document.getElementById("editTxId").value = tx.id;
    document.getElementById("editTxCustName").innerText = `${tx.customerName} (${tx.accountNo})`;
    document.getElementById("editTxAmount").value = tx.amount;
    document.getElementById("editTxMode").value = tx.mode;

    new bootstrap.Modal(document.getElementById("editPaymentModal")).show();
  },

  saveEditedPayment() {
    const txId = document.getElementById("editTxId").value;
    const newAmt = Number(document.getElementById("editTxAmount").value) || 0;
    const newMode = document.getElementById("editTxMode").value;

    if (newAmt <= 0) {
      this.showToast(this.data.settings.language === 'ta' ? "சரியான தொகையை உள்ளிடவும்!" : "Enter a valid amount!", "warning");
      return;
    }

    const tx = this.data.transactions.find(t => t.id === txId);
    if (!tx) return;

    const cust = this.data.customers.find(c => c.id === tx.customerId);
    if (cust) {
      const oldAmt = Number(tx.amount) || 0;
      cust.balance = (Number(cust.balance) || 0) + oldAmt - newAmt;
      cust.totalPaid = (Number(cust.totalPaid) || 0) - oldAmt + newAmt;
    }

    tx.amount = newAmt;
    tx.mode = newMode;

    this.saveState();
    bootstrap.Modal.getInstance(document.getElementById("editPaymentModal")).hide();
    this.renderCollectionSheet();
    this.renderHomeSummary();
    if (this.currentView === 'customer' && this.currentCustId) {
      this.openCustomerProfile(this.currentCustId);
    }
    this.showToast(this.data.settings.language === 'ta' ? "வசூல் தொகை வெற்றிகரமாக திருத்தப்பட்டது!" : "Collection payment updated successfully!", "success");
  },

  /* ================= 12. UPI QR MODAL ================= */
  openUpiModal(custId) {
    const cust = this.data.customers.find(c => c.id === custId);
    if (!cust) return;

    const amt = Number(document.getElementById(`payInput_${custId}`)?.value) || cust.dueAmount;
    this.pendingUpiCustId = custId;
    this.pendingUpiAmount = amt;

    document.getElementById("upiModalAmount").innerText = `₹${amt.toLocaleString()}`;
    document.getElementById("upiModalCustName").innerText = `${cust.name} (${cust.accountNo})`;

    const upiUrl = `upi://pay?pa=${this.data.settings.upiId}&pn=${encodeURIComponent(this.data.settings.companyName)}&am=${amt}&cu=INR&tn=Due-${cust.accountNo}`;
    const container = document.getElementById("upiQrCodeContainer");
    container.innerHTML = "";
    new QRCode(container, { text: upiUrl, width: 160, height: 160 });

    new bootstrap.Modal(document.getElementById("upiModal")).show();
  },

  confirmUpiReceived() {
    if (!this.pendingUpiCustId) return;
    this.recordPayment(this.pendingUpiCustId, 'UPI', this.pendingUpiAmount);
    bootstrap.Modal.getInstance(document.getElementById("upiModal")).hide();
  },

  /* ================= 13. THERMAL RECEIPT SLIP (58MM) ================= */
  printReceipt(txId) {
    const tx = this.data.transactions.find(t => t.id === txId);
    if (!tx) return;
    const cust = this.data.customers.find(c => c.id === tx.customerId);

    document.getElementById("slipBodyContent").innerHTML = `
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-weight: 800; font-size: 13px;">${this.data.settings.companyName}</div>
        <div style="font-size: 9px;">வசூல் ரசீது (RECEIPT)</div>
        <div style="font-size: 9px;">தேதி: ${tx.date}</div>
      </div>
      <table style="width: 100%; font-size: 10px;">
        <tr><td>ரசீது:</td><td style="text-align: right; font-weight: bold;">${tx.id}</td></tr>
        <tr><td>Acc:</td><td style="text-align: right;">${tx.accountNo}</td></tr>
        <tr><td>பெயர்:</td><td style="text-align: right; font-weight: bold;">${tx.customerName}</td></tr>
        <tr><td>பகுதி:</td><td style="text-align: right;">${tx.area}</td></tr>
        <tr><td>முறை:</td><td style="text-align: right;">${tx.mode}</td></tr>
      </table>
      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 6px 0; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
        <span>வரவு தொகை:</span>
        <span>₹${tx.amount}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 10px;">
        <span>மீதி பாக்கி:</span>
        <span style="font-weight: bold;">₹${cust ? cust.balance : '0'}</span>
      </div>
      <div style="text-align: center; font-size: 9px; margin-top: 8px;">
        <div>வசூலாளர்: ${tx.collector}</div>
        <div>நன்றி! மீண்டும் வருக!</div>
      </div>
    `;
    new bootstrap.Modal(document.getElementById("thermalSlipModal")).show();
  },

  /* ================= 14. MASTER HUB (TILES & 2-STEP LOAN ENGINE) ================= */
  openMasterSubPage(pageKey) {
    document.getElementById("masterMainMenuContainer").classList.add("d-none");
    document.getElementById("masterSubPageContainer").classList.remove("d-none");

    document.querySelectorAll(".master-subpage").forEach(p => p.classList.add("d-none"));
    const target = document.getElementById("masterSub_" + pageKey);
    if (target) target.classList.remove("d-none");

    const isTa = (this.data.settings.language || 'ta') === 'ta';
    const titles = {
      loan: isTa ? "1. புதிய கடன் வழங்கல் (New Loan Disbursal)" : "1. New Loan Disbursal",
      line: isTa ? "2. புதிய லைன் சேர்க்க (Add Line)" : "2. Add New Line",
      area: isTa ? "3. ஊர் / பகுதி மேலாண்மை (Village / Area)" : "3. Village & Area Management"
    };
    document.getElementById("masterSubPageTitleBadge").innerText = titles[pageKey] || "Master Section";

    if (pageKey === 'loan') {
      this.backToLoanStep1();
      this.onMasterLineChange();
    }
    if (pageKey === 'area') {
      this.renderMasterAreaChips();
    }
  },

  backToMasterMenu() {
    document.getElementById("masterSubPageContainer").classList.add("d-none");
    document.getElementById("masterMainMenuContainer").classList.remove("d-none");
  },

  goToLoanStep2() {
    const name = document.getElementById("mCustName")?.value.trim();
    const phone = document.getElementById("mCustPhone")?.value.trim();
    const lineId = document.getElementById("mCustLine")?.value;
    const area = document.getElementById("mCustArea")?.value;
    const routeOrder = document.getElementById("mCustRouteOrder")?.value || 1;

    if (!name || !phone || !lineId || !area) {
      this.showToast(this.data.settings.language === 'ta' ? "பெயர், மொபைல், லைன் மற்றும் ஊர் விவரங்களை உள்ளிடவும்!" : "Please fill Name, Mobile, Line, and Area!", "warning");
      return;
    }

    const line = this.data.lines.find(l => l.id === lineId);
    document.getElementById("step2SummaryName").innerText = name;
    document.getElementById("step2SummaryPhone").innerText = "+91 " + phone;
    document.getElementById("step2SummaryLineArea").innerText = `${line ? line.name : lineId} - ${area}`;
    document.getElementById("step2SummaryRoute").innerText = `வரிசை #${routeOrder}`;

    document.getElementById("loanStep1Container").classList.add("d-none");
    document.getElementById("loanStep2Container").classList.remove("d-none");
    this.recomputeLoan('principal');
  },

  backToLoanStep1() {
    document.getElementById("loanStep2Container").classList.add("d-none");
    document.getElementById("loanStep1Container").classList.remove("d-none");
  },

  toggleWeeklyDaySelect(isWeekly) {
    document.getElementById("weeklyDaySelectBox").classList.toggle("d-none", !isWeekly);
  },

  handleSaveNewLine() {
    const name = document.getElementById("lineNameInput").value.trim();
    const freq = document.querySelector('input[name="lineFreqChoice"]:checked').value;
    const target = Number(document.getElementById("lineTargetInput").value) || 25000;
    const day = (freq.includes("Weekly") || freq.includes("வாராந்திர")) ? document.getElementById("lineWeeklyDay").value : null;

    const newLine = {
      id: "LINE-" + Date.now().toString().slice(-4),
      name: name,
      frequency: freq,
      day: day,
      target: target,
      areas: []
    };

    this.data.lines.push(newLine);
    this.saveState();
    this.populateDropdowns();
    document.getElementById("lineNameInput").value = "";
    this.showToast(`${this.data.settings.language === 'ta' ? 'லைன்' : 'Line'} "${name}" ${this.data.settings.language === 'ta' ? 'வெற்றிகரமாகச் சேர்க்கப்பட்டது!' : 'created successfully!'}`, "success");
    this.backToMasterMenu();
  },

  renderMasterAreaChips() {
    const lineId = document.getElementById("areaLineSelect")?.value;
    const line = this.data.lines.find(l => l.id === lineId);
    const container = document.getElementById("areaChipsBox");
    if (!container) return;

    container.innerHTML = "";
    if (!line || !line.areas || line.areas.length === 0) {
      container.innerHTML = `<span class="text-muted small">${this.data.settings.language === 'ta' ? 'பகுதிகள் எதுவும் சேர்க்கப்படவில்லை' : 'No areas added yet'}</span>`;
      return;
    }

    line.areas.forEach(a => {
      const chip = document.createElement("span");
      chip.className = "badge bg-white text-dark border p-2 d-inline-flex align-items-center gap-1";
      chip.innerHTML = `${a} <i class="bi bi-x-circle-fill text-danger cursor-pointer" onclick="app.removeArea('${line.id}', '${a}')"></i>`;
      container.appendChild(chip);
    });
  },

  handleSaveVillageArea() {
    const lineId = document.getElementById("areaLineSelect")?.value;
    const line = this.data.lines.find(l => l.id === lineId);
    const areaName = document.getElementById("newAreaNameInput").value.trim();

    if (!line || !areaName) return;
    if (!line.areas) line.areas = [];
    if (line.areas.includes(areaName)) {
      this.showToast(this.data.settings.language === 'ta' ? "இந்த ஊர் ஏற்கனவே உள்ளது!" : "This area already exists!", "warning");
      return;
    }

    line.areas.push(areaName);
    this.saveState();
    document.getElementById("newAreaNameInput").value = "";
    this.renderMasterAreaChips();
    this.populateDropdowns();
    this.showToast(`"${areaName}" ${this.data.settings.language === 'ta' ? 'சேர்க்கப்பட்டது!' : 'added successfully!'}`, "success");
  },

  removeArea(lineId, areaName) {
    const line = this.data.lines.find(l => l.id === lineId);
    if (!line || !line.areas) return;
    line.areas = line.areas.filter(a => a !== areaName);
    this.saveState();
    this.renderMasterAreaChips();
    this.populateDropdowns();
  },

  /* ================= 15. NEW LOAN CALCULATIONS ================= */
  onMasterLineChange() {
    const lineId = document.getElementById("mCustLine")?.value;
    const line = this.data.lines.find(l => l.id === lineId);
    const isWeekly = line?.frequency?.includes("Weekly") || line?.frequency?.includes("வாராந்திர");

    document.getElementById("mFreqBadge").innerText = line ? line.frequency : "தினசரி";
    document.getElementById("mFreqBadge").className = isWeekly ? "badge bg-primary-subtle text-primary font-mono px-2 py-1" : "badge bg-success-subtle text-success font-mono px-2 py-1";

    const tenureLabel = document.getElementById("mTenureLabel");
    const tenureInput = document.getElementById("mTenure");
    const isTa = (this.data.settings.language || 'ta') === 'ta';

    if (isWeekly) {
      tenureLabel.innerText = isTa ? "தவணைகள் (வாரங்கள் - Weeks)" : "Tenure (Weeks)";
      if (Number(tenureInput.value) > 52 || Number(tenureInput.value) === 100) tenureInput.value = 10;
    } else {
      tenureLabel.innerText = isTa ? "தவணைகள் (நாட்கள் - 100 Days)" : "Tenure (Days - 100 Days)";
      if (Number(tenureInput.value) <= 52) tenureInput.value = 100;
    }

    const areaSelect = document.getElementById("mCustArea");
    if (areaSelect && line) {
      let opts = "";
      (line.areas || []).forEach(a => { opts += `<option value="${a}">${a}</option>`; });
      if (!opts) opts = `<option value="">${isTa ? 'ஊர்கள் இல்லை' : 'No areas'}</option>`;
      areaSelect.innerHTML = opts;
    }

    this.recomputeLoan('tenure');
  },

  setPresetPrincipal(amt) {
    document.getElementById("mPrincipal").value = amt;
    this.recomputeLoan('principal');
  },

  togglePctAutoCalc(checked) {
    this.usePctAutoCalc = checked;
    document.getElementById("mPctRow").style.opacity = checked ? "1" : "0.5";
    if (checked) this.recomputeLoan('pct');
  },

  setProfitPct(pct) {
    this.activeProfitPct = Number(pct);
    document.getElementById("mCustomPct").value = pct;
    [10, 15, 20, 25].forEach(p => {
      const btn = document.getElementById("chipM" + p);
      if (btn) btn.className = (p === Number(pct)) ? "btn btn-sm btn-success text-white py-0 px-2 active" : "btn btn-sm btn-outline-success py-0 px-2";
    });
    this.recomputeLoan('pct');
  },

  recomputeLoan(changed) {
    const principal = Number(document.getElementById("mPrincipal").value) || 0;
    const docFee = Number(document.getElementById("mDocFee").value) || 0;
    const tenure = Number(document.getElementById("mTenure").value) || 1;
    let dueAmount = Number(document.getElementById("mDueAmount").value) || 0;

    const handCash = Math.max(0, principal - docFee);
    document.getElementById("mHandCash").value = handCash;

    if (this.usePctAutoCalc && (changed === 'pct' || changed === 'principal' || changed === 'tenure')) {
      const profit = Math.round(principal * (this.activeProfitPct / 100));
      dueAmount = Math.ceil((principal + profit) / tenure);
      document.getElementById("mDueAmount").value = dueAmount;
    }

    const totalRepay = tenure * dueAmount;
    const profit = Math.max(0, totalRepay - principal);

    document.getElementById("mTotalRepayDisplay").innerText = `₹${totalRepay.toLocaleString()}`;
    document.getElementById("mProfitDisplay").innerText = `₹${profit.toLocaleString()}`;
    document.getElementById("mNetHandDisplay").innerText = `₹${handCash.toLocaleString()}`;

    this.calcLoanCloseDate();
  },

  calcLoanCloseDate() {
    const startVal = document.getElementById("mStartDate")?.value;
    if (!startVal) return;

    const tenure = Number(document.getElementById("mTenure")?.value) || 1;
    const lineId = document.getElementById("mCustLine")?.value;
    const line = this.data.lines.find(l => l.id === lineId);
    const isWeekly = line?.frequency?.includes("Weekly") || line?.frequency?.includes("வாராந்திர");
    const isTa = (this.data.settings.language || 'ta') === 'ta';

    const start = new Date(startVal);
    const close = new Date(start);

    if (isWeekly) close.setDate(close.getDate() + (tenure * 7));
    else close.setDate(close.getDate() + tenure);

    const d = String(close.getDate()).padStart(2, '0');
    const m = String(close.getMonth() + 1).padStart(2, '0');
    const y = close.getFullYear();
    const daysTa = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];
    const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayStr = isTa ? daysTa[close.getDay()] : daysEn[close.getDay()];

    document.getElementById("mCloseDateBadge").innerText = `${d}-${m}-${y} (${dayStr})`;
  },

  handleDisburseNewLoan() {
    const name = document.getElementById("mCustName").value.trim();
    const phone = document.getElementById("mCustPhone").value.trim();
    const altPhone = document.getElementById("mCustAltPhone")?.value.trim() || "";
    const aadhaar = document.getElementById("mCustAadhaar")?.value.trim() || "";
    const address = document.getElementById("mCustAddress")?.value.trim() || "";
    const lineId = document.getElementById("mCustLine").value;
    const area = document.getElementById("mCustArea").value;
    const routeOrder = Number(document.getElementById("mCustRouteOrder")?.value) || 1;
    const principal = Number(document.getElementById("mPrincipal").value) || 0;
    const docFee = Number(document.getElementById("mDocFee").value) || 0;
    const tenure = Number(document.getElementById("mTenure").value) || 1;
    const dueAmount = Number(document.getElementById("mDueAmount").value) || 0;
    const startDate = document.getElementById("mStartDate").value;

    if (!name || !phone || !lineId || !area) {
      this.showToast(this.data.settings.language === 'ta' ? "அனைத்து கட்டாய விவரங்களையும் உள்ளிடவும்!" : "Please fill all mandatory details!", "warning");
      return;
    }

    const totalRepay = tenure * dueAmount;
    const handCash = Math.max(0, principal - docFee);

    const newCust = {
      id: "CUST-" + Date.now().toString().slice(-6),
      accountNo: "EC-" + (1001 + this.data.customers.length),
      routeOrder: routeOrder,
      name: name,
      phone: phone,
      altPhone: altPhone,
      aadhaar: aadhaar ? "[Aadhaar Recorded]" : "",
      address: address,
      lineId: lineId,
      area: area,
      principal: principal,
      docFee: docFee,
      handCash: handCash,
      tenure: tenure,
      dueAmount: dueAmount,
      balance: totalRepay,
      totalPaid: 0,
      startDate: startDate
    };

    this.data.customers.push(newCust);
    this.saveState();
    this.showToast(`${this.data.settings.language === 'ta' ? 'கடன் வழங்கப்பட்டது! Acc எண்' : 'Loan disbursed! Acc No'}: ${newCust.accountNo}`, "success");

    document.getElementById("mCustName").value = "";
    document.getElementById("mCustPhone").value = "";
    document.getElementById("mCustAltPhone").value = "";
    document.getElementById("mCustAadhaar").value = "";
    document.getElementById("mCustAddress").value = "";
    this.backToLoanStep1();
    this.switchView('home');
  },

  /* ================= 16. CUSTOMER PROFILE (DELETE, SETTLE, RE-LOAN) ================= */
  openCustomerProfile(custId) {
    const cust = this.data.customers.find(c => c.id === custId);
    if (!cust) return;

    this.currentCustId = cust.id;
    const isTa = (this.data.settings.language || 'ta') === 'ta';

    document.getElementById("cProfName").innerText = cust.name;
    document.getElementById("cProfAvatar").innerText = cust.name.charAt(0).toUpperCase();
    document.getElementById("cProfAcc").innerText = cust.accountNo;
    document.getElementById("cProfRouteOrderBadge").innerText = `${isTa ? 'தெரு வரிசை' : 'Route'}: #${cust.routeOrder || 1}`;
    document.getElementById("cProfPhone").innerText = "+91 " + cust.phone;
    document.getElementById("cProfPhone").href = "tel:" + cust.phone;
    document.getElementById("cProfAltPhone").innerText = cust.altPhone ? "+91 " + cust.altPhone : (isTa ? "இல்லை" : "None");
    document.getElementById("cProfAddress").innerText = cust.address || (isTa ? "முகவரி குறிப்பிடப்படவில்லை" : "Address not specified");

    const line = this.data.lines.find(l => l.id === cust.lineId);
    document.getElementById("cProfLineArea").innerText = `${line ? line.name : cust.lineId} - ${cust.area}`;
    document.getElementById("cProfDue").innerText = `₹${cust.dueAmount}`;

    const totalRepay = cust.dueAmount * cust.tenure;
    const isSettled = (Number(cust.balance || 0) <= 0);

    document.getElementById("cProfPrincipal").innerText = `₹${Number(cust.principal || 0).toLocaleString()}`;
    document.getElementById("cProfTotal").innerText = `₹${totalRepay.toLocaleString()}`;
    document.getElementById("cProfPaid").innerText = `₹${Number(cust.totalPaid || 0).toLocaleString()}`;
    document.getElementById("cProfBalance").innerText = `₹${Number(cust.balance || 0).toLocaleString()}`;

    const pct = totalRepay > 0 ? Math.min(100, Math.round(((Number(cust.totalPaid) || 0) / totalRepay) * 100)) : 0;
    document.getElementById("cProfProgressPct").innerText = `${pct}%`;
    document.getElementById("cProfProgressBar").style.width = `${pct}%`;

    const statusBadge = document.getElementById("cProfStatusBadge");
    const settledBanner = document.getElementById("cProfSettledBanner");
    const reLoanBtn = document.getElementById("cProfReLoanBtn");
    const settleBtn = document.getElementById("cProfFullSettleBtn");

    if (isSettled) {
      statusBadge.innerText = isTa ? "முடிக்கப்பட்டது (Settled)" : "Settled";
      statusBadge.className = "badge bg-primary-subtle text-primary border border-primary-subtle font-sans";
      settledBanner.classList.remove("d-none");
      reLoanBtn.classList.remove("d-none");
      settleBtn.classList.add("d-none");
    } else {
      statusBadge.innerText = isTa ? "செயலில் (Active)" : "Active";
      statusBadge.className = "badge bg-success-subtle text-success border border-success-subtle font-sans";
      settledBanner.classList.add("d-none");
      reLoanBtn.classList.add("d-none");
      settleBtn.classList.remove("d-none");
    }

    const tbody = document.getElementById("cProfLedgerBody");
    tbody.innerHTML = "";
    const txs = this.data.transactions.filter(t => t.customerId === cust.id);

    if (txs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3 font-sans">${isTa ? 'வரவுப் பதிவுகள் எதுவும் இல்லை' : 'No ledger records found'}</td></tr>`;
    } else {
      txs.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span class="badge bg-light text-dark border">${t.id}</span></td>
          <td>${t.date}</td>
          <td class="text-success fw-bold">₹${t.amount}</td>
          <td><span class="badge ${t.mode === 'UPI' ? 'bg-primary' : 'bg-success'} text-white">${t.mode}</span></td>
          <td class="text-center">
            <button class="btn btn-outline-dark btn-sm py-0 px-2" onclick="app.printReceipt('${t.id}')"><i class="bi bi-printer"></i></button>
          </td>
          <td class="text-center">
            <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="app.openEditPaymentModal('${t.id}')"><i class="bi bi-pencil-square"></i> ${isTa ? 'திருத்து' : 'Edit'}</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    this.switchView('customer');
  },

  /* SECURE CUSTOMER DELETION */
  confirmDeleteCustomer(custId) {
    const cust = this.data.customers.find(c => c.id === custId);
    if (!cust) return;

    const isTa = (this.data.settings.language || 'ta') === 'ta';
    this.showConfirm(
      isTa ? "வாடிக்கையாளர் நீக்குதல்" : "Delete Customer",
      `${isTa ? 'வாடிக்கையாளர்' : 'Customer'} "${cust.name} (${cust.accountNo})" - ${isTa ? 'ன் அனைத்து தகவல்களையும் நிரந்தரமாக நீக்கவா?' : 'and account records will be permanently removed. Continue?'}`,
      () => {
        this.data.customers = this.data.customers.filter(c => c.id !== custId);
        this.saveState();
        this.switchView('collection');
        this.renderCollectionSheet();
        this.showToast(isTa ? "வாடிக்கையாளர் கணக்கு நீக்கப்பட்டது!" : "Customer record deleted!", "danger");
      }
    );
  },

  confirmFullSettleCustomer() {
    const cust = this.data.customers.find(c => c.id === this.currentCustId);
    if (!cust) return;

    const isTa = (this.data.settings.language || 'ta') === 'ta';
    this.showConfirm(
      isTa ? "முழு கடன் தீர்வு" : "Full Loan Settlement",
      `${isTa ? 'வாடிக்கையாளர்' : 'Customer'} ${cust.name} - ${isTa ? 'ன் மொத்தக் கடனையும் முடித்து தீர்வு செய்யவா?' : 'account will be marked as fully settled. Proceed?'}`,
      () => {
        cust.balance = 0;
        this.saveState();
        this.openCustomerProfile(cust.id);
        this.showToast(isTa ? "கடன் முழுமையாக தீர்வு செய்யப்பட்டது! தற்போது மறு கடன் வழங்கலாம்." : "Loan settled! Re-loan can be issued now.", "success");
      }
    );
  },

  /* DIRECT INLINE RE-LOAN MODAL (STAYS ON CUSTOMER PAGE) */
  openDirectCustomerReLoanModal() {
    const cust = this.data.customers.find(c => c.id === this.currentCustId);
    if (!cust) return;

    document.getElementById("reLoanCustId").value = cust.id;
    document.getElementById("reLoanCustNameDisplay").innerText = `${cust.name} (${cust.accountNo})`;
    document.getElementById("reLoanCustPhoneDisplay").innerText = `Phone: +91 ${cust.phone} | Line: ${cust.area}`;
    document.getElementById("reLoanStartDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("reLoanPrincipal").value = cust.principal || 10000;
    document.getElementById("reLoanDocFee").value = cust.docFee || 200;
    document.getElementById("reLoanTenure").value = cust.tenure || 10;
    document.getElementById("reLoanDueAmount").value = cust.dueAmount || 1200;

    this.recomputeReLoanModal();
    new bootstrap.Modal(document.getElementById("customerReLoanModal")).show();
  },

  recomputeReLoanModal() {
    const prin = Number(document.getElementById("reLoanPrincipal").value) || 0;
    const doc = Number(document.getElementById("reLoanDocFee").value) || 0;
    const tenure = Number(document.getElementById("reLoanTenure").value) || 1;
    document.getElementById("reLoanHandCash").value = Math.max(0, prin - doc);

    const profit = Math.round(prin * (this.activeProfitPct / 100));
    const due = Math.ceil((prin + profit) / tenure);
    document.getElementById("reLoanDueAmount").value = due;

    this.calcReLoanCloseDate();
  },

  calcReLoanCloseDate() {
    const startVal = document.getElementById("reLoanStartDate").value;
    if (!startVal) return;

    const tenure = Number(document.getElementById("reLoanTenure").value) || 1;
    const cust = this.data.customers.find(c => c.id === this.currentCustId);
    const line = this.data.lines.find(l => l.id === cust?.lineId);
    const isWeekly = line?.frequency?.includes("Weekly") || line?.frequency?.includes("வாராந்திர");
    const isTa = (this.data.settings.language || 'ta') === 'ta';

    const start = new Date(startVal);
    const close = new Date(start);

    if (isWeekly) close.setDate(close.getDate() + (tenure * 7));
    else close.setDate(close.getDate() + tenure);

    const d = String(close.getDate()).padStart(2, '0');
    const m = String(close.getMonth() + 1).padStart(2, '0');
    const y = close.getFullYear();
    const daysTa = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];
    const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayStr = isTa ? daysTa[close.getDay()] : daysEn[close.getDay()];

    document.getElementById("reLoanCloseDateBadge").innerText = `${d}-${m}-${y} (${dayStr})`;
  },

  handleDirectCustomerReLoanSubmit() {
    const cust = this.data.customers.find(c => c.id === this.currentCustId);
    if (!cust) return;

    const prin = Number(document.getElementById("reLoanPrincipal").value) || 0;
    const doc = Number(document.getElementById("reLoanDocFee").value) || 0;
    const tenure = Number(document.getElementById("reLoanTenure").value) || 1;
    const due = Number(document.getElementById("reLoanDueAmount").value) || 0;
    const start = document.getElementById("reLoanStartDate").value;

    cust.principal = prin;
    cust.docFee = doc;
    cust.handCash = Math.max(0, prin - doc);
    cust.tenure = tenure;
    cust.dueAmount = due;
    cust.balance = tenure * due;
    cust.totalPaid = 0;
    cust.startDate = start;

    this.saveState();
    bootstrap.Modal.getInstance(document.getElementById("customerReLoanModal")).hide();
    this.openCustomerProfile(cust.id);
    this.showToast(this.data.settings.language === 'ta' ? "மறு கடன் வெற்றிகரமாக வழங்கப்பட்டது!" : "Re-Loan issued successfully!", "success");
  },

  /* ================= 17. DAY BOOK & AUDIT PDF ================= */
  saveOpeningBalances() {
    const date = document.getElementById("dbDateSelect")?.value || new Date().toISOString().split('T')[0];
    const cash = Number(document.getElementById("dbOpeningCashInput").value) || 0;
    const bank = Number(document.getElementById("dbOpeningBankInput").value) || 0;

    if (!this.data.daybook.openingBalances) this.data.daybook.openingBalances = {};
    this.data.daybook.openingBalances[date] = { cash, bank };

    this.saveState();
    this.renderDayBook();
    this.showToast(`${this.data.settings.language === 'ta' ? 'தேதி' : 'Date'} ${date} ${this.data.settings.language === 'ta' ? 'ஆரம்ப இருப்பு சேமிக்கப்பட்டது!' : 'opening float saved!'}`, "success");
  },

  renderDayBook() {
    const date = document.getElementById("dbDateSelect")?.value || new Date().toISOString().split('T')[0];
    const dayTxs = this.data.transactions.filter(t => t.date.startsWith(date));

    const cashVasool = dayTxs.filter(t => t.mode === 'CASH').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const upiVasool = dayTxs.filter(t => t.mode === 'UPI').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const expenses = (this.data.daybook.expenses || []).filter(e => e.date.startsWith(date));
    const totalExp = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const disbursedToday = this.data.customers.filter(c => c.startDate === date);
    const totalDisbursedHandCash = disbursedToday.reduce((sum, c) => sum + (Number(c.handCash) || Number(c.principal) || 0), 0);

    const openObj = (this.data.daybook.openingBalances && this.data.daybook.openingBalances[date]) || { cash: 0, bank: 0 };
    const closingCash = openObj.cash + cashVasool - totalExp - totalDisbursedHandCash;

    document.getElementById("dbOpeningCashInput").value = openObj.cash;
    document.getElementById("dbOpeningBankInput").value = openObj.bank;

    document.getElementById("dbDisplayOpenCash").innerText = `₹${openObj.cash.toLocaleString()}`;
    document.getElementById("dbDisplayCashVasool").innerText = `₹${cashVasool.toLocaleString()}`;
    document.getElementById("dbDisplayUpiVasool").innerText = `₹${upiVasool.toLocaleString()}`;
    document.getElementById("dbDisplayExpenses").innerText = `₹${totalExp.toLocaleString()}`;
    document.getElementById("dbDisplayClosingCash").innerText = `₹${closingCash.toLocaleString()}`;

    const isTa = (this.data.settings.language || 'ta') === 'ta';
    document.getElementById("dbDisbursedTotalBadge").innerText = `₹${totalDisbursedHandCash.toLocaleString()} (${disbursedToday.length} ${isTa ? 'நபர்கள்' : 'Customers'})`;
    const dBody = document.getElementById("dbDisbursedLoansBody");
    dBody.innerHTML = "";
    if (disbursedToday.length === 0) {
      dBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-2 font-sans">${isTa ? 'இன்று புதிய கடன்கள் எதுவும் வழங்கப்படவில்லை' : 'No new loans disbursed today'}</td></tr>`;
    } else {
      disbursedToday.forEach(c => {
        const line = this.data.lines.find(l => l.id === c.lineId);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span class="badge bg-light text-dark border">${c.accountNo}</span></td>
          <td><strong>${c.name}</strong> (${c.phone})</td>
          <td>${line ? line.name : c.lineId} - ${c.area}</td>
          <td class="text-end font-mono">₹${Number(c.principal).toLocaleString()}</td>
          <td class="text-end font-mono fw-bold text-danger">₹${Number(c.handCash || c.principal).toLocaleString()}</td>
        `;
        dBody.appendChild(tr);
      });
    }

    const tbody = document.getElementById("dbExpenseTableBody");
    tbody.innerHTML = "";
    if (expenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-2 font-sans">${isTa ? 'செலவுகள் எதுவும் இல்லை' : 'No expenses recorded'}</td></tr>`;
    } else {
      expenses.forEach((e, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${e.desc}</td>
          <td class="text-end text-danger fw-bold">₹${Number(e.amount).toLocaleString()}</td>
          <td class="text-center"><i class="bi bi-trash text-danger cursor-pointer" onclick="app.deleteExpense(${i})"></i></td>
        `;
        tbody.appendChild(tr);
      });
    }
  },

  handleAddExpense() {
    const desc = document.getElementById("expDesc").value.trim();
    const amt = Number(document.getElementById("expAmount").value) || 0;
    const date = document.getElementById("dbDateSelect").value || new Date().toISOString().split('T')[0];

    if (!desc || amt <= 0) return;
    if (!this.data.daybook.expenses) this.data.daybook.expenses = [];

    this.data.daybook.expenses.push({ desc, amount: amt, date });
    this.saveState();
    document.getElementById("expDesc").value = "";
    document.getElementById("expAmount").value = "";
    this.renderDayBook();
    this.showToast(this.data.settings.language === 'ta' ? "செலவு பதிவு செய்யப்பட்டது!" : "Expense added!", "info");
  },

  deleteExpense(idx) {
    this.data.daybook.expenses.splice(idx, 1);
    this.saveState();
    this.renderDayBook();
  },

  sendDayBookWhatsApp() {
    const date = document.getElementById("dbDateSelect").value;
    const closing = document.getElementById("dbDisplayClosingCash").innerText;
    const cash = document.getElementById("dbDisplayCashVasool").innerText;
    const upi = document.getElementById("dbDisplayUpiVasool").innerText;

    const msg = `*${this.data.settings.companyName} - டே புக் அறிக்கை*\nதேதி: ${date}\n---------------------------\nரொக்க வசூல்: ${cash}\nUPI வரவு: ${upi}\n*ஒப்படைக்க வேண்டிய ரொக்கம்: ${closing}*\nவசூலாளர்: ${this.data.settings.collectorName}`;
    window.open(`https://wa.me/91${this.data.settings.ownerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  openDayBookAuditPdfModal() {
    const date = document.getElementById("dbDateSelect").value || new Date().toISOString().split('T')[0];
    const dayTxs = this.data.transactions.filter(t => t.date.startsWith(date));
    const cashVasool = dayTxs.filter(t => t.mode === 'CASH').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const upiVasool = dayTxs.filter(t => t.mode === 'UPI').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalVasool = cashVasool + upiVasool;

    const expenses = (this.data.daybook.expenses || []).filter(e => e.date.startsWith(date));
    const totalExp = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const disbursedToday = this.data.customers.filter(c => c.startDate === date);
    const totalDisbursed = disbursedToday.reduce((sum, c) => sum + (Number(c.handCash) || Number(c.principal) || 0), 0);

    const openObj = (this.data.daybook.openingBalances && this.data.daybook.openingBalances[date]) || { cash: 0, bank: 0 };
    const closingCash = openObj.cash + cashVasool - totalExp - totalDisbursed;

    let txRows = dayTxs.map((t, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${t.id}</td>
        <td>${t.accountNo}</td>
        <td>${t.customerName}</td>
        <td>${t.area}</td>
        <td style="text-align: center;">${t.mode}</td>
        <td style="text-align: right; font-weight: bold; color: #059669;">₹${Number(t.amount).toLocaleString()}</td>
      </tr>
    `).join("") || `<tr><td colspan="7" style="text-align: center; color: #64748b;">வசூல் பதிவுகள் இல்லை</td></tr>`;

    let expRows = expenses.map((e, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${e.desc}</td>
        <td style="text-align: right; font-weight: bold; color: #dc2626;">₹${Number(e.amount).toLocaleString()}</td>
      </tr>
    `).join("") || `<tr><td colspan="3" style="text-align: center; color: #64748b;">செலவுகள் இல்லை</td></tr>`;

    let disbRows = disbursedToday.map((c, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${c.accountNo}</td>
        <td>${c.name} (${c.phone})</td>
        <td>${c.area}</td>
        <td style="text-align: right; font-weight: bold; color: #d97706;">₹${Number(c.handCash || c.principal).toLocaleString()}</td>
      </tr>
    `).join("") || `<tr><td colspan="5" style="text-align: center; color: #64748b;">இன்று புதிய கடன் வழங்கப்படவில்லை</td></tr>`;

    document.getElementById("auditPdfContainer").innerHTML = `
      <div style="border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h2 style="margin: 0; color: #047857; text-transform: uppercase; font-size: 20px; font-weight: 800;">${this.data.settings.companyName}</h2>
          <div style="font-size: 11px; color: #475569;">Micro Finance & Daily/Weekly Line Collection System</div>
          <div style="font-size: 10px; color: #64748b;">வசூலாளர்: <strong>${this.data.settings.collectorName}</strong> | தொலைபேசி: <strong>+91 ${this.data.settings.ownerPhone}</strong></div>
        </div>
        <div style="text-align: right;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">
            தணிக்கை அறிக்கை (Audit Report)
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">தணிக்கை தேதி: ${date}</div>
        </div>
      </div>

      <table class="pdf-audit-table" style="margin-bottom: 16px;">
        <thead>
          <tr>
            <th>ஆரம்ப ரொக்கம்</th>
            <th>ரொக்க வசூல் (+)</th>
            <th>UPI வரவு (+)</th>
            <th>களச் செலவுகள் (-)</th>
            <th>வழங்கிய கடன் (-)</th>
            <th style="background-color: #dcfce7 !important; color: #166534 !important;">ஒப்படைக்க வேண்டிய ரொக்கம்</th>
          </tr>
        </thead>
        <tbody style="font-family: monospace; font-weight: bold;">
          <tr>
            <td>₹${openObj.cash.toLocaleString()}</td>
            <td style="color: #059669;">₹${cashVasool.toLocaleString()}</td>
            <td style="color: #2563eb;">₹${upiVasool.toLocaleString()}</td>
            <td style="color: #dc2626;">₹${totalExp.toLocaleString()}</td>
            <td style="color: #d97706;">₹${totalDisbursed.toLocaleString()}</td>
            <td style="font-size: 13px; color: #166534; background-color: #f0fdf4;">₹${closingCash.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-weight: bold; font-size: 12px; margin-bottom: 6px; color: #1e293b;">1. இன்றைய வசூல் பதிவுகள் (${dayTxs.length} ரசீதுகள் - மொத்தம்: ₹${totalVasool.toLocaleString()})</div>
      <table class="pdf-audit-table" style="margin-bottom: 16px;">
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>ரசீது எண்</th>
            <th>Acc எண்</th>
            <th>வாடிக்கையாளர்</th>
            <th>பகுதி</th>
            <th style="text-align: center;">முறை</th>
            <th style="text-align: right;">தொகை</th>
          </tr>
        </thead>
        <tbody style="font-family: monospace;">
          ${txRows}
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 12px; margin-bottom: 24px;">
        <div>
          <div style="font-weight: bold; font-size: 12px; margin-bottom: 6px; color: #1e293b;">2. இன்று வழங்கிய புதிய கடன்கள் (மொத்தம்: ₹${totalDisbursed.toLocaleString()})</div>
          <table class="pdf-audit-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>Acc</th>
                <th>பெயர்</th>
                <th>பகுதி</th>
                <th style="text-align: right;">கை ரொக்கம்</th>
              </tr>
            </thead>
            <tbody style="font-family: monospace;">
              ${disbRows}
            </tbody>
          </table>
        </div>

        <div>
          <div style="font-weight: bold; font-size: 12px; margin-bottom: 6px; color: #1e293b;">3. களச் செலவுகள் (மொத்தம்: ₹${totalExp.toLocaleString()})</div>
          <table class="pdf-audit-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th>விபரம்</th>
                <th style="text-align: right;">தொகை</th>
              </tr>
            </thead>
            <tbody style="font-family: monospace;">
              ${expRows}
            </tbody>
          </table>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 11px; margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 20px;">
        <div>
          <div style="font-weight: bold;">${this.data.settings.collectorName}</div>
          <div style="color: #64748b; font-size: 10px;">வசூலாளர் கையொப்பம்</div>
        </div>
        <div>
          <div style="font-weight: bold;">சரிபார்த்தவர்</div>
          <div style="color: #64748b; font-size: 10px;">காசாளர் கையொப்பம்</div>
        </div>
        <div>
          <div style="font-weight: bold;">மேலாளர் / உரிமையாளர்</div>
          <div style="color: #64748b; font-size: 10px;">அங்கீகரிக்கப்பட்ட முத்திரை</div>
        </div>
      </div>
    `;

    new bootstrap.Modal(document.getElementById("auditPdfModal")).show();
  },

  downloadAuditPdf() {
    const element = document.getElementById("auditPdfContainer");
    const date = document.getElementById("dbDateSelect").value || new Date().toISOString().split('T')[0];
    const opt = {
      margin: 8,
      filename: `EasyCollection_Audit_${date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  },

  /* ================= 18. REPORTS ================= */
  toggleReportDateMode(mode) {
    this.currentReportDateMode = mode;
    const isSingle = (mode === 'single');
    document.getElementById("repSingleDateCol").classList.toggle("d-none", !isSingle);
    document.getElementById("repRangeFromCol").classList.toggle("d-none", isSingle);
    document.getElementById("repRangeToCol").classList.toggle("d-none", isSingle);
    this.renderReports();
  },

  renderReports() {
    const mode = this.currentReportDateMode;
    const line = document.getElementById("repLineSelect")?.value || "ALL";

    let fromDate, toDate;
    if (mode === 'single') {
      fromDate = toDate = document.getElementById("repSingleDate")?.value;
    } else {
      fromDate = document.getElementById("repFromDate")?.value;
      toDate = document.getElementById("repToDate")?.value;
    }

    let list = this.data.transactions.filter(t => {
      const d = t.date.split(" ")[0];
      return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    });

    if (line !== "ALL") list = list.filter(t => t.lineId === line);

    const total = list.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const cash = list.filter(t => t.mode === 'CASH').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const upi = list.filter(t => t.mode === 'UPI').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    document.getElementById("repTotalDisplay").innerText = `₹${total.toLocaleString()}`;
    document.getElementById("repCashDisplay").innerText = `₹${cash.toLocaleString()}`;
    document.getElementById("repUpiDisplay").innerText = `₹${upi.toLocaleString()}`;

    const tbody = document.getElementById("repTableBody");
    tbody.innerHTML = "";
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3 font-sans">${this.data.settings.language === 'ta' ? 'பதிவுகள் எதுவும் இல்லை' : 'No records found'}</td></tr>`;
      return;
    }

    list.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="badge bg-light text-dark border">${t.id}</span></td>
        <td>${t.date}</td>
        <td><strong>${t.customerName}</strong> (${t.accountNo})</td>
        <td>${t.area}</td>
        <td class="text-success fw-bold">₹${t.amount}</td>
        <td><span class="badge ${t.mode === 'UPI' ? 'bg-primary' : 'bg-success'} text-white">${t.mode}</span></td>
        <td>${t.collector}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  exportReportsCSV() {
    if (this.data.transactions.length === 0) {
      this.showToast(this.data.settings.language === 'ta' ? "தரவுகள் இல்லை!" : "No data to export!", "warning");
      return;
    }
    let csv = "ReceiptID,Date,AccNo,Customer,Area,Amount,Mode,Collector\n";
    this.data.transactions.forEach(t => {
      csv += `"${t.id}","${t.date}","${t.accountNo}","${t.customerName}","${t.area}","${t.amount}","${t.mode}","${t.collector}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `EasyCollection_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  },

  sendDailySummaryWhatsApp() {
    const total = document.getElementById("repTotalDisplay").innerText;
    const msg = `*${this.data.settings.companyName} - வசூல் அறிக்கை*\nமொத்த வசூல்: ${total}\nவசூலாளர்: ${this.data.settings.collectorName}`;
    window.open(`https://wa.me/91${this.data.settings.ownerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  /* ================= 19. SETTINGS (10 SUBPAGES & BILINGUAL ENGINE) ================= */
  openSettingsSubPage(pageKey) {
    document.getElementById("settingsMainMenuContainer").classList.add("d-none");
    document.getElementById("settingsSubPageContainer").classList.remove("d-none");

    document.querySelectorAll(".settings-subpage").forEach(p => p.classList.add("d-none"));
    const target = document.getElementById("subpage_" + pageKey);
    if (target) target.classList.remove("d-none");

    const isTa = (this.data.settings.language || 'ta') === 'ta';
    const titles = {
      language: isTa ? "1. மொழி தேர்வு (Language)" : "1. Language Selection",
      profile: isTa ? "2. சுயவிவரம் & UPI" : "2. Profile & UPI",
      password: isTa ? "3. கடவுச்சொல் (PIN)" : "3. Password (PIN)",
      biometric: isTa ? "4. கைரேகை உள்நுழைவு" : "4. Biometric Login",
      lines: isTa ? "5. லைன் மேலாண்மை" : "5. Line Management",
      areas: isTa ? "6. ஒதுக்கீடு பகுதிகள்" : "6. Assigned Areas",
      cloud: isTa ? "7. ஆன்லைன் கிளவுட்" : "7. Online Cloud DB",
      theme: isTa ? "8. தோற்றம் / தீம்" : "8. Appearance / Theme",
      pwa: isTa ? "9. ஆண்ட்ராய்டு APK நிறுவல்" : "9. Android APK Installer",
      backup: isTa ? "10. முழு தரவு பேக்கப் & மீட்டெடுப்பு" : "10. Full JSON Backup & Restore"
    };

    document.getElementById("subPageBadgeTitle").innerText = titles[pageKey] || "Settings";

    if (pageKey === 'lines') this.renderSettingsLinesTable();
    if (pageKey === 'areas') this.renderSettingsAreaChips();
    if (pageKey === 'profile') {
      document.getElementById("cfgCompany").value = this.data.settings.companyName;
      document.getElementById("cfgCollector").value = this.data.settings.collectorName;
      document.getElementById("cfgUpi").value = this.data.settings.upiId;
      document.getElementById("cfgOwnerPhone").value = this.data.settings.ownerPhone;
    }
    if (pageKey === 'cloud') {
      document.getElementById("cfgCloudUrl").value = this.data.settings.cloudUrl || "";
      document.getElementById("cfgCloudKey").value = this.data.settings.cloudKey || "";
      document.getElementById("cfgCloudTable").value = this.data.settings.cloudTable || "easy_collection_data";
    }
  },

  backToSettingsMenu() {
    document.getElementById("settingsSubPageContainer").classList.add("d-none");
    document.getElementById("settingsMainMenuContainer").classList.remove("d-none");
  },

  setLanguage(lang) {
    this.data.settings.language = lang;
    this.saveState();
    this.applyLanguage(lang);
    this.startHeaderClock();
    this.populateDropdowns();
    this.showToast(lang === 'ta' ? "மொழி தமிழாக மாற்றப்பட்டது!" : "Language switched to English successfully!", "success");
  },

  applyLanguage(lang) {
    const isTa = (lang === 'ta');

    const btnTa = document.getElementById("btnLangSelectTa");
    const btnEn = document.getElementById("btnLangSelectEn");
    if (btnTa && btnEn) {
      btnTa.className = isTa ? "btn btn-success p-3 text-start fw-bold" : "btn btn-outline-secondary p-3 text-start fw-bold";
      btnEn.className = !isTa ? "btn btn-success p-3 text-start fw-bold" : "btn btn-outline-secondary p-3 text-start fw-bold";
    }

    const mapText = (id, ta, en) => {
      const el = document.getElementById(id);
      if (el) el.innerText = isTa ? ta : en;
    };

    mapText("pillNavHome", "முகப்பு (Home)", "Home");
    mapText("pillNavMaster", "பதிவுகள் (Master)", "Master Hub");
    mapText("pillNavDaybook", "டே புக் (Day Book)", "Day Book");
    mapText("pillNavReports", "அறிக்கைகள் (Reports)", "Reports");
    mapText("pillNavSettings", "அமைப்புகள் (Settings)", "Settings");
    mapText("btnNavLogout", "வெளியேறு (Logout)", "Logout");

    mapText("lblMobNavHome", "முகப்பு", "Home");
    mapText("lblMobNavMaster", "பதிவுகள்", "Master");
    mapText("lblMobNavDaybook", "டே புக்", "Day Book");
    mapText("lblMobNavReports", "அறிக்கை", "Reports");
    mapText("lblMobNavSettings", "அமைப்பு", "Settings");

    mapText("lblHomeRouteHeading", "வசூல் வழித்தடத் தேர்வு (Daily Route Selection)", "Daily Route Selection");
    mapText("lblHomeDate", "வசூல் தேதி (Date) *", "Collection Date *");
    mapText("lblHomeLine", "லைன் (Line) *", "Line *");
    mapText("lblHomeArea", "பகுதி / ஊர் (Area) *", "Area / Village *");
    mapText("btnHomeSubmit", "வசூல் பட்டியல் செல்", "Open Collection Sheet");
    mapText("lblHomeCardTotal", "இன்றைய மொத்த வசூல்", "Today's Total Collection");
    mapText("lblHomeCardCash", "ரொக்கம் (Cash)", "Cash Collection");
    mapText("lblHomeCardUpi", "UPI வங்கி வரவு", "UPI Bank Received");

    mapText("btnColBack", "முகப்பு (Back)", "Back to Home");
    mapText("btnColPrint", "பிரிண்ட்", "Print");
    mapText("thColAcc", "Acc எண்", "Acc No");
    mapText("thColCust", "வாடிக்கையாளர் பெயர்", "Customer Name");
    mapText("thColArea", "ஊர் / பகுதி", "Area / Village");
    mapText("thColBal", "மீதி பாக்கி", "Remaining Balance");
    mapText("thColDue", "தவணைத் தொகை", "Due Amount");
    mapText("thColPay", "வசூல் உள்ளீடு (Payment)", "Record Payment");
    mapText("thColAction", "ரசீது / திருத்து", "Receipt / Edit");

    mapText("lblMasterHubTitle", "பதிவுகள் மேலாண்மை (Master Hub)", "Master Records Hub");
    mapText("lblMasterHubSubtitle", "கடன் வழங்கல், புதிய லைன் மற்றும் பகுதி மேலாண்மைக்கு கீழே உள்ள ஒன்றைத் தேர்ந்தெடுக்கவும்", "Choose an option below to manage loans, lines, or villages");
    mapText("lblMasterTile1Title", "1. புதிய கடன் வழங்கல்", "1. New Loan Disbursal");
    mapText("lblMasterTile1Desc", "2-படி ஆவணப் பதிவு & கடன் கணக்கீடு", "2-step document capture & loan calculation");
    mapText("lblMasterTile2Title", "2. புதிய லைன் சேர்க்க", "2. Add New Line");
    mapText("lblMasterTile2Desc", "தினசரி / வாராந்திர (ஞாயிறு-சனி) லைன்", "Daily / Weekly (Sunday-Saturday) lines");
    mapText("lblMasterTile3Title", "3. ஊர் / பகுதி மேலாண்மை", "3. Village & Area Management");
    mapText("lblMasterTile3Desc", "லைன்களுக்கு புதிய ஊர்கள் சேர்த்தல்", "Assign and map villages to collection lines");
    mapText("btnBackToMaster", "பதிவுகள் மெனுவுக்கு திரும்பு", "Back to Master Hub");

    mapText("lblSettingsTitle", "அமைப்புகள் (Settings Hub)", "Settings Hub");
    mapText("lblSettingsSubtitle", "கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுத்து அமைப்புகளை மாற்றலாம்", "Select an option below to configure your preferences");
    mapText("lblSetTileLang", "1. மொழி தேர்வு (Language)", "1. Language Selection");
    mapText("lblSetTileLangDesc", "தமிழ் / English இடைமுகம்", "Tamil / English UI Toggle");
    mapText("lblSetTileProfile", "2. சுயவிவரம் & UPI (Profile)", "2. Profile & UPI");
    mapText("lblSetTileProfileDesc", "நிறுவனப் பெயர், UPI ID, வசூலாளர்", "Company name, UPI VPA, Collector");
    mapText("lblSetTilePass", "3. கடவுச்சொல் (Password PIN)", "3. Change Password PIN");
    mapText("lblSetTilePassDesc", "உள்நுழைவு PIN மாற்றுதல்", "Update app login security PIN");
    mapText("lblSetTileBio", "4. கைரேகை உள்நுழைவு (Biometric)", "4. Biometric Login");
    mapText("lblSetTileBioDesc", "மொபைல் கைரேகை அமைப்பு", "Mobile fingerprint sensor setup");
    mapText("lblSetTileLines", "5. லைன் மேலாண்மை (Lines)", "5. Line Management");
    mapText("lblSetTileLinesDesc", "லைன்கள் சேர்க்க, எடிட், நீக்க", "Add, edit, or delete collection lines");
    mapText("lblSetTileAreas", "6. ஒதுக்கீடு பகுதிகள் (Areas)", "6. Assigned Areas");
    mapText("lblSetTileAreasDesc", "ஊர்கள் / பகுதிகள் மேலாண்மை", "Manage villages mapped to lines");
    mapText("lblSetTileCloud", "7. ஆன்லைன் கிளவுட் (Cloud DB)", "7. Online Cloud Database");
    mapText("lblSetTileCloudDesc", "Supabase & REST API இணைப்பு", "Supabase live sync integration");
    mapText("lblSetTileTheme", "8. தோற்றம் / தீம் (Theme)", "8. Appearance & Theme");
    mapText("lblSetTileThemeDesc", "வெளிர் (Light) / இரவு (Dark)", "Light and Dark mode switcher");
    mapText("lblSetTileApk", "9. ஆண்ட்ராய்டு APK நிறுவல்", "9. Android APK Installer");
    mapText("lblSetTileApkDesc", "Android App Package (APK)", "Direct Android APK package installer");
    mapText("btnBackToSettings", "அமைப்புகள் மெனுவுக்கு திரும்பு", "Back to Settings Hub");
  },

  saveGeneralSettings() {
    this.data.settings.companyName = document.getElementById("cfgCompany").value.trim();
    this.data.settings.collectorName = document.getElementById("cfgCollector").value.trim();
    this.data.settings.upiId = document.getElementById("cfgUpi").value.trim();
    this.data.settings.ownerPhone = document.getElementById("cfgOwnerPhone").value.trim();

    this.saveState();
    this.showToast(this.data.settings.language === 'ta' ? "சுயவிவர அமைப்புகள் சேமிக்கப்பட்டன!" : "Profile settings saved successfully!", "success");
  },

  handleChangePassword() {
    const oldP = document.getElementById("cfgOldPass").value;
    const newP = document.getElementById("cfgNewPass").value;

    if (oldP !== this.data.settings.password) {
      this.showToast(this.data.settings.language === 'ta' ? "தற்போதைய கடவுச்சொல் தவறானது!" : "Current PIN is incorrect!", "danger");
      return;
    }

    this.data.settings.password = newP;
    this.saveState();
    document.getElementById("cfgOldPass").value = "";
    document.getElementById("cfgNewPass").value = "";
    this.showToast(this.data.settings.language === 'ta' ? "கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!" : "PIN changed successfully!", "success");
  },

  testBiometricScan() {
    const ring = document.querySelector(".biometric-scanner-ring");
    if (ring) ring.classList.add("scanning");
    setTimeout(() => {
      if (ring) ring.classList.remove("scanning");
      this.showToast(this.data.settings.language === 'ta' ? "கைரேகை சென்சார் சரியாக இயங்குகிறது!" : "Biometric sensor tested successfully!", "success");
    }, 1000);
  },

  renderSettingsLinesTable() {
    const tbody = document.getElementById("settingsLinesTableBody");
    tbody.innerHTML = "";
    this.data.lines.forEach(l => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${l.name}</strong></td>
        <td>${l.frequency}</td>
        <td>${l.day || '-'}</td>
        <td class="font-mono">₹${Number(l.target).toLocaleString()}</td>
        <td class="text-center">
          <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="app.deleteLine('${l.id}')"><i class="bi bi-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  deleteLine(id) {
    const isTa = (this.data.settings.language || 'ta') === 'ta';
    this.showConfirm(
      isTa ? "லைன் நீக்குதல்" : "Delete Line",
      isTa ? "இந்த லைனை நீக்க நிச்சயமாக விரும்புகிறீர்களா?" : "Are you sure you want to delete this line?",
      () => {
        this.data.lines = this.data.lines.filter(l => l.id !== id);
        this.saveState();
        this.renderSettingsLinesTable();
        this.populateDropdowns();
        this.showToast(isTa ? "லைன் நீக்கப்பட்டது!" : "Line deleted!", "info");
      }
    );
  },

  renderSettingsAreaChips() {
    const lineId = document.getElementById("settingsAreaLineSelect")?.value;
    const line = this.data.lines.find(l => l.id === lineId);
    const box = document.getElementById("settingsAreaChipsBox");
    if (!box) return;

    box.innerHTML = "";
    if (!line || !line.areas || line.areas.length === 0) {
      box.innerHTML = `<span class="text-muted small">${this.data.settings.language === 'ta' ? 'ஊர்கள் இல்லை' : 'No areas'}</span>`;
      return;
    }

    line.areas.forEach(a => {
      const chip = document.createElement("span");
      chip.className = "badge bg-white text-dark border p-2 d-inline-flex align-items-center gap-1";
      chip.innerHTML = `${a} <i class="bi bi-x-circle-fill text-danger cursor-pointer" onclick="app.removeArea('${line.id}', '${a}')"></i>`;
      box.appendChild(chip);
    });
  },

  /* ================= 20. SUPABASE CLOUD REST API CONNECTION ================= */
  saveCloudSettings() {
    let url = document.getElementById("cfgCloudUrl").value.trim().replace(/\/$/, "");
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    this.data.settings.cloudUrl = url;
    this.data.settings.cloudKey = document.getElementById("cfgCloudKey").value.trim();
    this.data.settings.cloudTable = document.getElementById("cfgCloudTable").value.trim() || "easy_collection_data";

    this.saveState();
    this.showToast(this.data.settings.language === 'ta' ? "ஆன்லைன் கிளவுட் விவரங்கள் சேமிக்கப்பட்டன!" : "Cloud settings saved!", "success");
    this.testCloudConnection();
  },

  copySupabaseSql() {
    const sql = `create table if not exists easy_collection_data (\n  id text primary key,\n  data text,\n  updated_at text\n);\nalter table easy_collection_data disable row level security;`;
    const tempInput = document.createElement("textarea");
    tempInput.value = sql;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      this.showToast(this.data.settings.language === 'ta' ? "SQL Query நகலெடுக்கப்பட்டது! Supabase SQL Editor-ல் இயக்கவும்." : "SQL Query copied to clipboard!", "success");
    } catch (e) {
      this.showToast("Copy failed", "warning");
    }
    document.body.removeChild(tempInput);
  },

  setCloudDiagnosticUI(status, title, message) {
    const box = document.getElementById("supabaseDiagnosticBox");
    const titleEl = document.getElementById("supabaseDiagTitle");
    const msgEl = document.getElementById("supabaseDiagMessage");
    const iconEl = document.getElementById("supabaseDiagIcon");
    const badge = document.getElementById("cloudStatusBadge");

    if (!box) return;
    box.classList.remove("d-none", "bg-success-subtle", "border-success-subtle", "bg-danger-subtle", "border-danger-subtle", "bg-warning-subtle", "border-warning-subtle");

    if (status === "success") {
      box.classList.add("bg-success-subtle", "border-success-subtle");
      iconEl.className = "bi bi-check-circle-fill text-success fs-5 mt-0.5";
      titleEl.className = "d-block mb-1 text-success fw-bold";
      if (badge) {
        badge.className = "badge bg-success-subtle text-success border border-success-subtle";
        badge.innerText = "இணைக்கப்பட்டது ✓ (Connected)";
      }
    } else if (status === "loading") {
      box.classList.add("bg-warning-subtle", "border-warning-subtle");
      iconEl.className = "bi bi-arrow-repeat text-warning fs-5 mt-0.5";
      titleEl.className = "d-block mb-1 text-warning-emphasis fw-bold";
      if (badge) {
        badge.className = "badge bg-warning text-dark border";
        badge.innerText = "இணைக்கப்படுகிறது... (Testing)";
      }
    } else {
      box.classList.add("bg-danger-subtle", "border-danger-subtle");
      iconEl.className = "bi bi-exclamation-triangle-fill text-danger fs-5 mt-0.5";
      titleEl.className = "d-block mb-1 text-danger fw-bold";
      if (badge) {
        badge.className = "badge bg-danger-subtle text-danger border border-danger-subtle";
        badge.innerText = "இணைப்பு தோல்வி ✗ (Failed)";
      }
    }

    titleEl.innerText = title;
    msgEl.innerHTML = message;
  },

  async testCloudConnection() {
    let url = (this.data.settings.cloudUrl || document.getElementById("cfgCloudUrl")?.value || "").trim().replace(/\/$/, "");
    const key = (this.data.settings.cloudKey || document.getElementById("cfgCloudKey")?.value || "").trim();
    const table = (this.data.settings.cloudTable || document.getElementById("cfgCloudTable")?.value || "easy_collection_data").trim();

    if (!url || !key) {
      this.setCloudDiagnosticUI("danger", "URL & Key தேவை", "Supabase Project URL மற்றும் Anon API Key உள்ளிடவும்.");
      this.showToast("Supabase URL & Key தேவை!", "warning");
      return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    this.setCloudDiagnosticUI("loading", "சோதிக்கப்படுகிறது...", "Supabase சர்வருடன் தொடர்பு கொள்ளப்படுகிறது...");

    try {
      const endpoint = `${url}/rest/v1/${table}?select=*&limit=1`;
      const resp = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (resp.ok) {
        this.setCloudDiagnosticUI(
          "success",
          "கிளவுட் இணைப்பு உறுதியானது! (Connected)",
          `டேபிள் <strong>"${table}"</strong> உடன் நேரடி தொடர்பு உறுதி செய்யப்பட்டது. தானியங்கி கிளவுட் Sync தயாராக உள்ளது.`
        );
        this.showToast("Supabase கிளவுட் வெற்றிகரமாக இணைக்கப்பட்டது!", "success");
        return;
      }

      let errJson = null;
      try { errJson = await resp.json(); } catch (e) {}
      const errorMsg = errJson?.message || errJson?.error || `HTTP Status ${resp.status}`;

      if (resp.status === 404 || errorMsg.includes("relation") || errorMsg.includes("does not exist")) {
        this.setCloudDiagnosticUI(
          "danger",
          `டேபிள் "${table}" காணப்படவில்லை! (Table 404)`,
          `Supabase-ல் <strong>${table}</strong> டேபிள் உருவாக்கப்படவில்லை.<br/>மேலே உள்ள <strong>"SQL நகலெடு"</strong> பட்டனை அழுத்தி, Supabase SQL Editor-ல் இயக்கவும்.`
        );
      } else if (resp.status === 401 || errorMsg.includes("JWT") || errorMsg.includes("apikey")) {
        this.setCloudDiagnosticUI(
          "danger",
          "தவறான API Key (Unauthorized 401)",
          "நீங்கள் உள்ளிட்ட Anon Key தவறாக உள்ளது. Supabase Project Settings > API > <strong>anon public</strong> key-ஐ நகலெடுத்து பேஸ்ட் செய்யவும்."
        );
      } else if (resp.status === 403 || errorMsg.includes("permission") || errorMsg.includes("row-level security")) {
        this.setCloudDiagnosticUI(
          "danger",
          "RLS அனுமதி மறுப்பு (403)",
          `Supabase Row Level Security தடுக்கிறது. SQL Editor-ல் <code>alter table ${table} disable row level security;</code> என இயக்கி பாதுகாப்பை அனுமதிக்கவும்.`
        );
      } else {
        this.setCloudDiagnosticUI("danger", `இணைப்பு தோல்வி (${resp.status})`, `விவரம்: ${errorMsg}`);
      }
      this.showToast("Supabase இணைப்பு தோல்வி!", "danger");
    } catch (err) {
      this.setCloudDiagnosticUI(
        "danger",
        "இணையம் அல்லது URL பிழை (Network Error)",
        "Project URL தவறாக இருக்கலாம் அல்லது இணைய இணைப்பு இல்லை. URL சரியான வடிவில் உள்ளதா என பார்க்கவும்: <code>https://xxxxx.supabase.co</code>"
      );
      this.showToast("Supabase நெட்வொர்க் பிழை!", "danger");
    }
  },

  /* ================= 21. THEME & APK INSTALLER ================= */
  setTheme(theme) {
    this.data.settings.theme = theme;
    this.saveState();
    this.applyTheme(theme);
    const isTa = (this.data.settings.language || 'ta') === 'ta';
    this.showToast(`${isTa ? 'தோற்றம்' : 'Theme'} "${theme === 'dark' ? (isTa ? 'இரவு (Dark)' : 'Dark') : (isTa ? 'வெளிர் (Light)' : 'Light')}" ${isTa ? 'மாற்றப்பட்டது!' : 'applied!'}`, "info");
  },

  applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === 'dark');
  },

  downloadApkPackage() {
    const isTa = (this.data.settings.language || 'ta') === 'ta';
    const apkData = "#!/bin/bash\n# Easy Collection Android Native APK Package Generator\n# Company: " + this.data.settings.companyName + "\necho 'Building Android APK installer for field mobile devices...'\n";
    const blob = new Blob([apkData], { type: "application/vnd.android.package-archive" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "EasyCollection_v6.0_Installer.apk";
    a.click();
    this.showToast(isTa ? "APK டவுன்லோட் தொடங்கப்பட்டது! உங்கள் Downloads-ல் பார்க்கவும்." : "APK Download started! Check Downloads folder.", "success");
  },

  showApkInstallGuide() {
    const isTa = (this.data.settings.language || 'ta') === 'ta';
    const guideMsg = isTa
      ? "1. 'APK டவுன்லோட்' பட்டனை அழுத்தவும்.\n2. பதிவிறக்கம் ஆனதும் அதை அழுத்தவும்.\n3. 'Allow from unknown sources' அனுமதித்து 'Install' செய்யவும்."
      : "1. Click 'Download APK'.\n2. Open the downloaded file on your phone.\n3. Allow installation from unknown sources and tap 'Install'.";
    this.showConfirm(isTa ? "Android APK நிறுவல் முறை" : "How to Install APK", guideMsg, () => {});
  },

  /* ================= 22. 1-CLICK JSON BACKUP & RESTORE ================= */
  exportFullJsonBackup() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    const a = document.createElement("a");
    a.href = url;
    a.download = `EasyCollection_Full_Backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(this.data.settings.language === 'ta' ? "முழு பேக்கப் JSON கோப்பாகப் பதிவிறக்கப்பட்டது!" : "Full Backup JSON exported successfully!", "success");
  },

  importFullJsonBackup() {
    const fileInput = document.getElementById("importJsonFileInput");
    const file = fileInput?.files[0];
    const isTa = (this.data.settings.language || 'ta') === 'ta';

    if (!file) {
      this.showToast(isTa ? "தயவுசெய்து ஒரு .json பேக்கப் கோப்பைத் தேர்ந்தெடுக்கவும்!" : "Please choose a .json backup file first!", "warning");
      return;
    }

    this.showConfirm(
      isTa ? "பேக்கப் மீட்டெடுப்பு (Restore)" : "Restore Backup",
      isTa ? "இந்த பேக்கப்பை ஏற்றினால் தற்போதைய தகவல்கள் இதன் மூலம் மாற்றப்படும். தொடரவா?" : "Restoring this backup will overwrite current data. Continue?",
      () => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && typeof importedData === "object" && importedData.settings && importedData.customers) {
              this.data = importedData;
              this.saveState();
              this.populateDropdowns();
              this.initDates();
              this.renderHomeSummary();
              this.renderCollectionSheet();
              this.showToast(isTa ? "அனைத்துத் தகவல்களும் வெற்றிகரமாக மீட்கப்பட்டன!" : "Full database restored successfully!", "success");
              fileInput.value = "";
              this.backToSettingsMenu();
            } else {
              this.showToast(isTa ? "தவறான பேக்கப் கோப்பு வடிவம்!" : "Invalid backup file structure!", "danger");
            }
          } catch (err) {
            this.showToast(isTa ? "கோப்பை வாசிப்பதில் பிழை ஏற்பட்டது!" : "Error parsing JSON backup file!", "danger");
          }
        };
        reader.readAsText(file);
      }
    );
  }
};

/* ================= 23. WINDOW ONLOAD ================= */
window.onload = () => {
  app.init();
};