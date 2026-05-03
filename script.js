import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mydoctor-clinic.firebaseapp.com",
  projectId: "mydoctor-clinic",
  storageBucket: "mydoctor-clinic.appspot.com",
  messagingSenderId: "996532645974",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

/******** BOOK ********/
import { db } from "./script.js";
import { collection, addDoc } from "firebase/firestore";

export function book() {
  let name = document.getElementById("name").value;
  let phone = document.getElementById("phone").value;
  let date = document.getElementById("date").value;
  let time = document.getElementById("time").value;

  addDoc(collection(db, "bookings"), {
    name,
    phone,
    date,
    time,
    price: 200,
    createdAt: new Date()
  }).then(() => {
    window.location.href = "confirm.html";
  });
}
/******** ADD VIDEO ********/
function addVideo(){
  let url=document.getElementById("videoUrl").value;
  let text=document.getElementById("videoText").value;

  let videos=JSON.parse(localStorage.getItem("videos")||"[]");

  videos.push({url,text});

  localStorage.setItem("videos",JSON.stringify(videos));

  alert("تم إضافة الفيديو");
  loadHome();
}

/******** ADD BLOG ********/
function addBlog(){
  let title=document.getElementById("blogTitle").value;
  let text=document.getElementById("blogText").value;

  let blogs=JSON.parse(localStorage.getItem("blogs")||"[]");

  blogs.push({title,text});

  localStorage.setItem("blogs",JSON.stringify(blogs));

  alert("تم إضافة المقال");
  loadHome();
}

/******** LOAD HOME ********/
function loadHome(){

  let videos=JSON.parse(localStorage.getItem("videos")||"[]");
  let v=document.getElementById("videos");

  if(v){
    v.innerHTML="";
    videos.forEach(i=>{
      v.innerHTML+=`
        <div class="card">
          <iframe src="${i.url}" style="width:100%;height:180px"></iframe>
          <p>${i.text}</p>
        </div>
      `;
    });
  }

  let blogs=JSON.parse(localStorage.getItem("blogs")||"[]");
  let b=document.getElementById("blogs");

  if(b){
    b.innerHTML="";
    blogs.forEach(i=>{
      b.innerHTML+=`
        <div class="card">
          <h3>${i.title}</h3>
          <p>${i.text}</p>
        </div>
      `;
    });
  }
}

window.onload=loadHome;

import { db } from "./script.js";
import { collection, getDocs } from "firebase/firestore";

export async function getDailyIncome() {
  const snap = await getDocs(collection(db, "bookings"));

  let total = 0;

  snap.forEach(doc => {
    total += doc.data().price || 0;
  });

  document.getElementById("income").innerText =
    "إجمالي اليوم: " + total + " جنيه";
}
