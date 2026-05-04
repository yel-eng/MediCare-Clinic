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

// سعر الكشف
const PRICE = 200;

function getLocalDateString(dateObj) {
    return dateObj.toISOString().split('T')[0];
}

// 1. رسم واجهة الأيام السبعة في الإعداد
function setupWeekUI() {
    const grid = document.getElementById("weekSetupGrid");
    if (!grid) return;
    const startVal = document.getElementById("startDatePicker").value;
    let start = startVal ? new Date(startVal) : new Date();
    
    grid.innerHTML = ""; 
    for (let i = 0; i < 7; i++) {
        let curr = new Date(start);
        curr.setDate(start.getDate() + i);
        let dStr = getLocalDateString(curr);
        let dName = curr.toLocaleDateString('ar-EG', { weekday: 'long' });
        
        grid.innerHTML += `
            <div class="day-setup-row" data-date="${dStr}">
                <b style="color:var(--main)">${dName}</b><br>
                <small style="color:#777">${dStr}</small><br>
                <input type="time" class="start-t" value="17:00" style="width:80%">
                <input type="time" class="end-t" value="21:00" style="width:80%">
            </div>`;
    }
}

// 2. توليد المواعيد وحفظها
async function generateSmartSlots() {
    const dur = parseInt(document.getElementById("duration").value) || 30;
    const rows = document.querySelectorAll(".day-setup-row");
    const batch = db.batch();

    rows.forEach(row => {
        const date = row.dataset.date;
        const sTime = row.querySelector(".start-t").value;
        const eTime = row.querySelector(".end-t").value;

        if (sTime && eTime) {
            let current = new Date(`${date}T${sTime}`);
            let end = new Date(`${date}T${eTime}`);
            while (current < end) {
                let tStr = current.toTimeString().substring(0, 5);
                let ref = db.collection("slots").doc();
                batch.set(ref, {
                    date, time: tStr, booked: false, paid: false,
                    timestamp: firebase.firestore.Timestamp.fromDate(new Date(current))
                });
                current.setMinutes(current.getMinutes() + dur);
            }
        }
    });
    await batch.commit();
    alert("تم تحديث جدول العيادة بنجاح ✨");
}

// 3. عرض المواعيد وحساب الحصالة
function loadAdminSlots() {
    const container = document.getElementById("slotsContainer");
    const totalBox = document.getElementById("dayTotal");
    if (!container) return;

    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        container.innerHTML = "";
        let daysMap = {};
        let income = 0;

        snap.forEach(doc => {
            let s = doc.data();
            if (!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            if (s.booked && s.paid) income += PRICE;
        });

        totalBox.innerText = income;

        for (let date in daysMap) {
            let col = document.createElement("div");
            col.className = "day-column";
            let dName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
            
            let html = `<div class="day-header">${dName} <br> <small>${date}</small></div>`;
            daysMap[date].forEach(slot => {
                html += `
                <div class="slot-item ${slot.booked ? 'booked-card' : ''}">
                    <div>
                        <b>${slot.time}</b><br>
                        <small>${slot.booked ? (slot.patient?.name || 'محجوز') : 'متاح'}</small>
                    </div>
                    <div style="display:flex; gap:5px;">
                        ${slot.booked ? `
                            <button class="btn-pay" onclick="togglePay('${slot.id}', ${slot.paid})" 
                                    style="background:${slot.paid ? '#4caf50' : '#ff9800'}; color:white;">
                                ${slot.paid ? 'مدفوع' : 'تحصيل'}
                            </button>` : ''}
                        <button class="btn-danger" onclick="deleteSlot('${slot.id}')">×</button>
                    </div>
                </div>`;
            });
            col.innerHTML = html;
            container.appendChild(col);
        }
    });
}

async function togglePay(id, status) {
    await db.collection("slots").doc(id).update({ paid: !status });
}

async function deleteSlot(id) {
    if(confirm("حذف هذا الموعد نهائياً؟")) await db.collection("slots").doc(id).delete();
}

window.onload = () => {
    setupWeekUI();
    loadAdminSlots();
};
