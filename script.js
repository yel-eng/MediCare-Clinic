// 1. Config (سيبيه زي ما هو عندك)
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
let currentActiveSlot = null; // عشان نعرف إحنا فاتحين ميعاد مين

/* =========================================
   توليد المواعيد (7 أيام كاملة - الأسبوعي)
   ========================================= */
function generateSmartSlots() {
    let startDateInput = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);
    let price = prompt("سعر الكشف الموحد للأسبوع:", "200");

    if (!startDateInput || !start || !end || !duration) {
        alert("املئي كل الحقول أولاً"); return;
    }

    // Loop الأسبوع (7 أيام)
    for (let i = 0; i < 7; i++) {
        let currentDay = new Date(startDateInput);
        currentDay.setDate(currentDay.getDate() + i);
        let dateStr = currentDay.toISOString().split('T')[0];

        let startDateTime = new Date(`${dateStr}T${start}`);
        let endDateTime = new Date(`${dateStr}T${end}`);

        while (startDateTime < endDateTime) {
            let timeLabel = startDateTime.toTimeString().slice(0, 5);
            db.collection("slots").add({
                date: dateStr,
                time: timeLabel,
                booked: false,
                patient: null,
                price: parseFloat(price) || 0,
                status: "pending",
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            startDateTime.setMinutes(startDateTime.getMinutes() + duration);
        }
    }
    alert("تم توليد جدول أسبوعي كامل بنجاح ✅");
    loadSlots();
}

/* =========================================
   إدارة الحجز والتعديل (الأدمن)
   ========================================= */
function viewPatientDetails(id) {
    currentActiveSlot = id;
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || { name: "", phone: "", note: "", photo: "" };
        
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3>إدارة ميعاد: ${s.date} | ${s.time}</h3>
            <label>اسم المريض (للحجز اليدوي):</label>
            <input id="editName" value="${p.name}" placeholder="الاسم">
            <label>رقم الهاتف:</label>
            <input id="editPhone" value="${p.phone}" placeholder="الهاتف مع كود الدولة">
            <label>المبلغ:</label>
            <input id="editPrice" type="number" value="${s.price || 0}">
            <label>الحالة:</label>
            <select id="editStatus">
                <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>انتظار</option>
                <option value="attended" ${s.status === 'attended' ? 'selected' : ''}>حضر</option>
                <option value="missed" ${s.status === 'missed' ? 'selected' : ''}>لم يحضر</option>
            </select>
            <label>ملاحظات:</label>
            <textarea id="editNote" style="width:100%; height:60px;">${p.note || ""}</textarea>
            <label>رابط صورة التحاليل/الأشعة:</label>
            <input id="editPhoto" value="${p.photo || ""}" placeholder="رابط الصورة">
            
            <div id="qrcode_area" style="margin:15px auto; display:flex; justify-content:center;"></div>
            
            <button onclick="updateFullBooking('${id}')">حفظ كل البيانات ✅</button>
        `;

        // توليد QR بكل البيانات
        let qrData = `المريض: ${p.name}\nالتاريخ: ${s.date}\nالوقت: ${s.time}\nالملاحظات: ${p.note}`;
        new QRCode(document.getElementById("qrcode_area"), { text: qrData, width: 120, height: 120 });
    });
}

// تحديث وحجز يدوي من الأدمن
function updateFullBooking(id) {
    let name = document.getElementById("editName").value;
    let phone = document.getElementById("editPhone").value;
    let price = parseFloat(document.getElementById("editPrice").value);
    let status = document.getElementById("editStatus").value;
    let note = document.getElementById("editNote").value;
    let photo = document.getElementById("editPhoto").value;

    db.collection("slots").doc(id).update({
        booked: name.trim() !== "",
        price: price,
        status: status,
        patient: { name, phone, note, photo }
    }).then(() => {
        alert("تم تحديث البيانات بنجاح");
        loadSlots();
    });
}

/* =========================================
   ميزة إرسال واتساب
   ========================================= */
function sendWhatsApp() {
    let name = document.getElementById("editName").value;
    let phone = document.getElementById("editPhone").value;
    let note = document.getElementById("editNote").value;
    
    if(!phone) { alert("لا يوجد رقم هاتف!"); return; }
    
    let msg = `أهلاً يا ${name}%0Aنود إبلاغك بخصوص حجزك في عيادة ماي دكتور.%0Aملاحظات الطبيب: ${note}`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

/* =========================================
   عرض المواعيد (تحسين الترتيب)
   ========================================= */
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    db.collection("slots").get().then(snap => {
        let slots = [];
        snap.forEach(doc => slots.push({id: doc.id, ...doc.data()}));
        
        // ترتيب يدوي بالأيام والساعات
        slots.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));

        container.innerHTML = "";
        slots.forEach(s => {
            let isBooked = s.booked;
            container.innerHTML += `
                <div class="card" style="border-right: 8px solid ${isBooked ? '#f1c40f' : '#2ecc71'}">
                    <p>📅 ${s.date} | ⏰ ${s.time}</p>
                    <p>${isBooked ? "👤 " + s.patient.name : "🟢 متاح"}</p>
                    <button onclick='viewPatientDetails("${s.id}")'>تعديل / حجز يدوي</button>
                </div>`;
        });
    });
}

// تشغيل عند التحميل
window.onload = function() {
    if(typeof loadAvailableSlots === 'function') loadAvailableSlots();
    loadSlots();
};
/* =========================================
   عرض المواعيد للمريض (حل مشكلة الاختفاء)
   ========================================= */
function loadAvailableSlots() {
    let select = document.getElementById("slotsSelect");
    if (!select) return;

    // شلنا الـ orderBy من الكويري عشان ما يطلبش Index ويوقف الشغل
    db.collection("slots").where("booked", "==", false).get().then(snap => {
        let allSlots = [];
        snap.forEach(doc => {
            allSlots.push({ id: doc.id, ...doc.data() });
        });

        // بنرتب المواعيد هنا "كود" بدل "سيرفر" عشان نضمن إنها تشتغل فوراً
        allSlots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        select.innerHTML = '<option value="">اختر ميعاداً متاحاً...</option>';
        allSlots.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.date} | الساعة ${s.time}</option>`;
        });
        
        if(allSlots.length === 0) {
            select.innerHTML = '<option value="">لا توجد مواعيد متاحة حالياً</option>';
        }
    }).catch(err => {
        console.error("Error loading slots:", err);
        select.innerHTML = '<option value="">حدث خطأ في التحميل</option>';
    });
}

/* =========================================
   باقي الدوال (الأدمن والحجز)
   ========================================= */
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    db.collection("slots").get().then(snap => {
        let slotsArr = [];
        snap.forEach(doc => slotsArr.push({id: doc.id, ...doc.data()}));
        
        // ترتيب يدوي للأدمن أيضاً
        slotsArr.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        container.innerHTML = "";
        let totalRevenue = 0;
        let today = new Date().toISOString().split('T')[0];

        slotsArr.forEach(s => {
            if (s.date === today && s.status === "attended") { totalRevenue += (s.price || 0); }
            let isBooked = s.booked;
            container.innerHTML += `
                <div class="card" style="border-right: 8px solid ${isBooked ? (s.status === 'attended' ? '#2ecc71' : '#f1c40f') : '#4caf50'}">
                    <p>📅 ${s.date} | ⏰ ${s.time}</p>
                    <p>${isBooked ? `👤 ${s.patient.name}` : "🟢 متاح"}</p>
                    <button onclick='viewPatientDetails("${s.id}")'>إدارة الحجز</button>
                </div>`;
        });
        if(document.getElementById("dailyRevenue")) 
            document.getElementById("dailyRevenue").innerHTML = `دخل اليوم المحصل: 💰 ${totalRevenue} ج.م`;
    });
}

// دالة الحجز للمريض
function book() {
    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let slotId = document.getElementById("slotsSelect").value;

    if (!name || !phone || !slotId) { alert("أكمل البيانات"); return; }

    db.collection("slots").doc(slotId).update({
        booked: true,
        patient: { name, phone, note: "" }
    }).then(() => {
        localStorage.setItem("name", name);
        localStorage.setItem("phone", phone);
        window.location.href = "confirm.html";
    });
}

// الدوال المساعدة (Modal)
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3>تعديل الحجز</h3>
            <input id="editName" value="${s.patient ? s.patient.name : ''}" placeholder="الاسم">
            <input id="editPrice" type="number" value="${s.price || 0}" placeholder="السعر">
            <select id="editStatus">
                <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>انتظار</option>
                <option value="attended" ${s.status === 'attended' ? 'selected' : ''}>حضر</option>
                <option value="missed" ${s.status === 'missed' ? 'selected' : ''}>غائب</option>
            </select>
            <button onclick="updateFullBooking('${id}')">حفظ</button>
        `;
    });
}

function updateFullBooking(id) {
    let name = document.getElementById("editName").value;
    let price = parseFloat(document.getElementById("editPrice").value);
    let status = document.getElementById("editStatus").value;
    db.collection("slots").doc(id).update({
        booked: name !== "",
        price: price,
        status: status,
        "patient.name": name
    }).then(() => { alert("تم التحديث"); location.reload(); });
}

window.onload = function() {
    loadSlots();
    loadAvailableSlots();
};
