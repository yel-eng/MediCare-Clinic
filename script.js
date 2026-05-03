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
BOOK (FIXED + SLOT SAFE)
**********************/
function book() {

  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;

  if (!name || !phone || !date || !time) {
    alert("املأ البيانات");
    return;
  }

  let slotKey = date + "_" + time;

  db.collection("slots")
    .where("slotKey", "==", slotKey)
    .get()
    .then(snap => {

      if (snap.empty) {
        alert("الميعاد غير موجود ❌");
        return;
      }

      let slot = snap.docs[0];

      if (slot.data().booked) {
        alert("الموعد محجوز ❌");
        return;
      }

      slot.ref.update({
        booked: true,
        patient: { name, phone }
      });

      db.collection("patients").add({
        name,
        phone,
        date,
        time,
        price: slot.data().price || 0,
        images: [],
        qr: null,
        done: false
      });

      alert("تم الحجز بنجاح ✅");
      loadSlots();
      loadPatients();
    });
}


/**********************
EDIT PATIENT
**********************/
function editPatient(id, data) {

  let name = prompt("الاسم", data.name || "");
  let phone = prompt("التليفون", data.phone || "");
  let date = prompt("التاريخ", data.date || "");
  let time = prompt("الوقت", data.time || "");
  let price = prompt("السعر", data.price || 0);

  db.collection("patients").doc(id).update({
    name,
    phone,
    date,
    time,
    price: Number(price || 0)
  }).then(() => {
    loadPatients();
  });
}


/**********************
ADD PATIENT BY ADMIN
**********************/
function addPatientByAdmin() {

  let name = prompt("الاسم");
  let phone = prompt("التليفون");
  let date = prompt("التاريخ");
  let time = prompt("الوقت");
  let price = prompt("السعر");

  db.collection("patients").add({
    name,
    phone,
    date,
    time,
    price: Number(price || 0),
    images: [],
    qr: null,
    done: false
  }).then(() => {
    loadPatients();
  });
}


/**********************
UPLOAD IMAGE
**********************/
function uploadImage(id, file) {

  if (!file) return;

  let ref = storage.ref("patients/" + id + "/" + file.name);

  ref.put(file).then(snap => {
    snap.ref.getDownloadURL().then(url => {

      db.collection("patients").doc(id).update({
        images: firebase.firestore.FieldValue.arrayUnion(url)
      });

    });
  });
}


/**********************
QR
**********************/
function generatePatientQR(id) {

  let url =
    "https://yel-eng.github.io/MediCare-Clinic/patient.html?id=" + id;

  let qr =
    "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" +
    encodeURIComponent(url);

  db.collection("patients").doc(id).update({
    qr
  });

}


/**********************
DELETE
**********************/
function deletePatient(id, images = []) {

  images.forEach(url => {
    try {
      storage.refFromURL(url).delete();
    } catch {}
  });

  db.collection("patients").doc(id).delete()
    .then(() => loadPatients());
}


/**********************
FINISH
**********************/
function finishPatient(id, images = []) {

  images.forEach(url => {
    try {
      storage.refFromURL(url).delete();
    } catch {}
  });

  db.collection("patients").doc(id).update({
    images: [],
    done: true
  });
}


/**********************
LOAD PATIENTS
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

          <h3>${d.name || ""}</h3>
          <p>${d.phone || ""}</p>
          <p>${d.date || ""} - ${d.time || ""}</p>

          ${d.qr ? `<img src="${d.qr}" width="120">` : ""}

          <button onclick="editPatient('${doc.id}', ${JSON.stringify(d)})">
            ✏️ تعديل
          </button>

          <button onclick="generatePatientQR('${doc.id}')">
            QR
          </button>

          <input type="file"
            onchange="uploadImage('${doc.id}', this.files[0])">

          <button onclick="addPatientByAdmin()">
            ➕ إضافة عميل
          </button>

          <button style="background:red"
            onclick="deletePatient('${doc.id}', ${JSON.stringify(d.images || [])})">
            حذف
          </button>

        </div>
      `;
    });

  });
}


/**********************
SLOTS FIXED
**********************/
function generateSlots() {

  let date = document.getElementById("slotDate").value;
  let start = document.getElementById("startTime").value;
  let end = document.getElementById("endTime").value;

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

    startDate.setMinutes(startDate.getMinutes() + 30);
  }

  loadSlots();
}


/**********************
LOAD SLOTS
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
          <p>${s.booked ? "محجوز" : "متاح"}</p>

          <input id="price-${doc.id}" placeholder="السعر">

          <button onclick="updatePrice('${doc.id}')">حفظ</button>

          <button onclick="deleteSlot('${doc.id}')">حذف</button>

        </div>
      `;
    });

  });
}


/**********************
UPDATE PRICE
**********************/
function updatePrice(id) {

  let price = document.getElementById("price-" + id).value;

  db.collection("slots").doc(id).update({
    price: Number(price || 0)
  }).then(loadSlots);
}


/**********************
DELETE SLOT
**********************/
function deleteSlot(id) {

  db.collection("slots").doc(id).delete()
    .then(loadSlots);
}


/**********************
INIT
**********************/
window.onload = function () {
  loadPatients();
  loadSlots();
};
