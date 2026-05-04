// إعدادات Firebase
const firebaseConfig = { /* بياناتك هنا */ };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let selectedSlotId = null;

// 1. توليد الجلسات بناءً على مدة الجلسة (مرونة كاملة)
async function generateSlots() {
    const date = document.getElementById("targetDate").value;
    const start = document.getElementById("startTime").value;
    const end = document.getElementById("endTime").value;
    const dur = parseInt(document.getElementById("duration").value);

    if(!date) return alert("اختر التاريخ");

    let curr = new Date(`${date}T${start}`);
    let stop = new Date(`${date}T${end}`);

    while(curr < stop) {
        await db.collection("slots").add({
            date: date,
            time: curr.toTimeString().substring(0,5),
            booked: false,
            status: 'متاح',
            paid: 0,
            timestamp: firebase.firestore.Timestamp.fromDate(new Date(curr))
        });
        curr.setMinutes(curr.getMinutes() + dur);
    }
    alert("تمت جدولة اليوم بنجاح");
}

// 2. عرض البيانات والحصالة (حساب الحصالة بناءً على الحالة)
function loadAdminDashboard() {
    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        const container = document.getElementById("daysGrid");
        let daysMap = {};
        let grandTotal = 0;

        snap.forEach(doc => {
            let data = doc.data();
            if(!daysMap[data.date]) daysMap[data.date] = { slots: [], dayIncome: 0 };
            daysMap[data.date].slots.push({id: doc.id, ...data});
            
            // حساب الحصالة: الكشف فقط هو ما يضاف
            if(data.status === 'كشف') {
                daysMap[data.date].dayIncome += Number(data.paid || 0);
                grandTotal += Number(data.paid || 0);
            }
        });

        document.getElementById("grandTotal").innerText = grandTotal + " ج.م";
        container.innerHTML = "";

        for(let date in daysMap) {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-col";
            let html = `
                <div class="day-head">
                    <span class="del-day" onclick="deleteDay('${date}')">×</span>
                    <b>${date}</b> <br>
                    <small>حصالة اليوم: ${daysMap[date].dayIncome} ج.م</small>
                </div>`;
            
            daysMap[date].slots.forEach(slot => {
                html += `
                <div class="slot-item ${slot.booked ? 'booked' : ''}" onclick="prepareEdit('${slot.id}', '${slot.patient?.name || ''}', '${slot.patient?.phone || ''}', '${slot.paid}', '${slot.status}')">
                    <b>${slot.time}</b> - ${slot.status}
                    ${slot.booked ? `
                        <div class="patient-card">
                            👤 ${slot.patient.name} <br>
                            📞 <a class="wa-link" href="https://wa.me/2${slot.patient.phone}" target="_blank">${slot.patient.phone} (واتساب)</a>
                        </div>
                    ` : ''}
                </div>`;
            });
            dayDiv.innerHTML = html;
            container.appendChild(dayDiv);
        }
    });
}

// 3. تحضير البيانات للتعديل عند الضغط على الموعد
function prepareEdit(id, name, phone, paid, status) {
    selectedSlotId = id;
    document.getElementById("pName").value = name;
    document.getElementById("pPhone").value = phone;
    document.getElementById("pPaid").value = paid;
    document.getElementById("pStatus").value = status;
    alert("تم اختيار موعد " + id + " للتعديل أو الحجز");
}

// 4. حفظ أو تعديل بيانات المريض
async function saveBooking() {
    if(!selectedSlotId) return alert("اختر موعداً من الجدول أولاً");
    
    const pData = {
        name: document.getElementById("pName").value,
        phone: document.getElementById("pPhone").value,
        notes: document.getElementById("pNotes").value
    };

    await db.collection("slots").doc(selectedSlotId).update({
        booked: pData.name !== "",
        status: document.getElementById("pStatus").value,
        paid: Number(document.getElementById("pPaid").value),
        patient: pData
    });
    alert("تم التحديث");
}

// 5. حذف يوم كامل (مرونة المسح)
async function deleteDay(date) {
    if(confirm("حذف يوم " + date + " بالكامل؟")) {
        let snap = await db.collection("slots").where("date", "==", date).get();
        snap.forEach(d => d.ref.delete());
    }
}

// 6. رفع المحتوى (مقال بصورة وفيديو بوصف)
async function uploadContent() {
    const art = { title: document.getElementById("artTitle").value, text: document.getElementById("artText").value };
    const vid = { url: document.getElementById("vidUrl").value, desc: document.getElementById("vidDesc").value };
    
    await db.collection("content").doc("article").set(art);
    await db.collection("content").doc("video").set(vid);
    alert("تم نشر المحتوى الطبي");
}

window.onload = loadAdminDashboard;
