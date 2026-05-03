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

// مصفوفة مؤقتة لتخزين المواعيد المتاحة لصفحة الحجز
let allAvailableSlots = [];

// دالة مساعدة للحصول على التاريخ المحلي YYYY-MM-DD
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
    if (!daySelect) return; // لضمان عدم التشغيل إلا في صفحة الحجز

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

        daySelect.innerHTML = '<option value="">اختر اليوم المناسب...</option>';
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
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const slotId = document.getElementById("slotsSelect").value;

    if (!name || !phone || !slotId) {
        return alert("برجاء إدخال بياناتك واختيار الموعد");
    }

    try {
        await db.collection("slots").doc(slotId).update({
            booked: true,
            status: "pending",
            patient: {
                name: name,
                phone: phone,
                note: "حجز تلقائي من الموقع"
            }
        });
        alert("تم حجز موعدك بنجاح! شكراً لك.");
        location.reload();
    } catch (e) {
        alert("عذراً، حدث خطأ أثناء الحجز. حاول مرة أخرى.");
    }
}

// ==========================================
// وظائف لوحة التحكم (Admin Page)
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
                <div style="margin-top:10px; display:flex; flex-direction:column; gap:5px;">
                    <input type="time" class="start-t" title="من">
                    <input type="time" class="end-t" title="إلى">
                </div>
            </div>`;
    }
}

async function generateSmartSlots() {
    const rows = document.querySelectorAll(".day-setup-row");
    const duration = parseInt(document.getElementById("duration")?.value || 30);
    let price = prompt("سعر الكشف الموحد لهذه المواعيد (ج.م):", "200");
    if (!price) return;
    let batch = db.batch();
    let count = 0;
    rows.forEach(row => {
        const dateStr = row.getAttribute("data-date");
        const startInput = row.querySelector(".start-t");
        const endInput = row.querySelector(".end-t");
        if (startInput?.value && endInput?.value) {
            let current = new Date(`${dateStr}T${startInput.value}`);
            let limit = new Date(`${dateStr}T${endInput.value}`);
            while (current < limit) {
                let time = current.toTimeString().slice(0, 5);
                let ref = db.collection("slots").doc();
                batch.set(ref, { date: dateStr, time: time, booked: false, price: parseFloat(price), status: "pending", patient: null });
                current.setMinutes(current.getMinutes() + duration);
                count++;
            }
        }
    });
    if (count === 0) return alert("يرجى تحديد وقت ليوم واحد على الأقل!");
    await batch.commit();
    alert(`تم توليد ${count} موعد بنجاح!`);
    location.reload();
}

function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    if (!container) return;
    let today = getLocalDateString(new Date());
    db.collection("slots").where("date", ">=", today).onSnapshot(snap => {
        let daysMap = {};
        let dayRevenue = {};
        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) { daysMap[s.date] = []; dayRevenue[s.date] = 0; }
            daysMap[s.date].push({id: doc.id, ...s});
            if (s.status === "attended") { dayRevenue[s.date] += (Number(s.price) || 0); }
        });
        container.innerHTML = "";
        let sortedDates = Object.keys(daysMap).sort();
        sortedDates.forEach(date => {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', {weekday: 'long'});
            let total = dayRevenue[date] || 0;
            dayDiv.innerHTML = `
                <div class="day-header" style="background:#1a237e; color:white; padding:10px; border-radius:8px 8px 0 0; text-align:center;">
                    <div style="font-size:15px; font-weight:bold;">${dayName}</div>
                    <div style="font-size:11px; opacity:0.8; margin-bottom:5px;">${date}</div>
                    <div style="background:#ffd700; color:#000; padding:3px; border-radius:4px; font-size:12px; font-weight:bold;">💰 دخل اليوم: ${total} ج.م</div>
                    <button onclick="deleteDay('${date}')" style="background:none; color:#ff9999; border:none; font-size:10px; cursor:pointer; text-decoration:underline;">مسح الكل</button>
                </div>`;
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                const isBooked = slot.booked === true;
                const isAttended = slot.status === "attended";
                dayDiv.innerHTML += `
                    <div class="slot-item" style="border-right:5px solid ${isAttended ? '#27ae60' : (isBooked ? '#e74c3c' : '#2ecc71')};">
                        <span><b>${slot.time}</b> ${isAttended ? '✅' : (isBooked ? '👤' : '🟢')}</span>
                        <button onclick="viewPatientDetails('${slot.id}')" class="btn-outline" style="font-size:11px;">إدارة</button>
                    </div>`;
            });
            container.appendChild(dayDiv);
        });
    });
}

function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        if (!doc.exists) return;
        let s = doc.data();
        let p = s.patient || {name:"", phone:"", note:""};
        let waLink = (p.phone && p.phone !== "-") ? `https://wa.me/${p.phone.replace(/\s/g, '')}` : "#";
        document.getElementById("modal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3>⚙️ إدارة الموعد</h3>
            <p>التوقيت: ${s.date} | ${s.time}</p>
            <input id="en" value="${p.name}" style="width:100%; padding:8px; margin-bottom:10px;">
            <input id="ep" value="${p.phone}" style="width:100%; padding:8px; margin-bottom:10px;">
            <select id="es" style="width:100%; padding:8px; margin-bottom:10px;">
                <option value="pending" ${s.status==='pending'?'selected':''}>انتظار</option>
                <option value="attended" ${s.status==='attended'?'selected':''}>تم الكشف</option>
            </select>
            <textarea id="enot" style="width:100%; height:60px;">${p.note||""}</textarea>
            <button onclick="saveAdmin('${id}')" class="btn-main" style="width:100%; margin-top:10px;">حفظ</button>
        `;
    });
}

async function saveAdmin(id) {
    await db.collection("slots").doc(id).update({
        status: document.getElementById("es").value,
        booked: document.getElementById("en").value.trim() !== "", 
        patient: { name: document.getElementById("en").value, phone: document.getElementById("ep").value, note: document.getElementById("enot").value }
    });
    closeModal();
}

function closeModal() { document.getElementById("modal").style.display = "none"; document.getElementById("overlay").style.display = "none"; }

// ==========================================
// التشغيل عند تحميل الصفحة (توجيه الوظائف)
// ==========================================
window.onload = () => {
    // إذا وجدنا "daySelect" نحن في صفحة الحجز
    if (document.getElementById("daySelect")) {
        loadBookingDays();
    } 
    // إذا وجدنا "slotsContainer" نحن في لوحة الإدارة
    if (document.getElementById("slotsContainer")) {
        setupWeekUI();
        loadAdminSlots();
    }
};
