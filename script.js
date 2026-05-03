// 1. Config (تأكدي من صحة بياناتك هنا)
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
   توليد المواعيد (7 أيام كاملة)
   ========================================= */
function generateSmartSlots() {
    let startDateInput = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);
    let price = prompt("سعر الكشف الموحد للأسبوع:", "200");

    if (!startDateInput || !start || !end || !duration) {
        alert("املئي كل الحقول (التاريخ، بداية ونهاية الوقت، والمدة)");
        return;
    }

    // الـ Loop السحري لـ 7 أيام
    for (let i = 0; i < 7; i++) {
        let currentLoopDate = new Date(startDateInput);
        currentLoopDate.setDate(currentLoopDate.getDate() + i);
        let dateStr = currentLoopDate.toISOString().split('T')[0];

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
                timestamp: startDateTime.getTime() // بنحفظ الوقت كرقم عشان الترتيب السهل
            });
            startDateTime.setMinutes(startDateTime.getMinutes() + duration);
        }
    }
    alert("تم توليد جدول أسبوعي (7 أيام) بنجاح ✅");
    loadSlots();
}

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
