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
   1. توليد المواعيد (تصليح الأسبوعي)
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

    alert("جاري توليد مواعيد أسبوع كامل.. انتظري لحظة ⏳");

    for (let i = 0; i < 7; i++) {
        let dateObj = new Date(startDateInput);
        dateObj.setDate(dateObj.getDate() + i);
        
        // تحويل التاريخ لنص YYYY-MM-DD بطريقة آمنة
        let y = dateObj.getFullYear();
        let m = String(dateObj.getMonth() + 1).padStart(2, '0');
        let d = String(dateObj.getDate()).padStart(2, '0');
        let dateStr = `${y}-${m}-${d}`; 

        let startDateTime = new Date(`${dateStr}T${start}`);
        let endDateTime = new Date(`${dateStr}T${end}`);

        while (startDateTime < endDateTime) {
            let timeLabel = startDateTime.toTimeString().slice(0, 5);
            
            // إضافة الموعد لقاعدة البيانات
            await db.collection("slots").add({
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
    alert("تم توليد جدول 7 أيام بنجاح ✅");
    location.reload(); // إعادة تحميل لرؤية النتائج
}

/* =========================================
   2. عرض المواعيد
   ========================================= */
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    db.collection("slots").orderBy("date").orderBy("time").get().then(snap => {
        container.innerHTML = "";
        let totalRevenue = 0;
        let today = new Date().toISOString().split('T')[0];

        snap.forEach(doc => {
            let s = doc.data();
            if (s.date === today && s.status === "attended") { totalRevenue += (s.price || 0); }
            
            let isBooked = s.booked;
            container.innerHTML += `
                <div class="card" style="border-right: 8px solid ${isBooked ? '#f1c40f' : '#4caf50'}">
                    <p>📅 ${s.date} | ⏰ ${s.time}</p>
                    <p>${isBooked ? `👤 ${s.patient.name}` : "🟢 متاح"}</p>
                    <button onclick='viewPatientDetails("${doc.id}")'>إدارة</button>
                </div>`;
        });
        document.getElementById("dailyRevenue").innerText = `دخل اليوم: ${totalRevenue} ج.م`;
    });
}

// استدعاء المواعيد عند الفتح
window.onload = loadSlots;
