const firebaseConfig = {
  apiKey: "AIzaSyALRPP2Txa7rFDDARnpjI3gkBWLqRZfBjs",
  authDomain: "roadto660.firebaseapp.com",
  databaseURL: "https://roadto660-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "roadto660",
  storageBucket: "roadto660.firebasestorage.app",
  messagingSenderId: "607340843543",
  appId: "1:607340843543:web:313cde5883f8012f018252",
};

export default firebaseConfig;

export const isFirebaseConfigured = (): boolean =>
  firebaseConfig.apiKey !== 'PEGAR_AQUI' && firebaseConfig.apiKey !== '';