// تكوين Firebase
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

let allAvailableSlots = [];

function getLocalDateString(dateObj) {
    let y = dateObj.getFullYear();
    let m = String(dateObj.getMonth() + 1).padStart(2, '0');
    let d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ==========================================
// وظائف صفحة الحجز (Booking Page)
// ==========================================

function loadBookingDays() {
    const daySelect = document.getElementById("daySelect");
    if (!daySelect) return;

    let today = getLocalDateString(new Date());

    db.collection("slots")
      .where("date", ">=", today)
      .where("booked", "==", false)
      .onSnapshot(snap => {
        allAvailableSlots = [];
        let daysSet = new Set();
        
        snap.forEach(doc => {
            let s = doc.data();
            allAvailableSlots.push({id: doc.id, ...s});
            daysSet.add(s.date);
        });

        if (daysSet.size === 0) {
            daySelect.innerHTML = '<option value="">لا توجد مواعيد متاحة</option>';
            return;
        }

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
    const timeGroup = document.getElementById("timeSlotGroup");

    if (!selectedDate) {
        timeGroup.style.display = "none";
        return;
    }

    let filtered = allAvailableSlots
        .filter(s => s.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time));

    slotsSelect.innerHTML = '<option value="">اختر الوقت...</option>';
    filtered.forEach(slot => {
        slotsSelect.innerHTML += `<option value="${slot.id}">${slot.time}</option>`;
    });

    timeGroup.style.display = "block";
}

async function book() {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const slotId = document.getElementById("slotsSelect").value;

    if (!name || !phone || !slotId) return alert("اكمل البيانات");

    try {
        await db.collection("slots").doc(slotId).update({
            booked: true,
            patient: { name, phone }
        });
        alert("تم الحجز بنجاح!");
        location.reload();
    } catch (e) { alert("حدث خطأ في الحجز"); }
}

// ==========================================
// وظائف لوحة التحكم (Admin Page)
// ==========================================

function setupWeekUI() {
    const grid = document.getElementById("weekSetupGrid");
    if (!grid) return;
    const startDateInput = document.getElementById("startDatePicker");
    let start = startDateInput.value ? new Date(startDateInput.value) : new Date();
    
    grid.innerHTML = ""; 
    for (let i = 0; i < 7; i++) {
        let current = new Date(start);
        current.setDate(start.getDate() + i);
        let dateStr = getLocalDateString(current);
        let dayName = current.toLocaleDateString('ar-EG', { weekday: 'long' });
        
        grid.innerHTML += `
            <div class="day-setup-row" data-date="${dateStr}">
                <b>${dayName}</b><br><small>${dateStr}</small>
                <input type="time" class="start-t" value="17:00">
                <input type="time" class="end-t" value="21:00">
            </div>`;
    }
}

async function generateSmartSlots() {
    const duration = parseInt(document.getElementById("duration").value);
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
                    date: date,
                    time: timeStr,
                    booked: false,
                    timestamp: firebase.firestore.Timestamp.fromDate(new Date(current))
                });
                current.setMinutes(current.getMinutes() + duration);
            }
        }
    });

    await batch.commit();
    alert("تم توليد المواعيد بنجاح!");
    loadAdminSlots();
}

function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    if (!container) return;

    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        container.innerHTML = "";
        let daysMap = {};

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
        });

        for (let date in daysMap) {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
            
            let html = `<div class="day-header">${dayName} <br> ${date}</div>`;
            daysMap[date].forEach(slot => {
                html += `
                    <div class="slot-item ${slot.booked ? 'booked-card' : ''}">
                        <span>${slot.time} ${slot.booked ? '✅ ('+slot.patient.name+')' : '⏳'}</span>
                        <button class="btn-danger" onclick="deleteSlot('${slot.id}')">حذف</button>
                    </div>`;
            });
            dayDiv.innerHTML = html;
            container.appendChild(dayDiv);
        }
    });
}

async function deleteSlot(id) {
    if(confirm("هل تريد حذف هذا الموعد؟")) {
        await db.collection("slots").doc(id).delete();
    }
}

// تشغيل الدوال عند تحميل الصفحة
window.onload = () => {
    if (document.getElementById("daySelect")) loadBookingDays();
    if (document.getElementById("weekSetupGrid")) {
        setupWeekUI();
        loadAdminSlots();
    }
};
