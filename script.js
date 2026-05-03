// 1. Firebase Config
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

/* =========================================
   1. توليد المواعيد (7 أيام متتالية)
   ========================================= */
async function generateSmartSlots() {
    let startDateInput = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);
    let price = prompt("سعر الكشف الموحد للأسبوع:", "200");

    if (!startDateInput || !start || !end || !duration) {
        alert("يا دكتورة املئي كل الحقول أولاً"); return;
    }

    alert("جاري توليد مواعيد أسبوع كامل.. انتظري ثواني ⏳");

    // نستخدم Batch لضمان سرعة التسجيل وعدم ضياع البيانات
    let batch = db.batch();

    for (let i = 0; i < 7; i++) {
        let dateObj = new Date(startDateInput);
        dateObj.setDate(dateObj.getDate() + i);
        
        let y = dateObj.getFullYear();
        let m = String(dateObj.getMonth() + 1).padStart(2, '0');
        let d = String(dateObj.getDate()).padStart(2, '0');
        let dateStr = `${y}-${m}-${d}`; 

        let startDateTime = new Date(`${dateStr}T${start}`);
        let endDateTime = new Date(`${dateStr}T${end}`);

        while (startDateTime < endDateTime) {
            let timeLabel = startDateTime.toTimeString().slice(0, 5);
            let ref = db.collection("slots").doc(); // إنشاء مستند جديد عشوائي
            
            batch.set(ref, {
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

    await batch.commit();
    alert("تم توليد جدول 7 أيام بنجاح ✅");
    location.reload();
}

/* =========================================
   2. عرض المواعيد (للأدمن والمريض)
   ========================================= */
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    // تم تعديل الاستعلام ليعمل بدون الحاجة لـ Index معقد
    db.collection("slots").get().then(snap => {
        let slotsArr = [];
        snap.forEach(doc => slotsArr.push({id: doc.id, ...doc.data()}));
        
        // ترتيب يدوي لضمان الظهور الصحيح
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
            document.getElementById("dailyRevenue").innerText = `دخل اليوم المحصل: 💰 ${totalRevenue} ج.م`;
    });
}

// دالة خاصة لصفحة المريض (تعبئة القائمة المنسدلة)
function loadAvailableSlotsForPatient() {
    let select = document.getElementById("slotsSelect");
    if (!select) return;

    db.collection("slots").where("booked", "==", false).get().then(snap => {
        let available = [];
        snap.forEach(doc => available.push({id: doc.id, ...doc.data()}));
        available.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        select.innerHTML = '<option value="">-- اختر ميعاداً متاحاً --</option>';
        available.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.date} | الساعة ${s.time}</option>`;
        });
    });
}

/* =========================================
   3. تفاصيل المريض (QR، واتساب، تحاليل)
   ========================================= */
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || { name: "", phone: "", note: "", photo: "" };
        
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        
        document.getElementById("modalContent").innerHTML = `
            <h3>إدارة ميعاد: ${s.date} | ${s.time}</h3>
            <label>اسم المريض:</label>
            <input id="editName" value="${p.name}" placeholder="الاسم (للحجز اليدوي)">
            <label>رقم الهاتف:</label>
            <input id="editPhone" value="${p.phone}" placeholder="رقم الواتساب">
            <label>سعر الكشف:</label>
            <input id="editPrice" type="number" value="${s.price || 0}">
            <label>الحالة:</label>
            <select id="editStatus">
                <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>انتظار</option>
                <option value="attended" ${s.status === 'attended' ? 'selected' : ''}>حضر ودفع</option>
                <option value="missed" ${s.status === 'missed' ? 'selected' : ''}>لم يحضر</option>
            </select>
            <label>ملاحظات طبية:</label>
            <textarea id="editNote" style="width:100%; height:60px;">${p.note || ""}</textarea>
            <label>رابط صورة الأشعة/التحاليل:</label>
            <input id="editPhoto" value="${p.photo || ""}" placeholder="رابط الصورة">
            
            <div id="qrcode_area" style="margin:15px auto; display:flex; justify-content:center;"></div>
            
            <button onclick="updateFullBooking('${id}')" style="background:#2ecc71">حفظ البيانات ✅</button>
            <button onclick="sendWhatsAppMessage()" style="background:#25D366; margin-top:5px;">مراسلة واتساب 💬</button>
        `;

        let qrText = `المريض: ${p.name}\nالموعد: ${s.date} ${s.time}\nملاحظات: ${p.note}`;
        new QRCode(document.getElementById("qrcode_area"), { text: qrText, width: 100, height: 100 });
    });
}

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
        alert("تم التحديث");
        location.reload();
    });
}

function sendWhatsAppMessage() {
    let name = document.getElementById("editName").value;
    let phone = document.getElementById("editPhone").value;
    if(!phone) return alert("لا يوجد رقم هاتف");
    let msg = `أهلاً يا ${name}، نذكركم بموعدكم في العيادة يوم ${document.getElementById("editName").parentElement.querySelector('h3').innerText}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
}

/* =========================================
   4. تنفيذ الحجز (للمريض)
   ========================================= */
function book() {
    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let slotId = document.getElementById("slotsSelect").value;

    if (!name || !phone || !slotId) { alert("أكمل بياناتك"); return; }

    db.collection("slots").doc(slotId).update({
        booked: true,
        patient: { name, phone, note: "", photo: "" }
    }).then(() => {
        window.location.href = "confirm.html";
    });
}

// تشغيل عند التحميل
window.onload = function() {
    loadSlots(); // للأدمن
    loadAvailableSlotsForPatient(); // للمريض
};
