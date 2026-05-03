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

// --- توليد المواعيد المخصص ---
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

    if (count === 0) return alert("لم يتم إدخال ساعات عمل لأي يوم");
    
    await batch.commit();
    alert(`تم توليد ${count} موعد بنجاح ✅`);
    location.reload();
}

// --- عرض للأدمن (مع فلترة الأيام القديمة) ---
function loadAdminSlots() {
    let container = document.getElementById("slotsContainer");
    if (!container) return;

    let today = new Date().toISOString().split('T')[0];

    // فلترة: جلب المواعيد التي تاريخها يساوي اليوم أو أكبر (المستقبل)
    db.collection("slots").where("date", ">=", today).get().then(snap => {
        let daysMap = {};
        let totalRev = 0;

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            
            // حساب الأرباح لليوم الحالي فقط
            if (s.date === today && s.status === "attended") {
                totalRev += (Number(s.price) || 0);
            }
        });

        container.innerHTML = "";
        // ترتيب الأيام وتوليد الأعمدة
        Object.keys(daysMap).sort().forEach(date => {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            let dayName = new Date(date).toLocaleDateString('ar-EG', {weekday: 'long'});
            dayDiv.innerHTML = `<div class="day-header">${dayName}<br><small>${date}</small></div>`;
            
            let slotsList = "";
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                slotsList += `
                    <div class="slot-item">
                        <span>${slot.time} - ${slot.booked ? slot.patient.name : '🟢'}</span>
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

// --- وظائف المريض والحجز (بدون تغيير) ---
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
    if(!name || !id) return alert("اكمل البيانات");
    db.collection("slots").doc(id).update({ booked: true, patient: { name, phone, note: "", photo: "" }})
      .then(() => { alert("تم الحجز بنجاح"); location.reload(); });
}

function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || {name:"", phone:"", note:""};
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3>${s.date} | ${s.time}</h3>
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
            <textarea id="enot" placeholder="ملاحظات">${p.note||""}</textarea>
            <button onclick="saveAdmin('${id}')">حفظ التعديلات</button>
            <div id="qr" style="margin-top:10px; display:flex; justify-content:center;"></div>`;
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
    }).then(() => { alert("تم الحفظ"); location.reload(); });
}

window.onload = () => {
    if (document.getElementById("slotsContainer")) loadAdminSlots();
    if (document.getElementById("daySelect")) loadPatientData();
};
