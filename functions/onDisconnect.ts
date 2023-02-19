import { prisma } from "../prisma/prisma";

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

                await tx.sensor.updateMany({
                    where:{
                        deviceId:dbDevice.id
                    },
                    data:{
                        isWorking:false
                    }
                })
            })
        }
    }catch(e){
        throw new Error('Disconnect error')
    }
}