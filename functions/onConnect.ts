import { Socket } from "socket.io"
import { prisma } from "../prisma/prisma"

enum DeviceType{
    "User",
    "IOT"
}

export default async function OnSocketConnect(token:string,type:DeviceType,socket:Socket,sensors?:string[]){
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
                    socketId:socket.id
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
                        socketId:socket.id
                    }
                })

                if (sensors!.length == 0){
                    throw new Error('Sensors should be passed')
                }

                Promise.all([sensors!.forEach(async (sensor)=>{
                    await prisma.sensor.update({
                        where:{
                            id:sensor
                        },
                        data:{
                            isWorking:true
                        }
                    })
                })])
            })
        }
    }catch(e){
        throw new Error('Authorization error')
    }
}