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
const storage = firebase.storage();

/* =========================
   CREATE SLOTS (ADMIN)
========================= */
function generateSlots() {

  let date = document.getElementById("slotDate").value;
  let start = document.getElementById("startTime").value;
  let end = document.getElementById("endTime").value;
  let duration = parseInt(document.getElementById("duration").value);

  if (!date || !start || !end || !duration) {
    alert("املأ كل البيانات");
    return;
  }

  let startDate = new Date(`${date}T${start}`);
  let endDate = new Date(`${date}T${end}`);

  while (startDate < endDate) {

    let time = startDate.toTimeString().slice(0, 5);

    let endTimeDate = new Date(startDate);
    endTimeDate.setMinutes(endTimeDate.getMinutes() + duration);

    let endTime = endTimeDate.toTimeString().slice(0, 5);

    db.collection("slots").add({
      date,
      time,
      endTime,
      duration,
      booked: false,
      patient: null
    });

    startDate.setMinutes(startDate.getMinutes() + duration);
  }

  alert("تم إنشاء المواعيد");
  loadSlots();
  loadAvailableSlots();
}


/* =========================
   LOAD ADMIN SLOTS
========================= */
function loadSlots() {

  let container = document.getElementById("slots");
  if (!container) return;

  db.collection("slots").get().then(snap => {

    container.innerHTML = "";

    snap.forEach(doc => {

      let s = doc.data();

      container.innerHTML += `
        <div class="card">

          <p>📅 ${s.date}</p>
          <p>⏰ ${s.time} - ${s.endTime || ""}</p>

          <p>${s.booked ? "❌ محجوز" : "✅ متاح"}</p>

          ${s.booked && s.patient ? `
            <p>👤 ${s.patient.name}</p>
            <p>📞 ${s.patient.phone}</p>
          ` : ""}

          <button onclick="deleteSlot('${doc.id}')">🗑 حذف</button>

        </div>
      `;
    });

  });
}


/* =========================
   CLIENT SLOTS
========================= */
function loadAvailableSlots() {

  let select = document.getElementById("slotsSelect");
  if (!select) return;

  select.innerHTML = "";

  db.collection("slots")
    .where("booked", "==", false)
    .get()
    .then(snap => {

      snap.forEach(doc => {
        let s = doc.data();

        select.innerHTML += `
          <option value="${doc.id}">
            ${s.date} - ${s.time} → ${s.endTime}
          </option>
        `;
      });

    });
}


/* =========================
   BOOK SLOT (CLIENT)
========================= */
function book() {

  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let slotId = document.getElementById("slotsSelect").value;

  if (!name || !phone || !slotId) {
    alert("املأ البيانات");
    return;
  }

  let ref = db.collection("slots").doc(slotId);

  ref.get().then(doc => {

    let s = doc.data();

    if (s.booked) {
      alert("الموعد محجوز ❌");
      loadAvailableSlots();
      return;
    }

    ref.update({
      booked: true,
      patient: { name, phone }
    }).then(() => {

      alert("تم الحجز بنجاح ✅");

      loadSlots();
      loadAvailableSlots();
    });

  });
}


/* =========================
   DELETE SLOT (ADMIN)
========================= */
function deleteSlot(id) {
  db.collection("slots").doc(id).delete().then(() => {
    loadSlots();
    loadAvailableSlots();
  });
}


/* =========================
   INIT
========================= */
window.onload = function () {
  loadSlots();
  loadAvailableSlots();
};
