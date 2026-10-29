import {saveTask} from "../config/firebase-config.js";


const taskFrom =document.getElementById('task-form');
taskFrom.addEventListener('submit',(e)=>{
    e.preventDefault();console.log('submit');
  const correo=  taskFrom['login-correo'];
  const pass=taskFrom['login-pass'];
  
   saveTask(correo.value,pass.value);

});


/*async function ejecutarLogin(e) {
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
});*/