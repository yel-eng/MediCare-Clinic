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

// 1. توليد واجهة الـ 7 أيام
function setupWeekUI() {
    const grid = document.getElementById("weekSetupGrid");
    if (!grid) return;
    const startDateInput = document.getElementById("startDatePicker");
    let start = (startDateInput && startDateInput.value) ? new Date(startDateInput.value) : new Date();
    grid.innerHTML = ""; 
    for (let i = 0; i < 7; i++) {
        let current = new Date(start);
        current.setDate(start.getDate() + i);
        let dateStr = current.toISOString().split('T')[0];
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

// 2. توليد المواعيد (تعديل: التأكد من الحالة الافتراضية)
async function generateSmartSlots() {
    const rows = document.querySelectorAll(".day-setup-row");
    const duration = parseInt(document.getElementById("duration")?.value || 30);
    let price = prompt("سعر الكشف (ج.م):", "200");
    if (!price) return;
    let batch = db.batch();
    let count = 0;

    rows.forEach(row => {
        const dateStr = row.getAttribute("data-date");
        const start = row.querySelector(".start-t").value;
        const end = row.querySelector(".end-t").value;
        if (start && end) {
            let current = new Date(`${dateStr}T${start}`);
            let limit = new Date(`${dateStr}T${end}`);
            while (current < limit) {
                let time = current.toTimeString().slice(0, 5);
                let ref = db.collection("slots").doc();
                batch.set(ref, { 
                    date: dateStr, time: time, 
                    booked: false, // افتراضياً غير محجوز
                    price: parseFloat(price), 
                    status: "pending", 
                    patient: null 
                });
                current.setMinutes(current.getMinutes() + duration);
                count++;
            }
        }
    });

    if (count === 0) return alert("يرجى إدخال ساعات العمل!");
    await batch.commit();
    alert(`تم توليد ${count} موعد!`);
    location.reload();
}

// 3. تحميل الجدول (تعديل: الربط الصحيح بالألوان)
function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    if (!container) return;
    let today = new Date().toISOString().split('T')[0];

    db.collection("slots").where("date", ">=", today).onSnapshot(snap => {
        let daysMap = {};
        let totalRev = 0;
        container.innerHTML = "";

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            if (s.date === today && s.status === "attended") totalRev += (Number(s.price) || 0);
        });

        document.getElementById("dailyRevenue") && (document.getElementById("dailyRevenue").innerText = `💰 دخل اليوم الفعلي: ${totalRev} ج.م`);
        
        Object.keys(daysMap).sort().forEach(date => {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', {weekday: 'long'});
            dayDiv.innerHTML = `<div class="day-header">${dayName}<br>${date} <button onclick="deleteDay('${date}')" style="background:red;border:none;color:white;cursor:pointer;padding:2px;font-size:9px;">مسح</button></div>`;
            
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                // هنا التعديل: إذا كان booked حقيقي يظهر أيقونة الشخص ولون مختلف
                const isBooked = slot.booked === true;
                dayDiv.innerHTML += `
                    <div class="slot-item ${isBooked ? 'booked-card' : ''}" style="${isBooked ? 'border-right:5px solid #e74c3c; background:#fff5f5;' : ''}">
                        <span><b>${slot.time}</b> ${isBooked ? '👤' : '🟢'}</span>
                        <button onclick="viewPatientDetails('${slot.id}')" class="btn-outline" style="font-size:11px; padding:4px;">إدارة</button>
                    </div>`;
            });
            container.appendChild(dayDiv);
        });
    });
}

// 4. حجز يدوي (تعديل هام جداً لتغيير الحالة فوراً)
async function addManualSlot() {
    let n = prompt("اسم المريض:");
    let d = prompt("التاريخ (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    let t = prompt("الوقت (مثال 10:30):");
    if(n && d && t) {
        await db.collection("slots").add({
            date: d, time: t, 
            booked: true, // تغيير الحالة لتمكين اللون
            status: "pending", price: 200,
            patient: { name: n, phone: "-", note: "حجز يدوي" }
        });
        alert("تم الحجز اليدوي!");
    }
}

// 5. حفظ التعديلات (تعديل للتأكد من حالة الحجز)
async function saveAdmin(id) {
    const status = document.getElementById("es").value;
    const name = document.getElementById("en").value;
    
    await db.collection("slots").doc(id).update({
        status: status,
        booked: name.trim() !== "", // إذا وجد اسم مريض، الموعد محجوز
        patient: {
            name: name,
            phone: document.getElementById("ep").value,
            note: document.getElementById("enot").value
        }
    });
    closeModal();
}

// باقي الدوال (حذف، إغلاق المودال، إلخ) تبقى كما هي
async function deleteDay(date) {
    if(confirm(`مسح كل مواعيد ${date}؟`)) {
        const snap = await db.collection("slots").where("date", "==", date).get();
        const batch = db.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

window.onload = () => {
    setupWeekUI();
    loadAdminSlots();
};
