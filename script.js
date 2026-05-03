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
   PATIENT BOOKING (OLD SYSTEM + SLOT LINK)
========================= */
function book() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let slotId = document.getElementById("slotsSelect")?.value;

  if (!name || !phone || !slotId) {
    alert("املأ البيانات");
    return;
  }

  db.collection("slots").doc(slotId).get().then(doc => {
    if (!doc.exists) return;

    let s = doc.data();

    if (s.booked) {
      alert("الموعد محجوز ❌");
      loadAvailableSlots();
      return;
    }

    // اقفل الميعاد
    doc.ref.update({
      booked: true,
      patient: { name, phone }
    });

    // ضيف في CRM (المهم اللي كان عندك قبل كده)
    db.collection("patients").add({
      name,
      phone,
      date: s.date,
      time: s.time,
      price: s.price || 0,
      images: [],
      qr: null,
      done: false
    });

    alert("تم الحجز بنجاح ✅");
    loadSlots();
    loadPatients();
    loadAvailableSlots();
  });
}

/* =========================
   PATIENT CRM (FULL RESTORED)
========================= */
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

          <button onclick="editPatient('${doc.id}', ${JSON.stringify(d)})">✏️ تعديل</button>

          <button onclick="generateQR('${doc.id}')">QR</button>

          <input type="file" onchange="uploadImage('${doc.id}', this.files[0])">

          <button onclick="finishPatient('${doc.id}', ${JSON.stringify(d.images || [])})">✅ إنهاء</button>

          <button onclick="deletePatient('${doc.id}', ${JSON.stringify(d.images || [])})">🗑 حذف</button>

        </div>
      `;
    });
  });
}

/* EDIT PATIENT */
function editPatient(id, data) {
  let name = prompt("الاسم", data.name);
  let phone = prompt("التليفون", data.phone);
  let price = prompt("السعر", data.price || 0);

  db.collection("patients").doc(id).update({
    name,
    phone,
    price: Number(price)
  }).then(loadPatients);
}

/* UPLOAD IMAGE */
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

/* QR */
function generateQR(id) {
  let url = "https://yel-eng.github.io/MediCare-Clinic/patient.html?id=" + id;

  let qr = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(url);

  db.collection("patients").doc(id).update({ qr });
}

/* DELETE */
function deletePatient(id, images = []) {
  images.forEach(url => {
    try { storage.refFromURL(url).delete(); } catch {}
  });

  db.collection("patients").doc(id).delete().then(loadPatients);
}

/* FINISH */
function finishPatient(id, images = []) {
  images.forEach(url => {
    try { storage.refFromURL(url).delete(); } catch {}
  });

  db.collection("patients").doc(id).update({
    images: [],
    done: true
  });
}

/* =========================
   SLOTS SYSTEM (FIXED)
========================= */
function generateSlots() {
  let date = document.getElementById("slotDate").value;
  let start = document.getElementById("startTime").value;
  let end = document.getElementById("endTime").value;
  let duration = parseInt(document.getElementById("duration").value);

  let startDate = new Date(`${date}T${start}`);
  let endDate = new Date(`${date}T${end}`);

  while (startDate < endDate) {
    let time = startDate.toTimeString().slice(0,5);

    db.collection("slots").add({
      date,
      time,
      booked:false,
      price:0,
      patient:null,
      slotKey: `${date}_${time}`
    });

    startDate.setMinutes(startDate.getMinutes() + duration);
  }

  loadSlots();
  loadAvailableSlots();
}

/* ADMIN SLOTS */
function loadSlots() {
  let container = document.getElementById("slots");
  if (!container) return;

  db.collection("slots").get().then(snap => {
    container.innerHTML = "";

    snap.forEach(doc => {
      let s = doc.data();

      container.innerHTML += `
        <div class="card">

          <b>${s.date} - ${s.time}</b><br>

          ${s.booked ? "❌ محجوز" : "✅ متاح"}

          <br>

          <input id="price-${doc.id}" placeholder="السعر">

          <button onclick="updatePrice('${doc.id}')">💰</button>

          <button onclick="bookByAdmin('${doc.id}')">➕</button>

          <button onclick="editSlot('${doc.id}')">✏️</button>

          <button onclick="deleteSlot('${doc.id}')">🗑</button>

        </div>
      `;
    });
  });
}

/* AVAILABLE CLIENT */
function loadAvailableSlots() {
  let select = document.getElementById("slotsSelect");
  if (!select) return;

  select.innerHTML = "";

  db.collection("slots").where("booked","==",false).get().then(snap => {
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

/* ADMIN BOOK */
function bookByAdmin(id) {
  let name = prompt("اسم العميل");
  let phone = prompt("التليفون");

  db.collection("slots").doc(id).update({
    booked:true,
    patient:{name,phone}
  }).then(() => {
    loadSlots();
    loadAvailableSlots();
  });
}

/* PRICE */
function updatePrice(id) {
  let price = document.getElementById("price-"+id).value;

  db.collection("slots").doc(id).update({
    price:Number(price || 0)
  });
}

/* DELETE SLOT */
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
  loadPatients();
  loadSlots();
  loadAvailableSlots();
};
