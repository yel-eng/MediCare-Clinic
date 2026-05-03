// 1. إعدادات الفايربيس (Config)
const firebaseConfig = {
    apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
    authDomain: "mydoctor-clinic.firebaseapp.com",
    projectId: "mydoctor-clinic",
    storageBucket: "mydoctor-clinic.appspot.com",
    messagingSenderId: "996532645974",
    appId: "1:996532645974:web:bfc3e6a61bdc7f04a24bf7"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/* =========================================
   القسم الأول: نظام المواعيد الأسبوعي والمالي (الأدمن)
   ========================================= */

// توليد مواعيد أسبوع كامل بضغطة واحدة
function generateSmartSlots() {
    let startDateInput = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);
    let price = prompt("أدخلي سعر الكشف الموحد (مثلاً 200):", "200");

    if (!startDateInput || !start || !end || !duration) {
        alert("يا مبرمجة، املئي التاريخ والوقت والمدة أولاً!");
        return;
    }

    // إنشاء مواعيد لـ 7 أيام متتالية
    for (let i = 0; i < 7; i++) {
        let currentDate = new Date(startDateInput);
        currentDate.setDate(currentDate.getDate() + i);
        let dateStr = currentDate.toISOString().split('T')[0];

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
                status: "pending", // الحالات: pending (انتظار), attended (حضر), missed (لم يحضر)
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            startDateTime.setMinutes(startDateTime.getMinutes() + duration);
        }
    }
    alert("تم توليد جدول أسبوع كامل بنجاح ✅");
    loadSlots();
}

// تحميل المواعيد وحساب الأرباح
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    db.collection("slots").orderBy("date").get().then(snap => {
        container.innerHTML = "";
        let totalRevenue = 0;
        let today = new Date().toISOString().split('T')[0];

        snap.forEach(doc => {
            let s = doc.data();
            let isBooked = s.booked;
            
            // حساب أرباح اليوم للمرضى الذين حضروا فقط
            if (s.date === today && s.status === "attended") {
                totalRevenue += (s.price || 0);
            }

            container.innerHTML += `
                <div class="card" style="border-right: 8px solid ${isBooked ? (s.status === 'attended' ? '#2ecc71' : '#f1c40f') : '#4caf50'}">
                    <p>📅 ${s.date} | ⏰ ${s.time}</p>
                    <p>الحالة: ${isBooked ? `🔴 محجوز (${s.status})` : "🟢 متاح"}</p>
                    <p>💰 السعر: ${s.price || 0} ج.م</p>
                    ${isBooked ? `
                        <p>👤 ${s.patient.name}</p>
                        <button onclick='viewPatientDetails("${doc.id}")'>تعديل / حسابات / QR</button>
                    ` : `<button onclick='viewPatientDetails("${doc.id}")' style="background:#666">تعديل يدوي</button>`}
                </div>
            `;
        });

        // عرض إجمالي الدخل في الصفحة
        let revDiv = document.getElementById("dailyRevenue");
        if (revDiv) revDiv.innerHTML = `إجمالي دخل اليوم (المحصل فعلياً): 💰 ${totalRevenue} جنيه`;
    });
}

/* =========================================
   القسم الثاني: التعديل الكامل والملف الطبي (Modal)
   ========================================= */

function viewPatientDetails(slotId) {
    db.collection("slots").doc(slotId).get().then(doc => {
        let s = doc.data();
        const modal = document.getElementById("patientModal");
        const content = document.getElementById("modalContent");
        
        modal.style.display = "block";
        if(document.getElementById("overlay")) document.getElementById("overlay").style.display = "block";

        content.innerHTML = `
            <h3>تعديل بيانات الحجز</h3>
            <label>اسم المريض:</label>
            <input id="editName" value="${s.patient ? s.patient.name : ''}" placeholder="اسم المريض">
            <label>رقم الهاتف:</label>
            <input id="editPhone" value="${s.patient ? s.patient.phone : ''}" placeholder="الهاتف">
            <label>المبلغ (سعر الكشف):</label>
            <input type="number" id="editPrice" value="${s.price || 0}">
            <label>حالة الزيارة:</label>
            <select id="editStatus">
                <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>انتظار (لم يدفع بعد)</option>
                <option value="attended" ${s.status === 'attended' ? 'selected' : ''}>حضر (تم التحصيل)</option>
                <option value="missed" ${s.status === 'missed' ? 'selected' : ''}>لم يحضر (خصم من الحساب)</option>
            </select>
            <label>ملاحظات طبية:</label>
            <textarea id="editNote" style="width:100%; height:80px;">${s.patient ? s.patient.note : ''}</textarea>
            
            <div id="qrcode_area" style="margin:10px auto; display:flex; justify-content:center;"></div>
            
            <button onclick="updateFullBooking('${slotId}')">حفظ التعديلات ✅</button>
            <button onclick="deleteSlot('${slotId}')" style="background:#e74c3c; margin-top:5px;">حذف الموعد نهائياً 🗑️</button>
        `;

        // توليد QR
        new QRCode(document.getElementById("qrcode_area"), {
            text: `https://mydoctor.com/patient.html?id=${slotId}`,
            width: 100, height: 100
        });
    });
}

function updateFullBooking(id) {
    let name = document.getElementById("editName").value;
    let phone = document.getElementById("editPhone").value;
    let price = parseFloat(document.getElementById("editPrice").value);
    let status = document.getElementById("editStatus").value;
    let note = document.getElementById("editNote").value;

    db.collection("slots").doc(id).update({
        booked: name.trim() !== "", // لو الاسم فاضي يرجع الموعد متاح
        price: price,
        status: status,
        patient: name.trim() !== "" ? { name, phone, note } : null
    }).then(() => {
        alert("تم تحديث البيانات والحسابات بنجاح");
        closeModal();
        loadSlots();
    });
}

function deleteSlot(id) {
    if(confirm("هل أنتي متأكدة من حذف هذا الموعد تماماً؟")) {
        db.collection("slots").doc(id).delete().then(() => { closeModal(); loadSlots(); });
    }
}

/* =========================================
   القسم الثالث: نظام الحجز للمريض (Client)
   ========================================= */

function loadAvailableSlots() {
    let select = document.getElementById("slotsSelect");
    if(!select) return;

    db.collection("slots").where("booked", "==", false).orderBy("date").get().then(snap => {
        select.innerHTML = '<option value="">اختر ميعاداً متاحاً...</option>';
        snap.forEach(doc => {
            let s = doc.data();
            select.innerHTML += `<option value="${doc.id}">${s.date} - الساعة ${s.time}</option>`;
        });
    });
}

function book() {
    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let slotId = document.getElementById("slotsSelect").value;

    if (!name || !phone || !slotId) { alert("من فضلك ادخل بياناتك كاملة"); return; }

    db.collection("slots").doc(slotId).update({
        booked: true,
        status: "pending",
        patient: { name, phone, note: "", photo: "" }
    }).then(() => {
        localStorage.setItem("name", name);
        localStorage.setItem("phone", phone);
        window.location.href = "confirm.html";
    });
}

/* =========================================
   إضافات المحتوى (فيديوهات ومقالات)
   ========================================= */

function addVideo() {
    let url = document.getElementById("videoUrl").value;
    let text = document.getElementById("videoText").value;
    db.collection("videos").add({ url, text }).then(() => alert("تمت الإضافة"));
}

function addBlog() {
    let title = document.getElementById("blogTitle").value;
    let text = document.getElementById("blogText").value;
    db.collection("blogs").add({ title, text }).then(() => alert("تم النشر"));
}

// تشغيل عند فتح الصفحة
window.onload = function () {
    loadSlots();
    loadAvailableSlots();
};

function closeModal() {
    document.getElementById("patientModal").style.display = "none";
    if(document.getElementById("overlay")) document.getElementById("overlay").style.display = "none";
}
