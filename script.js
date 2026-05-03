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

// --- توليد المواعيد أسبوعياً ---
async function generateSmartSlots() {
    let startDateInput = document.getElementById("slotDate").value;
    let start = document.getElementById("startTime").value;
    let end = document.getElementById("endTime").value;
    let duration = parseInt(document.getElementById("duration").value);
    let price = prompt("سعر الكشف:", "200");

    if (!startDateInput || !start || !end) return alert("اكمل البيانات");
    
    let batch = db.batch();
    for (let i = 0; i < 7; i++) {
        let dateObj = new Date(startDateInput);
        dateObj.setDate(dateObj.getDate() + i);
        let dateStr = dateObj.toISOString().split('T')[0];

        let current = new Date(`${dateStr}T${start}`);
        let limit = new Date(`${dateStr}T${end}`);

        while (current < limit) {
            let time = current.toTimeString().slice(0, 5);
            let ref = db.collection("slots").doc();
            batch.set(ref, { date: dateStr, time: time, booked: false, price: parseFloat(price), status: "pending", patient: null });
            current.setMinutes(current.getMinutes() + duration);
        }
    }
    await batch.commit();
    alert("تم توليد الأسبوع ✅");
    location.reload();
}

// --- عرض للأدمن بتنسيق الأيام ---
function loadAdminSlots() {
    let container = document.getElementById("slotsContainer");
    if (!container) return;

    db.collection("slots").get().then(snap => {
        let daysMap = {};
        let totalRev = 0;
        let today = new Date().toISOString().split('T')[0];

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            if (s.date === today && s.status === "attended") totalRev += s.price;
        });

        container.innerHTML = "";
        Object.keys(daysMap).sort().forEach(date => {
            let dayDiv = document.createElement("div");
            dayDiv.className = "day-column";
            dayDiv.innerHTML = `<div class="day-header">${date}</div>`;
            
            daysMap[date].sort((a,b)=>a.time.localeCompare(b.time)).forEach(slot => {
                dayDiv.innerHTML += `
                    <div class="slot-item">
                        <span>${slot.time} - ${slot.booked ? slot.patient.name : '🟢'}</span>
                        <button onclick="viewPatientDetails('${slot.id}')">إدارة</button>
                    </div>`;
            });
            container.appendChild(dayDiv);
        });
        document.getElementById("dailyRevenue").innerText = `دخل اليوم المحصل: ${totalRev} ج.م`;
    });
}

// --- عرض للمريض (فلترة الأيام) ---
let allAvailableSlots = [];
function loadPatientData() {
    let daySelect = document.getElementById("daySelect");
    if (!daySelect) return;

    db.collection("slots").where("booked", "==", false).get().then(snap => {
        allAvailableSlots = [];
        let days = new Set();
        snap.forEach(doc => {
            let s = doc.data();
            allAvailableSlots.push({id: doc.id, ...s});
            days.add(s.date);
        });

        Array.from(days).sort().forEach(d => {
            daySelect.innerHTML += `<option value="${d}">${d}</option>`;
        });
    });
}

function filterTimesByDay() {
    let day = document.getElementById("daySelect").value;
    let timeSelect = document.getElementById("slotsSelect");
    timeSelect.innerHTML = '<option value="">-- اختر الوقت --</option>';
    
    allAvailableSlots.filter(s => s.date === day)
        .sort((a,b)=>a.time.localeCompare(b.time))
        .forEach(s => {
            timeSelect.innerHTML += `<option value="${s.id}">${s.time}</option>`;
        });
}

// --- الحجز والتفاصيل ---
function book() {
    let name = document.getElementById("name").value;
    let phone = document.getElementById("phone").value;
    let id = document.getElementById("slotsSelect").value;
    if(!name || !id) return alert("اكمل البيانات");
    db.collection("slots").doc(id).update({ booked: true, patient: { name, phone, note: "", photo: "" }})
      .then(() => alert("تم الحجز بنجاح"));
}

function viewPatientDetails(id) {
    db.collection("slots").doc(id).get().then(doc => {
        let s = doc.data();
        let p = s.patient || {name:"", phone:"", note:""};
        document.getElementById("patientModal").style.display = "block";
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modalContent").innerHTML = `
            <h3>${s.date} | ${s.time}</h3>
            <input id="en" value="${p.name}" placeholder="الاسم">
            <input id="ep" value="${p.phone}" placeholder="الهاتف">
            <select id="es"><option value="pending">انتظار</option><option value="attended">تم الكشف</option></select>
            <textarea id="enot">${p.note||""}</textarea>
            <button onclick="saveAdmin('${id}')">حفظ</button>
            <div id="qr" style="margin-top:10px;"></div>`;
        new QRCode(document.getElementById("qr"), {text: p.name, width:80, height:80});
    });
}

window.onload = () => { loadAdminSlots(); loadPatientData(); };
