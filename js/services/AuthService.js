import { db } from "../config/firebase-config.js";
import {addDoc,collection,getDocs} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

export class AuthService {
    async RegistrarUsuario(correo,password){
        await addDoc(collection(db,"user"),{
            correo,
            password
        });
        console.log("Usuario Registrado");
    }

    async ListarUsuario(){
       return await getDocs(collection(db,"user"));
    }
}

