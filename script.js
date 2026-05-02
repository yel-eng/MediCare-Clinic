/**********************
 * BOOKING SYSTEM
***********************/

function book() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;

  if (!name || !phone || !date || !time) {
    alert("من فضلك املأ كل البيانات");
    return;
  }

  localStorage.setItem("name", name);
  localStorage.setItem("phone", phone);
  localStorage.setItem("date", date);
  localStorage.setItem("time", time);

  let msg = `مرحبا، أريد حجز موعد:\nالاسم: ${name}\nالهاتف: ${phone}\nالتاريخ: ${date}\nالوقت: ${time}`;

  window.open("https://wa.me/201227630041?text=" + encodeURIComponent(msg));

  window.location.href = "confirm.html";
}


/**********************
 * REVIEWS SYSTEM
***********************/

let selectedRating = 0;

function rate(num) {
  selectedRating = num;

  let stars = document.querySelectorAll(".stars span");

  stars.forEach((s, i) => {
    s.style.color = i < num ? "gold" : "gray";
  });
}

function openReviewForm() {
  document.getElementById("reviewBox").style.display = "flex";
}

function closeReviewForm() {
  document.getElementById("reviewBox").style.display = "none";
}

function saveReview() {
  let name = document.getElementById("rName").value;
  let text = document.getElementById("rText").value;

  if (!name || !text || selectedRating === 0) {
    alert("من فضلك اكتب الاسم والتقييم والرأي");
    return;
  }

  let reviews = JSON.parse(localStorage.getItem("reviews") || "[]");

  reviews.push({
    name: name,
    text: text,
    rating: selectedRating
  });

  localStorage.setItem("reviews", JSON.stringify(reviews));

  displayReviews();
  closeReviewForm();
}

function displayReviews() {
  let reviews = JSON.parse(localStorage.getItem("reviews") || "[]");

  let container = document.getElementById("reviewsList");

  if (!container) return;

  container.innerHTML = "";

  reviews.forEach(r => {
    container.innerHTML += `
      <div class="testi-card">
        <p>"${r.text}"</p>
        <h4>- ${r.name}</h4>
        <small>⭐ ${r.rating}/5</small>
      </div>
    `;
  });
}


/**********************
 * LOAD ON PAGE START
***********************/

window.onload = function () {
  displayReviews();
};


/**********************
 * ADMIN DASHBOARD (LOCAL VERSION)
***********************/

function loadDashboard() {
  document.body.innerHTML += `
    <h2>Admin Dashboard</h2>

    <h3>الحجوزات</h3>
    <div id="bookings"></div>

    <h3>الآراء</h3>
    <div id="reviews"></div>
  `;

  // bookings from localStorage (simple version)
  let name = localStorage.getItem("name");
  let phone = localStorage.getItem("phone");
  let date = localStorage.getItem("date");
  let time = localStorage.getItem("time");

  let bookingsDiv = document.getElementById("bookings");

  if (name) {
    bookingsDiv.innerHTML = `
      <p>الاسم: ${name}</p>
      <p>الهاتف: ${phone}</p>
      <p>التاريخ: ${date}</p>
      <p>الوقت: ${time}</p>
    `;
  }

  // reviews
  let reviews = JSON.parse(localStorage.getItem("reviews") || "[]");

  let reviewsDiv = document.getElementById("reviews");

  reviews.forEach(r => {
    reviewsDiv.innerHTML += `
      <p>${r.name} ⭐ ${r.rating}</p>
      <p>${r.text}</p>
      <hr>
    `;
  });
}
