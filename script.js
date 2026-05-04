// 1. إعدادات Firebase (تأكدي أنها نفس بيانات مشروعك)
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

// دالة مساعدة لتنسيق التاريخ (YYYY-MM-DD)
function getLocalDateString(dateObj) {
    let y = dateObj.getFullYear();
    let m = String(dateObj.getMonth() + 1).padStart(2, '0');
    let d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ==========================================
// أولاً: وظائف صفحة الأدمين (Admin)
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
            <div class="day-setup-row card" data-date="${dateStr}" style="padding:10px; border:1px solid #eee; margin:5px;">
                <b>${dayName}</b><br><small>${dateStr}</small>
                <input type="time" class="start-t" value="17:00" style="display:block; margin:5px auto;">
                <input type="time" class="end-t" value="21:00" style="display:block; margin:5px auto;">
            </div>`;
    }
}

async function generateSmartSlots() {
    const duration = parseInt(document.getElementById("duration").value) || 30;
    const dayRows = document.querySelectorAll(".day-setup-row");
    
    for (const row of dayRows) {
        const date = row.dataset.date;
        const startT = row.querySelector(".start-t").value;
        const endT = row.querySelector(".end-t").value;

        if (startT && endT) {
            let current = new Date(`${date}T${startT}`);
            let end = new Date(`${date}T${endT}`);

            while (current < end) {
                let timeStr = current.toTimeString().substring(0, 5);
                await db.collection("slots").add({
                    date: date,
                    time: timeStr,
                    booked: false,
                    timestamp: firebase.firestore.Timestamp.fromDate(new Date(current))
                });
                current.setMinutes(current.getMinutes() + duration);
            }
        }
    }
    alert("تم توليد المواعيد بنجاح!");
    if(typeof loadAdminSlots === "function") loadAdminSlots();
}

function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    if (!container) return;

    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        container.innerHTML = "";
        snap.forEach(doc => {
            let s = doc.data();
            container.innerHTML += `
                <div style="border-bottom:1px solid #ccc; padding:5px;">
                    ${s.date} - ${s.time} ${s.booked ? '✅' : '⏳'} 
                    <button onclick="db.collection('slots').doc('${doc.id}').delete()">حذف</button>
                </div>`;
        });
    });
}

// ==========================================
// ثانياً: وظائف صفحة الحجز (Booking)
// ==========================================
let allAvailableSlots = [];

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
        if(timeGroup) timeGroup.style.display = "none";
        return;
    }

    let filtered = allAvailableSlots.filter(s => s.date === selectedDate);
    slotsSelect.innerHTML = '<option value="">اختر الوقت...</option>';
    filtered.forEach(slot => {
        slotsSelect.innerHTML += `<option value="${slot.id}">${slot.time}</option>`;
    });

    if(timeGroup) timeGroup.style.display = "block";
}

async function book() {
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const slotId = document.getElementById("slotsSelect").value;

    if (!name || !phone || !slotId) return alert("برجاء إكمال البيانات");

    await db.collection("slots").doc(slotId).update({
        booked: true,
        patientName: name,
        patientPhone: phone
    });
    alert("تم الحجز!");
    location.reload();
}

// تشغيل الوظائف عند التحميل
window.onload = () => {
    if (document.getElementById("daySelect")) loadBookingDays();
    if (document.getElementById("weekSetupGrid")) {
        setupWeekUI();
        loadAdminSlots();
    }
};
