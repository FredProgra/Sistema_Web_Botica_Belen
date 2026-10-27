import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase-config.js";

async function ejecutarLogin(e) {
    e.preventDefault();

    const correo = document.getElementById("login-correo").value;
    const password = document.getElementById("login-pass").value;
    

    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            correo,
            password
        );

        const user = userCredential.user;

        alert(`Bienvenido ${user.email}`);

        controlarCargaInterfazSegunLogin();

    } catch (error) {
        alert("Correo o contraseña incorrectos");
        console.error(error);
    }
}

import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

document.getElementById("btn-login")
.addEventListener("click", async (e) => {

    e.preventDefault();

    const correo =
        document.getElementById("login-correo").value;

    const password =
        document.getElementById("login-password").value;

    try {

        await signInWithEmailAndPassword(
            auth,
            correo,
            password
        );

        alert("Login correcto");

        window.location.href = "dashboard.html";

    } catch (error) {

        alert("Correo o contraseña incorrectos");
        console.log(error);

    }
});