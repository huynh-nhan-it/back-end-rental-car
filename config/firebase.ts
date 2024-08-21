import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB-R6o0O8D3URPTG59QsDO8ZtmNgQA7trQ",
  authDomain: "rental-car-8da1d.firebaseapp.com",
  projectId: "rental-car-8da1d",
  storageBucket: "rental-car-8da1d.appspot.com",
  messagingSenderId: "749719970494",
  appId: "1:749719970494:web:5c8fda2507622ad5bb34ef",
  measurementId: "G-3ZYYHZ3KPN"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage, ref, uploadBytes, getDownloadURL };