import { AuthService } from "../services/AuthService.js";

const authservice =new AuthService();

const formu=document.getElementById("task-form");
formu.addEventListener("submit",async(e)=>{
    e.preventDefault();
    const correo=document.getElementById("login-correo");
    const password=document.getElementById("login-pass");
    await authservice.RegistrarUsuario(
        correo.value,
        password.value
    );
});
const container=document.getElementById("container");
window.addEventListener("DOMContentLoaded",async()=>{
const querySnapshot=await authservice.ListarUsuario();
let html='';

querySnapshot.forEach(doc => {
    const user=doc.data();
    html +=`
    <div> 
    <h3>${user.correo}</h3>
    <p>${user.password}</p>
    </div>
    `
    });
    container.innerHTML=html;
});
