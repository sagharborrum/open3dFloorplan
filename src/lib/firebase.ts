import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyBA-uD92gwICfqpqFH4EVC_CDHMLBNAemo',
  authDomain: 'openplan3d.firebaseapp.com',
  projectId: 'openplan3d',
  storageBucket: 'openplan3d.firebasestorage.app',
  messagingSenderId: '821030103548',
  appId: '1:821030103548:web:daa8f23b8348b8cb322a79',
  measurementId: 'G-SSDH4GMGFP',
};

export const app = initializeApp(firebaseConfig);

// Only init analytics in browser (not during SSR/build)
export const analytics = isSupported().then((yes) => (yes ? getAnalytics(app) : null));
