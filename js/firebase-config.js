const firebaseConfig = {
    apiKey: "AIzaSyA6u3X0ClWLL4s6M8lxOdA_82p-AOWRBfE",
    authDomain: "forex-assist.firebaseapp.com",
    projectId: "forex-assist",
    storageBucket: "forex-assist.firebasestorage.app",
    messagingSenderId: "930868016103",
    appId: "1:930868016103:web:148d6405e4ac5cc5900342"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

window.db = db;
