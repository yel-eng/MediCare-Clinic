/**********************
🔥 FIREBASE SETUP (مرة واحدة بس)
**********************/
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
🔥 LOGIN
**********************/
function login() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  if (!email || !password) {
    alert("اكتب الايميل والباسورد");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "admin.html";
    })
    .catch(err => alert(err.message));
}


/**********************
🔥 BOOKING SYSTEM (تم إصلاحه)
**********************/
function book() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;

  if (!name || !phone || !date || !time) {
    alert("من فضلك املي كل البيانات");
    return;
  }

  db.collection("bookings").add({
    name: name,
    phone: phone,
    date: date,
    time: time,
    price: 200,
    createdAt: new Date()
  })
  .then(() => {

    let msg = `حجز جديد:
الاسم: ${name}
الموبايل: ${phone}
التاريخ: ${date}
الوقت: ${time}`;

    window.open("https://wa.me/201227630041?text=" + encodeURIComponent(msg));

    window.location.href = "confirm.html";

  })
  .catch(err => {
    alert("في مشكلة في الحجز ❌");
    console.log(err);
  });
}


/**********************
🔥 LOAD BOOKINGS + INCOME (ADMIN)
**********************/
function loadBookings() {
  let container = document.getElementById("bookings");

  if (!container) return;

  db.collection("bookings").get().then(snap => {
    let total = 0;
    container.innerHTML = "";

    snap.forEach(doc => {
      let data = doc.data();

      total += data.price || 0;

      container.innerHTML += `
        <div class="card">
          <p>👤 ${data.name}</p>
          <p>📞 ${data.phone}</p>
          <p>📅 ${data.date} - ⏰ ${data.time}</p>
        </div>
      `;
    });

    let income = document.getElementById("income");
    if (income) {
      income.innerText = "إجمالي الأرباح: " + total + " جنيه";
    }
  });
}


/**********************
🔥 ADD VIDEO
**********************/
function addVideo() {
  let url = document.getElementById("videoUrl").value;
  let text = document.getElementById("videoText").value;

  if (!url) {
    alert("ضيف لينك الفيديو");
    return;
  }

  db.collection("videos").add({
    url: url,
    text: text
  });

  alert("تم إضافة الفيديو");
}


/**********************
🔥 LOAD VIDEOS
**********************/
function loadVideos() {
  let container = document.getElementById("videos");

  if (!container) return;

  db.collection("videos").get().then(snap => {
    container.innerHTML = "";

    snap.forEach(doc => {
      let v = doc.data();

      container.innerHTML += `
        <div class="card">
          <iframe src="${v.url}" width="100%" height="200"></iframe>
          <p>${v.text}</p>
        </div>
      `;
    });
  });
}


/**********************
🔥 ADD BLOG
**********************/
function addBlog() {
  let title = document.getElementById("blogTitle").value;
  let text = document.getElementById("blogText").value;
  let image = document.getElementById("blogImage").value;

  if (!title || !text) {
    alert("اكتب عنوان ومحتوى");
    return;
  }

  db.collection("blogs").add({
    title: title,
    text: text,
    image: image
  });

  alert("تم إضافة المقال");
}


/**********************
🔥 LOAD BLOGS
**********************/
function loadBlogs() {
  let container = document.getElementById("blogs");

  if (!container) return;

  db.collection("blogs").get().then(snap => {
    container.innerHTML = "";

    snap.forEach(doc => {
      let b = doc.data();

      container.innerHTML += `
        <div class="card">
          <img src="${b.image}" style="width:100%;border-radius:10px">
          <h3>${b.title}</h3>
          <p>${b.text}</p>
        </div>
      `;
    });
  });
}


/**********************
🔥 AUTO LOAD (مهم جدًا)
**********************/
window.onload = function () {
  loadBookings();
  loadVideos();
  loadBlogs();
};
