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
   1. وظائف المحتوى (فيديو ومقالات)
   ========================================= */
function addVideo() {
    const url = document.getElementById("videoUrl").value;
    const text = document.getElementById("videoText").value;
    if(!url || !text) return alert("اكمل بيانات الفيديو");
    db.collection("videos").add({ url, text, date: new Date().toLocaleDateString() })
      .then(() => { alert("تم إضافة الفيديو"); location.reload(); });
}

function addBlog() {
    const title = document.getElementById("blogTitle").value;
    const text = document.getElementById("blogText").value;
    if(!title || !text) return alert("اكمل بيانات المقال");
    db.collection("blogs").add({ title, text, date: new Date().toLocaleDateString() })
      .then(() => { alert("تم نشر المقال"); location.reload(); });
}

/* =========================================
   2. توليد المواعيد الأسبوعية (Batch)
   ========================================= */
async function generateSmartSlots() {
    let startDateInput = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);
    let price = prompt("سعر الكشف الموحد للأسبوع:", "200");

    if (!startDateInput || !start || !end || !duration) {
        alert("يا دكتورة املئي كل الحقول"); return;
    }

    alert("جاري إنشاء جدول الـ 7 أيام القادمة.. ⏳");
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
            let ref = db.collection("slots").doc();
            batch.set(ref, {
                date: dateStr, time: timeLabel, booked: false,
                patient: null, price: parseFloat(price) || 0, status: "pending"
            });
            startDateTime.setMinutes(startDateTime.getMinutes() + duration);
        }
    }
    await batch.commit();
    alert("تم توليد الأسبوع بنجاح ✅");
    location.reload();
}

/* =========================================
   3. عرض المواعيد (أدمن + مريض)
   ========================================= */
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    db.collection("slots").get().then(snap => {
        let slotsArr = [];
        snap.forEach(doc => slotsArr.push({id: doc.id, ...doc.data()}));
        slotsArr.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        container.innerHTML = "";
        let totalRevenue = 0;
        let today = new Date().toISOString().split('T')[0];

        slotsArr.forEach(s => {
            if (s.date === today && s.status === "attended") totalRevenue += s.price;
            let isBooked = s.booked;
            container.innerHTML += `
                <div class="card" style="border-right: 8px solid ${isBooked ? (s.status === 'attended' ? '#2ecc71' : '#f1c40f') : '#4caf50'}">
                    <p>📅 ${s.date} | ⏰ ${s.time}</p>
                    <p>${isBooked ? `👤 ${s.patient.name}` : "🟢 متاح"}</p>
                    <button onclick='viewPatientDetails("${s.id}")'>إدارة الموعد</button>
                </div>`;
        });
        document.getElementById("dailyRevenue").innerText = `دخل اليوم المحصل: 💰 ${totalRevenue} ج.م`;
    });
}

function loadAvailableSlotsForPatient() {
    let select = document.getElementById("slotsSelect");
    if (!select) return;
    db.collection("slots").where("booked", "==", false).get().then(snap => {
        let available = [];
        snap.forEach(doc => available.push({id: doc.id, ...doc.data()}));
        available.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        select.innerHTML = '<option value="">-- اختر ميعاداً --</option>';
        available.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.date} | الساعة ${s.time}</option>`;
        });
    });
}

/* =========================================
   4. إدارة الحجز (QR - واتساب - تحاليل)
   ========================================= */
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || { name: "", phone: "", note: "", photo: "" };
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3>إدارة ميعاد: ${s.date} | ${s.time}</h3>
            <label>اسم المريض:</label> <input id="editName" value="${p.name}">
            <label>الهاتف:</label> <input id="editPhone" value="${p.phone}">
            <label>السعر:</label> <input id="editPrice" type="number" value="${s.price}">
            <label>الحالة:</label>
            <select id="editStatus">
                <option value="pending" ${s.status === 'pending'?'selected':''}>انتظار</option>
                <option value="attended" ${s.status === 'attended'?'selected':''}>حضر ودفع</option>
            </select>
            <label>ملاحظات:</label> <textarea id="editNote">${p.note||""}</textarea>
            <label>رابط التحاليل:</label> <input id="editPhoto" value="${p.photo||""}">
            <div id="qrcode_area" style="margin:10px auto; display:flex; justify-content:center;"></div>
            <button onclick="updateFullBooking('${id}')" style="background:#2ecc71">حفظ وتأكيد</button>
            <button onclick="sendWhatsApp('${p.phone}', '${p.name}')" style="background:#25D366; margin-top:5px;">واتساب 💬</button>
        `;
        new QRCode(document.getElementById("qrcode_area"), { text: `Patient: ${p.name}, Date: ${s.date}`, width: 100, height: 100 });
    });
}

function updateFullBooking(id) {
    const data = {
        booked: document.getElementById("editName").value.trim() !== "",
        price: parseFloat(document.getElementById("editPrice").value),
        status: document.getElementById("editStatus").value,
        patient: {
            name: document.getElementById("editName").value,
            phone: document.getElementById("editPhone").value,
            note: document.getElementById("editNote").value,
            photo: document.getElementById("editPhoto").value
        }
    };
    db.collection("slots").doc(id).update(data).then(() => { alert("تم الحفظ"); location.reload(); });
}

function sendWhatsApp(phone, name) {
    if(!phone) return alert("لا يوجد رقم");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent('أهلاً يا ' + name + ' نذكركم بموعدكم في العيادة')}`);
}

/* =========================================
   5. الحجز (صفحة المريض)
   ========================================= */
function book() {
    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let slotId = document.getElementById("slotsSelect").value;
    if (!name || !phone || !slotId) return alert("اكمل بياناتك");
    db.collection("slots").doc(slotId).update({
        booked: true, patient: { name, phone, note: "", photo: "" }
    }).then(() => { window.location.href = "confirm.html"; });
}

window.onload = function() {
    loadSlots();
    loadAvailableSlotsForPatient();
};
