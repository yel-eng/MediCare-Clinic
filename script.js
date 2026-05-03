const firebaseConfig = {
  apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
  authDomain: "mydoctor-clinic.firebaseapp.com",
  projectId: "mydoctor-clinic",
  storageBucket: "mydoctor-clinic.appspot.com",
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

/***********************
PATIENTS
***********************/
function loadPatients() {

  let c = document.getElementById("patients");
  if (!c) return;

  db.collection("patients").get().then(snap => {

    c.innerHTML = "";

    snap.forEach(doc => {
      let d = doc.data();

      c.innerHTML += `
      <div class="card">
        <h3>${d.name}</h3>
        <p>${d.phone}</p>

        <button onclick="editPatient('${doc.id}', ${JSON.stringify(d)})">✏️ تعديل</button>
        <button onclick="deletePatient('${doc.id}')">🗑 حذف</button>

        <input type="file" onchange="uploadImage('${doc.id}', this.files[0])">

        ${(d.images || []).map(i => `<img src="${i}" width="60">`).join("")}
      </div>`;
    });
  });
}

function editPatient(id, d){
  let name = prompt("name", d.name);
  let phone = prompt("phone", d.phone);

  db.collection("patients").doc(id).update({name, phone})
  .then(loadPatients);
}

function deletePatient(id){
  db.collection("patients").doc(id).delete().then(loadPatients);
}

/***********************
UPLOAD
***********************/
function uploadImage(id, file){

  let ref = storage.ref("patients/" + id + "/" + file.name);

  ref.put(file).then(snap=>{
    snap.ref.getDownloadURL().then(url=>{

      db.collection("patients").doc(id).update({
        images: firebase.firestore.FieldValue.arrayUnion(url)
      });

    });
  });
}

/***********************
BLOG
***********************/
function addBlog(){
  db.collection("blogs").add({
    title: blogTitle.value,
    text: blogText.value,
    image: blogImage.value
  });
}

/***********************
VIDEOS
***********************/
function addVideo(){
  db.collection("videos").add({
    url: videoUrl.value,
    text: videoText.value
  });
}

/***********************
SLOTS GENERATION
***********************/
function generateSlots(){

  let date = slotDate.value;
  let start = startTime.value;
  let end = endTime.value;
  let duration = Number(document.getElementById("duration").value || 30);

  let t = new Date(`${date}T${start}`);
  let e = new Date(`${date}T${end}`);

  while(t < e){

    let time = t.toTimeString().slice(0,5);

    db.collection("slots").add({
      date,
      time,
      booked:false,
      patient:null
    });

    t.setMinutes(t.getMinutes()+duration);
  }

  loadSlots();
}

/***********************
LOAD SLOTS
***********************/
function loadSlots(){

  let c = document.getElementById("slots");
  if(!c) return;

  db.collection("slots").get().then(snap=>{

    c.innerHTML="";

    snap.forEach(doc=>{
      let s = doc.data();

      c.innerHTML += `
      <div class="card">
        ${s.date} - ${s.time}
        <p>${s.booked ? "محجوز" : "متاح"}</p>

        <button onclick="bookByAdmin('${doc.id}')">حجز</button>
        <button onclick="deleteSlot('${doc.id}')">حذف</button>
      </div>`;
    });
  });
}

/***********************
BOOK CLIENT
***********************/
function loadAvailableSlots(){

  let s = document.getElementById("slotsSelect");
  if(!s) return;

  db.collection("slots").where("booked","==",false).get()
  .then(sn=>{
    s.innerHTML="";
    sn.forEach(doc=>{
      let d = doc.data();
      s.innerHTML += `<option value="${doc.id}">${d.date} - ${d.time}</option>`;
    });
  });
}

function book(){

  let id = slotsSelect.value;

  db.collection("slots").doc(id).update({
    booked:true
  });

  alert("تم الحجز");
}

/***********************
ADMIN BOOK
***********************/
function bookByAdmin(id){

  let name = prompt("name");
  let phone = prompt("phone");

  db.collection("slots").doc(id).update({
    booked:true,
    patient:{name,phone}
  }).then(loadSlots);
}

/***********************
DELETE SLOT
***********************/
function deleteSlot(id){
  db.collection("slots").doc(id).delete().then(loadSlots);
}

/***********************
INIT
***********************/
window.onload = function(){
  loadPatients();
  loadSlots();
  loadAvailableSlots();
};
