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
const PRICE = 200;

// --- وظائف المواعيد والحصالة ---
function setupWeekUI() {
    const grid = document.getElementById("weekSetupGrid");
    const startVal = document.getElementById("startDatePicker").value;
    let start = startVal ? new Date(startVal) : new Date();
    grid.innerHTML = "";
    for (let i = 0; i < 7; i++) {
        let d = new Date(start); d.setDate(start.getDate() + i);
        let dStr = d.toISOString().split('T')[0];
        grid.innerHTML += `<div class="day-setup-row">
            <b>${d.toLocaleDateString('ar-EG',{weekday:'long'})}</b><br>${dStr}
            <input type="time" class="start-t" value="17:00"><input type="time" class="end-t" value="21:00">
        </div>`;
    }
}

async function generateSmartSlots() {
    const dur = parseInt(document.getElementById("duration").value);
    const rows = document.querySelectorAll(".day-setup-row");
    for (let row of rows) {
        let date = row.innerText.split('\n')[1];
        let sT = row.querySelector(".start-t").value;
        let eT = row.querySelector(".end-t").value;
        let curr = new Date(`${date}T${sT}`);
        let end = new Date(`${date}T${eT}`);
        while (curr < end) {
            await db.collection("slots").add({ date, time: curr.toTimeString().substring(0,5), booked: false, paid: false, timestamp: curr });
            curr.setMinutes(curr.getMinutes() + dur);
        }
    }
    alert("تم!");
}

function loadAdminSlots() {
    db.collection("slots").orderBy("timestamp", "asc").onSnapshot(snap => {
        const container = document.getElementById("slotsContainer");
        let daysMap = {}; let total = 0;
        snap.forEach(doc => {
            let s = doc.data(); 
            if(!daysMap[s.date]) daysMap[s.date] = [];
            daysMap[s.date].push({id: doc.id, ...s});
            if(s.booked && s.paid) total += PRICE;
        });
        document.getElementById("dayTotal").innerText = total;
        container.innerHTML = "";
        for (let day in daysMap) {
            let html = `<div class="day-column"><div class="day-header">${day}</div>`;
            daysMap[day].forEach(slot => {
                html += `<div class="slot-item ${slot.booked?'booked-card':''}">
                    ${slot.time} ${slot.booked?'✅':''}
                    <button onclick="db.collection('slots').doc('${slot.id}').update({paid:!${slot.paid}})">${slot.paid?'مدفوع':'تحصيل'}</button>
                </div>`;
            });
            container.innerHTML += html + `</div>`;
        }
    });
}

// --- وظائف المقال والفيديو الجديدة ---
async function updateVideo() {
    const url = document.getElementById("videoUrl").value;
    await db.collection("content").doc("video").set({ url });
    alert("تم تحديث الفيديو");
}

async function updateArticle() {
    const text = document.getElementById("articleText").value;
    await db.collection("content").doc("article").set({ text });
    alert("تم تحديث المقال");
}

window.onload = () => { setupWeekUI(); loadAdminSlots(); };
