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


/**********************
🔥 LOAD AVAILABLE SLOTS (للعميل)
**********************/
function loadAvailableSlots() {

  let select = document.getElementById("slotsSelect");
  if (!select) return;

  db.collection("slots")
    .where("booked", "==", false)
    .get()
    .then(snap => {

      select.innerHTML = "";

      snap.forEach(doc => {
        let s = doc.data();

        let option = document.createElement("option");
        option.value = doc.id;
        option.text = `${s.date} - ${s.time}`;

        select.appendChild(option);
      });

    });
}


/**********************
🔥 BOOK (من العميل)
**********************/
function book() {

  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let slotId = document.getElementById("slotsSelect").value;

  if (!name || !phone || !slotId) {
    alert("املأ البيانات");
    return;
  }

  let slotRef = db.collection("slots").doc(slotId);

  db.runTransaction(async (t) => {

    let slotDoc = await t.get(slotRef);

    if (!slotDoc.exists) throw "Slot مش موجود";

    if (slotDoc.data().booked) {
      throw "الموعد اتحجز خلاص ❌";
    }

    t.update(slotRef, {
      booked: true,
      patient: { name, phone }
    });

    db.collection("patients").add({
      name,
      phone,
      date: slotDoc.data().date,
      time: slotDoc.data().time,
      price: slotDoc.data().price || 0,
      images: [],
      qr: null,
      done: false
    });

  })
  .then(() => {
    alert("تم الحجز ✅");
    loadAvailableSlots();
  })
  .catch(err => alert(err));
}


/**********************
🔥 ADMIN BOOK (حجز من الادمن)
**********************/
function adminBook(slotId) {

  let name = prompt("اسم العميل");
  let phone = prompt("رقم العميل");

  if (!name || !phone) return;

  let ref = db.collection("slots").doc(slotId);

  ref.get().then(doc => {

    if (doc.data().booked) {
      alert("محجوز بالفعل");
      return;
    }

    ref.update({
      booked: true,
      patient: { name, phone }
    });

    db.collection("patients").add({
      name,
      phone,
      date: doc.data().date,
      time: doc.data().time,
      price: doc.data().price || 0,
      images: [],
      qr: null,
      done: false
    });

    loadSlots();
    loadPatients();
  });
}


/**********************
🔥 GENERATE SLOTS (الأدمن)
**********************/
function generateSlots() {

  let date = document.getElementById("slotDate").value;
  let start = document.getElementById("startTime").value;
  let end = document.getElementById("endTime").value;
  let duration = document.getElementById("duration").value || 30;

  let startDate = new Date(`${date}T${start}`);
  let endDate = new Date(`${date}T${end}`);

  while (startDate < endDate) {

    let time = startDate.toTimeString().slice(0,5);

    db.collection("slots").add({
      date,
      time,
      slotKey: date + "_" + time,
      booked: false,
      price: 0,
      patient: null
    });

    startDate.setMinutes(startDate.getMinutes() + Number(duration));
  }

  alert("تم إنشاء المواعيد");
  loadSlots();
}


/**********************
🔥 LOAD SLOTS (الأدمن)
**********************/
function loadSlots() {

  let container = document.getElementById("slots");
  if (!container) return;

  db.collection("slots").get().then(snap => {

    container.innerHTML = "";

    snap.forEach(doc => {

      let s = doc.data();

      container.innerHTML += `
        <div class="card">

          <p>${s.date} - ${s.time}</p>
          <p>${s.booked ? "❌ محجوز" : "✅ متاح"}</p>

          <input id="price-${doc.id}" placeholder="السعر">

          <button onclick="updatePrice('${doc.id}')">💰 حفظ</button>

          ${!s.booked ? `
            <button onclick="adminBook('${doc.id}')">
            ➕ حجز للعميل
            </button>
          ` : ""}

          <button onclick="deleteSlot('${doc.id}')">🗑 حذف</button>

        </div>
      `;
    });

  });
}


/**********************
🔥 UPDATE PRICE
**********************/
function updatePrice(id) {

  let price = document.getElementById("price-" + id).value;

  db.collection("slots").doc(id).update({
    price: Number(price || 0)
  }).then(loadSlots);
}


/**********************
🔥 DELETE SLOT
**********************/
function deleteSlot(id) {
  db.collection("slots").doc(id).delete().then(loadSlots);
}


/**********************
🔥 LOAD PATIENTS
**********************/
function loadPatients() {

  let container = document.getElementById("patients");
  if (!container) return;

  db.collection("patients").get().then(snap => {

    container.innerHTML = "";

    snap.forEach(doc => {

      let d = doc.data();

      container.innerHTML += `
        <div class="card">

          <h3>${d.name}</h3>
          <p>${d.phone}</p>
          <p>${d.date} - ${d.time}</p>

          <button onclick="deletePatient('${doc.id}')">
          🗑 حذف
          </button>

        </div>
      `;
    });

  });
}


/**********************
🔥 DELETE PATIENT
**********************/
function deletePatient(id) {
  db.collection("patients").doc(id).delete().then(loadPatients);
}


/**********************
🔥 INIT
**********************/
window.onload = function () {
  loadSlots();
  loadPatients();
  loadAvailableSlots();
};
