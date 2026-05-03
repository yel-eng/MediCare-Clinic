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

// دالة مساعدة للحصول على التاريخ المحلي بصيغة YYYY-MM-DD بدقة
function getLocalDateString(dateObj) {
    let y = dateObj.getFullYear();
    let m = String(dateObj.getMonth() + 1).padStart(2, '0');
    let d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 1. توليد واجهة الأيام (إصلاح مشكلة التواريخ المتضاربة)
function setupWeekUI() {
    const grid = document.getElementById("weekSetupGrid");
    if (!grid) return;
    const startDateInput = document.getElementById("startDatePicker");
    
    let start = (startDateInput && startDateInput.value) ? new Date(startDateInput.value) : new Date();
    
    grid.innerHTML = ""; 
    for (let i = 0; i < 7; i++) {
        let current = new Date(start);
        current.setDate(start.getDate() + i);
        
        // استخدام الدالة المساعدة لضمان ثبات التاريخ
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

// 2. توليد المواعيد (مرن: يولد فقط الأيام المدخلة)
async function generateSmartSlots() {
    const rows = document.querySelectorAll(".day-setup-row");
    const durationEl = document.getElementById("duration");
    const duration = parseInt(durationEl ? durationEl.value : 30);
    
    let price = prompt("سعر الكشف (ج.م):", "200");
    if (!price) return;

    let batch = db.batch();
    let count = 0;

    rows.forEach(row => {
        const dateStr = row.getAttribute("data-date");
        const startInput = row.querySelector(".start-t");
        const endInput = row.querySelector(".end-t");

        if (startInput && endInput && startInput.value && endInput.value) {
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

    if (count === 0) return alert("يرجى إدخال وقت ليوم واحد على الأقل!");
    
    await batch.commit();
    alert(`تم توليد ${count} موعد بنجاح!`);
    location.reload();
}

// 3. تحميل الجدول (إظهار الأسماء وتحديث لحظي)
function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    if (!container) return;
    let today = getLocalDateString(new Date());

    db.collection("slots").where("date", ">=", today).onSnapshot(snap => {
        let daysMap = {};
        let totalRev = 0;

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            // حساب الدخل فقط لمن "تم الكشف" عليهم اليوم
            if (s.date === today && s.status === "attended") totalRev += (Number(s.price) || 0);
        });

        const revEl = document.getElementById("dailyRevenue");
        if (revEl) revEl.innerText = `💰 دخل اليوم الفعلي: ${totalRev} ج.م`;

        container.innerHTML = "";
        let sortedDates = Object.keys(daysMap).sort();

        sortedDates.forEach(date => {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', {weekday: 'long'});
            
            dayDiv.innerHTML = `
                <div class="day-header">
                    ${dayName}<br>${date}
                    <button onclick="deleteDay('${date}')" style="background:red; color:white; border:none; font-size:10px; cursor:pointer; padding:2px 5px; margin-top:5px; border-radius:3px;">مسح اليوم</button>
                </div>`;
            
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                const isBooked = slot.booked === true;
                const pName = (isBooked && slot.patient) ? slot.patient.name : "متاح";
                
                dayDiv.innerHTML += `
                    <div class="slot-item ${isBooked ? 'booked-card' : ''}" style="${isBooked ? 'border-right:5px solid #e74c3c; background:#fff5f5;' : ''}">
                        <div style="display:flex; flex-direction:column; overflow:hidden;">
                            <span><b>${slot.time}</b> ${isBooked ? '👤' : '🟢'}</span>
                            <small style="color:#2c3e50; font-weight:bold; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${pName}</small>
                        </div>
                        <button onclick="viewPatientDetails('${slot.id}')" class="btn-outline" style="font-size:11px; padding:4px;">إدارة</button>
                    </div>`;
            });
            container.appendChild(dayDiv);
        });
    });
}

// 4. عرض التفاصيل مع ميزة الواتساب
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        if (!doc.exists) return;
        let s = doc.data();
        let p = s.patient || {name:"", phone:"", note:""};
        
        let whatsappBtn = (p.phone && p.phone !== "-") ? 
            `<a href="https://wa.me/${p.phone.replace(/\s/g, '')}" target="_blank" style="background:#25D366; color:white; text-decoration:none; padding:8px; border-radius:5px; display:inline-block; margin-top:5px; font-size:12px;">💬 واتساب</a>` : "";

        document.getElementById("modal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>📋 إدارة الحجز</h3>
                ${whatsappBtn}
            </div>
            <p style="font-size:13px;"><b>التاريخ:</b> ${s.date} | <b>الوقت:</b> ${s.time}</p>
            <hr>
            <label>اسم المريض:</label>
            <input id="en" value="${p.name}" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ddd; border-radius:4px;">
            <label>رقم الهاتف:</label>
            <input id="ep" value="${p.phone}" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ddd; border-radius:4px;">
            <label>الحالة:</label>
            <select id="es" style="width:100%; padding:8px; margin-bottom:10px;">
                <option value="pending" ${s.status==='pending'?'selected':''}>انتظار</option>
                <option value="attended" ${s.status==='attended'?'selected':''}>تم الكشف</option>
            </select>
            <label>ملاحظات:</label>
            <textarea id="enot" style="width:100%; height:60px; padding:8px; border:1px solid #ddd; border-radius:4px;">${p.note||""}</textarea>
            <button onclick="saveAdmin('${id}')" class="btn-main" style="width:100%; margin-top:10px; padding:10px;">حفظ التغييرات</button>
            <button onclick="deleteSlot('${id}')" style="background:none; color:red; border:none; width:100%; cursor:pointer; margin-top:15px; font-size:12px;">❌ حذف هذا الموعد نهائياً</button>
        `;
    });
}

// 5. حفظ وحذف
async function saveAdmin(id) {
    const name = document.getElementById("en").value;
    const phone = document.getElementById("ep").value;
    const status = document.getElementById("es").value;
    const note = document.getElementById("enot").value;
    
    await db.collection("slots").doc(id).update({
        status: status,
        booked: name.trim() !== "", 
        patient: { name: name, phone: phone, note: note }
    });
    closeModal();
}

async function deleteDay(date) {
    if(confirm(`سيتم مسح جميع مواعيد يوم ${date}. هل أنت متأكد؟`)) {
        const snap = await db.collection("slots").where("date", "==", date).get();
        const batch = db.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
}

async function deleteSlot(id) {
    if(confirm("هل تريد حذف هذا الموعد من الجدول؟")) {
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
