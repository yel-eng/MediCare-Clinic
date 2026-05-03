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
    done: false
  }).then(() => {
    alert("تم الحجز");
  });
}


/**********************
UPLOAD IMAGE (ROSHETA)
**********************/
function uploadImage(id, file) {
  const storageRef = firebase.storage().ref("patients/" + id + "/" + file.name);

  storageRef.put(file).then(snapshot => {
    snapshot.ref.getDownloadURL().then(url => {

      db.collection("patients").doc(id).update({
        images: firebase.firestore.FieldValue.arrayUnion(url)
      });

    });
  });
}


/**********************
GENERATE QR
**********************/
function generateQR(data) {
  return "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" 
  + encodeURIComponent(data);
}


/**********************
SEND WHATSAPP
**********************/
function sendWhatsApp(phone, text) {
  window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(text));
}


/**********************
MARK DONE + DELETE IMAGES
**********************/
function finishPatient(id, images) {

  images.forEach(url => {
    let ref = firebase.storage().refFromURL(url);
    ref.delete();
  });

  db.collection("patients").doc(id).update({
    images: [],
    done: true
  }).then(() => {
    alert("تم الانتهاء وحذف الصور");
  });
}


/**********************
LOAD PATIENTS (CRM VIEW)
**********************/
function loadPatients() {
  let container = document.getElementById("patients");
  if (!container) return;

  db.collection("patients").get().then(snap => {

    container.innerHTML = "";

    snap.forEach(doc => {
      let d = doc.data();

      let qrData = generateQR(
        d.name + " " + d.phone + " " + d.date
      );

      container.innerHTML += `
        <div class="card">

          <h3>${d.name}</h3>
          <p>${d.phone}</p>
          <p>${d.date} - ${d.time}</p>

          <img src="${qrData}" width="100">

          <input type="file" onchange="uploadImage('${doc.id}', this.files[0])">

          <button onclick="
            sendWhatsApp('${d.phone}',
            'بياناتك جاهزة 👇\\n${d.name}\\n${d.date}')
          ">
          📩 واتساب
          </button>

          <button onclick="finishPatient('${doc.id}', ${JSON.stringify(d.images)})">
          ✅ تم الانتهاء
          </button>

          <div>
            ${d.images.map(img => `<img src="${img}" width="80">`).join("")}
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
