// 1. إعدادات الفايربيس (تأكدي أن الـ Config صحيح من ملفك الأصلي)
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
   القسم الأول: نظام المواعيد الذكي (الأدمن)
   ========================================= */

// دالة توليد المواعيد آلياً بناءً على المدة
function generateSmartSlots() {
    let date = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);

    if (!date || !start || !end || !duration) {
        alert("يا مبرمجة، لازم تملي كل البيانات (التاريخ، البداية، النهاية، المدة)");
        return;
    }

    let startDateTime = new Date(`${date}T${start}`);
    let endDateTime = new Date(`${date}T${end}`);

    while (startDateTime < endDateTime) {
        let timeLabel = startDateTime.toTimeString().slice(0, 5);
        
        db.collection("slots").add({
            date: date,
            time: timeLabel,
            booked: false,
            patient: null,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        startDateTime.setMinutes(startDateTime.getMinutes() + duration);
    }
    alert("تم تقسيم المواعيد وإضافتها بنجاح ✅");
    loadSlots(); 
}

// تحميل المواعيد في صفحة الأدمن
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    db.collection("slots").orderBy("date").get().then(snap => {
        container.innerHTML = "";
        snap.forEach(doc => {
            let s = doc.data();
            let isBooked = s.booked;
            container.innerHTML += `
                <div class="card" style="border-right: 8px solid ${isBooked ? '#f44336' : '#4caf50'}">
                    <p>📅 ${s.date} | ⏰ ${s.time}</p>
                    <p>الحالة: ${isBooked ? "🔴 محجوز" : "🟢 متاح"}</p>
                    ${isBooked ? `
                        <p>👤 ${s.patient.name}</p>
                        <button onclick='viewPatientDetails("${doc.id}")'>الملف الطبي والـ QR</button>
                    ` : ""}
                </div>
            `;
        });
    });
}

/* =========================================
   القسم الثاني: حجز المريض (Client)
   ========================================= */

function loadAvailableSlots() {
    let select = document.getElementById("slotsSelect");
    if(!select) return;

    db.collection("slots").where("booked", "==", false).get().then(snap => {
        select.innerHTML = '<option value="">اختر ميعاداً...</option>';
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

    if (!name || !phone || !slotId) { alert("اكتبي بياناتك يا دكتورة"); return; }

    db.collection("slots").doc(slotId).update({
        booked: true,
        patient: { name, phone, note: "لا يوجد ملاحظات بعد", photo: "" }
    }).then(() => {
        localStorage.setItem("name", name);
        localStorage.setItem("phone", phone);
        window.location.href = "confirm.html";
    });
}

/* =========================================
   القسم الثالث: إدارة ملف المريض (الملاحظات والـ QR)
   ========================================= */

function viewPatientDetails(slotId) {
    db.collection("slots").doc(slotId).get().then(doc => {
        let data = doc.data();
        const modal = document.getElementById("patientModal");
        const content = document.getElementById("modalContent");
        
        modal.style.display = "block";
        content.innerHTML = `
            <h3>تعديل ملف المريض: ${data.patient.name}</h3>
            <p>الهاتف: ${data.patient.phone}</p>
            <textarea id="tempNote" style="width:100%; height:100px;">${data.patient.note || ""}</textarea>
            <div id="qrcode_area" style="margin:10px auto; display:flex; justify-content:center;"></div>
            <button onclick="saveNote('${slotId}')">حفظ الملاحظات</button>
        `;

        // توليد QR ينقل لصفحة بيانات المريض
        new QRCode(document.getElementById("qrcode_area"), {
            text: `https://mydoctor.com/patient.html?id=${slotId}`,
            width: 120, height: 120
        });
    });
}

function saveNote(id) {
    let note = document.getElementById("tempNote").value;
    db.collection("slots").doc(id).update({ "patient.note": note })
    .then(() => { alert("تم الحفظ"); document.getElementById("patientModal").style.display="none"; });
}

/* =========================================
   القسم الرابع: الفيديوهات والمقالات (اللي كانوا عندك)
   ========================================= */

function addVideo() {
    let url = document.getElementById("videoUrl").value;
    let text = document.getElementById("videoText").value;
    db.collection("videos").add({ url, text });
    alert("تمت الإضافة");
}

function addBlog() {
    let title = document.getElementById("blogTitle").value;
    let text = document.getElementById("blogText").value;
    db.collection("blogs").add({ title, text });
    alert("تم النشر");
}

// تشغيل الدوال عند فتح الصفحة
window.onload = function () {
    loadSlots();
    loadAvailableSlots();
};
