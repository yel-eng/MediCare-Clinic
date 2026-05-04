// 1. إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
    authDomain: "mydoctor-clinic.firebaseapp.com",
    projectId: "mydoctor-clinic",
    storageBucket: "mydoctor-clinic.appspot.com",
    messagingSenderId: "996532645974",
    appId: "1:996532645974:web:bfc3e6a61bdc7f04a24bf7"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// سعر الكشف الافتراضي للحسابات
const CLINIC_PRICE = 200; 

// دالة مساعدة للتاريخ
function getLocalDateString(dateObj) {
    let y = dateObj.getFullYear();
    let m = String(dateObj.getMonth() + 1).padStart(2, '0');
    let d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ==========================================
// وظائف الأدمين والحصالة
// ==========================================

function setupWeekUI() {
    const grid = document.getElementById("weekSetupGrid");
    if (!grid) return;
    const startDateInput = document.getElementById("startDatePicker");
    let start = (startDateInput && startDateInput.value) ? new Date(startDateInput.value) : new Date();
    
    grid.innerHTML = ""; 
    for (let i = 0; i < 7; i++) {
        let current = new Date(start);
        current.setDate(start.getDate() + i);
        let dateStr = getLocalDateString(current);
        let dayName = current.toLocaleDateString('ar-EG', { weekday: 'long' });
        
        grid.innerHTML += `
            <div class="day-setup-row card" data-date="${dateStr}">
                <b>${dayName}</b><br><small>${dateStr}</small>
                <input type="time" class="start-t" value="17:00">
                <input type="time" class="end-t" value="21:00">
            </div>`;
    }
}

async function generateSmartSlots() {
    const duration = parseInt(document.getElementById("duration").value) || 30;
    const dayRows = document.querySelectorAll(".day-setup-row");
    const batch = db.batch();

    dayRows.forEach(row => {
        const date = row.dataset.date;
        const startT = row.querySelector(".start-t").value;
        const endT = row.querySelector(".end-t").value;

        if (startT && endT) {
            let current = new Date(`${date}T${startT}`);
            let end = new Date(`${date}T${endT}`);
            while (current < end) {
                let timeStr = current.toTimeString().substring(0, 5);
                let ref = db.collection("slots").doc();
                batch.set(ref, {
                    date: date, time: timeStr, booked: false, paid: false,
                    timestamp: firebase.firestore.Timestamp.fromDate(new Date(current))
                });
                current.setMinutes(current.getMinutes() + duration);
            }
        }
    });
    await batch.commit();
    alert("تم تحديث الجدول بنجاح!");
}

function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    const totalDisplay = document.getElementById("dayTotal");
    if (!container) return;

    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        container.innerHTML = "";
        let daysMap = {};
        let grandTotal = 0;

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            if (s.booked && s.paid) grandTotal += CLINIC_PRICE;
        });

        if (totalDisplay) totalDisplay.innerText = grandTotal;

        for (let date in daysMap) {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
            let html = `<div class="day-header">${dayName} <br> ${date}</div>`;
            
            daysMap[date].forEach(slot => {
                const isPaid = slot.paid || false;
                html += `
                    <div class="slot-item ${slot.booked ? 'booked-card' : ''}">
                        <div>
                            <b>${slot.time}</b><br>
                            ${slot.booked ? `<small>${slot.patient?.name || 'مريض'}</small>` : '<small>متاح</small>'}
                        </div>
                        <div style="display:flex; gap:5px; align-items:center;">
                            ${slot.booked ? `
                                <button onclick="togglePayment('${slot.id}', ${isPaid})" 
                                        style="background:${isPaid ? '#4caf50' : '#ff9800'}; color:white; border:none; padding:4px; border-radius:4px; cursor:pointer; font-size:9px;">
                                    ${isPaid ? 'مدفوع' : 'تحصيل'}
                                </button>
                            ` : ''}
                            <button class="btn-danger" onclick="deleteSlot('${slot.id}')">×</button>
                        </div>
                    </div>`;
            });
            dayDiv.innerHTML = html;
            container.appendChild(dayDiv);
        }
    });
}

async function togglePayment(id, status) {
    await db.collection("slots").doc(id).update({ paid: !status });
}

async function deleteSlot(id) {
    if(confirm("حذف الموعد؟")) await db.collection("slots").doc(id).delete();
}

// ==========================================
// وظائف صفحة الحجز (للمريض)
// ==========================================
let allAvailableSlots = [];

function loadBookingDays() {
    const daySelect = document.getElementById("daySelect");
    if (!daySelect) return;

    db.collection("slots")
      .where("date", ">=", getLocalDateString(new Date()))
      .where("booked", "==", false)
      .onSnapshot(snap => {
        allAvailableSlots = [];
        let daysSet = new Set();
        snap.forEach(doc => {
            let s = doc.data();
            allAvailableSlots.push({id: doc.id, ...s});
            daysSet.add(s.date);
        });

        daySelect.innerHTML = '<option value="">اختر اليوم...</option>';
        Array.from(daysSet).sort().forEach(date => {
            let dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
            daySelect.innerHTML += `<option value="${date}">${dayName} (${date})</option>`;
        });
    });
}

function updateAvailableTimes() {
    const selectedDate = document.getElementById("daySelect").value;
    const slotsSelect = document.getElementById("slotsSelect");
    const filtered = allAvailableSlots.filter(s => s.date === selectedDate);
    
    slotsSelect.innerHTML = '<option value="">اختر الساعة...</option>';
    filtered.forEach(s => {
        slotsSelect.innerHTML += `<option value="${s.id}">${s.time}</option>`;
    });
}

async function book() {
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const slotId = document.getElementById("slotsSelect").value;

    if (!name || !slotId) return alert("اكمل البيانات");

    await db.collection("slots").doc(slotId).update({
        booked: true,
        patient: { name: name, phone: phone }
    });
    alert("تم الحجز!");
    location.reload();
}

// التشغيل التلقائي
window.onload = () => {
    if (document.getElementById("daySelect")) loadBookingDays();
    if (document.getElementById("slotsContainer")) {
        setupWeekUI();
        loadAdminSlots();
    }
};
