<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>نظام إدارة العيادة</title>
    <style>
        :root { --main: #1a237e; --accent: #00bcd4; --bg: #f4f7f6; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: var(--bg); margin: 0; padding: 20px; color: #333; }
        .admin-grid { display: grid; grid-template-columns: 350px 1fr; gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 20px; }
        
        .safe-box { background: var(--main); color: white; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
        .days-row { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 20px; }
        .day-col { min-width: 280px; background: white; border: 1px solid #ddd; border-radius: 12px; flex-shrink: 0; }
        .day-head { background: var(--main); color: white; padding: 12px; text-align: center; position: relative; border-radius: 12px 12px 0 0; }
        .day-safe { background: #e8f5e9; color: #2e7d32; padding: 8px; text-align: center; font-weight: bold; border-bottom: 1px solid #eee; }
        
        .slot-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: 0.2s; }
        .slot-item:hover { background: #f0f7ff; }
        .slot-item.booked { border-right: 5px solid #2e7d32; background: #f9fdf9; }
        
        .del-day { position: absolute; right: 10px; top: 10px; cursor: pointer; color: #ff5252; background: white; border-radius: 50%; width: 22px; height: 22px; line-height: 20px; font-weight: bold; }
        input, textarea, select { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
        .btn { background: var(--main); color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; cursor: pointer; font-weight: bold; }
    </style>
</head>
<body>

<div class="safe-box">
    <h2>إجمالي الحصالة العام: <span id="grandTotal">0</span> ج.م</h2>
</div>

<div class="admin-grid">
    <!-- الجانب الأيمن: إدخال البيانات -->
    <div class="side-panel">
        <div class="card">
            <h3>👤 بيانات المريض</h3>
            <p id="editTitle" style="font-size: 12px; color: #666;">اضغط على ميعاد من الجدول</p>
            <input type="text" id="pName" placeholder="اسم المريض">
            <input type="text" id="pPhone" placeholder="رقم الهاتف">
            <input type="number" id="pPaid" placeholder="المبلغ المدفوع">
            <textarea id="pNotes" placeholder="ملاحظات طبية"></textarea>
            <select id="pStatus">
                <option value="حجز">حجز فقط</option>
                <option value="كشف">تم الكشف (يضاف للحصالة)</option>
                <option value="ملغي">ملغي</option>
            </select>
            <button class="btn" style="background:#2e7d32" onclick="saveBooking()">تثبيت وحفظ ✅</button>
        </div>

        <div class="card">
            <h3>🎬 المحتوى الطبي</h3>
            <input type="text" id="artTitle" placeholder="عنوان المقال">
            <textarea id="artText" placeholder="نص المقال"></textarea>
            <input type="text" id="vidUrl" placeholder="رابط اليوتيوب">
            <button class="btn" onclick="uploadContent()">نشر المحتوى</button>
        </div>
    </div>

    <!-- الجانب الأيسر: الجدول -->
    <div class="main-panel">
        <div class="card">
            <h3>📅 إضافة مواعيد جديدة</h3>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="date" id="targetDate">
                <input type="time" id="startTime" value="17:00">
                <input type="time" id="endTime" value="22:00">
                <input type="number" id="duration" value="30" title="مدة الجلسة بالدقائق" style="width: 70px;">
                <button class="btn" onclick="generateSlots()">توليد</button>
            </div>
        </div>
        <div id="daysGrid" class="days-row"></div>
    </div>
</div>

<!-- Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>

<script>
    // الإعدادات الخاصة بمشروعك (mydoctor-clinic)
    const firebaseConfig = {
        apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
        authDomain: "mydoctor-clinic.firebaseapp.com",
        projectId: "mydoctor-clinic",
        storageBucket: "mydoctor-clinic.appspot.com",
        messagingSenderId: "996532645974",
        appId: "1:996532645974:web:bfc3e6a61bdc7f04a24bf7"
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    
    let activeSlotId = null; // لضمان عدم حدوث Error عند التحميل

    // 1. توليد المواعيد
    async function generateSlots() {
        const d = document.getElementById("targetDate").value;
        const s = document.getElementById("startTime").value;
        const e = document.getElementById("endTime").value;
        const dur = parseInt(document.getElementById("duration").value) || 30;

        if(!d) return alert("اختر التاريخ");
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
                patient: { name: '', phone: '', notes: '' },
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(curr))
            });
            curr.setMinutes(curr.getMinutes() + dur);
        }
        await batch.commit();
        alert("تم إنشاء الجدول بنجاح");
    }

    // 2. سحب وعرض البيانات (الريفريش)
    function loadClinic() {
        db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
            const grid = document.getElementById("daysGrid");
            let daysGroups = {};
            let grandSafe = 0;

            snap.forEach(doc => {
                let data = doc.data();
                if(!daysGroups[data.date]) daysGroups[data.date] = { slots: [], dayCash: 0 };
                daysGroups[data.date].slots.push({id: doc.id, ...data});
                
                if(data.status === 'كشف') {
                    daysGroups[data.date].dayCash += Number(data.paid || 0);
                    grandSafe += Number(data.paid || 0);
                }
            });

            document.getElementById("grandTotal").innerText = grandSafe;
            grid.innerHTML = "";

            for(let date in daysGroups) {
                let col = document.createElement("div");
                col.className = "day-col";
                let slotsHtml = daysGroups[date].slots.map(slot => `
                    <div class="slot-item ${slot.booked ? 'booked' : ''}" onclick="openForEdit('${slot.id}')">
                        <b>${slot.time}</b> - ${slot.booked ? slot.patient.name : 'متاح'}
                    </div>
                `).join('');

                col.innerHTML = `
                    <div class="day-head">
                        <span class="del-day" onclick="deleteDay('${date}')">×</span>
                        <b>${date}</b>
                    </div>
                    <div class="day-safe">حصالة اليوم: ${daysGroups[date].dayCash}</div>
                    ${slotsHtml}
                `;
                grid.appendChild(col);
            }
        });
    }

    // 3. فتح الموعد للتعديل
    async function openForEdit(id) {
        activeSlotId = id;
        const doc = await db.collection("slots").doc(id).get();
        const data = doc.data();
        
        document.getElementById("pName").value = data.patient?.name || "";
        document.getElementById("pPhone").value = data.patient?.phone || "";
        document.getElementById("pPaid").value = data.paid || 0;
        document.getElementById("pStatus").value = data.status || "حجز";
        document.getElementById("pNotes").value = data.patient?.notes || "";
        document.getElementById("editTitle").innerText = "تعديل ميعاد الساعة: " + data.time;
    }

    // 4. حفظ الحجز
    async function saveBooking() {
        if(!activeSlotId) return alert("اضغط على ميعاد من الجدول أولاً");
        const name = document.getElementById("pName").value;
        const status = document.getElementById("pStatus").value;

        await db.collection("slots").doc(activeSlotId).update({
            booked: (name !== "" && status !== "ملغي"),
            status: status,
            paid: Number(document.getElementById("pPaid").value),
            patient: {
                name: name,
                phone: document.getElementById("pPhone").value,
                notes: document.getElementById("pNotes").value
            }
        });
        alert("تم الحفظ وتحديث البيانات ✅");
    }

    // 5. حذف يوم بالكامل
    async function deleteDay(date) {
        if(confirm(`هل تريد حذف يوم ${date} بالكامل؟`)) {
            const snap = await db.collection("slots").where("date", "==", date).get();
            const batch = db.batch();
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    }

    // 6. رفع المحتوى
    async function uploadContent() {
        const title = document.getElementById("artTitle").value;
        const text = document.getElementById("artText").value;
        const vid = document.getElementById("vidUrl").value;
        await db.collection("content").add({ title, text, vid, date: new Date() });
        alert("تم النشر بنجاح");
    }

    window.onload = loadClinic;
</script>
</body>
</html>
