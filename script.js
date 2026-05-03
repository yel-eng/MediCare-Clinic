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

/* =========================
   ADMIN: CREATE SLOTS
========================= */
function setAvailability() {

  let date = document.getElementById("slotDate").value;
  let start = document.getElementById("startTime").value;
  let end = document.getElementById("endTime").value;

  if (!date || !start || !end) {
    alert("املأ البيانات");
    return;
  }

  let startDate = new Date(`${date}T${start}`);
  let endDate = new Date(`${date}T${end}`);

  while (startDate < endDate) {

    let time = startDate.toTimeString().slice(0, 5);

    db.collection("slots").add({
      date,
      time,
      booked: false,
      patient: null
    });

    startDate.setMinutes(startDate.getMinutes() + 30);
  }

  loadSlots();
}

/* =========================
   ADMIN LOAD
========================= */
function loadSlots() {

  let container = document.getElementById("slots");
  if (!container) return;

  db.collection("slots").orderBy("date").get().then(snap => {

    container.innerHTML = "";

    snap.forEach(doc => {

      let s = doc.data();

      container.innerHTML += `
        <div class="card">

          <p>📅 ${s.date} - ⏰ ${s.time}</p>

          <p>${s.booked ? "❌ محجوز" : "✅ متاح"}</p>

          ${s.booked && s.patient ? `
            <p>👤 ${s.patient.name}</p>
            <p>📞 ${s.patient.phone}</p>
          ` : ""}

        </div>
      `;
    });

  });
}

/* =========================
   CLIENT LOAD SLOTS
========================= */
function loadAvailableSlots() {

  let select = document.getElementById("slotsSelect");
  select.innerHTML = "";

  db.collection("slots")
    .where("booked", "==", false)
    .get()
    .then(snap => {

      snap.forEach(doc => {

        let s = doc.data();

        select.innerHTML += `
          <option value="${doc.id}">
            ${s.date} - ${s.time}
          </option>
        `;
      });

    });
}

/* =========================
   BOOK SLOT
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

    if (doc.data().booked) {
      alert("الموعد اتحجز ❌");
      return;
    }

    ref.update({
      booked: true,
      patient: { name, phone }
    }).then(() => {

      alert("تم الحجز ✅");
      loadAvailableSlots();

    });

  });
}

/* =========================
   INIT
========================= */
window.onload = function () {
  loadSlots();
  loadAvailableSlots();
};
