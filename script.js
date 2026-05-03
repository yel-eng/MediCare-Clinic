const firebaseConfig = {
  apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
  authDomain: "mydoctor-clinic.firebaseapp.com",
  projectId: "mydoctor-clinic",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* =========================
   CREATE SLOTS (ADMIN)
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
      patient:null
    });

    startDate.setMinutes(startDate.getMinutes()+duration);
  }

  loadSlots();
  loadAvailableSlots();
}

/* =========================
   LOAD SLOTS (ADMIN)
========================= */
function loadSlots(){

  let container = document.getElementById("slots");
  if(!container) return;

  db.collection("slots").get().then(snap=>{
    container.innerHTML="";

    snap.forEach(doc=>{
      let s = doc.data();

      container.innerHTML += `
        <div class="card">
          <b>${s.date} - ${s.time}</b><br>
          ${s.booked ? "❌ محجوز" : "✅ متاح"}
        </div>
      `;
    });
  });
}

/* =========================
   LOAD AVAILABLE (CLIENT)
========================= */
function loadAvailableSlots(){

  let select = document.getElementById("slotsSelect");
  if(!select) return;

  select.innerHTML="";

  db.collection("slots")
    .where("booked","==",false)
    .get()
    .then(snap=>{
      snap.forEach(doc=>{
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
   BOOK (CLIENT)
========================= */
function book(){

  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let slotId = document.getElementById("slotsSelect").value;

  db.collection("slots").doc(slotId).get().then(doc=>{

    if(doc.data().booked){
      alert("محجوز ❌");
      loadAvailableSlots();
      return;
    }

    doc.ref.update({
      booked:true,
      patient:{name,phone}
    }).then(()=>{

      alert("تم الحجز ✅");
      loadAvailableSlots();
      loadSlots();

    });

  });
}

/* =========================
   LOAD INIT
========================= */
window.onload = function(){
  loadSlots();
  loadAvailableSlots();
};
