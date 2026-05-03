
/******** FIREBASE (CDN STYLE - بدون import) ********/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mydoctor-clinic.firebaseapp.com",
  projectId: "mydoctor-clinic",
  storageBucket: "mydoctor-clinic.appspot.com",
  messagingSenderId: "996532645974",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (global)
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

/******** BOOK ********/
function book() {

  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;

  if (!name || !phone || !date || !time) {
    alert("املأ كل البيانات");
    return;
  }

  db.collection("bookings").add({
    name,
    phone,
    date,
    time,
    price: 200,
    createdAt: new Date()
  }).then(() => {

    let msg = `حجز جديد:
الاسم: ${name}
الهاتف: ${phone}
التاريخ: ${date}
الوقت: ${time}`;

    window.open("https://wa.me/201227630041?text=" + encodeURIComponent(msg));

    window.location.href = "confirm.html";
  });
}

/******** ADD VIDEO ********/
function addVideo() {

  let url = document.getElementById("videoUrl").value;
  let text = document.getElementById("videoText").value;

  db.collection("videos").add({
    url,
    text,
    createdAt: new Date()
  }).then(() => {
    alert("تم إضافة الفيديو");
  });
}

/******** ADD BLOG ********/
function addBlog() {

  let title = document.getElementById("blogTitle").value;
  let text = document.getElementById("blogText").value;

  db.collection("blogs").add({
    title,
    text,
    createdAt: new Date()
  }).then(() => {
    alert("تم إضافة المقال");
  });
}

/******** LOAD HOME ********/
function loadHome() {

  /**** VIDEOS ****/
  db.collection("videos").get().then(snap => {

    let v = document.getElementById("videos");

    if (v) {
      v.innerHTML = "";

      snap.forEach(doc => {
        let d = doc.data();

        v.innerHTML += `
          <div class="card">
            <iframe src="${d.url}" style="width:100%;height:180px"></iframe>
            <p>${d.text}</p>
          </div>
        `;
      });
    }
  });

  /**** BLOGS ****/
  db.collection("blogs").get().then(snap => {

    let b = document.getElementById("blogs");

    if (b) {
      b.innerHTML = "";

      snap.forEach(doc => {
        let d = doc.data();

        b.innerHTML += `
          <div class="card">
            <h3>${d.title}</h3>
            <p>${d.text}</p>
          </div>
        `;
      });
    }
  });
}

window.onload = loadHome;

/******** DAILY INCOME ********/
function getDailyIncome() {

  db.collection("bookings").get().then(snap => {

    let total = 0;

    snap.forEach(doc => {
      total += doc.data().price || 200;
    });

    let el = document.getElementById("income");

    if (el) {
      el.innerText = "إجمالي اليوم: " + total + " جنيه";
    }
  });
}
