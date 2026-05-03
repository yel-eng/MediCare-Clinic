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

// --- وظائف المحتوى ---
function addVideo() {
    const url = document.getElementById("videoUrl").value;
    const text = document.getElementById("videoText").value;
    db.collection("videos").add({ url, text, date: new Date().toLocaleDateString() }).then(() => location.reload());
}
function addBlog() {
    const title = document.getElementById("blogTitle").value;
    const text = document.getElementById("blogText").value;
    db.collection("blogs").add({ title, text, date: new Date().toLocaleDateString() }).then(() => location.reload());
}

// --- توليد المواعيد المخصص (لو سبتي الخانة فاضية يبقى اليوم إجازة) ---
async function generateSmartSlots() {
    const rows = document.querySelectorAll(".day-setup-row");
    const duration = parseInt(document.getElementById("duration").value);
    if (!rows.length) return alert("برجاء اختيار تاريخ البداية أولاً");
    
    let price = prompt("سعر الكشف:", "200");
    let batch = db.batch();
    let count = 0;

    rows.forEach(row => {
        const dateStr = row.getAttribute("data-date");
        const start = row.querySelector(".start-t").value;
        const end = row.querySelector(".end-t").value;

        // لو الخانات فيها وقت، يبقى اليوم ده "شغل". لو فاضية، يبقى "إجازة"
        if (start && end) {
            let current = new Date(`${dateStr}T${start}`);
            let limit = new Date(`${dateStr}T${end}`);

            while (current < limit) {
                let time = current.toTimeString().slice(0, 5);
                let ref = db.collection("slots").doc();
                batch.set(ref, { 
                    date: dateStr, 
                    time: time, 
                    booked: false, 
                    price: parseFloat(price), 
                    status: "pending", 
                    patient: null 
                });
                current.setMinutes(current.getMinutes() + duration);
                count++;
            }
        }
    });

    if (count === 0) return alert("لم يتم تحديد أي ساعات عمل. (كل الأيام إجازة؟)");
    
    await batch.commit();
    alert(`تم توليد جدول العمل بنجاح لـ ${count} موعد ✅`);
    location.reload();
}

// --- عرض للأدمن: يعرض فقط الأيام اللي "فيها مواعيد" وتم إنشاؤها ---
function loadAdminSlots() {
    let container = document.getElementById("slotsContainer");
    if (!container) return;

    let today = new Date().toISOString().split('T')[0];

    // هنجيب كل المواعيد اللي تاريخها النهاردة أو بعدين
    db.collection("slots").where("date", ">=", today).get().then(snap => {
        let daysMap = {};
        let totalRev = 0;

        snap.forEach(doc => {
            let s = doc.data();
            // تجميع المواعيد حسب التاريخ
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            
            if (s.date === today && s.status === "attended") {
                totalRev += (Number(s.price) || 0);
            }
        });

        container.innerHTML = "";
        
        // تحويل الماب لجدول مرتب
        let sortedDates = Object.keys(daysMap).sort();
        
        if (sortedDates.length === 0) {
            container.innerHTML = "<p style='text-align:center; width:100%; padding:20px;'>لا يوجد جدول عمل حالي. استخدم النموذج أعلاه لتوليد المواعيد.</p>";
            return;
        }

        sortedDates.forEach(date => {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', {weekday: 'long'});
            
            dayDiv.innerHTML = `<div class="day-header">${dayName}<br><small>${date}</small></div>`;
            
            let slotsList = "";
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                slotsList += `
                    <div class="slot-item ${slot.booked ? 'booked-card' : ''}">
                        <span><b>${slot.time}</b> - ${slot.booked ? slot.patient.name : '🟢 متاح'}</span>
                        <button onclick="viewPatientDetails('${slot.id}')" style="width:auto; padding:2px 8px;">إدارة</button>
                    </div>`;
            });
            dayDiv.innerHTML += slotsList;
            container.appendChild(dayDiv);
        });
        
        if(document.getElementById("dailyRevenue")) {
            document.getElementById("dailyRevenue").innerText = `دخل اليوم المحصل: ${totalRev} ج.م`;
        }
    });
}

// --- وظائف المريض والحجز ---
let allAvailableSlots = [];
function loadPatientData() {
    let daySelect = document.getElementById("daySelect");
    if (!daySelect) return;

    let today = new Date().toISOString().split('T')[0];

    db.collection("slots")
      .where("booked", "==", false)
      .where("date", ">=", today)
      .get().then(snap => {
        allAvailableSlots = [];
        let days = new Set();
        snap.forEach(doc => {
            let s = doc.data();
            allAvailableSlots.push({id: doc.id, ...s});
            days.add(s.date);
        });
        
        daySelect.innerHTML = '<option value="">-- اختر اليوم --</option>';
        Array.from(days).sort().forEach(d => {
            let dayName = new Date(d).toLocaleDateString('ar-EG', {weekday: 'long'});
            daySelect.innerHTML += `<option value="${d}">${dayName} (${d})</option>`;
        });
    });
}

function filterTimesByDay() {
    let day = document.getElementById("daySelect").value;
    let timeSelect = document.getElementById("slotsSelect");
    if (!timeSelect) return;
    timeSelect.innerHTML = '<option value="">-- اختر الوقت --</option>';
    allAvailableSlots.filter(s => s.date === day)
        .sort((a,b)=>a.time.localeCompare(b.time))
        .forEach(s => {
            timeSelect.innerHTML += `<option value="${s.id}">${s.time}</option>`;
        });
}

function book() {
    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let id = document.getElementById("slotsSelect").value;
    if(!name || !id) return alert("برجاء إدخال الاسم واختيار موعد");
    db.collection("slots").doc(id).update({ 
        booked: true, 
        patient: { name, phone, note: "", photo: "" }
    }).then(() => { 
        alert("تم الحجز بنجاح! ننتظرك في الموعد."); 
        location.reload(); 
    });
}

function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || {name:"", phone:"", note:""};
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3>تعديل موعد: ${s.date} | ${s.time}</h3>
            <label>اسم المريض:</label>
            <input id="en" value="${p.name}" placeholder="الاسم">
            <label>رقم الهاتف:</label>
            <input id="ep" value="${p.phone}" placeholder="الهاتف">
            <label>الحالة:</label>
            <select id="es">
                <option value="pending" ${s.status==='pending'?'selected':''}>انتظار</option>
                <option value="attended" ${s.status==='attended'?'selected':''}>تم الكشف</option>
            </select>
            <label>ملاحظات طبية:</label>
            <textarea id="enot" placeholder="اكتب هنا التشخيص أو الملاحظات">${p.note||""}</textarea>
            <button onclick="saveAdmin('${id}')" style="background:#2e7d32;">حفظ التعديلات</button>
            <button onclick="deleteSlot('${id}')" style="background:#c62828; margin-top:5px;">حذف هذا الموعد نهائياً 🗑️</button>
            <div id="qr" style="margin-top:15px; display:flex; justify-content:center;"></div>`;
        new QRCode(document.getElementById("qr"), {text: p.name || "No Name", width:80, height:80});
    });
}

function saveAdmin(id) {
    const name = document.getElementById("en").value;
    const phone = document.getElementById("ep").value;
    const status = document.getElementById("es").value;
    const note = document.getElementById("enot").value;
    db.collection("slots").doc(id).update({
        status: status,
        patient: { name, phone, note }
    }).then(() => { alert("تم تحديث بيانات المريض"); location.reload(); });
}

// دالة إضافية لحذف موعد لو حبيتي تلغيه يدوياً
function deleteSlot(id) {
    if(confirm("هل أنتِ متأكدة من حذف هذا الموعد؟")) {
        db.collection("slots").doc(id).delete().then(() => {
            alert("تم حذف الموعد");
            location.reload();
        });
    }
}

window.onload = () => {
    if (document.getElementById("slotsContainer")) loadAdminSlots();
    if (document.getElementById("daySelect")) loadPatientData();
};
