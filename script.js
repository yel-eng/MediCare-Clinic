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
   1. نظام توليد المواعيد (أسبوعي - 7 أيام)
   ========================================= */
function generateSmartSlots() {
    let startDateInput = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);
    let price = prompt("سعر الكشف الموحد للأسبوع:", "200");

    if (!startDateInput || !start || !end || !duration) {
        alert("يا دكتورة املئي كل الحقول (التاريخ، الوقت، المدة)"); return;
    }

    // تكرار العملية لـ 7 أيام متتالية
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
    alert("تم توليد جدول أسبوعي (7 أيام) بنجاح ✅");
    loadSlots();
}

/* =========================================
   2. عرض المواعيد (للأدمن وللمريض)
   ========================================= */
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    db.collection("slots").get().then(snap => {
        let slotsArr = [];
        snap.forEach(doc => slotsArr.push({id: doc.id, ...doc.data()}));
        
        // ترتيب المواعيد بالتاريخ والوقت
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
                    <button onclick='viewPatientDetails("${s.id}")'>إدارة الحجز / تعديل</button>
                </div>`;
        });
        if(document.getElementById("dailyRevenue")) 
            document.getElementById("dailyRevenue").innerHTML = `دخل اليوم المحصل: 💰 ${totalRevenue} ج.م`;
    });
}

function loadAvailableSlots() {
    let select = document.getElementById("slotsSelect");
    if (!select) return;

    db.collection("slots").where("booked", "==", false).get().then(snap => {
        let allSlots = [];
        snap.forEach(doc => allSlots.push({ id: doc.id, ...doc.data() }));
        allSlots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        select.innerHTML = '<option value="">اختر ميعاداً متاحاً...</option>';
        allSlots.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.date} | الساعة ${s.time}</option>`;
        });
    });
}

/* =========================================
   3. إدارة الحجز (تعديل، واتساب، QR، حجز يدوي)
   ========================================= */
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || { name: "", phone: "", note: "", photo: "" };
        
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3>إدارة ميعاد: ${s.date} | ${s.time}</h3>
            <label>اسم المريض:</label>
            <input id="editName" value="${p.name}" placeholder="الاسم (للحجز اليدوي اكتب هنا)">
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
            <input id="editPhoto" value="${p.photo || ""}" placeholder="ضع رابط الصورة هنا">
            
            <div id="qrcode_area" style="margin:15px auto; display:flex; justify-content:center;"></div>
            
            <button onclick="updateFullBooking('${id}')" style="background:#2ecc71">حفظ كل التعديلات ✅</button>
            <button onclick="sendWhatsApp()" style="background:#25D366; margin-top:5px;">إرسال للواتساب 💬</button>
        `;

        // توليد الـ QR بالبيانات الشاملة
        let qrText = `عيادة ماي دكتور\nالمريض: ${p.name}\nالموعد: ${s.date} ${s.time}\nملاحظات: ${p.note}`;
        new QRCode(document.getElementById("qrcode_area"), { text: qrText, width: 120, height: 120 });
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
        booked: name.trim() !== "", // لو الاسم اتكتب يتحول لمحجوز تلقائياً
        price: price,
        status: status,
        patient: { name, phone, note, photo }
    }).then(() => {
        alert("تم الحفظ وتحديث البيانات");
        location.reload();
    });
}

function sendWhatsApp() {
    let name = document.getElementById("editName").value;
    let phone = document.getElementById("editPhone").value;
    let note = document.getElementById("editNote").value;
    if(!phone) { alert("أدخلي رقم الهاتف أولاً"); return; }
    
    let msg = `أهلاً يا ${name}. نود تذكيرك بموعدك في عيادة MediCare. ملاحظاتك: ${note}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* =========================================
   4. الحجز من جهة المريض
   ========================================= */
function book() {
    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let slotId = document.getElementById("slotsSelect").value;

    if (!name || !phone || !slotId) { alert("من فضلك أكمل بياناتك"); return; }

    db.collection("slots").doc(slotId).update({
        booked: true,
        patient: { name, phone, note: "", photo: "" }
    }).then(() => {
        localStorage.setItem("name", name);
        localStorage.setItem("phone", phone);
        window.location.href = "confirm.html";
    });
}

window.onload = function() {
    loadSlots();
    loadAvailableSlots();
};
