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


/**********************
BOOK PATIENT
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

  // نجيب slot المطابق
  db.collection("slots")
    .where("date", "==", date)
    .where("time", "==", time)
    .get()
    .then(snap => {

      if (snap.empty) {
        alert("الميعاد ده مش موجود ❌");
        return;
      }

      let slotDoc = snap.docs[0];

      let slot = slotDoc.data();

      if (slot.booked) {
        alert("الموعد محجوز ❌ اختار وقت تاني");
        return;
      }

      // نحجز فعليًا
      slotDoc.ref.update({
        booked: true,
        patient: { name, phone }
      }).then(() => {

        alert("تم الحجز بنجاح ✅");

        loadSlots();

      });

    });
}

/**********************
UPLOAD IMAGE
**********************/
function uploadImage(id, file) {

  if (!file) return;

  const storageRef =
    firebase.storage().ref("patients/" + id + "/" + file.name);

  storageRef.put(file).then(snapshot => {
    snapshot.ref.getDownloadURL().then(url => {

      db.collection("patients").doc(id).update({
        images: firebase.firestore.FieldValue.arrayUnion(url)
      }).then(() => {
        loadPatients();
      });

    });
  });
}


/**********************
QR GENERATION
**********************/
function generatePatientQR(id) {

  let url =
    "https://yel-eng.github.io/MediCare-Clinic/patient.html?id=" + id;

  let qrURL =
    "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" +
    encodeURIComponent(url);

  db.collection("patients").doc(id).update({
    qr: qrURL
  }).then(() => {
    loadPatients();
  });
}


/**********************
DELETE PATIENT
**********************/
function deletePatient(id, images = []) {

  images.forEach(url => {
    try {
      let ref = firebase.storage().refFromURL(url);
      ref.delete();
    } catch (e) {}
  });

  db.collection("patients").doc(id).delete()
    .then(() => {
      alert("تم الحذف");
      loadPatients();
    });
}


/**********************
FINISH PATIENT
**********************/
function finishPatient(id, images = []) {

  images.forEach(url => {
    try {
      let ref = firebase.storage().refFromURL(url);
      ref.delete();
    } catch (e) {}
  });

  db.collection("patients").doc(id).update({
    images: [],
    done: true
  }).then(() => {
    alert("تم الانتهاء");
    loadPatients();
  });
}


/**********************
WHATSAPP
**********************/
function sendWhatsApp(phone, text) {

  if (!phone) return;

  window.open(
    "https://wa.me/" + phone +
    "?text=" + encodeURIComponent(text)
  );
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

          <button onclick="generatePatientQR('${doc.id}')">
            📱 Generate QR
          </button>

          <input type="file"
            onchange="uploadImage('${doc.id}', this.files[0])">

          <button onclick="
            sendWhatsApp('${d.phone || ""}',
            'بياناتك جاهزة 👇\\n${d.name || ""}')
          ">
          📩 واتساب
          </button>

          <button onclick="finishPatient('${doc.id}', ${JSON.stringify(d.images || [])})">
          ✅ تم الانتهاء
          </button>

          <button style="background:red"
            onclick="deletePatient('${doc.id}', ${JSON.stringify(d.images || [])})">
            🗑 حذف
          </button>

          <div>
            ${(d.images || []).map(img => `
              <img src="${img}" width="80">
            `).join("")}
          </div>

        </div>
      `;
    });

  });
}


/**********************
SLOTS
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

          <p>📅 ${s.date}</p>
          <p>⏰ ${s.time}</p>
          <p>💰 ${s.price || 0}</p>
          <p>${s.booked ? "محجوز" : "متاح"}</p>

          <input placeholder="سعر" id="price-${doc.id}">

          <button onclick="updatePrice('${doc.id}')">
            حفظ
          </button>

          <button style="background:red"
            onclick="deleteSlot('${doc.id}')">
            حذف
          </button>

        </div>
      `;
    });

  });
}


/**********************
GENERATE SLOTS
**********************/
function generateSlots() {

  let date = document.getElementById("slotDate")?.value;
  let start = document.getElementById("startTime")?.value;
  let end = document.getElementById("endTime")?.value;

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
      patient: null,
      price: 0
    });

    startDate.setMinutes(startDate.getMinutes() + 30);
  }

  alert("تم إنشاء المواعيد");
  loadSlots();
}


/**********************
UPDATE PRICE
**********************/
function updatePrice(id) {

  let price = document.getElementById("price-" + id)?.value;

  db.collection("slots").doc(id).update({
    price: Number(price || 0)
  }).then(() => {
    loadSlots();
  });
}


/**********************
DELETE SLOT
**********************/
function deleteSlot(id) {

  db.collection("slots").doc(id).delete()
    .then(() => {
      loadSlots();
    });
}


/**********************
ON LOAD FIXED
**********************/
window.onload = function () {
  loadPatients();
  loadSlots();
};
