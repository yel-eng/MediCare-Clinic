<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>نظام العيادة المستقر</title>
    <style>
        :root { --main: #1a237e; --bg: #f4f7f6; }
        body { font-family: 'Segoe UI', sans-serif; background: var(--bg); margin: 0; padding: 20px; }
        .admin-grid { display: grid; grid-template-columns: 350px 1fr; gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .days-row { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 20px; }
        .day-col { min-width: 280px; background: white; border: 1px solid #ddd; border-radius: 12px; flex-shrink: 0; }
        .day-head { background: var(--main); color: white; padding: 12px; text-align: center; border-radius: 12px 12px 0 0; position: relative; }
        .day-safe { background: #e8f5e9; color: #2e7d32; padding: 8px; text-align: center; font-weight: bold; border-bottom: 1px solid #eee; font-size: 14px; }
        .slot-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; }
        .slot-item:hover { background: #f0f7ff; }
        .slot-item.booked { border-right: 5px solid #2e7d32; background: #f9fdf9; }
        .del-btn { position: absolute; right: 10px; top: 10px; cursor: pointer; color: #ff5252; background: white; border-radius: 50%; width: 20px; height: 20px; line-height: 18px; font-weight: bold; }
        input, textarea, select { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
        .btn { background: var(--main); color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; cursor: pointer; font-weight: bold; }
    </style>
</head>
<body>

<div class="admin-grid">
    <div class="side-panel">
        <div class="card">
            <h3>👤 بيانات الحجز</h3>
            <p id="targetTime" style="color: #666; font-size: 12px;">اختر ميعاداً من الجدول</p>
            <input type="text" id="pName" placeholder="اسم المريض">
            <input type="text" id="pPhone" placeholder="رقم الهاتف">
            <input type="number" id="pPaid" placeholder="المبلغ">
            <select id="pStatus">
                <option value="حجز">حجز فقط</option>
                <option value="كشف">تم الكشف (يضاف للحصالة)</option>
                <option value="ملغي">ملغي</option>
            </select>
            <button class="btn" style="background:#2e7d32" onclick="updateSlot()">حفظ التعديلات ✅</button>
        </div>
    </div>

    <div class="main-panel">
        <div class="card">
            <h3>📅 إضافة يوم جديد</h3>
            <div style="display: flex; gap: 10px;">
                <input type="date" id="slotDate">
                <input type="time" id="startTime" value="17:00">
                <input type="time" id="endTime" value="22:00">
                <button class="btn" onclick="setAvailability()">توليد الجدول</button>
            </div>
        </div>
        <div id="daysGrid" class="days-row"></div>
    </div>
</div>

<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>

<script>
    const firebaseConfig = {
        apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
        authDomain: "mydoctor-clinic.firebaseapp.com",
        projectId: "mydoctor-clinic",
        storageBucket: "mydoctor-clinic.appspot.com",
        messagingSenderId: "996532645974",
        appId: "1:996532645974:web:bfc3e6a61bdc7f04a24bf7"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    let activeId = null;

    // 1. توليد المواعيد (نفس منطق الكود المستقر)
    function setAvailability() {
        let date = document.getElementById("slotDate").value;
        let start = document.getElementById("startTime").value;
        let end = document.getElementById("endTime").value;
        if (!date || !start || !end) return alert("املأ البيانات");

        let startDate = new Date(`${date}T${start}`);
        let endDate = new Date(`${date}T${end}`);
        const batch = db.batch();

        while (startDate < endDate) {
            let time = startDate.toTimeString().slice(0, 5);
            let ref = db.collection("slots").doc();
            batch.set(ref, {
                date, time, booked: false, status: 'حجز', paid: 0,
                patient: { name: '', phone: '' },
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(startDate))
            });
            startDate.setMinutes(startDate.getMinutes() + 30);
        }
        batch.commit().then(() => { alert("تم التوليد"); loadSlots(); });
    }

    // 2. تحميل البيانات (تم التعديل ليكون مستقر ولا يختفي)
    function loadSlots() {
        db.collection("slots").orderBy("timestamp", "asc").get().then(snap => {
            const grid = document.getElementById("daysGrid");
            grid.innerHTML = "";
            let days = {};

            snap.forEach(doc => {
                let s = doc.data();
                if (!days[s.date]) days[s.date] = { items: [], cash: 0 };
                days[s.date].items.push({ id: doc.id, ...s });
                if (s.status === 'كشف') days[s.date].cash += Number(s.paid || 0);
            });

            for (let d in days) {
                let col = document.createElement("div");
                col.className = "day-col";
                let slotsHtml = days[d].items.map(item => `
                    <div class="slot-item ${item.booked ? 'booked' : ''}" 
                         onclick="selectForEdit('${item.id}', '${item.patient?.name||''}', '${item.patient?.phone||''}', '${item.paid}', '${item.status}', '${item.time}')">
                        <b>${item.time}</b> - ${item.booked ? item.patient.name : 'متاح'}
                    </div>
                `).join('');

                col.innerHTML = `
                    <div class="day-head">
                        <span class="del-btn" onclick="deleteDay('${d}')">×</span>
                        <b>${d}</b>
                    </div>
                    <div class="day-safe">💰 حصالة اليوم: ${days[d].cash}</div>
                    ${slotsHtml}
                `;
                grid.appendChild(col);
            }
        });
    }

    // 3. اختيار موعد للتعديل
    function selectForEdit(id, name, phone, paid, status, time) {
        activeId = id;
        document.getElementById("pName").value = name;
        document.getElementById("pPhone").value = phone;
        document.getElementById("pPaid").value = paid;
        document.getElementById("pStatus").value = status;
        document.getElementById("targetTime").innerText = "تعديل ميعاد الساعة: " + time;
    }

    // 4. تحديث البيانات (الحفظ)
    function updateSlot() {
        if (!activeId) return alert("اختر ميعاداً أولاً");
        const name = document.getElementById("pName").value;
        db.collection("slots").doc(activeId).update({
            booked: name !== "",
            status: document.getElementById("pStatus").value,
            paid: Number(document.getElementById("pPaid").value),
            patient: { name: name, phone: document.getElementById("pPhone").value }
        }).then(() => {
            alert("تم الحفظ ✅");
            loadSlots(); // إعادة تحميل الجدول بعد الحفظ
        });
    }

    // 5. حذف يوم
    function deleteDay(date) {
        if (confirm("حذف اليوم؟")) {
            db.collection("slots").where("date", "==", date).get().then(snap => {
                const batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                batch.commit().then(() => loadSlots());
            });
        }
    }

    window.onload = loadSlots;
</script>
</body>
</html>
