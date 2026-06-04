const firebaseConfig = {
    apiKey: "AIzaSyA6u3X0ClWLL4s6M8lx0dA_82p-AOWRBfE",
    authDomain: "forex-assist.firebaseapp.com",
    projectId: "forex-assist",
    storageBucket: "forex-assist.firebasestorage.app",
    messagingSenderId: "930868016103",
    appId: "1:930868016103:web:148d6405e4ac5cc5900342"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

window.db = db;

window.firebaseDebug = {
    sdkVersion: firebase.SDK_VERSION,
    keys: Object.keys(firebase),
    messagingType: typeof firebase.messaging,
    firestoreType: typeof firebase.firestore,
    appType: typeof firebase.app
};
