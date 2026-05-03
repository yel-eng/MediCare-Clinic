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

  db.collection("patients").add({
    name,
    phone,
    date,
    time,
    price: null,
    note: "",
    images: [],
    qr: null,
    done: false
  }).then(() => {
    alert("تم الحجز");
    loadPatients();
  });
}


/**********************
UPLOAD IMAGE (ROSHETA)
**********************/
function uploadImage(id, file) {

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
🔥 QR (FIXED - PROFESSIONAL)
**********************/
function generatePatientQR(id) {

  let url =
    "https://yel-eng.github.io/MediCare-Clinic/patient.html?id=" + id;

  let qrImage =
    "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" +
    encodeURIComponent(url);

  db.collection("patients").doc(id).update({
    qr: qrImage
  }).then(() => {
    loadPatients();
  });

}


/**********************
DELETE PATIENT
**********************/
function deletePatient(id, images) {

  if (images && images.length) {
    images.forEach(url => {
      try {
        let ref = firebase.storage().refFromURL(url);
        ref.delete();
      } catch (e) {
        console.log(e);
      }
    });
  }

  db.collection("patients").doc(id).delete()
    .then(() => {
      alert("تم حذف العميل");
      loadPatients();
    });
}


/**********************
FINISH PATIENT
**********************/
function finishPatient(id, images) {

  if (images && images.length) {
    images.forEach(url => {
      try {
        let ref = firebase.storage().refFromURL(url);
        ref.delete();
      } catch (e) {}
    });
  }

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
  window.open(
    "https://wa.me/" + phone + "?text=" + encodeURIComponent(text)
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

          <h3>${d.name}</h3>
          <p>${d.phone}</p>
          <p>${d.date} - ${d.time}</p>

          ${d.qr ? `<img src="${d.qr}" width="120">` : ""}

          <button onclick="generatePatientQR('${doc.id}')">
            📱 Generate QR
          </button>

          <input type="file"
            onchange="uploadImage('${doc.id}', this.files[0])">

          <button onclick="
            sendWhatsApp('${d.phone}',
            'بياناتك جاهزة 👇\\n${d.name}\\n${d.date}')
          ">
          📩 واتساب
          </button>

          <button onclick="finishPatient('${doc.id}', ${JSON.stringify(d.images || [])})">
          ✅ تم الانتهاء
          </button>

          <button style="background:red"
            onclick="deletePatient('${doc.id}', ${JSON.stringify(d.images || [])})">
            🗑 حذف العميل
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
AUTO LOAD
**********************/
window.onload = function () {
  loadPatients();
};
