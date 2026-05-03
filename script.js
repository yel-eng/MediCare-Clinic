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

// توليد المواعيد
async function generateSmartSlots() {
    const rows = document.querySelectorAll(".day-setup-row");
    const duration = parseInt(document.getElementById("duration").value);
    let price = prompt("سعر الكشف الموحد (ج.م):", "200");
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
                    price: parseFloat(price), status: "pending", patient: null 
                });
                current.setMinutes(current.getMinutes() + duration);
                count++;
            }
        }
    });

    if (count === 0) return alert("يرجى إدخال مواعيد العمل للأيام المختارة!");
    await batch.commit();
    alert(`تم توليد ${count} موعد بنجاح!`);
    location.reload();
}

// تحميل الجدول للأدمن
function loadAdminSlots() {
    let container = document.getElementById("slotsContainer");
    if (!container) return;

    let today = new Date().toISOString().split('T')[0];

    db.collection("slots").where("date", ">=", today).get().then(snap => {
        let daysMap = {};
        let totalRev = 0;

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            if (s.date === today && s.status === "attended") totalRev += (Number(s.price) || 0);
        });

        container.innerHTML = "";
        let sortedDates = Object.keys(daysMap).sort();
        
        if (sortedDates.length === 0) {
            container.innerHTML = "<p style='padding:20px;'>لا يوجد مواعيد مسجلة للأيام القادمة.</p>";
        }

        sortedDates.forEach(date => {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', {weekday: 'long'});
            dayDiv.innerHTML = `<div class="day-header">${dayName}<br>${date}</div>`;
            
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                dayDiv.innerHTML += `
                    <div class="slot-item ${slot.booked ? 'booked-card' : ''}">
                        <span><b>${slot.time}</b> ${slot.booked ? '👤' : '🟢'}</span>
                        <button onclick="viewPatientDetails('${slot.id}')" style="font-size:11px; padding:4px 8px; cursor:pointer;">إدارة</button>
                    </div>`;
            });
            container.appendChild(dayDiv);
        });
        document.getElementById("dailyRevenue").innerText = `💰 دخل اليوم: ${totalRev} ج.م`;
    });
}

// عرض تفاصيل المريض
function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || {name:"-", phone:"-", note:"-"};
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3 style="margin-top:0;">📋 تفاصيل الموعد</h3>
            <p><b>التاريخ:</b> ${s.date} | ${s.time}</p>
            <hr>
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
            <textarea id="enot" style="width:90%; height:60px; padding:8px; margin:5px 0;">${p.note||""}</textarea><br>
            <button onclick="saveAdmin('${id}')" style="background:#1a237e; color:white; border:none; padding:10px; width:100%; border-radius:5px; cursor:pointer; margin-top:10px;">حفظ التغييرات</button>
            <button onclick="deleteSlot('${id}')" style="background:none; color:red; border:none; width:100%; margin-top:10px; cursor:pointer; font-size:12px;">❌ حذف الموعد نهائياً</button>
        `;
    });
}

function saveAdmin(id) {
    db.collection("slots").doc(id).update({
        status: document.getElementById("es").value,
        patient: {
            name: document.getElementById("en").value,
            phone: document.getElementById("ep").value,
            note: document.getElementById("enot").value
        }
    }).then(() => { alert("تم الحفظ!"); location.reload(); });
}

function deleteSlot(id) {
    if(confirm("هل أنتِ متأكدة؟ سيتم مسح الموعد تماماً.")) {
        db.collection("slots").doc(id).delete().then(() => location.reload());
    }
}

// دالة تحميل بيانات المرضى (للموقع الرئيسي)
let allAvailableSlots = [];
function loadPatientData() {
    let daySelect = document.getElementById("daySelect");
    if (!daySelect) return;
    let today = new Date().toISOString().split('T')[0];

    db.collection("slots").where("booked", "==", false).where("date", ">=", today).get().then(snap => {
        allAvailableSlots = [];
        let days = new Set();
        snap.forEach(doc => {
            allAvailableSlots.push({id: doc.id, ...doc.data()});
            days.add(doc.data().date);
        });
        daySelect.innerHTML = '<option value="">-- اختر اليوم --</option>';
        Array.from(days).sort().forEach(d => {
            daySelect.innerHTML += `<option value="${d}">${new Date(d).toLocaleDateString('ar-EG',{weekday:'long'})} (${d})</option>`;
        });
    });
}

function filterTimesByDay() {
    let day = document.getElementById("daySelect").value;
    let ts = document.getElementById("slotsSelect");
    if (!ts) return;
    ts.innerHTML = '<option value="">-- اختر الوقت --</option>';
    allAvailableSlots.filter(s => s.date === day).sort((a,b)=>a.time.localeCompare(b.time)).forEach(s => {
        ts.innerHTML += `<option value="${s.id}">${s.time}</option>`;
    });
}

function book() {
    let n = document.getElementById("name").value;
    let p = document.getElementById("phone").value;
    let id = document.getElementById("slotsSelect").value;
    if(!n || !id) return alert("أكمل البيانات!");
    db.collection("slots").doc(id).update({ booked: true, patient: { name:n, phone:p, note:"" }})
    .then(() => { alert("تم الحجز!"); location.reload(); });
}

window.onload = () => {
    if (document.getElementById("slotsContainer")) loadAdminSlots();
    if (document.getElementById("daySelect")) loadPatientData();
};
