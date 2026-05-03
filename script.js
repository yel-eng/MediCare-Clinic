// ... (Firebase Config يظل كما هو في بداية الملف)

// --- [تعديل ذكي] توليد واجهة الأيام السبعة تلقائياً ---
function setupWeekUI() {
    const grid = document.getElementById("weekSetupGrid"); // تأكدي من وجود هذا ID في الـ HTML
    if (!grid) return;

    const startDateInput = document.getElementById("startDatePicker");
    // إذا لم يحدد الأدمن تاريخ، يبدأ من تاريخ اليوم تلقائياً
    let start = startDateInput && startDateInput.value ? new Date(startDateInput.value) : new Date();
    
    grid.innerHTML = ""; // مسح القديم

    for (let i = 0; i < 7; i++) {
        let current = new Date(start);
        current.setDate(start.getDate() + i);
        let dateStr = current.toISOString().split('T')[0];
        let dayName = current.toLocaleDateString('ar-EG', { weekday: 'long' });

        grid.innerHTML += `
            <div class="day-setup-row card" data-date="${dateStr}" style="margin-bottom:10px; padding:10px; border:1px solid #ddd;">
                <div style="font-weight:bold; color:#1a237e;">${dayName} (${dateStr})</div>
                <div style="display:flex; gap:10px; margin-top:5px;">
                    <input type="time" class="start-t" title="بداية العمل" style="padding:5px;">
                    <input type="time" class="end-t" title="نهاية العمل" style="padding:5px;">
                    <button onclick="deleteDay('${dateStr}')" style="background:#ffebee; color:red; border:none; cursor:pointer; padding:5px 10px; border-radius:4px;">إجازة ❌</button>
                </div>
            </div>`;
    }
}

// --- [أساسي] توليد المواعيد (تم تعديله ليدعم الخصائص الجديدة) ---
async function generateSmartSlots() {
    const rows = document.querySelectorAll(".day-setup-row");
    const durationInput = document.getElementById("duration");
    const duration = durationInput ? parseInt(durationInput.value) : 30; // افتراضي 30 دقيقة
    
    let price = prompt("سعر الكشف الموحد لهذه الفترة (ج.م):", "200");
    if (!price) return;

    let batch = db.batch();
    let count = 0;

    rows.forEach(row => {
        const dateStr = row.getAttribute("data-date");
        const start = row.querySelector(".start-t").value;
        const end = row.querySelector(".end-t").value;

        if (start && end) {
            let current = new Date(`${dateStr}T${start}`);
            let limit = new Date(`${dateStr}T${end}`);

            while (current < limit) {
                let time = current.toTimeString().slice(0, 5);
                let ref = db.collection("slots").doc();
                batch.set(ref, { 
                    date: dateStr, time: time, booked: false, 
                    price: parseFloat(price), status: "pending", 
                    patient: null, createdAt: Date.now() 
                });
                current.setMinutes(current.getMinutes() + duration);
                count++;
            }
        }
    });

    if (count === 0) return alert("يرجى إدخال مواعيد العمل للأيام التي ترغبين في تفعيلها!");
    await batch.commit();
    alert(`تم توليد ${count} موعد بنجاح!`);
    location.reload();
}

// --- [تعديل] عرض تفاصيل المريض + توليد QR Code ---
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || {name:"-", phone:"-", note:"-"};
        
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        
        // توليد رابط الـ QR (بيانات المريض + اليوم + الساعة)
        let qrData = `Patient: ${p.name} | Date: ${s.date} | Time: ${s.time}`;
        let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

        document.getElementById("modalContent").innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="width:60%;">
                    <h3 style="margin-top:0; color:#1a237e;">📋 إدارة الحجز</h3>
                    <p><b>التاريخ:</b> ${s.date} | ${s.time}</p>
                    <label>اسم المريض:</label><br>
                    <input id="en" value="${p.name}" style="width:90%; padding:8px; margin:5px 0;"><br>
                    <label>الموبايل:</label><br>
                    <input id="ep" value="${p.phone}" style="width:90%; padding:8px; margin:5px 0;"><br>
                    <label>الحالة:</label><br>
                    <select id="es" style="width:95%; padding:8px; margin:5px 0;">
                        <option value="pending" ${s.status==='pending'?'selected':''}>انتظار</option>
                        <option value="attended" ${s.status==='attended'?'selected':''}>تم الكشف</option>
                    </select><br>
                    <label>ملاحظات:</label><br>
                    <textarea id="enot" style="width:90%; height:60px; padding:8px; margin:5px 0;">${p.note||""}</textarea>
                </div>
                <div style="text-align:center; width:35%;">
                    <img src="${qrUrl}" alt="QR Code" style="border:1px solid #ddd; padding:5px; background:white;">
                    <p style="font-size:10px;">كود تأكيد الحجز</p>
                    <button onclick="window.print()" style="font-size:11px; cursor:pointer;">طباعة التذكرة</button>
                </div>
            </div>
            <hr>
            <button onclick="saveAdmin('${id}')" style="background:#1a237e; color:white; border:none; padding:10px; width:100%; border-radius:5px; cursor:pointer;">حفظ التعديلات</button>
            <button onclick="deleteSlot('${id}')" style="background:none; color:red; border:none; width:100%; margin-top:10px; cursor:pointer; font-size:12px;">❌ حذف هذا الموعد نهائياً</button>
        `;
    });
}

// --- [إضافة] وظيفة الحجز اليدوي المباشر من الأدمن ---
async function addManualSlot() {
    let name = prompt("اسم المريض:");
    let date = prompt("التاريخ (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    let time = prompt("الوقت (مثال 08:30):");
    
    if(!name || !date || !time) return alert("البيانات ناقصة!");

    await db.collection("slots").add({
        date: date,
        time: time,
        booked: true,
        price: 200,
        status: "pending",
        patient: { name: name, phone: "حجز يدوي", note: "" }
    });
    alert("تم الحجز اليدوي بنجاح!");
    location.reload();
}

// تعديل window.onload ليعرض الأيام السبعة فوراً
window.onload = () => {
    if (document.getElementById("weekSetupGrid")) setupWeekUI();
    if (document.getElementById("slotsContainer")) loadAdminSlots();
    if (document.getElementById("daySelect")) loadPatientData();
};

// ... (باقي الدوال الثابتة: saveAdmin, deleteSlot, loadAdminSlots, loadPatientData, book تظل كما هي)
