const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "mydoctor-clinic.firebaseapp.com",
  projectId: "mydoctor-clinic"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/**********************
CREATE SLOTS (ADMIN)
**********************/
function generateSlots(){

  let date = document.getElementById("slotDate").value;
  let start = document.getElementById("startTime").value;
  let end = document.getElementById("endTime").value;
  let duration = parseInt(document.getElementById("duration").value);

  if(!date || !start || !end || !duration){
    alert("املأ البيانات");
    return;
  }

  let startDate = new Date(`${date}T${start}`);
  let endDate = new Date(`${date}T${end}`);

  while(startDate < endDate){

    let time = startDate.toTimeString().slice(0,5);

    db.collection("slots").add({
      date,
      time,
      booked:false,
      price:0,
      patient:null
    });

    startDate.setMinutes(startDate.getMinutes() + duration);
  }

  alert("تم إنشاء المواعيد");
  loadSlots();
}

/**********************
LOAD SLOTS (ADMIN)
**********************/
function loadSlots(){

  let container = document.getElementById("slots");
  if(!container) return;

  db.collection("slots")
  .orderBy("date")
  .orderBy("time")
  .get()
  .then(snap=>{

    container.innerHTML="";

    snap.forEach(doc=>{

      let s = doc.data();

      container.innerHTML += `
      <div class="card">

        <p>📅 ${s.date} - ${s.time}</p>

        <p>
        ${s.booked 
          ? "❌ محجوز - " + (s.patient?.name || "")
          : "✅ متاح"}
        </p>

        <input id="price-${doc.id}" placeholder="السعر">

        <button onclick="updatePrice('${doc.id}')">💰 حفظ</button>

        <button onclick="bookByAdmin('${doc.id}')">➕ حجز</button>

        <button onclick="deleteSlot('${doc.id}')">🗑 حذف</button>

      </div>
      `;
    });

  });
}

/**********************
BOOK BY ADMIN
**********************/
function bookByAdmin(id){

  let name = prompt("اسم العميل");
  let phone = prompt("رقم الهاتف");

  if(!name || !phone) return;

  db.collection("slots").doc(id).get().then(doc=>{

    let s = doc.data();

    if(s.booked){
      alert("محجوز بالفعل");
      return;
    }

    doc.ref.update({
      booked:true,
      patient:{name,phone}
    }).then(()=>{
      loadSlots();
    });

  });
}

/**********************
UPDATE PRICE
**********************/
function updatePrice(id){

  let price = document.getElementById("price-"+id).value;

  db.collection("slots").doc(id).update({
    price:Number(price || 0)
  });
}

/**********************
DELETE SLOT
**********************/
function deleteSlot(id){
  db.collection("slots").doc(id).delete().then(loadSlots);
}

/**********************
LOAD AVAILABLE (CLIENT)
**********************/
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

/**********************
BOOK (CLIENT)
**********************/
function book(){

  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let slotId = document.getElementById("slotsSelect").value;

  if(!name || !phone || !slotId){
    alert("املأ البيانات");
    return;
  }

  db.collection("slots").doc(slotId).get().then(doc=>{

    let s = doc.data();

    if(s.booked){
      alert("الموعد اتحجز ❌");
      loadAvailableSlots();
      return;
    }

    doc.ref.update({
      booked:true,
      patient:{name,phone}
    }).then(()=>{

      alert("تم الحجز ✅");

      loadAvailableSlots();
      loadSlots(); // 🔥 يحدث الادمن

    });

  });
}

/**********************
AUTO LOAD
**********************/
window.onload = function () {
  loadSlots();
  loadAvailableSlots();
};
