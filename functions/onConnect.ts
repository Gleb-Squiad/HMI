import { prisma } from "../prisma/prisma"

enum DeviceType{
    "User",
    "IOT"
}

export default async function OnSocketConnect(token:string,type:DeviceType,socketId:string){
    try{
        if (type == DeviceType.User){
            const dbUser = await prisma.user.findUnique({
                where:{
                   API_TOKEN:token 
                }
            })

            if (dbUser == null){
                throw new Error('Authorization error')
            }

            await prisma.user.update({
                where:{
                    id:dbUser.id
                },
                data:{
                    socketId:socketId
                }
            })
        }else{
            const dbDevice = await prisma.device.findUnique({
                where:{
                   API_TOKEN:token 
                }
            })

            if (dbDevice == null){
                throw new Error('Authorization error')
            }

            await prisma.$transaction(async (tx)=>{
                await tx.device.update({
                    where:{
                        id:dbDevice.id
                    },
                    data:{
                        socketId:socketId
                    }
                })

                await tx.log.create({
                    data:{
                        status:"Enabled",
                        message:"IOT device connected successfully",
                        deviceId:dbDevice.id
                    }
                })
            })
        }
    }catch(e){
        throw new Error('Authorization error')
    }
}