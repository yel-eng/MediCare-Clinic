firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  }
});

// --- إعدادات Firebase ---
const firebaseConfig = { /* بياناتك هنا */ };
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

let activeSlotId = null; // الموعد المحدد حالياً للتعديل أو الحجز

// --- 1. توليد الجلسات (حسب مدة الجلسة واليوم المختار) ---
async function generateSlots() {
    const d = document.getElementById("targetDate").value;
    const s = document.getElementById("startTime").value;
    const e = document.getElementById("endTime").value;
    const dur = parseInt(document.getElementById("duration").value);

    if(!d) return alert("من فضلك اختر التاريخ أولاً");

    let curr = new Date(`${d}T${s}`);
    let stop = new Date(`${d}T${e}`);

    const batch = db.batch();
    while(curr < stop) {
        let ref = db.collection("slots").doc();
        batch.set(ref, {
            date: d,
            time: curr.toTimeString().substring(0,5),
            booked: false,
            status: 'متاح',
            paid: 0,
            timestamp: firebase.firestore.Timestamp.fromDate(new Date(curr))
        });
        curr.setMinutes(curr.getMinutes() + dur);
    }
    await batch.commit();
    alert("تم توليد الجدول بنجاح");
}

// --- 2. سحب البيانات وتحديث الحصالة (المنطق المالي) ---
function loadClinic() {
    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        const grid = document.getElementById("daysGrid");
        let daysGroups = {};
        let grandSafe = 0;

        snap.forEach(doc => {
            let data = doc.data();
            if(!daysGroups[data.date]) daysGroups[data.date] = { slots: [], dayCash: 0 };
            daysGroups[data.date].slots.push({id: doc.id, ...data});
            
            // الحصالة تحسب فقط من حالة "كشف"
            if(data.status === 'كشف') {
                daysGroups[data.date].dayCash += Number(data.paid || 0);
                grandSafe += Number(data.paid || 0);
            }
        });

        document.getElementById("grandTotal").innerText = grandSafe + " ج.م";
        grid.innerHTML = "";

        for(let date in daysGroups) {
            let col = document.createElement("div");
            col.className = "day-col";
            let html = `
                <div class="day-head">
                    <span class="del-day" onclick="deleteDay('${date}')">×</span>
                    <b>${date}</b><br>
                    <small>حصالة اليوم: ${daysGroups[date].dayCash} ج.م</small>
                </div>`;

            daysGroups[date].slots.forEach(slot => {
                html += `
                <div class="slot-item ${slot.booked ? 'booked' : ''}" onclick="openForEdit('${slot.id}')">
                    <b>${slot.time}</b> - <span class="status-label">${slot.status}</span>
                    ${slot.booked ? `
                        <div class="patient-card">
                            👤 ${slot.patient.name}<br>
                            📞 <a href="https://wa.me/2${slot.patient.phone}" target="_blank" style="color:#25d366">واتساب 📱</a>
                        </div>
                    ` : ''}
                </div>`;
            });
            col.innerHTML = html;
            grid.appendChild(col);
        }
    });
}

// --- 3. فتح البيانات للتعديل (الضغط على الموعد يسحب البيانات للخانات) ---
async function openForEdit(id) {
    activeSlotId = id;
    const doc = await db.collection("slots").doc(id).get();
    const data = doc.data();

    // ملء الخانات الجانبية تلقائياً لتمكين التعديل
    document.getElementById("pName").value = data.patient?.name || "";
    document.getElementById("pPhone").value = data.patient?.phone || "";
    document.getElementById("pPaid").value = data.paid || 0;
    document.getElementById("pStatus").value = data.status || "حجز";
    document.getElementById("pNotes").value = data.patient?.notes || "";
    
    // تمييز الموعد المختار بصرياً
    document.querySelectorAll('.slot-item').forEach(el => el.style.border = "none");
    event.currentTarget.style.border = "2px solid #00bcd4";
}

// --- 4. التثبيت النهائي (العميل أو الإدمن) ---
async function saveBooking() {
    if(!activeSlotId) return alert("اختر ميعاداً من الجدول أولاً بالضغط عليه");

    const name = document.getElementById("pName").value;
    const phone = document.getElementById("pPhone").value;
    const paid = document.getElementById("pPaid").value;
    const status = document.getElementById("pStatus").value;
    const notes = document.getElementById("pNotes").value;

    if(!name || !phone) return alert("الاسم ورقم الهاتف مطلوبان");

    await db.collection("slots").doc(activeSlotId).update({
        booked: status !== "ملغي",
        status: status,
        paid: Number(paid),
        patient: { name, phone, notes }
    });
    alert("تم حفظ وتحديث البيانات والحصالة ✅");
}

// --- 5. رفع المحتوى الطبي (مقال بصورة + فيديو بوصف) ---
async function uploadContent() {
    const art = {
        title: document.getElementById("artTitle").value,
        text: document.getElementById("artText").value,
        image: "رابط_الصورة_هنا" // يمكن تطويرها لرفع ملف حقيقي
    };
    const vid = {
        url: document.getElementById("vidUrl").value,
        desc: document.getElementById("vidDesc").value
    };

    await db.collection("content").doc("medical").set({ art, vid });
    alert("تم نشر المقال والفيديو بنجاح");
}

// --- 6. مسح يوم بالكامل ---
async function deleteDay(date) {
    if(confirm(`هل أنت متأكد من حذف يوم ${date} بالكامل؟`)) {
        const snap = await db.collection("slots").where("date", "==", date).get();
        const batch = db.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
}

window.onload = loadClinic;
