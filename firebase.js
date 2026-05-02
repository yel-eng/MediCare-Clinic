const firebaseConfig = {
  apiKey: "XXXX",
  authDomain: "mydoctor-clinic.firebaseapp.com",
  projectId: "mydoctor-clinic"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
