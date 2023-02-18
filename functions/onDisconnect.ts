import { prisma } from "../prisma/prisma";

enum DeviceType{
    "User",
    "IOT"
}

export default async function onSocketDisconnect(socketId:string){
    try{
        const dbUser = await prisma.user.findUnique({
            where:{
                socketId:socketId
            }
        })

        const dbDevice = await prisma.user.findUnique({
            where:{
                socketId:socketId
            }
        })

        if (dbUser!=null){
            // const dbUser = await prisma.user.findUnique({
            //     where:{
            //         socketId:socketId
            //     }
            // })
    
            if (dbUser==null){
                throw new Error('Disconnect error. No device found')
            }

            await prisma.user.update({
                where:{
                    id:dbUser.id
                },
                data:{
                    socketId:null
                }
            })
        }else{
            // const dbDevice = await prisma.user.findUnique({
            //     where:{
            //         socketId:socketId
            //     }
            // })
    
            if (dbDevice==null){
                throw new Error('Disconnect error. No device found')
            }
    
            await prisma.$transaction(async (tx)=>{
                await tx.device.update({
                    where:{
                        id:dbDevice.id
                    },
                    data:{
                        socketId:null
                    }
                })
    
                await tx.log.create({
                    data:{
                        status:"Disabled",
                        message:"IOT device disconnected",
                        deviceId:dbDevice.id
                    }
                })
            })
        }
    }catch(e){
        throw new Error('Disconnect error')
    }
}