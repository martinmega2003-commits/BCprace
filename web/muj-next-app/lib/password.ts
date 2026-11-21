import argon2 from "argon2";

export async function  hashPassword(heslo: string){


    return argon2.hash(heslo, {type:argon2.argon2id});
}


export async function  verifyPassword(hashFromDB:string, password:string) {
    

    return argon2.verify(hashFromDB, password)
}