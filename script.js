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

// 1. توليد واجهة الـ 7 أيام تلقائياً عند فتح الصفحة
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

// 2. توليد الجلسات في قاعدة البيانات
async function generateSmartSlots() {
    const rows = document.querySelectorAll(".day-setup-row");
    const durationEl = document.getElementById("duration");
    const duration = durationEl ? parseInt(durationEl.value) : 30;
    
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
                    date: dateStr, time: time, booked: false, 
                    price: parseFloat(price), status: "pending", patient: null 
                });
                current.setMinutes(current.getMinutes() + duration);
                count++;
            }
        }
    });

    if (count === 0) return alert("يرجى إدخال ساعات العمل للأيام أولاً!");
    await batch.commit();
    alert(`تم توليد ${count} موعد بنجاح!`);
    location.reload();
}

// 3. تحميل وعرض الجدول للأدمن
function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    if (!container) return;

    let today = new Date().toISOString().split('T')[0];

    db.collection("slots").where("date", ">=", today).get().then(snap => {
        let daysMap = {};
        let totalRev = 0;

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            if (s.date === today && s.status === "attended") totalRev += (Number(s.price) || 0);
        });

        const revEl = document.getElementById("dailyRevenue");
        if (revEl) revEl.innerText = `💰 دخل اليوم الفعلي: ${totalRev} ج.م`;

        container.innerHTML = "";
        let sortedDates = Object.keys(daysMap).sort();

        if (sortedDates.length === 0) {
            container.innerHTML = "<p style='padding:20px;'>لا توجد مواعيد حالية.</p>";
            return;
        }

        sortedDates.forEach(date => {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', {weekday: 'long'});
            
            dayDiv.innerHTML = `
                <div class="day-header">
                    ${dayName}<br>${date}
                    <button onclick="deleteDay('${date}')" style="background:red; color:white; border:none; font-size:10px; cursor:pointer; padding:2px 5px; margin-top:5px; border-radius:3px;">مسح (إجازة)</button>
                </div>`;
            
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                dayDiv.innerHTML += `
                    <div class="slot-item ${slot.booked ? 'booked-card' : ''}">
                        <span><b>${slot.time}</b> ${slot.booked ? '👤' : '🟢'}</span>
                        <button onclick="viewPatientDetails('${slot.id}')" class="btn-outline" style="font-size:11px; padding:4px 8px;">إدارة</button>
                    </div>`;
            });
            container.appendChild(dayDiv);
        });
    });
}

// 4. عرض تفاصيل المريض والـ QR
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || {name:"-", phone:"-", note:"-"};
        let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(id)}`;

        document.getElementById("modal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h3>📋 تفاصيل الحجز</h3>
                <img src="${qrUrl}" style="border:1px solid #ddd;">
            </div>
            <p><b>التوقيت:</b> ${s.date} | ${s.time}</p>
            <hr>
            <label>اسم المريض:</label><br>
            <input id="en" value="${p.name}" style="width:100%"><br>
            <label>الموبايل:</label><br>
            <input id="ep" value="${p.phone}" style="width:100%"><br>
            <label>الحالة:</label><br>
            <select id="es" style="width:100%">
                <option value="pending" ${s.status==='pending'?'selected':''}>انتظار</option>
                <option value="attended" ${s.status==='attended'?'selected':''}>تم الكشف</option>
            </select><br>
            <label>ملاحظات:</label><br>
            <textarea id="enot" style="width:100%; height:50px;">${p.note||""}</textarea><br>
            <button onclick="saveAdmin('${id}')" class="btn-main" style="width:100%; margin-top:10px;">حفظ التغييرات</button>
            <button onclick="deleteSlot('${id}')" style="background:none; color:red; border:none; width:100%; cursor:pointer; margin-top:10px;">❌ حذف الموعد نهائياً</button>
        `;
    });
}

// 5. وظائف إضافية (حفظ، حذف، حجز يدوي)
async function saveAdmin(id) {
    await db.collection("slots").doc(id).update({
        status: document.getElementById("es").value,
        patient: {
            name: document.getElementById("en").value,
            phone: document.getElementById("ep").value,
            note: document.getElementById("enot").value
        }
    });
    location.reload();
}

async function deleteDay(date) {
    if(confirm(`مسح كل مواعيد ${date}؟`)) {
        const snap = await db.collection("slots").where("date", "==", date).get();
        const batch = db.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        location.reload();
    }
}

async function deleteSlot(id) {
    if(confirm("حذف هذا الموعد؟")) {
        await db.collection("slots").doc(id).delete();
        location.reload();
    }
}

async function addManualSlot() {
    let n = prompt("اسم المريض:");
    let d = prompt("التاريخ (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    let t = prompt("الوقت (مثال 10:30):");
    if(n && d && t) {
        await db.collection("slots").add({
            date: d, time: t, booked: true, status: "pending", price: 200,
            patient: { name: n, phone: "-", note: "حجز يدوي" }
        });
        location.reload();
    }
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

// التشغيل عند التحميل
window.onload = () => {
    setupWeekUI();
    loadAdminSlots();
};
