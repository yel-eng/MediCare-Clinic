// دالة لتوليد المواعيد بناءً على مدة الجلسة
function generateSmartSlots() {
    let date = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);

    if (!date || !start || !end || !duration) {
        alert("برجاء إدخال كافة التفاصيل");
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
            timestamp: startDateTime.getTime()
        });

        // زيادة الوقت حسب مدة الجلسة
        startDateTime.setMinutes(startDateTime.getMinutes() + duration);
    }
    alert("تم توليد المواعيد بنجاح");
    loadSlots();
}

// دالة عرض بيانات المريض مع الملاحظات والـ QR
function viewPatientDetails(slotId, patientData) {
    const modal = document.getElementById("patientModal");
    const content = document.getElementById("modalContent");
    modal.style.display = "block";

    content.innerHTML = `
        <h3>الملف الطبي: ${patientData.name}</h3>
        <p>رقم الهاتف: ${patientData.phone}</p>
        <textarea id="adminNote" placeholder="أضف ملاحظات طبية هنا...">${patientData.note || ''}</textarea>
        <input type="file" id="patientImage" accept="image/*">
        <div id="qrcode" style="margin:20px auto;"></div>
        <button onclick="updatePatientInfo('${slotId}')">حفظ التعديلات</button>
    `;

    // توليد الـ QR Code يحتوي على رابط صفحة المريض
    new QRCode(document.getElementById("qrcode"), {
        text: `https://yourdomain.com/patient.html?id=${slotId}`,
        width: 128,
        height: 128
    });
}

// تحديث الملاحظات والصور
function updatePatientInfo(slotId) {
    let note = document.getElementById("adminNote").value;
    // هنا ممكن تضيفي كود رفع الصورة لـ Firebase Storage لو حابة مستقبلاً
    
    db.collection("slots").doc(slotId).update({
        "patient.note": note
    }).then(() => {
        alert("تم تحديث الملف الطبي");
        closeModal();
    });
}

function closeModal() {
    document.getElementById("patientModal").style.display = "none";
}

// تعديل دالة التحميل لعرض الأزرار بشكل أفضل
function loadSlots() {
    let container = document.getElementById("slots");
    if (!container) return;

    db.collection("slots").orderBy("date").get().then(snap => {
        container.innerHTML = "";
        snap.forEach(doc => {
            let s = doc.data();
            let statusClass = s.booked ? "booked-card" : "available-card";
            container.innerHTML += `
                <div class="card ${statusClass}">
                    <p>📅 ${s.date} | ⏰ ${s.time}</p>
                    <p>${s.booked ? "🔴 محجوز" : "🟢 متاح"}</p>
                    ${s.booked ? `<button onclick='viewPatientDetails("${doc.id}", ${JSON.stringify(s.patient)})'>فتح الملف الطبي</button>` : ""}
                </div>
            `;
        });
    });
}
