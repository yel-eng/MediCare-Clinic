const firebaseConfig = {
  apiKey: "AIzaSyA8FEgNeXAMZ1Sbg12zFCzwwxUD3sVl99o",
  authDomain: "mydoctor-clinic.firebaseapp.com",
  projectId: "mydoctor-clinic",
  storageBucket: "mydoctor-clinic.appspot.com",
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

/***********************
PATIENTS (بدون تغيير)
***********************/
function loadPatients(){
  let c=document.getElementById("patients");
  if(!c) return;

  db.collection("patients").get().then(snap=>{
    c.innerHTML="";
    snap.forEach(d=>{
      let x=d.data();
      c.innerHTML+=`<div class="card">
        ${x.name} - ${x.phone}
      </div>`;
    });
  });
}

/***********************
BLOG + VIDEO (مختصر)
***********************/
function addBlog(){
  db.collection("blogs").add({
    title:blogTitle.value,
    text:blogText.value,
    image:blogImage.value
  });
}

function addVideo(){
  db.collection("videos").add({
    url:videoUrl.value,
    text:videoText.value
  });
}

/***********************
1) SET AVAILABILITY (ADMIN)
***********************/
function setAvailability(){

  let date = slotDate.value;
  let start = startTime.value;
  let end = endTime.value;

  db.collection("availability").doc(date).set({
    date,
    start,
    end
  });

  alert("تم ضبط الدوام");
}

/***********************
2) LOAD CLIENT SLOTS (SMART)
***********************/
function loadClientSlots(){

  let date=document.getElementById("date").value;
  let select=document.getElementById("slotsSelect");

  select.innerHTML="";

  db.collection("availability").doc(date).get().then(doc=>{

    let range=doc.exists?doc.data():null;
    let hours=[];

    // لو مفيش تحديد → اليوم كله
    if(!range){
      for(let i=0;i<24;i++){
        hours.push(`${String(i).padStart(2,'0')}:00`);
        hours.push(`${String(i).padStart(2,'0')}:30`);
      }
    } else {
      let s=parseInt(range.start.split(":")[0]);
      let e=parseInt(range.end.split(":")[0]);

      for(let i=s;i<e;i++){
        hours.push(`${i}:00`);
        hours.push(`${i}:30`);
      }
    }

    db.collection("bookings").where("date","==",date).get()
    .then(snap=>{

      let booked=snap.docs.map(d=>d.data().time);

      hours.forEach(t=>{
        if(!booked.includes(t)){
          select.innerHTML+=`<option>${t}</option>`;
        }
      });

    });

  });
}

/***********************
3) BOOK
***********************/
function book(){

  let name=name.value;
  let phone=phone.value;
  let date=document.getElementById("date").value;
  let time=slotsSelect.value;

  db.collection("bookings").add({
    name,
    phone,
    date,
    time
  });

  alert("تم الحجز");
}

/***********************
INIT
***********************/
window.onload=function(){
  loadPatients();
};
