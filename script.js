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

// دالة مساعدة للحصول على التاريخ المحلي YYYY-MM-DD
function getLocalDateString(dateObj) {
    let y = dateObj.getFullYear();
    let m = String(dateObj.getMonth() + 1).padStart(2, '0');
    let d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 1. توليد واجهة الإعداد (الأيام السبعة)
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

// 2. توليد المواعيد في قاعدة البيانات
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
                batch.set(ref, { 
                    date: dateStr, 
                    time: time, 
                    booked: false, 
                    price: parseFloat(price), 
                    status: "pending", 
                    patient: null 
                });
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

// 3. عرض المواعيد وحساب الدخل لكل يوم (تحديث لحظي)
function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    if (!container) return;
    let today = getLocalDateString(new Date());

    // مراقبة المواعيد من اليوم فصاعداً
    db.collection("slots").where("date", ">=", today).onSnapshot(snap => {
        let daysMap = {};
        let dayRevenue = {}; // تخزين إجمالي دخل كل يوم

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) {
                daysMap[s.date] = [];
                dayRevenue[s.date] = 0;
            }
            daysMap[s.date].push({id: doc.id, ...s});
            
            // إضافة السعر للدخل فقط إذا كانت الحالة "تم الكشف"
            if (s.status === "attended") {
                dayRevenue[s.date] += (Number(s.price) || 0);
            }
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
                    <div style="background:#ffd700; color:#000; padding:3px; border-radius:4px; font-size:12px; font-weight:bold; border:1px solid #b8860b;">
                        💰 دخل اليوم: ${total} ج.م
                    </div>
                    <button onclick="deleteDay('${date}')" style="background:none; color:#ff9999; border:none; font-size:10px; cursor:pointer; text-decoration:underline; margin-top:5px;">مسح الكل</button>
                </div>`;
            
            // ترتيب المواعيد حسب الوقت
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                const isBooked = slot.booked === true;
                const isAttended = slot.status === "attended";
                const pName = (isBooked && slot.patient) ? slot.patient.name : "متاح";
                
                dayDiv.innerHTML += `
                    <div class="slot-item" style="border-right:5px solid ${isAttended ? '#27ae60' : (isBooked ? '#e74c3c' : '#2ecc71')}; background:${isAttended ? '#f0fff4' : '#fff'};">
                        <div style="display:flex; flex-direction:column; overflow:hidden;">
                            <span><b>${slot.time}</b> ${isAttended ? '✅' : (isBooked ? '👤' : '🟢')}</span>
                            <small style="color:#34495e; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pName}</small>
                        </div>
                        <button onclick="viewPatientDetails('${slot.id}')" class="btn-outline" style="font-size:11px; padding:4px 8px;">إدارة</button>
                    </div>`;
            });
            container.appendChild(dayDiv);
        });
    });
}

// 4. نافذة الإدارة (تعديل الحالة يحسب الدخل فوراً)
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        if (!doc.exists) return;
        let s = doc.data();
        let p = s.patient || {name:"", phone:"", note:""};
        
        let waLink = (p.phone && p.phone !== "-") ? `https://wa.me/${p.phone.replace(/\s/g, '')}` : "#";

        document.getElementById("modal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>⚙️ إدارة الموعد</h3>
                <a href="${waLink}" target="_blank" style="background:#25D366; color:white; padding:5px 10px; border-radius:5px; text-decoration:none; font-size:12px;">💬 واتساب</a>
            </div>
            <p style="background:#f8f9fa; padding:5px; border-radius:4px;"><b>التوقيت:</b> ${s.date} الساعة ${s.time}</p>
            <hr>
            <label>اسم المريض:</label>
            <input id="en" value="${p.name}" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; border-radius:4px;">
            
            <label>رقم الهاتف:</label>
            <input id="ep" value="${p.phone}" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; border-radius:4px;">
            
            <label>حالة الجلسة:</label>
            <select id="es" style="width:100%; padding:8px; margin-bottom:10px; background:#fffbe6; font-weight:bold;">
                <option value="pending" ${s.status==='pending'?'selected':''}>⏳ انتظار / حجز</option>
                <option value="attended" ${s.status==='attended'?'selected':''}>✅ تم الكشف (يُضاف للدخل)</option>
            </select>
            
            <label>ملاحظات الطبيب:</label>
            <textarea id="enot" style="width:100%; height:60px; padding:8px; border:1px solid #ccc; border-radius:4px;">${p.note||""}</textarea>
            
            <button onclick="saveAdmin('${id}')" class="btn-main" style="width:100%; margin-top:10px; padding:12px;">حفظ وتحديث الدخل</button>
            <button onclick="deleteSlot('${id}')" style="background:none; color:red; border:none; width:100%; cursor:pointer; margin-top:15px; font-size:11px;">❌ حذف الموعد نهائياً</button>
        `;
    });
}

// 5. وظائف الحفظ والحذف
async function saveAdmin(id) {
    const name = document.getElementById("en").value;
    const status = document.getElementById("es").value;
    
    await db.collection("slots").doc(id).update({
        status: status,
        booked: name.trim() !== "", 
        patient: {
            name: name,
            phone: document.getElementById("ep").value,
            note: document.getElementById("enot").value
        }
    });
    closeModal();
    // لا حاجة لعمل reload لأن onSnapshot سيحدث الدخل تلقائياً
}

async function deleteDay(date) {
    if(confirm(`هل متأكد من مسح جميع مواعيد يوم ${date}؟`)) {
        const snap = await db.collection("slots").where("date", "==", date).get();
        const batch = db.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
}

async function deleteSlot(id) {
    if(confirm("حذف هذا الموعد من الجدول؟")) {
        await db.collection("slots").doc(id).delete();
        closeModal();
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
