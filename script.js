// إعداد Firebase (نفس الإعدادات السابقة)
const firebaseConfig = { /* إعداداتك هنا */ };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// 1. إضافة يوم واحد فقط (مرونة كاملة)
async function addSingleDay() {
    const date = document.getElementById("singleDate").value;
    const sTime = document.getElementById("sTime").value;
    const eTime = document.getElementById("eTime").value;
    const interval = parseInt(document.getElementById("interval").value);

    if(!date) return alert("اختر التاريخ");

    let current = new Date(`${date}T${sTime}`);
    let end = new Date(`${date}T${eTime}`);

    const batch = db.batch();
    while(current < end) {
        let ref = db.collection("slots").doc();
        batch.set(ref, {
            date: date,
            time: current.toTimeString().substring(0,5),
            booked: false,
            status: 'متاح', // متاح، حجز، تم الكشف
            paid: 0,
            patient: null,
            timestamp: firebase.firestore.Timestamp.fromDate(new Date(current))
        });
        current.setMinutes(current.getMinutes() + interval);
    }
    await batch.commit();
    alert("تمت إضافة اليوم للجدول");
}

// 2. تحميل المواعيد مع "الحصالة اليومية" لكل عمود
function loadDashboard() {
    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        const grid = document.getElementById("daysGrid");
        grid.innerHTML = "";
        let daysData = {};

        snap.forEach(doc => {
            let s = doc.data();
            if(!daysData[s.date]) daysData[s.date] = { slots: [], totalPaid: 0, totalBooked: 0 };
            daysData[s.date].slots.push({id: doc.id, ...s});
            if(s.status === 'تم الكشف') daysData[s.date].totalPaid += Number(s.paid || 0);
            if(s.booked) daysData[s.date].totalBooked++;
        });

        for(let date in daysData) {
            let dayBox = document.createElement("div");
            dayBox.className = "day-column";
            
            let html = `
                <div class="day-header">
                    <span class="delete-day" onclick="deleteFullDay('${date}')">X</span>
                    <b>${date}</b>
                    <div class="day-wallet">
                        <div class="wallet-row"><span>المحقق:</span> <span>${daysData[date].totalPaid} ج.م</span></div>
                        <div class="wallet-row"><span>الحجوزات:</span> <span>${daysData[date].totalBooked}</span></div>
                    </div>
                </div>`;

            daysData[date].slots.forEach(slot => {
                html += `
                    <div class="slot-item ${slot.booked ? 'booked-card' : ''}" style="padding:10px; border-bottom:1px solid #eee;">
                        <b>${slot.time}</b> - ${slot.status}
                        ${slot.booked ? `
                            <div class="patient-info">
                                👤 ${slot.patient.name} <br> 📞 ${slot.patient.phone}
                                <div style="margin-top:5px;">
                                    <button class="btn-action" style="background:#4caf50; color:white;" onclick="markDone('${slot.id}')">تم الكشف</button>
                                    <button class="btn-action" style="background:#2196f3; color:white;" onclick="showPatientDetails('${slot.id}')">الملف / QR</button>
                                </div>
                            </div>
                        ` : `<button class="btn-action" onclick="quickBook('${slot.id}')">حجز سريع</button>`}
                        <button class="btn-action" style="color:red;" onclick="deleteSlot('${slot.id}')">حذف</button>
                    </div>`;
            });
            dayBox.innerHTML = html;
            grid.appendChild(dayBox);
        }
    });
}

// 3. حذف يوم كامل أو موعد منفرد
async function deleteFullDay(date) {
    if(confirm(`حذف يوم ${date} بالكامل؟`)) {
        let snap = await db.collection("slots").where("date", "==", date).get();
        let batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
}

// 4. نظام الكشف المالي (الحصالة تتحرك هنا)
async function markDone(id) {
    let amount = prompt("أدخل المبلغ المحصل لهذا الكشف:", "200");
    if(amount) {
        await db.collection("slots").doc(id).update({
            status: 'تم الكشف',
            paid: Number(amount)
        });
    }
}

// 5. رفع الملفات وتوليد الـ QR
async function showPatientDetails(id) {
    let doc = await db.collection("slots").doc(id).get();
    let data = doc.data();
    const modal = document.getElementById("editModal");
    const body = document.getElementById("modalBody");
    
    modal.style.display = "block";
    body.innerHTML = `
        <h3>ملف المريض: ${data.patient.name}</h3>
        <div id="qrcode"></div>
        <hr>
        <p>تعديل بيانات الحجز:</p>
        <input type="text" id="editName" value="${data.patient.name}">
        <button class="btn-main" style="background:var(--main); color:white;" onclick="updateSlot('${id}')">تحديث</button>
        <button onclick="document.getElementById('editModal').style.display='none'">إغلاق</button>
    `;
    
    new QRCode(document.getElementById("qrcode"), {
        text: `Patient:${data.patient.name}|Slot:${data.time}`,
        width: 128, height: 128
    });
}

// تشغيل النظام
window.onload = loadDashboard;

let selectedSlotId = null; // لتخزين الموعد الذي ستختارينه من الجدول

// دالة لاختيار الموعد من الجدول (تلوينه عند الضغط عليه)
function selectSlot(id) {
    selectedSlotId = id;
    alert("تم اختيار الموعد، الآن أكمل بيانات المريض بالأعلى واضغط تثبيت");
}

// دالة حفظ المريض والمبلغ (التي سألتِ عنها)
async function saveManualBooking() {
    const name = document.getElementById("pName").value;
    const phone = document.getElementById("pPhone").value;
    const deposit = document.getElementById("pDeposit").value;
    const notes = document.getElementById("pNotes").value;

    if (!selectedSlotId || !name) {
        return alert("من فضلك اختر موعداً من الجدول أولاً وأدخل اسم المريض");
    }

    try {
        await db.collection("slots").doc(selectedSlotId).update({
            booked: true,
            status: 'حجز مؤكد',
            paid: Number(deposit), // الخانة التي طلبتِها للمبلغ
            patient: {
                name: name,
                phone: phone,
                notes: notes,
                registeredAt: new Date().toLocaleString()
            }
        });
        alert("تم تسجيل المريض وحفظ المبلغ في الحصالة!");
        selectedSlotId = null; // إعادة تعيين
        clearForm();
    } catch (e) {
        alert("خطأ في الحفظ: " + e.message);
    }
}

// تعديل دالة العرض لإظهار البيانات والمبلغ داخل الجدول
function loadAdminSlots() {
    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        const container = document.getElementById("slotsContainer");
        const totalDisplay = document.getElementById("dayTotal");
        let dailyIncome = 0;
        let daysMap = {};

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            
            // إضافة المبلغ للحصالة إذا كان هناك دفع
            if (s.paid) dailyIncome += Number(s.paid);
        });

        totalDisplay.innerText = dailyIncome;
        container.innerHTML = "";

        for (let date in daysMap) {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let html = `<div class="day-header"><b>${date}</b></div>`;
            
            daysMap[date].forEach(slot => {
                html += `
                    <div class="slot-item ${slot.booked ? 'booked-card' : ''}" onclick="selectSlot('${slot.id}')">
                        <div style="flex:1">
                            <b>${slot.time}</b> 
                            ${slot.booked ? `
                                <div class="patient-card" style="font-size:11px; margin-top:5px; color:#1a237e; border-top:1px dashed #ccc;">
                                    👤 ${slot.patient.name} <br>
                                    💰 دفع: ${slot.paid} ج.م <br>
                                    📝 ${slot.patient.notes || ''}
                                </div>
                            ` : '<br><small style="color:green">متاح للحجز</small>'}
                        </div>
                        <button class="btn-danger" onclick="deleteSlot('${slot.id}')">×</button>
                    </div>`;
            });
            dayDiv.innerHTML = html;
            container.appendChild(dayDiv);
        }
    });
}

function clearForm() {
    document.getElementById("pName").value = "";
    document.getElementById("pPhone").value = "";
    document.getElementById("pDeposit").value = "";
    document.getElementById("pNotes").value = "";
}
