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
const auth = firebase.auth();

/**********************
LOGIN
**********************/
function login() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => window.location.href = "admin.html")
    .catch(err => alert(err.message));
}

/**********************
BOOKING
**********************/
function book() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;

  db.collection("bookings").add({
    name,
    phone,
    date,
    time,
    price: null,
    note: ""
  })
  .then(() => {
    window.location.href = "confirm.html";
  });
}

/**********************
UPDATE FIELD (price / note / etc)
**********************/
function updateField(id, field, value) {
  db.collection("bookings").doc(id).update({
    [field]: value
  }).then(() => loadBookings());
}

/**********************
DELETE BOOKING
**********************/
function deleteBooking(id) {
  db.collection("bookings").doc(id).delete()
    .then(() => loadBookings());
}

/**********************
LOAD BOOKINGS (ADMIN)
**********************/
function loadBookings() {
  let container = document.getElementById("bookings");
  if (!container) return;

  db.collection("bookings").get().then(snap => {
    let total = 0;
    container.innerHTML = "";

    snap.forEach(doc => {
      let d = doc.data();

      if (d.price) total += Number(d.price);

      container.innerHTML += `
        <div class="card">

          <input value="${d.name}" 
            onchange="updateField('${doc.id}','name',this.value)">

          <input value="${d.phone}" 
            onchange="updateField('${doc.id}','phone',this.value)">

          <input type="date" value="${d.date}" 
            onchange="updateField('${doc.id}','date',this.value)">

          <input type="time" value="${d.time}" 
            onchange="updateField('${doc.id}','time',this.value)">

          <input type="number" placeholder="المبلغ"
            value="${d.price ?? ''}"
            onchange="updateField('${doc.id}','price',this.value)">

          <textarea placeholder="ملاحظات"
            onchange="updateField('${doc.id}','note',this.value)">${d.note || ""}</textarea>

          <p>💰 ${d.price ? d.price + " جنيه" : "بدون مبلغ"}</p>

          <p>📝 ${d.note ? d.note : "لا توجد ملاحظات"}</p>

          <button onclick="deleteBooking('${doc.id}')">🗑 حذف</button>

        </div>
      `;
    });

    let income = document.getElementById("income");
    if (income) {
      income.innerText = "إجمالي الإيراد: " + total + " جنيه";
    }
  });
}

/**********************
AUTO LOAD
**********************/
window.onload = function () {
  loadBookings();
};
